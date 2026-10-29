// Pure parsing for V2EX's server-rendered pages: no runtime imports so unit tests can load it directly.
import type { Floor, PostPage, PostTarget } from '../parse';
import type { Row, RowPage, Section } from '../source';

/** Replies per page on V2EX. */
export const PAGE_SIZE = 100;

export const V2EX_TABS: Section[] = [
  ['tech', '技术'], ['creative', '创意'], ['play', '好玩'], ['apple', 'Apple'], ['jobs', '酷工作'], ['deals', '交易'],
  ['city', '城市'], ['qna', '问与答'], ['hot', '最热'], ['all', '全部'], ['r2', 'R2'],
].map(([tab, name]) => ({ name, path: `/?tab=${tab}` }));

const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim() || '';
const member = (href: string | null | undefined) => {
  const name = href?.match(/\/member\/([^/?#]+)/)?.[1];
  try { return name ? decodeURIComponent(name) : ''; } catch { return name || ''; }
};
const absolute = (src: string | null | undefined, origin: string) => {
  if (!src) return '';
  try { return new URL(src, origin).href; } catch { return ''; }
};

/** `2026-10-29 12:34:56 +08:00` (V2EX's time titles) → that instant. */
export function v2exDate(value: string | null | undefined): Date | null {
  const match = value?.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)(?:\s*([+-]\d{2}):?(\d{2}))?/);
  if (!match) return null;
  const date = new Date(`${match[1]}T${match[2].length === 5 ? `${match[2]}:00` : match[2]}${match[3] ? `${match[3]}:${match[4]}` : '+08:00'}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `刚刚`, `3 分钟前`, `2 小时 5 分钟前`, `5 天前` → roughly when; absolute dates fall through to `v2exDate`. */
export function relativeDate(value: string, now = new Date()): Date | null {
  const absoluteDate = v2exDate(value);
  if (absoluteDate) return absoluteDate;
  if (/刚刚|just now/i.test(value)) return now;
  const units: [RegExp, number][] = [[/(\d+)\s*(?:天|days?)/i, 86400000], [/(\d+)\s*(?:小时|hours?)/i, 3600000], [/(\d+)\s*(?:分钟|minutes?|mins?)/i, 60000], [/(\d+)\s*(?:秒|seconds?)/i, 1000]];
  let ago = 0, found = false;
  for (const [pattern, unit] of units) { const match = value.match(pattern); if (match) { ago += Number(match[1]) * unit; found = true; } }
  return found ? new Date(now.getTime() - ago) : null;
}

/** `/t/123?p=2#reply150` → topic 123, page 2, floor 150. Without `?p`, the floor decides the page. */
export function v2exTarget(href: string, base: string): PostTarget | null {
  let url: URL;
  try { url = new URL(href, base); } catch { return null; }
  const match = url.pathname.match(/^\/t\/(\d+)\/?$/);
  if (!match || url.hostname.replace(/^www\./, '') !== new URL(base).hostname.replace(/^www\./, '')) return null;
  const floor = Number(url.hash.match(/^#reply(\d+)$/)?.[1]) || null;
  const page = Number(url.searchParams.get('p')) || (floor ? Math.ceil(floor / PAGE_SIZE) : 1);
  return { id: Number(match[1]), page: Math.max(1, page), floor };
}

/** Lists the user can open in place: tabs, /recent and node pages. Null elsewhere, such as settings or the editor. */
export function v2exRoute(url: URL): { list: string | null; topic: PostTarget | null } | null {
  const topic = v2exTarget(url.href, url.origin);
  if (topic) return { list: null, topic };
  if (url.pathname === '/') return { list: `/${url.searchParams.get('tab') ? `?tab=${url.searchParams.get('tab')}` : ''}`, topic: null };
  if (url.pathname === '/recent' || /^\/go\/[^/]+\/?$/.test(url.pathname)) return { list: url.pathname + url.search, topic: null };
  return null;
}

/** The next page of a list: node pages and /recent count pages; a tab's "更多新主题" continues at /recent. */
function nextPage(doc: ParentNode, path: string, origin: string): string | null {
  const url = new URL(path, origin);
  if (url.hash) return null;
  if (url.pathname === '/') return doc.querySelector('#Main a[href="/recent"]') ? '/recent' : null;
  const current = Number(url.searchParams.get('p')) || 1;
  const max = Math.max(current, Number(doc.querySelector('input.page_input')?.getAttribute('max')) || 0,
    ...Array.from(doc.querySelectorAll('#Main a.page_normal, #Main a.page_current, #Main .page_input + a'), link => Number(link.getAttribute('href')?.match(/[?&]p=(\d+)/)?.[1]) || 0));
  if (current >= max) return null;
  url.searchParams.set('p', String(current + 1));
  return url.pathname + url.search;
}

/** Topic rows from tab, /recent, node and 今日热议 (`/#TopicsHot`) lists: author's avatar, node and last replier, reply count. */
export function v2exRows(doc: ParentNode, path: string, origin: string, now = new Date()): RowPage {
  const seen = new Set<number>();
  const rows: Row[] = [];
  // 今日热议 lives in the sidebar; every other list is the main column's.
  doc.querySelectorAll(path.endsWith('#TopicsHot') ? '#TopicsHot .cell' : '#Main .cell').forEach(cell => {
    const link = cell.querySelector<HTMLAnchorElement>('.item_title a[href*="/t/"], a.topic-link, .item_hot_topic_title a[href*="/t/"]');
    const target = link ? v2exTarget(link.getAttribute('href') || '', origin) : null;
    if (!link || !target || seen.has(target.id)) return;
    seen.add(target.id);
    const info = cell.querySelector('.topic_info');
    const names = Array.from(info?.querySelectorAll('strong a[href^="/member/"]') || [], node => text(node));
    const avatar = cell.querySelector('img.avatar');
    const author = names[0] || member(cell.querySelector('a[href^="/member/"]')?.getAttribute('href')) || avatar?.getAttribute('alt') || '';
    const stamp = info?.querySelector('span[title]');
    const count = cell.querySelector('a.count_livid, a.count_orange, .count_livid, .count_orange');
    // Node pages have no node link: the author takes its place before the last replier.
    const node = text(info?.querySelector('a.node'));
    rows.push({
      id: target.id, title: text(link) || `主题 #${target.id}`, author, avatar: absolute(avatar?.getAttribute('src'), origin),
      meta: [node || author, names[1]].filter(Boolean).join(' · '),
      time: v2exDate(stamp?.getAttribute('title')) || (stamp ? relativeDate(text(stamp), now) : null),
      count: count ? Number(text(count)) || 0 : (info ? 0 : null), floor: null,
    });
  });
  return { rows, next: nextPage(doc, path, origin) };
}

/** Notifications: who did what, on which topic, opening at the reply they point to. */
export function v2exNoticeRows(doc: ParentNode, origin: string, now = new Date()): RowPage {
  const rows: Row[] = [];
  doc.querySelectorAll('#Main .cell[id^="n_"]').forEach(cell => {
    const link = Array.from(cell.querySelectorAll<HTMLAnchorElement>('a[href*="/t/"]')).find(node => v2exTarget(node.getAttribute('href') || '', origin));
    const target = link ? v2exTarget(link.getAttribute('href') || '', origin) : null;
    if (!link || !target) return;
    const who = text(cell.querySelector('.fade a[href^="/member/"], a[href^="/member/"] strong')) || member(cell.querySelector('a[href^="/member/"]')?.getAttribute('href'));
    const line = text(cell.querySelector('.fade'));
    const what = /感谢/.test(line) ? '感谢了你' : /收藏/.test(line) ? '收藏了你的主题' : /提到/.test(line) ? '提到了你' : '回复了你';
    const payload = text(cell.querySelector('.payload'));
    rows.push({
      id: target.id, title: text(link) || `主题 #${target.id}`, author: who,
      avatar: absolute(cell.querySelector('img.avatar')?.getAttribute('src'), origin),
      meta: `${who ? `${who} ` : ''}${what}${payload ? `：${payload}` : ''}`,
      time: relativeDate(text(cell.querySelector('.snow')), now), count: null,
      floor: /感谢|收藏/.test(what) && !/回复/.test(line) ? null : target.floor, page: target.page,
    });
  });
  return { rows, next: null };
}

/** The `once` token V2EX's forms and thank links carry. */
export function v2exOnce(doc: ParentNode) {
  const field = doc.querySelector<HTMLInputElement>('input[name="once"]')?.getAttribute('value');
  if (field) return field;
  for (const node of Array.from(doc.querySelectorAll('a[href*="once="], [onclick*="once"], script'))) {
    const match = (node.getAttribute('href') || node.getAttribute('onclick') || node.textContent || '').match(/once[=:]\s*['"]?(\d+)/);
    if (match) return match[1];
  }
  return '';
}

export function v2exUnread(doc: ParentNode) {
  const link = doc.querySelector('#Rightbar a[href^="/notifications"], #Top a[href^="/notifications"], a.fade[href^="/notifications"]');
  return Number(text(link).match(/(\d+)/)?.[1]) || 0;
}

export function v2exUser(doc: ParentNode, origin: string) {
  const link = doc.querySelector('#Rightbar .box .cell a[href^="/member/"], #Top a[href^="/member/"]');
  const name = member(link?.getAttribute('href'));
  if (!name) return null;
  const image = doc.querySelector(`#Rightbar img.avatar, #Top a[href^="/member/"] img`);
  return { name, avatar: absolute(image?.getAttribute('src'), origin), profile: `/member/${encodeURIComponent(name)}` };
}

export function v2exTabs(doc: ParentNode): Section[] {
  const tabs = Array.from(doc.querySelectorAll<HTMLAnchorElement>('#Tabs a[href^="/?tab="]'), link => ({ name: text(link), path: link.getAttribute('href')! })).filter(tab => tab.name);
  return tabs.length ? tabs : V2EX_TABS;
}

export interface V2exPage extends PostPage {
  /** Replies-form token, reused by 感谢 and the reply box. */
  once: string;
  /** 加入收藏 / 取消收藏, as the topic's own buttons link them. */
  favorite: { on: boolean; href: string } | null;
}

const thanks = (value: string) => Number(value.match(/(\d+)/)?.[1]) || 0;

/** A topic page: the opening post with its 附言, then this page's replies, floors as V2EX numbers them. */
export function v2exPage(doc: ParentNode, id: number, page: number, origin: string, me = ''): V2exPage {
  const header = doc.querySelector('#Main .header');
  const title = text(header?.querySelector('h1')) || `主题 #${id}`;
  const opener = member(header?.querySelector('small a[href^="/member/"], .gray a[href^="/member/"], a[href^="/member/"]')?.getAttribute('href')) || header?.querySelector('img.avatar')?.getAttribute('alt') || '';
  const stats = text(doc.querySelector('#Main .topic_stats, #Main .topic_buttons .fr')) || text(header?.querySelector('small'));
  // The body is the first .topic_content outside a 附言; a topic may have no body and only 附言.
  const content = Array.from(doc.querySelectorAll('#Main .topic_content')).find(node => !node.closest('.subtle'));
  const ownerDoc = (doc as Node).ownerDocument || doc as Document;
  // The opening post and its 附言 are one message; each 附言 keeps its heading line.
  let opBody: Element | null = null;
  if (content || doc.querySelector('#Main .subtle')) {
    opBody = ownerDoc.createElement('div');
    if (content) opBody.append(...Array.from(content.childNodes, node => node.cloneNode(true)));
    doc.querySelectorAll('#Main .subtle').forEach(note => {
      const heading = ownerDoc.createElement('p'); heading.textContent = text(note.querySelector('.fade')) || '附言';
      const quote = ownerDoc.createElement('blockquote');
      quote.append(heading, ...Array.from(note.querySelector('.topic_content')?.childNodes || [], node => node.cloneNode(true)));
      opBody!.append(quote);
    });
  }
  const opTime = header?.querySelector('small span[title], span[title]');
  const topicThank = doc.querySelector('#topic_thank');
  const floors: Floor[] = [];
  if (page === 1) floors.push({
    floor: 0, op: true, author: opener || '楼主', profile: opener ? `/member/${encodeURIComponent(opener)}` : '', uid: null,
    avatar: absolute(header?.querySelector('img.avatar')?.getAttribute('src'), origin), poster: true, roles: [], hot: false,
    time: v2exDate(opTime?.getAttribute('title'))?.toISOString() || '', timeTitle: opTime?.getAttribute('title') || '', edited: '',
    content: opBody, reactions: [], stats: null,
    likes: thanks(stats.match(/(\d+)\s*人感谢/)?.[0] || ''), liked: /感谢已发送|已感谢/.test(text(topicThank)),
    canLike: !!topicThank?.querySelector('a') && !!me && me !== opener,
  });
  doc.querySelectorAll('#Main .cell[id^="r_"]').forEach(cell => {
    const floor = Number(text(cell.querySelector('.no')));
    if (!Number.isSafeInteger(floor) || floor <= 0) return;
    const author = text(cell.querySelector('strong a.dark, strong a[href^="/member/"]')) || cell.querySelector('img.avatar')?.getAttribute('alt') || '匿名';
    const stamp = cell.querySelector('.ago[title], span[title]');
    const area = cell.querySelector('.thank_area');
    floors.push({
      floor, op: false, postId: Number(cell.id.slice(2)) || undefined,
      author, profile: `/member/${encodeURIComponent(author)}`, uid: null,
      avatar: absolute(cell.querySelector('img.avatar')?.getAttribute('src'), origin),
      poster: !!cell.querySelector('.badge.op') || (!!opener && author === opener),
      roles: Array.from(cell.querySelectorAll('.badges .badge:not(.op)'), text).filter(Boolean), hot: false,
      time: v2exDate(stamp?.getAttribute('title'))?.toISOString() || '', timeTitle: stamp?.getAttribute('title') || text(stamp), edited: '',
      content: cell.querySelector('.reply_content'), reactions: [], stats: null,
      likes: thanks(text(cell.querySelector('.small.fade'))), liked: !!area && (area.classList.contains('thanked') || /感谢已发送/.test(text(area))),
      canLike: !!area?.querySelector('a.thank, a[onclick*="thank"]') && !!me && me !== author,
    });
  });
  const replies = Number(Array.from(doc.querySelectorAll('#Main .cell > .gray, #Main .cell .gray'), text).join(' ').match(/(\d+)\s*(?:条回复|repl(?:y|ies))/i)?.[1]) || 0;
  const pageMax = Math.max(Number(doc.querySelector('input.page_input')?.getAttribute('max')) || 0,
    ...Array.from(doc.querySelectorAll(`#Main a[href*="/t/${id}?p="]`), link => Number(link.getAttribute('href')?.match(/[?&]p=(\d+)/)?.[1]) || 0));
  const favorite = doc.querySelector<HTMLAnchorElement>('#Main a[href*="favorite/topic/"]');
  return {
    id, page, pages: Math.max(page, pageMax, Math.ceil(replies / PAGE_SIZE)), replies, title,
    category: header?.querySelector('a[href^="/go/"]') ? { name: text(header.querySelector('a[href^="/go/"]')), href: header.querySelector('a[href^="/go/"]')!.getAttribute('href')! } : null,
    views: stats.match(/(\d+)\s*次点击/)?.[1] || '', collected: /unfavorite/.test(favorite?.getAttribute('href') || ''),
    collections: Number(stats.match(/(\d+)\s*人收藏/)?.[1]) || 0,
    floors, once: v2exOnce(doc),
    favorite: favorite ? { on: /unfavorite/.test(favorite.getAttribute('href') || ''), href: favorite.getAttribute('href')! } : null,
  };
}

/** A topic page that asks to sign in, or V2EX's error box, instead of the topic. */
export function v2exProblem(doc: ParentNode) {
  const problem = text(doc.querySelector('#Main .problem'));
  if (problem) return problem;
  if (!doc.querySelector('#Main .topic_content, #Main .header h1') && doc.querySelector('form[action="/signin"], #Main .message')) return text(doc.querySelector('#Main .message')) || '需要先登录 V2EX';
  return '';
}

/** The daily login reward page (/mission/daily): already redeemed, or the link that redeems it, and the streak. */
export function v2exMission(html: string) {
  const days = Number(html.match(/已连续登录\s*(\d+)\s*天|(\d+)\s*consecutive days?/i)?.slice(1).find(Boolean)) || null;
  const redeem = html.match(/(\/mission\/daily\/redeem\?once=\d+)/)?.[1] || null;
  const done = !redeem && /每日登录奖励已领取|已成功领取每日登录奖励|already (?:been )?redeemed|reward has been redeemed/i.test(html);
  return { done, redeem, days };
}
