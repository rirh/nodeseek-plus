import type { Context } from '../../../core/types';
import { icon } from '../icons';
import type { Floor } from '../parse';
import type { SiteSource, ThreadSource } from '../source';
import {
  PAGE_SIZE, avatarUrl, discourseNoticeRows, discoursePage, discourseRoute, discourseRows, discourseSections, discourseTarget, jsonPath,
  type DiscourseCategory, type DiscourseList, type DiscourseNotice, type DiscoursePost, type DiscourseThread, type DiscourseUser,
} from './discourse-parse';

type CurrentUser = DiscourseUser & { all_unread_notifications_count?: number; unread_notifications?: number };
type Topic = { thread: DiscourseThread; stream: number[]; posts: Map<number, DiscoursePost>; fetched: number };
// The topic's post list goes stale after this long; replies sent from the pane drop it at once.
const STREAM_TTL = 60 * 1000;

const inert = (html: string) => new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html').body.firstElementChild!;

/** Values Discourse embeds in the page for its own start-up; each one is a JSON string. */
function preloaded<T>(key: string): T | null {
  try {
    const raw = document.getElementById('data-preloaded')?.getAttribute('data-preloaded');
    const value = raw ? JSON.parse(raw)?.[key] : null;
    return typeof value === 'string' ? JSON.parse(value) as T : (value as T) ?? null;
  } catch { return null; }
}

/** Relative luminance of a CSS colour, to tell whether the forum is showing its dark scheme. */
function darkColor(color: string) {
  const [r, g, b, a = 1] = (color.match(/[\d.]+/g) || []).map(Number);
  if (r == null || a === 0) return null;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
}

