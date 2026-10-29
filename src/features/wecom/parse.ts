// Pure parsing for the WeCom layout: no runtime imports so unit tests can load it directly.

/** `page` 0 means unknown: the source locates the page that holds `floor`. */
export interface PostTarget { id: number; page: number; floor: number | null }

export interface Floor {
  floor: number;
  /** The opening post. */
  op: boolean;
  /** Shown instead of `#floor` where the site numbers posts differently. */
  label?: string;
  /** The site's own id for this post or reply, which its like/thank endpoints take. */
  postId?: number;
  /** Likes (linux.do) or thanks (V2EX) and whether the signed-in user gave one. */
  likes?: number;
  liked?: boolean;
  canLike?: boolean;
  author: string;
  profile: string;
  uid: number | null;
  avatar: string;
  poster: boolean;
  roles: string[];
  hot: boolean;
  time: string;
  timeTitle: string;
  edited: string;
  content: Element | null;
  reactions: { title: string; count: number }[];
  /** The page config's record for this floor: what the native comment menu acts on. Null when the config is missing. */
  stats: FloorStats | null;
}

export interface FloorStats {
  commentId: number;
  markdown: string;
  created: string;
  edited: string;
  mine: boolean;
  upvoted: boolean; upvotes: number;
  liked: boolean; likes: number;
  disliked: boolean; dislikes: number;
}

export interface PostPage {
  id: number;
  page: number;
  pages: number;
  /** Reply count when the site reports it; otherwise the highest floor loaded stands in. */
  replies?: number;
  title: string;
  category: { name: string; href: string } | null;
  views: string;
  collected: boolean;
  collections: number | null;
  floors: Floor[];
}

/** `/post-12-3#25` → { id: 12, page: 3, floor: 25 }; anything that is not a same-origin post link is null. */
export function postTarget(href: string, base: string): PostTarget | null {
  let url: URL;
  try { url = new URL(href, base); } catch { return null; }
  const match = url.pathname.match(/^\/post-(\d+)(?:-(\d+))?(?:\.html)?\/?$/);
  if (url.origin !== new URL(base).origin || !match) return null;
  const floor = url.hash.match(/^#(\d+)$/);
  return { id: Number(match[1]), page: Math.max(1, Number(match[2]) || 1), floor: floor ? Number(floor[1]) : null };
}

type PageConfig = { commmentPerPage?: unknown; commentPerPage?: unknown; postData?: { title?: unknown; postPageCount?: unknown; views?: unknown; categoryWord?: unknown; categoryLink?: unknown; collected?: unknown; collectionCount?: unknown; comments?: unknown } };
type RawComment = {
  commentId?: unknown; floorIndex?: unknown; markdown?: unknown; poster?: { isMe?: unknown }; time?: { createdDate?: unknown; editedDate?: unknown };
  upvoted?: unknown; upvoteCount?: unknown; liked?: unknown; likeCount?: unknown; disliked?: unknown; dislikeCount?: unknown;
};

/** The server embeds the page config as base64 UTF-8 JSON in #temp-script; the live page removes it after reading. */
function pageConfig(doc: ParentNode): PageConfig | null {
  const raw = doc.querySelector('#temp-script')?.textContent?.trim();
  if (!raw) return null;
  try {
    const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
    const value = JSON.parse(new TextDecoder().decode(bytes));
    return value && typeof value === 'object' ? value as PageConfig : null;
  } catch { return null; }
}

const positive = (value: unknown) => { const n = Number(value); return Number.isSafeInteger(n) && n > 0 ? n : undefined; };
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() || '';
const tally = (value: unknown) => { const n = Number(value); return Number.isSafeInteger(n) && n >= 0 ? n : 0; };
const string = (value: unknown) => typeof value === 'string' ? value : '';

function floorStats(value: unknown): [number, FloorStats] | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as RawComment;
  const commentId = positive(raw.commentId), floor = Number(raw.floorIndex);
  if (!commentId || !Number.isSafeInteger(floor) || floor < 0) return null;
  return [floor, {
    commentId, markdown: string(raw.markdown), created: string(raw.time?.createdDate), edited: string(raw.time?.editedDate), mine: raw.poster?.isMe === true,
    upvoted: raw.upvoted === true, upvotes: tally(raw.upvoteCount),
    liked: raw.liked === true, likes: tally(raw.likeCount),
    disliked: raw.disliked === true, dislikes: tally(raw.dislikeCount),
  }];
}

