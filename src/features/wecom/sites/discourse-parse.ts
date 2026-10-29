// Pure parsing for linux.do (Discourse JSON): no runtime imports so unit tests can load it directly.
import type { Floor, PostPage, PostTarget } from '../parse';
import type { Row, RowPage, Section } from '../source';

/** Turns HTML into an inert element (DOMParser), so nothing in it loads or runs before it is copied. */
export type HtmlParser = (html: string) => Element;
/** Posts per page of the conversation: Discourse loads topics in chunks of 20. */
export const PAGE_SIZE = 20;

export type DiscourseUser = { id?: number; username?: string; name?: string; avatar_template?: string };
type Poster = { user_id?: number; description?: string };
export type DiscourseTopic = {
  id?: number; title?: string; fancy_title?: string; slug?: string; posts_count?: number; views?: number; category_id?: number;
  bumped_at?: string; last_posted_at?: string; created_at?: string; unread_posts?: number; new_posts?: number; unseen?: boolean;
  pinned?: boolean; last_poster_username?: string; posters?: Poster[];
};
export type DiscourseList = { users?: DiscourseUser[]; topic_list?: { topics?: DiscourseTopic[]; more_topics_url?: string } };
export type DiscoursePost = {
  id?: number; username?: string; name?: string; avatar_template?: string; created_at?: string; updated_at?: string; cooked?: string;
  post_number?: number; post_type?: number; user_id?: number; user_title?: string | null; admin?: boolean; moderator?: boolean;
  actions_summary?: { id?: number; count?: number; acted?: boolean; can_act?: boolean; can_undo?: boolean }[];
  reaction_users_count?: number; current_user_reaction?: unknown; version?: number; hidden?: boolean;
};
export type DiscourseThread = {
  id?: number; title?: string; fancy_title?: string; slug?: string; posts_count?: number; views?: number; category_id?: number;
  details?: { created_by?: { username?: string } }; post_stream?: { posts?: DiscoursePost[]; stream?: number[] };
};
export type DiscourseNotice = {
  id?: number; notification_type?: number; read?: boolean; created_at?: string; post_number?: number; topic_id?: number;
  fancy_title?: string; acting_user_avatar_template?: string;
  data?: { topic_title?: string; display_username?: string; original_username?: string; username?: string; badge_name?: string };
};
export type DiscourseCategory = { id?: number; name?: string; slug?: string; color?: string; parent_category_id?: number; position?: number };

