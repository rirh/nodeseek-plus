import type { Context } from '../../../core/types';
import { unsafeWindow } from '../../../lib/userscript';
import { reactions, siteIcon } from '../../post-interaction-data';
import { parsePostPage, postHref, postTarget, type Floor, type FloorStats, type PostPage } from '../parse';
import type { Chip, FloorAction, ThreadSource } from '../source';

const STICKER = '/static/image/sticker/';
// NodeSeek++'s author. Their floors carry a small fish, and the 插件作者 tag sends a school of fish across the pane.
const AUTHOR_UID = 17170;
// The forum's comment menu: 点赞 is free; 加鸡腿 and 反对 spend chicken legs, so they ask first with the forum's own wording.
const VOTES = {
  点赞: { endpoint: 'upvote', done: 'upvoted', total: 'upvotes', confirm: '' },
  加鸡腿: { endpoint: 'like', done: 'liked', total: 'likes', confirm: '是否投喂鸡腿，这将消耗你一个鸡腿' },
  反对: { endpoint: 'dislike', done: 'disliked', total: 'dislikes', confirm: '是否反对该回答，这将消耗你两个鸡腿' },
} as const satisfies Record<string, { endpoint: string; done: keyof FloorStats; total: keyof FloorStats; confirm: string }>;
type Vote = keyof typeof VOTES;
type StatResult = { success?: boolean; message?: string; current?: number; postCollectionCount?: number };
type ReplyResult = { success?: boolean; message?: string };
const TOKEN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const absolute = (path: string) => new URL(path, location.origin).href;
const icon = (title: string) => {
  const name = reactions.find(reaction => reaction.title === title)?.icon;
  return name ? () => siteIcon(name) : undefined;
};

/** NodeSeek and DeepFlood: post pages are fetched through the shared request queue; replies post to the endpoint the forum's own editor uses. */
export function nodeseekThread(ctx: Context): ThreadSource {
  const user = (unsafeWindow as Window & { __config__?: { user?: { member_id?: number; member_name?: string } | null } }).__config__?.user;
  const me = user?.member_id;
  // The forum's editor sends a random token of its own making in this header, one per editor; the pane is one editor.
  const csrf = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => TOKEN[byte % TOKEN.length]).join('');
  const statistic = (path: string, payload: object) => ctx.request<StatResult>(`/api/statistics/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  async function vote(kind: Vote, stats: FloorStats) {
    const spec = VOTES[kind];
    const result = await statistic(spec.endpoint, { commentId: stats.commentId, action: 'add' });
    if (!result?.success) throw new Error(result?.message || `${kind}未成功`);
    stats[spec.done] = true;
    if (typeof result.current === 'number') stats[spec.total] = result.current;
  }
  async function collect(data: PostPage) {
    const result = await statistic('collection', { postId: data.id, action: data.collected ? 'remove' : 'add' });
    if (!result?.success) throw new Error(result?.message || '收藏未成功');
    data.collected = result.message === 'added' || (result.message !== 'removed' && !data.collected);
    if (typeof result.postCollectionCount === 'number') data.collections = result.postCollectionCount;
  }
  /** 加鸡腿 is free a few times a day; the question says so when today's free ones are left. */
  async function feedPrompt() {
    try {
      const today = await ctx.request<{ maxFreeLike?: number; freeLikeUsed?: number }>('/api/progress/today?scope=freelike');
      if (Number(today?.maxFreeLike) > Number(today?.freeLikeUsed)) return '是否投喂鸡腿，本次投喂免费';
    } catch { /* Keep the wording that names the cost. */ }
    return VOTES.加鸡腿.confirm;
  }
  return {
    me: me == null ? null : { id: me, name: user?.member_name || '' },
    markdown: true,
    sending: '正在发送…',
    href: postHref,
    target: href => postTarget(href, location.origin),
    async load(id, page, signal) {
      const url = absolute(postHref(id, page));
      const html = await ctx.request<string>(url, { responseType: 'text', signal });
      const data = parsePostPage(new DOMParser().parseFromString(html, 'text/html'), url);
      if (!data.floors.length && page === 1) throw new Error('未找到正文');
      return data;
    },
    // The same request the forum's editor makes, sent straight away: no hidden copy of the post page, its avatars or its scripts.
    // Like that editor, it reads the JSON whatever the status and shows the forum's own message when it refuses.
    async reply(id, text) {
      let response: Response;
      try {
        response = await fetch(absolute('/api/content/new-comment'), {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'csrf-token': csrf },
          body: JSON.stringify({ content: text, mode: 'new-comment', postId: id }),
          signal: AbortSignal.any([ctx.signal, AbortSignal.timeout(20_000)]),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'TimeoutError') return '尚未确认发送结果，请刷新查看，勿重复发送';
        return '网络连接失败，回复未发送，请稍后重试';
      }
      const result = await response.json().catch(() => null) as ReplyResult | null;
      if (result?.success) return '';
      if (result?.message) return result.message;
      return response.ok ? '服务器未返回有效数据，请检查登录状态或站点验证页面' : `回复未发送（HTTP ${response.status}），请在原帖完成登录或站点验证后重试`;
    },
    // Counts come from the page config when present, so they can follow this pane's own actions; the menu text is the fallback.
    chips(floor, data): Chip[] {
      const stats = floor.stats;
      if (!stats) return floor.reactions.map(reaction => ({ ...reaction, on: false, icon: icon(reaction.title) }));
      return [
        { title: '点赞', count: stats.upvotes, on: stats.upvoted },
        { title: '加鸡腿', count: stats.likes, on: stats.liked },
        { title: '反对', count: stats.dislikes, on: stats.disliked },
        ...(floor.op && data.collections != null ? [{ title: '收藏', count: data.collections, on: data.collected }] : []),
      ].map(chip => ({ ...chip, icon: icon(chip.title) }));
    },
    actions(floor, data): FloorAction[] {
      const stats = floor.stats;
      if (me == null || !stats) return [];
      const votes = (Object.keys(VOTES) as Vote[]).map(kind => {
        const spec = VOTES[kind], done = stats[spec.done];
        return {
          label: done ? `已${kind}` : kind, detail: String(stats[spec.total]), disabled: done,
          confirm: kind === '加鸡腿' ? feedPrompt : spec.confirm ? () => spec.confirm : undefined,
          run: () => vote(kind, stats),
        };
      });
      return floor.op ? [...votes, { label: data.collected ? '取消收藏' : '收藏', detail: data.collections == null ? '' : String(data.collections), run: () => collect(data) }] : votes;
    },
    mine: floor => me != null && (floor.stats ? floor.stats.mine : floor.uid === me),
    // The forum offers 回复 on other people's floors only.
    canReply: floor => !(floor.stats ? floor.stats.mine : floor.uid === me),
    mention: (floor, href) => `@${floor.author} [#${floor.floor}](${href}) `,
    quote(floor, href, text) {
      const stats = floor.stats;
      const created = new Date(stats?.created || floor.time);
      const edited = stats?.edited ? `，编辑于${new Date(stats.edited).toLocaleString()}` : '';
      const source = stats?.markdown || text;
      return `> @${floor.author} [#${floor.floor}](${href}) 发布于${Number.isNaN(created.getTime()) ? '' : created.toLocaleString()}${edited}\n${source.split('\n').map(line => `> ${line}`).join('\n')}\n\n`;
    },
    source: floor => floor.stats?.markdown || '',
    sticker: image => image.src.includes(STICKER),
    author: floor => floor.uid === AUTHOR_UID,
  };
}
