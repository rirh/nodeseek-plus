import type { Context } from '../../../core/types';
import { icon } from '../icons';
import type { Floor } from '../parse';
import type { FloorAction, SiteSource, ThreadSource } from '../source';
import { v2exNoticeRows, v2exOnce, v2exPage, v2exProblem, v2exRoute, v2exRows, v2exTabs, v2exTarget, v2exUnread, v2exUser, type V2exPage } from './v2ex-parse';

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');

/** V2EX: server-rendered pages read through the shared request queue; replies, 感谢 and 收藏 post the site's own forms. */
export function v2exSite(ctx: Context): SiteSource {
  const origin = location.origin;
  const user = v2exUser(document, origin);
  let unread = v2exUnread(document);
  let once = v2exOnce(document);
  const page = async (path: string, signal?: AbortSignal) => {
    const doc = parse(await ctx.request<string>(path, { responseType: 'text', signal }));
    // Every page carries the unread count and a fresh form token; keep both current.
    if (doc.querySelector('#Rightbar, #Top')) unread = v2exUnread(doc);
    once = v2exOnce(doc) || once;
    return doc;
  };
  /** Posts a form or action the way the site's own buttons do, and reports V2EX's error box if one comes back. */
  async function post(path: string, body?: URLSearchParams) {
    const response = await fetch(path, {
      method: 'POST', credentials: 'same-origin',
      ...(body ? { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() } : {}),
    });
    if (!response.ok) throw new Error(response.status === 403 ? '需要先登录 V2EX，或今日操作次数已用完' : `站点未接受（HTTP ${response.status}）`);
    if (response.redirected && /\/signin\b/.test(response.url)) throw new Error('登录已过期，请重新登录 V2EX');
    const text = await response.text();
    if (/^\s*[{[]/.test(text)) {
      const data = JSON.parse(text) as { success?: boolean; message?: string; once?: string | number };
      if (data.once) once = String(data.once);
      if (data.success === false) throw new Error(data.message || '站点未接受');
      return null;
    }
    const doc = parse(text);
    const problem = v2exProblem(doc);
    if (problem) throw new Error(problem);
    once = v2exOnce(doc) || once;
    return doc;
  }
  const token = async (id: number) => {
    if (!once) await page(`/t/${id}`);
    if (!once) throw new Error('需要先登录 V2EX');
    return once;
  };

  async function thank(floor: Floor, id: number) {
    const path = floor.op ? `/thank/topic/${id}` : `/thank/reply/${floor.postId}`;
    await post(`${path}?once=${encodeURIComponent(await token(id))}`);
    floor.liked = true; floor.likes = (floor.likes || 0) + 1;
  }
  async function favorite(data: V2exPage) {
    if (!data.favorite) return;
    // The topic's 加入收藏 / 取消收藏 links carry their own token.
    const response = await fetch(new URL(data.favorite.href, origin), { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`站点未接受（HTTP ${response.status}）`);
    const doc = parse(await response.text());
    const next = doc.querySelector<HTMLAnchorElement>('#Main a[href*="favorite/topic/"]')?.getAttribute('href');
    const on = !data.favorite.on;
    data.favorite = { on, href: next || data.favorite.href.replace(on ? '/favorite/' : '/unfavorite/', on ? '/unfavorite/' : '/favorite/') };
    data.collected = on; data.collections = Math.max(0, (data.collections || 0) + (on ? 1 : -1));
    once = v2exOnce(doc) || once;
  }

  const me = user ? { id: user.name, name: user.name } : null;
  const thread: ThreadSource = {
    me, markdown: false, sending: '正在发送…',
    href: (id, number = 1, floor) => `/t/${id}${number > 1 ? `?p=${number}` : ''}${floor ? `#reply${floor}` : ''}`,
    target: href => v2exTarget(href, origin),
    async load(id, number, signal) {
      const doc = await page(thread.href(id, number), signal);
      const problem = v2exProblem(doc);
      if (problem) throw new Error(problem);
      const data = v2exPage(doc, id, number, origin, me?.name);
      if (!data.floors.length && number === 1) throw new Error('未找到正文');
      return data;
    },
    async reply(id, text) {
      // A stale token is answered with an error box; one fresh retry covers it.
      try { await post(`/t/${id}`, new URLSearchParams({ content: text, once: await token(id) })); }
      catch (error) {
        if (!(error instanceof Error) || !/once|过期|token/i.test(error.message)) throw error;
        once = ''; await post(`/t/${id}`, new URLSearchParams({ content: text, once: await token(id) }));
      }
      return '';
    },
    chips: (floor, data) => [
      { title: '感谢', count: floor.likes || 0, on: !!floor.liked, icon: () => icon('heart', 12, 2) },
      ...(floor.op ? [{ title: '收藏', count: data.collections || 0, on: data.collected, icon: () => icon('star', 12, 2) }] : []),
    ],
    actions(floor, data) {
      if (!me) return [];
      const actions: FloorAction[] = [];
      // 感谢 costs copper coins, so it asks with the site's own wording first.
      if (floor.liked) actions.push({ label: '已感谢', disabled: true, run: async () => {} });
      else if (floor.canLike) actions.push({
        label: '感谢', detail: floor.likes ? String(floor.likes) : '',
        confirm: () => floor.op ? '你确定要向本主题创建者发送谢意？' : `确认花费 10 个铜币向 @${floor.author} 的这条回复发送感谢？`,
        run: () => thank(floor, data.id),
      });
      const page = data as V2exPage;
      if (floor.op && page.favorite) actions.push({ label: page.favorite.on ? '取消收藏' : '收藏', detail: String(data.collections || 0), run: () => favorite(page) });
      return actions;
    },
    mine: floor => !!me && floor.author === me.name,
    canReply: () => true,
    mention: floor => `@${floor.author} ${floor.op ? '' : `#${floor.floor} `}`,
    // Replies are plain text: a quote is the mention plus the start of what was said.
    quote: (floor, _href, text) => {
      const line = text.replace(/\s+/g, ' ').trim();
      return `@${floor.author} ${floor.op ? '' : `#${floor.floor} `}「${line.length > 80 ? `${line.slice(0, 80)}…` : line}」\n`;
    },
  };

  return {
    name: 'V2EX', user: () => user, signIn: '/signin', compose: '/write', home: '/recent',
    route: url => v2exRoute(url),
    async list(path, signal) {
      return v2exRows(await page(path.endsWith('#TopicsHot') ? '/' : path, signal), path, origin);
    },
    sections: async () => v2exTabs(document),
    hot: [{ label: '最热', path: '/?tab=hot' }, { label: '今日热议', path: '/#TopicsHot' }],
    async notices(signal) {
      const rows = v2exNoticeRows(await page('/notifications', signal), origin);
      // Opening the notifications page marks them read on V2EX.
      unread = 0;
      return rows;
    },
    unread: () => unread,
    async poll(signal) { await page('/', signal); return unread; },
    dark: () => !!document.querySelector('#Wrapper.Night, body.Night') || matchMedia('(prefers-color-scheme: dark)').matches && !document.querySelector('#Wrapper'),
    thread,
  };
}