/** linux.do: Discourse's JSON API for lists, topics and notifications; replies and likes go through the same API with its CSRF token. */
export function linuxdoSite(ctx: Context): SiteSource {
  const origin = location.origin;
  const current = preloaded<CurrentUser>('currentUser');
  const categories = new Map<number, string>();
  let rawCategories: DiscourseCategory[] = preloaded<{ categories?: DiscourseCategory[] }>('site')?.categories || [];
  rawCategories.forEach(category => { if (category.id && category.name) categories.set(category.id, category.name); });
  const topics = new Map<number, Topic>();
  let token = '';

  const api = <T>(path: string, signal?: AbortSignal) => ctx.request<T>(path, { signal, headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
  const csrf = async () => {
    token ||= document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
    if (!token) token = (await api<{ csrf?: string }>('/session/csrf.json'))?.csrf || '';
    if (!token) throw new Error('未能取得登录凭证，请刷新页面后重试');
    return token;
  };
  /** Writes go straight to the forum so its own error messages (e.g. 正文太短) reach the status line. */
  async function write<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(path, {
      ...init, credentials: 'same-origin',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-Token': await csrf(), ...init.headers },
    });
    const data = await response.json().catch(() => null) as { errors?: string[]; error?: string } | null;
    if (!response.ok) {
      if (response.status === 403 && token) token = '';
      throw new Error(data?.errors?.join('；') || data?.error || (response.status === 429 ? '操作太频繁，请稍后再试' : `站点未接受（HTTP ${response.status}）`));
    }
    return data as T;
  }

  async function ensureCategories(signal?: AbortSignal) {
    if (rawCategories.length) return;
    rawCategories = (await api<{ categories?: DiscourseCategory[] }>('/site.json', signal))?.categories || [];
    rawCategories.forEach(category => { if (category.id && category.name) categories.set(category.id, category.name); });
  }
  const remember = (id: number, json: DiscourseThread) => {
    const entry: Topic = topics.get(id) || { thread: json, stream: [], posts: new Map(), fetched: 0 };
    entry.thread = json; entry.fetched = Date.now();
    if (Array.isArray(json.post_stream?.stream)) entry.stream = json.post_stream.stream;
    for (const post of json.post_stream?.posts || []) if (post.id) entry.posts.set(post.id, post);
    topics.set(id, entry);
    return entry;
  };
  const pages = (entry: Topic) => Math.max(1, Math.ceil(entry.stream.length / PAGE_SIZE));

  const me = current?.username ? { id: current.id ?? current.username, name: current.username } : null;
  async function like(floor: Floor) {
    if (!floor.postId) throw new Error('未能确定这条帖子');
    if (floor.liked) await write(`/post_actions/${floor.postId}?post_action_type_id=2`, { method: 'DELETE' });
    else await write('/post_actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: floor.postId, post_action_type_id: 2 }) });
    floor.likes = Math.max(0, (floor.likes || 0) + (floor.liked ? -1 : 1));
    floor.liked = !floor.liked;
  }

  const thread: ThreadSource = {
    me, markdown: true, sending: '正在发送…',
    href: (id, _page, floor) => `/t/topic/${id}${floor && floor > 1 ? `/${floor}` : ''}`,
    target: href => discourseTarget(href, origin),
    async load(id, page, signal) {
      await ensureCategories(signal).catch(() => {});
      let entry = topics.get(id);
      if (page === 1 || !entry || Date.now() - entry.fetched > STREAM_TTL) entry = remember(id, await api<DiscourseThread>(`/t/${id}.json`, signal));
      const ids = entry.stream.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      const missing = ids.filter(post => !entry!.posts.has(post));
      if (missing.length) {
        const more = await api<{ post_stream?: { posts?: DiscoursePost[] } }>(`/t/${id}/posts.json?${missing.map(post => `post_ids[]=${post}`).join('&')}`, signal);
        for (const post of more?.post_stream?.posts || []) if (post.id) entry.posts.set(post.id, post);
      }
      const posts = ids.flatMap(post => entry!.posts.get(post) || []);
      if (!posts.length && page === 1) throw new Error('未找到正文');
      return discoursePage(entry.thread, posts, page, pages(entry), origin, categories, inert);
    },
    /** Loads the posts around the floor, which also brings the topic's post list, and finds its chunk there. */
    async locate(target, signal) {
      const entry = remember(target.id, await api<DiscourseThread>(`/t/${target.id}/${target.floor}.json`, signal));
      const post = [...entry.posts.values()].find(each => each.post_number === target.floor);
      const index = post?.id ? entry.stream.indexOf(post.id) : -1;
      return index >= 0 ? Math.floor(index / PAGE_SIZE) + 1 : Math.min(pages(entry), Math.max(1, Math.ceil((target.floor || 1) / PAGE_SIZE)));
    },
    async reply(id, text, to) {
      await write('/posts.json', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: text, topic_id: id, ...(to && !to.op ? { reply_to_post_number: to.floor } : {}) }) });
      return '';
    },
    replied: id => { topics.delete(id); },
    chips: floor => [{ title: '点赞', count: floor.likes || 0, on: !!floor.liked, icon: () => icon('heart', 12, 2) }],
    actions: floor => me && floor.canLike && !thread.mine(floor) ? [{ label: floor.liked ? '取消点赞' : '点赞', detail: String(floor.likes || 0), run: () => like(floor) }] : [],
    mine: floor => !!me && floor.author === me.name,
    canReply: () => true,
    mention: floor => `@${floor.author} `,
    quote: (floor, _href, text, id) => `[quote="${floor.author}, post:${floor.floor}, topic:${id}"]\n${text.trim()}\n[/quote]\n\n`,
  };

  return {
    name: 'LINUX DO',
    user: () => me ? { name: me.name, avatar: avatarUrl(current?.avatar_template, origin), profile: `/u/${encodeURIComponent(me.name)}` } : null,
    signIn: '/login', compose: '/new-topic', home: '/latest',
    route: url => discourseRoute(url),
    async list(path, signal) {
      await ensureCategories(signal).catch(() => {});
      return discourseRows(await api<DiscourseList>(jsonPath(path), signal), origin, categories);
    },
    // Latest topics sort by last reply; Discourse's ?order=created lists them by when they were posted.
    sorts: [
      { label: '新回复', apply: path => { const url = new URL(path, origin); url.searchParams.delete('order'); return url.pathname + url.search; }, matches: path => !/[?&]order=created\b/.test(path) },
      { label: '新发布', apply: path => { const url = new URL(path, origin); url.searchParams.set('order', 'created'); return url.pathname + url.search; }, matches: path => /[?&]order=created\b/.test(path) },
    ],
    async sections(signal) { await ensureCategories(signal); return discourseSections(rawCategories); },
    hot: [{ label: '热门', path: '/hot' }, { label: '日榜', path: '/top?period=daily' }, { label: '周榜', path: '/top?period=weekly' }, { label: '月榜', path: '/top?period=monthly' }],
    async notices(signal) {
      return discourseNoticeRows(await api<{ notifications?: DiscourseNotice[] }>('/notifications.json?limit=40&recent=true', signal), origin);
    },
    async read(row) {
      if (!row.notice || row.read) return;
      await write('/notifications/mark-read', { method: 'PUT', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ id: String(row.notice) }).toString() });
      row.read = true;
    },
    // The header keeps its badge current through the forum's own message bus, even while it is hidden.
    unread() {
      const badge = document.querySelector('.header-dropdown-toggle.current-user .badge-notification, #current-user .badge-notification');
      if (badge) return Number(badge.textContent?.replace(/\D/g, '')) || 0;
      return document.querySelector('.d-header') ? 0 : current?.all_unread_notifications_count ?? current?.unread_notifications ?? 0;
    },
    dark() {
      for (const node of [document.body, document.documentElement]) {
        const dark = darkColor(getComputedStyle(node).backgroundColor);
        if (dark != null) return dark;
      }
      return matchMedia('(prefers-color-scheme: dark)').matches;
    },
    thread,
  };
}
