import type { Context } from '../core/types';
import { readingContent } from '../views/post-preview';
import { notificationAvatar } from '../views/notification-avatar';

type Category = 'atMe' | 'reply';
type Notice = { id: number; post_id: number; floor_id?: number | string; commenter_id?: number; member_id?: number; commenter_name?: string; title?: string; post_title?: string; content?: string; created_at?: string; viewed?: number | boolean };
const routes = { atMe: { endpoint: 'at-me', field: 'atMe', label: '@我' }, reply: { endpoint: 'reply-to-me', field: 'replys', label: '回复主题' } };
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => { const el = document.createElement(tag); el.className = className; el.textContent = text; return el; };
const button = (text: string, className = '') => { const el = node('button', className, text); el.type = 'button'; return el; };
const unread = (notice: Notice) => notice.viewed === 0 || notice.viewed === false;

export function createNotificationInbox(ctx: Context, onRead: () => void, onBack: () => void) {
  const root = node('div', 'nspp-messages-workspace nspp-notice-workspace'); root.hidden = true;
  const sidebar = node('aside', 'nspp-messages-sidebar');
  const toolbar = node('div', 'nspp-messages-search');
  const contactsBack = button('联系人', 'nspp-messages-back'); contactsBack.addEventListener('click', onBack, { signal: ctx.signal });
  toolbar.append(contactsBack);
  const search = node('input'); search.type = 'search'; search.placeholder = '搜索用户或主题'; search.setAttribute('aria-label', search.placeholder);
  const refresh = button('刷新'); toolbar.append(search, refresh);
  const list = node('div', 'nspp-messages-conversations');
  const info = node('p', 'nspp-messages-list-status'); info.setAttribute('role', 'status');
  const more = button('加载更多', 'nspp-messages-more'); sidebar.append(toolbar, list, info, more);
  const detail = node('section', 'nspp-messages-chat');
  const header = node('div', 'nspp-messages-heading'); header.hidden = true;
  const back = button('返回通知', 'nspp-notice-back'); const title = node('strong', '', '通知详情');
  const categoryAvatar = node('img', 'nspp-messages-avatar'); categoryAvatar.alt = '';
  const original = node('a', 'nspp-messages-profile', '打开原帖'); original.hidden = true;
  header.append(back, categoryAvatar, title, original);
  const content = node('div', 'nspp-messages-thread nspp-notice-detail');
  const empty = () => content.replaceChildren(node('div', 'nspp-messages-empty', '选择左侧通知查看内容'));
  empty(); detail.append(content); root.append(sidebar, detail);
  let category: Category | undefined, selected: number | undefined, page = 1, busy = false;
  let controller = new AbortController(), previewController = new AbortController();
  const notices = new Map<number, Notice>();
  const current = () => !ctx.signal.aborted && !root.hidden && !!category;
  const signal = () => AbortSignal.any([ctx.signal, controller.signal]);
  async function api(path: string, options: RequestInit = {}) {
    const result = await ctx.request<{ success?: boolean; message?: string; atList?: Notice[]; replyList?: Notice[]; msgArray?: Notice[]; notifications?: Notice[]; list?: Notice[]; data?: unknown }>(path, { ...options, signal: options.signal || signal() });
    if (result?.success !== true) throw new Error(result?.message || '通知读取失败');
    return result;
  }
  function render() {
    const query = search.value.trim().toLocaleLowerCase(); list.replaceChildren();
    for (const item of [...notices.values()].sort((a, b) => b.id - a.id)) {
      const actor = item.commenter_name || '用户'; const subject = item.post_title || item.title || `帖子 ${item.post_id}`;
      if (query && !`${actor} ${subject} ${item.content || ''}`.toLocaleLowerCase().includes(query)) continue;
      const row = button('', 'nspp-messages-peer'); row.setAttribute('aria-pressed', String(selected === item.id));
      const uid = item.commenter_id || item.member_id;
      if (uid && Number.isSafeInteger(uid)) { const image = node('img', 'nspp-messages-avatar'); image.src = `/avatar/${uid}.png`; image.alt = ''; image.loading = 'lazy'; row.append(image); }
      const text = node('span', 'nspp-messages-peer-details');
      const heading = node('span', 'nspp-messages-peer-title'); heading.append(node('strong', '', actor));
      const date = new Date(item.created_at || '');
      if (Number.isFinite(date.getTime())) heading.append(node('time', '', date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })));
      text.append(heading, node('span', 'nspp-messages-snippet', subject)); row.append(text);
      if (unread(item)) { const dot = node('span', 'nspp-messages-unread'); dot.setAttribute('aria-label', '未读'); row.append(dot); }
      row.addEventListener('click', () => { void select(item); }); list.append(row);
    }
    if (!list.childElementCount && !busy) list.append(node('p', 'nspp-messages-list-status', query ? '没有匹配的通知' : '暂无通知'));
  }
  async function load(next = false) {
    if (!current() || busy) return;
    const kind = category!; const requestSignal = signal(); const targetPage = next ? page + 1 : 1;
    busy = true; refresh.disabled = true; more.disabled = true; info.textContent = notices.size ? '' : '正在读取通知…';
    try {
      const result = await api(`/api/notification/${routes[kind].endpoint}/list?page=${targetPage}`, { signal: requestSignal });
      if (!current() || requestSignal.aborted) return;
      const nested = result.data && typeof result.data === 'object' && !Array.isArray(result.data) ? result.data as Record<string, unknown> : {};
      const raw = [kind === 'atMe' ? result.atList : result.replyList, result.msgArray, result.notifications, result.list, result.data, nested.atList, nested.replyList, nested.msgArray, nested.list].find(Array.isArray);
      if (!Array.isArray(raw)) throw new Error('通知格式已变化，可返回原版页面');
      const rows = raw.map(value => {
        if (!value || typeof value !== 'object') throw new Error('通知格式已变化，可返回原版页面');
        const item = value as Notice;
        const id = Number(item.id), postId = Number(item.post_id);
        if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(postId) || postId <= 0) throw new Error('通知格式已变化，可返回原版页面');
        return { ...item, id, post_id: postId, viewed: String(item.viewed) === '0' ? false : item.viewed };
      });
      let added = 0;
      for (const item of rows) { if (!notices.has(item.id)) added++; notices.set(item.id, item); }
      if (next) page = targetPage;
      if (next || page === 1) more.hidden = !rows.length || (next && !added);
      info.textContent = '';
    } catch (error) { if (current() && !requestSignal.aborted) info.textContent = error instanceof Error ? error.message : '通知读取失败'; }
    finally { if (!requestSignal.aborted) { busy = false; refresh.disabled = false; more.disabled = false; render(); } }
  }
  async function select(item: Notice) {
    if (!category || !current()) return;
    const kind = category; selected = item.id; root.classList.add('has-detail'); back.hidden = false; render();
    previewController.abort(); previewController = new AbortController();
    const requestSignal = AbortSignal.any([signal(), previewController.signal]);
    title.textContent = routes[kind].label;
    const floor = Number(String(item.floor_id ?? '0').replace(/^#/, ''));
    const safeFloor = Number.isSafeInteger(floor) && floor >= 0 ? floor : 0;
    const path = `/post-${item.post_id}-${Math.max(1, Math.ceil(safeFloor / 10))}`;
    original.href = `${path}${safeFloor ? `#${safeFloor}` : ''}`; original.hidden = false;
    const summary = node('div', 'nspp-notice-summary');
    summary.append(node('h3', '', item.post_title || item.title || `帖子 ${item.post_id}`), node('p', '', `${item.commenter_name || '用户'} ${kind === 'atMe' ? '@了你' : '回复了你的主题'}${safeFloor ? ` · #${safeFloor}` : ''}`));
    content.replaceChildren(summary);
    const body = node('div', 'nspp-notice-body', '正在加载内容…'); content.append(body);
    try {
      const html = await ctx.request<string>(path, { responseType: 'text', signal: requestSignal });
      if (!current() || requestSignal.aborted) return;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const floorLink = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a.floor-link')).find(link => link.getAttribute('href') === `#${safeFloor}` || link.textContent?.trim() === `#${safeFloor}`);
      const target = safeFloor ? floorLink?.closest('li, .comment-container')?.querySelector('.comment-content') : doc.querySelector('.post-content');
      const source = target || doc.querySelector('.post-content');
      if (!source) throw new Error('内容暂不可用，请打开原帖查看');
      body.replaceChildren();
      if (!target && safeFloor) body.append(node('p', 'nspp-notice-hint', '当前显示主题正文，指定回复请打开原帖查看。'));
      body.append(readingContent(source, new URL(path, location.origin).href));
      if (unread(item) && !document.hidden) {
        await api(`/api/notification/${routes[kind].endpoint}/markViewed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [routes[kind].field]: [item.id] }), signal: requestSignal });
        if (!requestSignal.aborted) { item.viewed = true; notices.set(item.id, item); render(); onRead(); }
      }
    } catch (error) {
      if (!current() || requestSignal.aborted) return;
      const message = error instanceof Error ? error.message : '内容加载失败';
      if (body.textContent === '正在加载内容…') body.textContent = message;
      else body.append(node('p', 'nspp-notice-hint', '内容已加载，已读状态同步失败'));
    }
  }
  async function markAll() {
    if (!current()) return;
    const kind = category!; const requestSignal = signal();
    await api(`/api/notification/${routes[kind].endpoint}/markViewed?all=true`, { method: 'POST', signal: requestSignal });
    if (!requestSignal.aborted) { notices.forEach(item => { item.viewed = true; }); render(); onRead(); }
  }
  function show(kind?: Category) {
    if (category === kind && !root.hidden) return;
    controller.abort(); previewController.abort(); controller = new AbortController(); busy = false;
    category = kind; root.hidden = !kind; header.hidden = !kind; back.hidden = true; root.classList.remove('has-detail'); selected = undefined;
    notices.clear(); page = 1; more.hidden = false; more.disabled = false; refresh.disabled = false;
    search.value = ''; info.textContent = ''; original.hidden = true; render(); empty();
    if (kind) { title.textContent = routes[kind].label; categoryAvatar.src = notificationAvatar(kind); void load(); }
  }
  search.addEventListener('input', render, { signal: ctx.signal });
  refresh.addEventListener('click', () => { void load(); }, { signal: ctx.signal });
  more.addEventListener('click', () => { void load(true); }, { signal: ctx.signal });
  back.addEventListener('click', () => { previewController.abort(); root.classList.remove('has-detail'); back.hidden = true; original.hidden = true; }, { signal: ctx.signal });
  return { element: root, heading: header, show, refresh: () => load(), markAll, stop: () => { controller.abort(); previewController.abort(); root.remove(); header.remove(); } };
}