function parseFloor(item: Element, base: string): Floor | null {
  const floorText = item.querySelector('.floor-link')?.textContent?.match(/\d+/)?.[0] ?? item.id;
  const floor = Number(floorText);
  if (!/^\d+$/.test(String(floorText)) || !Number.isSafeInteger(floor)) return null;
  const nameLink = item.querySelector<HTMLAnchorElement>('.author-info .author-name, .author-info > a[href*="/space/"]');
  const profile = nameLink?.getAttribute('href') || item.querySelector('.avatar-wrapper a')?.getAttribute('href') || '';
  const uid = Number(profile.match(/\/space\/(\d+)/)?.[1]);
  const img = item.querySelector('.avatar-wrapper img, img.avatar-normal');
  let avatar = '';
  try { avatar = img?.getAttribute('src') ? new URL(img.getAttribute('src')!, base).href : ''; } catch { /* Leave blank. */ }
  const time = item.querySelector('.date-created time, time');
  return {
    floor,
    op: floor === 0,
    author: text(nameLink) || img?.getAttribute('alt') || '匿名',
    profile,
    uid: Number.isSafeInteger(uid) ? uid : null,
    avatar,
    poster: !!item.querySelector('.author-info .is-poster'),
    roles: Array.from(item.querySelectorAll('.author-info .role-tag:not(.is-poster)'), text).filter(Boolean),
    hot: !!item.querySelector('.floor-link-wrapper .hot-badge'),
    time: time?.getAttribute('datetime') || '',
    timeTitle: time?.getAttribute('title') || text(time),
    edited: item.querySelector('.date-updated')?.getAttribute('title') || '',
    content: item.querySelector(':scope > article.post-content, :scope > .post-content, article.post-content'),
    reactions: Array.from(item.querySelectorAll(':scope > .comment-menu .menu-item[title]')).flatMap(menu => {
      const count = Number(text(menu.querySelector('span')));
      return Number.isSafeInteger(count) && count > 0 ? [{ title: menu.getAttribute('title')!, count }] : [];
    }),
    stats: null,
  };
}

/**
 * Page 1 repeats hot replies above the regular ones, and a hot reply that belongs to this page is only rendered there,
 * so floors are deduplicated and kept only when they fall inside this page's range.
 */
export function parsePostPage(doc: ParentNode, url: string): PostPage {
  const target = postTarget(url, url);
  if (!target) throw new Error('不是帖子地址');
  const config = pageConfig(doc);
  const data = config?.postData;
  const perPage = positive(config?.commmentPerPage ?? config?.commentPerPage) ?? 10;
  const pagerMax = Math.max(0, ...Array.from(doc.querySelectorAll('.nsk-pager a[href], .nsk-pager span[href]'), a => postTarget(a.getAttribute('href') || '', url))
    .filter(next => next?.id === target.id).map(next => next!.page));
  const pages = Math.max(target.page, positive(data?.postPageCount) ?? 0, pagerMax);
  const first = (target.page - 1) * perPage + 1, last = target.page * perPage;
  const stats = new Map((Array.isArray(data?.comments) ? data.comments : []).flatMap(comment => { const entry = floorStats(comment); return entry ? [entry] : []; }));
  const byFloor = new Map<number, Floor>();
  doc.querySelectorAll('.nsk-post .content-item, ul.comments > .content-item').forEach(item => {
    const floor = parseFloor(item, url);
    if (!floor) return;
    floor.stats = stats.get(floor.floor) ?? null;
    const inPage = floor.floor === 0 ? target.page === 1 : floor.floor >= first && floor.floor <= last;
    const seen = byFloor.get(floor.floor);
    if (!inPage) return;
    if (seen) { seen.hot ||= floor.hot; return; }
    byFloor.set(floor.floor, floor);
  });
  const categoryLink = doc.querySelector<HTMLAnchorElement>('.nsk-post .content-category a[href]');
  const categoryName = typeof data?.categoryWord === 'string' ? data.categoryWord : text(categoryLink);
  const categoryHref = typeof data?.categoryLink === 'string' ? data.categoryLink : categoryLink?.getAttribute('href') || '';
  return {
    id: target.id,
    page: target.page,
    pages,
    title: (typeof data?.title === 'string' && data.title.trim()) || text(doc.querySelector('.post-title-link, .post-title h1')) || `帖子 #${target.id}`,
    category: categoryName ? { name: categoryName, href: categoryHref } : null,
    views: data?.views == null ? '' : String(data.views),
    collected: data?.collected === true,
    collections: data?.collectionCount == null ? null : tally(data.collectionCount),
    floors: [...byFloor.values()].sort((a, b) => a.floor - b.floor),
  };
}

export function postHref(id: number, page = 1, floor?: number | null) {
  return `/post-${id}-${page}${floor == null ? '' : `#${floor}`}`;
}