const num = (value: unknown) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
const date = (value: unknown) => {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Avatar templates carry a `{size}` placeholder and may be relative to the forum. */
export function avatarUrl(template: unknown, origin: string, size = 96) {
  if (typeof template !== 'string' || !template) return '';
  try { return new URL(template.replace('{size}', String(size)), origin).href; } catch { return ''; }
}

/** `/latest?page=1` (as `more_topics_url` gives it) → `/latest.json?page=1`. */
export function jsonPath(path: string) {
  const url = new URL(path, 'https://forum.invalid');
  const clean = url.pathname.replace(/\/+$/, '') || '/latest';
  url.pathname = clean.endsWith('.json') ? clean : `${clean}.json`;
  return url.pathname + url.search;
}

/** `/t/slug/12/5`, `/t/12/5` and `/t/12` → topic 12 (at post 5); page 0 asks the source to find the page. */
export function discourseTarget(href: string, base: string): PostTarget | null {
  let url: URL;
  try { url = new URL(href, base); } catch { return null; }
  if (url.origin !== new URL(base).origin) return null;
  const parts = url.pathname.replace(/\/+$/, '').split('/').slice(1);
  if (parts[0] !== 't' || parts.length < 2) return null;
  const rest = parts.slice(1), numeric = (value?: string) => !!value && /^\d+$/.test(value);
  let id: string | undefined, post: string | undefined;
  // Two numbers are topic and post, as Discourse's own routes read them; otherwise the first part is the slug.
  if (numeric(rest[0]) && (rest.length === 1 || (rest.length === 2 && numeric(rest[1])))) [id, post] = rest;
  else if (numeric(rest[1]) && rest.length <= 3 && (rest.length < 3 || numeric(rest[2]))) [, id, post] = rest;
  if (!id) return null;
  const floor = post ? Number(post) : null;
  return { id: Number(id), page: floor && floor > 1 ? 0 : 1, floor: floor && floor > 1 ? floor : null };
}

const LISTS = ['/latest', '/new', '/unread', '/top', '/hot', '/bookmarks', '/posted'];
/** The list behind a forum page: categories and tags list their latest topics. Null for pages that are not lists or topics. */
export function discourseRoute(url: URL): { list: string | null; topic: PostTarget | null } | null {
  const topic = discourseTarget(url.href, url.origin);
  if (topic) return { list: null, topic };
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/categories') return { list: '/latest', topic: null };
  if (LISTS.includes(path)) return { list: path + url.search, topic: null };
  if (/^\/c\/.+\/\d+$/.test(path) || /^\/c\/\d+$/.test(path)) return { list: `${path}/l/latest`, topic: null };
  if (/^\/(?:c|tag|tags)\/./.test(path)) return { list: path + url.search, topic: null };
  return null;
}

/** Topic lists: the opening poster's avatar, category and last replier on the second line, unread replies as a badge. */
export function discourseRows(json: DiscourseList, origin: string, categories: Map<number, string>): RowPage {
  const users = new Map((json.users || []).map(user => [user.id, user]));
  const rows = (json.topic_list?.topics || []).flatMap((topic): Row[] => {
    const id = num(topic.id);
    if (!id) return [];
    const opener = topic.posters?.find(poster => /original poster|原始发帖人|发帖人/i.test(poster.description || '')) || topic.posters?.[0];
    const author = users.get(opener?.user_id);
    const unread = num(topic.unread_posts) || num(topic.new_posts);
    return [{
      id, title: topic.title || topic.fancy_title || `话题 #${id}`,
      author: author?.username || topic.last_poster_username || '', avatar: avatarUrl(author?.avatar_template, origin),
      meta: [categories.get(num(topic.category_id)), topic.last_poster_username].filter(Boolean).join(' · '),
      time: date(topic.bumped_at || topic.last_posted_at || topic.created_at),
      count: Math.max(0, num(topic.posts_count) - 1), floor: null,
      unread: unread || undefined, read: topic.unseen ? false : undefined, pinned: topic.pinned === true,
    }];
  });
  return { rows, next: json.topic_list?.more_topics_url || null };
}

// What each notification type says, after the acting user's name.
const NOTICES: Record<number, string> = {
  1: '提到了你', 2: '回复了你', 3: '引用了你', 4: '编辑了你的帖子', 5: '赞了你的帖子', 6: '给你发了私信', 7: '邀请你加入私信',
  9: '发布了回复', 11: '链接了你的帖子', 12: '授予了你徽章', 15: '提到了你的群组', 16: '给群组发了私信', 17: '发布了新话题',
  19: '书签提醒', 25: '回应了你的帖子', 26: '投票已结束', 36: '回应了你的帖子',
};
/** Notifications open the topic at the post they are about; unread ones keep their dot until opened. */
export function discourseNoticeRows(json: { notifications?: DiscourseNotice[]; load_more_notifications?: string }, origin: string): RowPage {
  const rows = (json.notifications || []).flatMap((notice): Row[] => {
    const id = num(notice.topic_id);
    if (!id) return [];
    const who = notice.data?.display_username || notice.data?.original_username || notice.data?.username || '';
    const what = NOTICES[num(notice.notification_type)] || '有新动态';
    return [{
      id, title: notice.data?.topic_title || notice.fancy_title || notice.data?.badge_name || `话题 #${id}`,
      author: who, avatar: avatarUrl(notice.acting_user_avatar_template, origin),
      meta: who ? `${who} ${what}` : what, time: date(notice.created_at), count: null,
      floor: num(notice.post_number) > 1 ? num(notice.post_number) : null, page: num(notice.post_number) > 1 ? 0 : 1,
      read: notice.read === true, notice: num(notice.id) || undefined,
    }];
  });
  return { rows, next: null };
}

/** Top-level categories in the forum's order, each followed by its subcategories. */
export function discourseSections(categories: DiscourseCategory[]): Section[] {
  const valid = categories.filter(category => num(category.id) && category.slug && category.name);
  const order = (a: DiscourseCategory, b: DiscourseCategory) => num(a.position) - num(b.position) || String(a.name).localeCompare(String(b.name));
  const byId = new Map(valid.map(category => [num(category.id), category]));
  const color = (category: DiscourseCategory) => category.color && /^[0-9a-f]{3,8}$/i.test(category.color) ? `#${category.color}` : undefined;
  return valid.filter(category => !category.parent_category_id || !byId.has(num(category.parent_category_id))).sort(order).flatMap(parent => [
    { name: parent.name!, path: `/c/${parent.slug}/${parent.id}/l/latest`, color: color(parent), depth: 0 },
    ...valid.filter(child => num(child.parent_category_id) === num(parent.id)).sort(order)
      .map(child => ({ name: child.name!, path: `/c/${parent.slug}/${child.slug}/${child.id}/l/latest`, color: color(child), depth: 1 })),
  ]);
}

/** Link previews become one link, quote headers lose their avatar, and polls point to the original post. */
export function tidyCooked(root: Element) {
  const doc = root.ownerDocument;
  root.querySelectorAll('.quote > .title img, .lightbox-wrapper .meta, .onebox-avatar, .site-icon, .cooked-date + svg').forEach(node => node.remove());
  root.querySelectorAll('aside.onebox, .onebox:not(a)').forEach(box => {
    const href = box.getAttribute('data-onebox-src') || box.querySelector('header a, h3 a, h4 a, a')?.getAttribute('href') || '';
    const label = box.querySelector('h3, h4')?.textContent?.trim() || href;
    const line = doc.createElement('p');
    if (href) { const link = doc.createElement('a'); link.setAttribute('href', href); link.textContent = label; line.append(link); }
    box.replaceWith(line);
  });
  root.querySelectorAll('.poll').forEach(poll => { const line = doc.createElement('p'); line.textContent = '（投票，请在原帖中查看）'; poll.replaceWith(line); });
  root.querySelectorAll('.video-placeholder-container[data-video-src]').forEach(video => {
    const line = doc.createElement('p'); const link = doc.createElement('a');
    link.setAttribute('href', video.getAttribute('data-video-src')!); link.textContent = '视频'; line.append(link); video.replaceWith(line);
  });
  return root;
}

const likeAction = (post: DiscoursePost) => post.actions_summary?.find(action => action.id === 2);
export function discourseFloor(post: DiscoursePost, origin: string, opener: string, parse: HtmlParser): Floor | null {
  const number = num(post.post_number);
  if (!number || post.post_type === 3) return null;
  const like = likeAction(post);
  const username = post.username || '';
  const roles = [post.admin ? '管理员' : post.moderator ? '版主' : '', post.user_title || ''].filter(Boolean);
  const created = post.created_at || '';
  const edited = (post.version || 1) > 1 && post.updated_at && post.updated_at !== created ? `编辑于 ${new Date(post.updated_at).toLocaleString()}` : '';
  return {
    floor: number, op: number === 1, label: `#${number}`, postId: num(post.id) || undefined,
    author: username || post.name || '匿名', profile: username ? `/u/${encodeURIComponent(username)}` : '', uid: num(post.user_id) || null,
    avatar: avatarUrl(post.avatar_template, origin), poster: !!opener && username === opener, roles: [...new Set(roles)], hot: false,
    time: created, timeTitle: '', edited,
    content: post.cooked ? tidyCooked(parse(post.cooked)) : null,
    reactions: [], stats: null,
    likes: num(post.reaction_users_count) || num(like?.count), liked: like?.acted === true || !!post.current_user_reaction,
    canLike: like?.can_act === true || like?.can_undo === true,
  };
}

/** One page of the conversation: the posts for one chunk of the topic's stream, in stream order. */
export function discoursePage(topic: DiscourseThread, posts: DiscoursePost[], page: number, pages: number, origin: string, categories: Map<number, string>, parse: HtmlParser): PostPage {
  const id = num(topic.id);
  const opener = topic.details?.created_by?.username || topic.post_stream?.posts?.find(post => post.post_number === 1)?.username || '';
  const category = categories.get(num(topic.category_id));
  return {
    id, page, pages: Math.max(1, pages), replies: Math.max(0, num(topic.posts_count) - 1),
    title: topic.title || topic.fancy_title || `话题 #${id}`,
    category: category ? { name: category, href: `/c/${num(topic.category_id)}` } : null,
    views: topic.views == null ? '' : String(topic.views), collected: false, collections: null,
    floors: posts.flatMap(post => { const floor = discourseFloor(post, origin, opener, parse); return floor ? [floor] : []; }),
  };
}
