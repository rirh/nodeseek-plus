import type { Context } from '../core/types';
import { readingContent } from '../views/post-preview';
import { notificationAvatar } from '../views/notification-avatar';
import { forumTime } from '../lib/forum-time';
import { footprintHref } from '../lib/link-rules';

type Category = 'atMe' | 'reply';
type Notice = { id: number; post_id: number; floor_id?: number | string; commenter_id?: number; member_id?: number; commenter_name?: string; title?: string; post_title?: string; content?: string; created_at?: string; viewed?: number | boolean };
const routes = { atMe: { endpoint: 'at-me', field: 'atMe', label: '@我' }, reply: { endpoint: 'reply-to-me', field: 'replys', label: '回复主题' } };
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => { const el = document.createElement(tag); el.className = className; el.textContent = text; return el; };
const button = (text: string, className = '') => { const el = node('button', className, text); el.type = 'button'; return el; };
const unread = (notice: Notice) => notice.viewed === 0 || notice.viewed === false;
const noticeFloor = (notice: Notice) => {
  if (notice.floor_id === undefined || String(notice.floor_id).trim() === '') return null;
  const floor = Number(String(notice.floor_id).replace(/^#/, ''));
  return Number.isSafeInteger(floor) && floor >= 0 ? floor : null;
};
const noticeHref = (notice: Notice) => noticeFloor(notice) === null ? `/post-${notice.post_id}-1` : footprintHref(notice.post_id, noticeFloor(notice)!);
type Preview = { title: string; body: DocumentFragment; snippet: string; available: boolean };

export function createNotificationInbox(ctx: Context, onRead: () => void, onBack: () => void) {
  const root = node('div', 'nspp-messages-workspace nspp-notice-workspace'); root.hidden = true;
  const sidebar = node('aside', 'nspp-messages-sidebar');
  const toolbar = node('div', 'nspp-messages-search');
  const contactsBack = button('联系人', 'nspp-messages-back'); contactsBack.addEventListener('click', onBack, { signal: ctx.signal });
  toolbar.append(contactsBack);
  const search = node('input'); search.type = 'search'; search.placeholder = '搜索用户、帖子或已加载的回复'; search.setAttribute('aria-label', search.placeholder);
  const refresh = button('刷新'); toolbar.append(search, refresh);
  const list = node('div', 'nspp-messages-conversations');
  const info = node('p', 'nspp-messages-list-status'); info.setAttribute('role', 'status');
  const more = button('加载更多', 'nspp-messages-more');
  const scrollArea = node('div', 'nspp-messages-contact-list nspp-notice-list-scroll'); scrollArea.append(list, info, more); sidebar.append(toolbar, scrollArea);
  const detail = node('section', 'nspp-messages-chat');
  const header = node('div', 'nspp-messages-heading'); header.hidden = true;
  const back = button('返回通知', 'nspp-notice-back'); const title = node('strong', '', '通知详情');
  const categoryAvatar = node('img', 'nspp-messages-avatar'); categoryAvatar.alt = '';
  const original = node('a', 'nspp-messages-profile', '打开原帖'); original.hidden = true;
  original.target = '_blank'; original.rel = 'noopener noreferrer';
  header.append(back, categoryAvatar, title, original);
  const content = node('div', 'nspp-messages-thread nspp-notice-detail');
  const empty = () => content.replaceChildren(node('div', 'nspp-messages-empty', '选择左侧通知查看内容'));
  empty(); detail.append(content); root.append(sidebar, detail);
  let category: Category | undefined, selected: number | undefined, page = 1, busy = false, loaded = false, autoPaused = false;
  let controller = new AbortController(), previewController = new AbortController();
  const notices = new Map<number, Notice>();
  const previews = new Map<number, Preview>();
  const pages = new Map<string, Promise<Document>>();
  const loading = new Map<number, Promise<Preview>>();
  const current = () => !ctx.signal.aborted && !root.hidden && !!category;
  const signal = () => AbortSignal.any([ctx.signal, controller.signal]);
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      observer?.unobserve(entry.target);
      const item = notices.get(Number((entry.target as HTMLElement).dataset.noticeId));
      if (item) void hydrate(entry.target as HTMLElement, item);
    }
  }, { root: scrollArea, rootMargin: '100px' }) : undefined;
  const moreObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting) && current() && loaded && !busy && !autoPaused && !more.hidden && !search.value.trim() && !document.hidden && !root.classList.contains('has-detail')) void load(true);
  }, { root: scrollArea, rootMargin: '150px' }) : undefined;
  const observeMore = () => {
    moreObserver?.disconnect();
    if (current() && loaded && !busy && !autoPaused && !more.hidden && !search.value.trim() && !root.classList.contains('has-detail')) moreObserver?.observe(more);
  };
  function getPreview(item: Notice): Promise<Preview> {
    if (previews.has(item.id)) return Promise.resolve(previews.get(item.id)!);
    if (loading.has(item.id)) return loading.get(item.id)!;
    const requestSignal = signal();
    const href = noticeHref(item), path = href.split('#')[0]!;
    const promise = (async () => {
      let subject = item.post_title || item.title || `帖子 ${item.post_id}`;
      let source: Element | null = null;
      if (item.content?.trim()) source = new DOMParser().parseFromString(item.content, 'text/html').body;
      else {
        let pageRequest = pages.get(path);
        if (!pageRequest) {
          pageRequest = ctx.request<string>(path, { responseType: 'text', signal: requestSignal }).then(html => new DOMParser().parseFromString(html, 'text/html'));
          pages.set(path, pageRequest);
          void pageRequest.catch(() => { if (pages.get(path) === pageRequest) pages.delete(path); });
        }
        const doc = await pageRequest;
        requestSignal.throwIfAborted();
        const pageTitle = doc.querySelector('.post-title')?.textContent?.trim();
        if (pageTitle) subject = pageTitle;
        const encoded = doc.querySelector('#temp-script')?.textContent?.trim();
        if (encoded) {
          let data: { postId?: unknown; title?: unknown } | undefined;
          try {
            data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded), char => char.charCodeAt(0))))?.postData;
          } catch { /* Keep the title supplied by the notification if page metadata is unavailable. */ }
          if (data?.postId !== undefined && String(data.postId) !== String(item.post_id)) throw new Error('帖子数据不匹配');
          if (typeof data?.title === 'string' && data.title.trim()) subject = data.title.trim();
        }
        const floor = noticeFloor(item);
        const floorLink = floor === null ? undefined : Array.from(doc.querySelectorAll<HTMLAnchorElement>('a.floor-link')).find(link => {
          const hash = new URL(link.getAttribute('href') || '', new URL(path, location.origin)).hash;
          return hash === `#${floor}` || link.textContent?.trim() === `#${floor}`;
        });
        source = floor === 0 ? doc.querySelector('.post-content, .nsk-post .nsk-content')
          : floorLink?.closest('li, .comment-container')?.querySelector('.comment-content') || null;
      }
      const body = source ? readingContent(source, new URL(path, location.origin).href) : document.createDocumentFragment();
      const snippet = body.textContent?.replace(/\s+/g, ' ').trim() || (body.querySelector('img') ? '[图片回复]' : '');
      const result = { title: subject, body, snippet, available: !!source };
      requestSignal.throwIfAborted(); previews.set(item.id, result); return result;
    })();
    loading.set(item.id, promise);
    void promise.finally(() => { if (loading.get(item.id) === promise) loading.delete(item.id); }).catch(() => {});
    return promise;
  }
  async function hydrate(row: HTMLElement, item: Notice) {
    const requestSignal = signal();
    const excerpt = row.querySelector<HTMLElement>('.nspp-notice-excerpt')!;
    try {
      const preview = await getPreview(item);
      if (requestSignal.aborted || !row.isConnected) return;
      const subject = row.querySelector<HTMLAnchorElement>('.nspp-notice-subject')!;
      subject.textContent = preview.title; subject.title = preview.title;
      excerpt.textContent = preview.available ? preview.snippet : '';
      excerpt.hidden = !excerpt.textContent;
    } catch {
      if (!requestSignal.aborted && row.isConnected) { excerpt.textContent = ''; excerpt.hidden = true; }
    } finally { excerpt.classList.remove('nspp-sweep-shine'); excerpt.removeAttribute('aria-busy'); }
  }
  async function api(path: string, options: RequestInit = {}) {
    const result = await ctx.request<{ success?: boolean; message?: string; atList?: Notice[]; replyList?: Notice[]; msgArray?: Notice[]; notifications?: Notice[]; list?: Notice[]; data?: unknown }>(path, { ...options, signal: options.signal || signal() });
    if (result?.success !== true) throw new Error(result?.message || '通知读取失败');
    return result;
  }
  function render() {
    const query = search.value.trim().toLocaleLowerCase(); observer?.disconnect(); list.replaceChildren();
    for (const item of [...notices.values()].sort((a, b) => b.id - a.id)) {
      const actor = item.commenter_name || '用户'; const preview = previews.get(item.id);
      const subject = preview?.title || item.post_title || item.title || `帖子 ${item.post_id}`;
      if (query && !`${actor} ${subject} ${preview?.snippet || item.content || ''}`.toLocaleLowerCase().includes(query)) continue;
      const row = node('div', 'nspp-messages-peer'); row.tabIndex = 0; row.setAttribute('role', 'button'); row.dataset.noticeId = String(item.id); row.setAttribute('aria-pressed', String(selected === item.id));
      const uid = item.commenter_id || item.member_id;
      if (uid && Number.isSafeInteger(uid)) { const image = node('img', 'nspp-messages-avatar'); image.src = `/avatar/${uid}.png`; image.alt = ''; image.loading = 'lazy'; row.append(image); }
      const text = node('span', 'nspp-messages-peer-details');
      const heading = node('span', 'nspp-messages-peer-title'); heading.append(node('strong', '', actor));
      heading.append(node('span', 'nspp-notice-action', `${category === 'atMe' ? '@了你' : '回复了主题'}${noticeFloor(item) === null ? '' : ` · #${noticeFloor(item)}`}`));
      const date = forumTime(item.created_at || '');
      if (date) { const stamp = node('time', '', date.text); stamp.dateTime = item.created_at!; stamp.title = date.full; heading.append(stamp); }
      const subjectLink = node('a', 'nspp-notice-subject', subject); subjectLink.href = noticeHref(item); subjectLink.target = '_blank'; subjectLink.rel = 'noopener noreferrer'; subjectLink.title = subject;
      subjectLink.addEventListener('click', event => event.stopPropagation());
      const excerpt = node('span', 'nspp-notice-excerpt', preview ? (preview.available ? preview.snippet : '') : '正在加载回复…');
      excerpt.hidden = !!preview && !excerpt.textContent;
      if (!preview) { excerpt.classList.add('nspp-sweep-shine'); excerpt.setAttribute('aria-busy', 'true'); }
      text.append(heading, subjectLink, excerpt); row.append(text);
      if (unread(item)) { const dot = node('span', 'nspp-messages-unread'); dot.setAttribute('aria-label', '未读'); row.append(dot); }
      row.addEventListener('click', () => { void select(item); }); list.append(row);
      row.addEventListener('keydown', event => { if (event.target === row && ['Enter', ' '].includes(event.key)) { event.preventDefault(); void select(item); } });
      if (!preview && !root.classList.contains('has-detail')) { if (observer && !item.content?.trim()) observer.observe(row); else void hydrate(row, item); }
    }
    if (!list.childElementCount && !busy && loaded && !info.textContent) list.append(node('p', 'nspp-messages-list-status', query ? '没有匹配的通知' : category === 'atMe' ? '还没有提到你的通知' : '还没有收到主题回复'));
    observeMore();
  }
  async function load(next = false) {
    if (!current() || busy) return;
    const kind = category!; const requestSignal = signal(); const targetPage = next ? page + 1 : 1;
    busy = true; loaded = false; refresh.disabled = true; more.disabled = true;
    info.textContent = next ? '正在加载更多通知…' : notices.size ? '正在刷新通知…' : category === 'atMe' ? '正在加载提及通知…' : '正在加载主题回复…';
    info.classList.add('nspp-sweep-shine'); info.setAttribute('aria-busy', 'true');
    const control = next ? more : refresh; control.setAttribute('aria-busy', 'true'); render();
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
      loaded = true; info.textContent = '';
    } catch (error) { if (current() && !requestSignal.aborted) { autoPaused = true; info.textContent = error instanceof Error ? error.message : '通知读取失败'; } }
    finally { if (!requestSignal.aborted) { busy = false; info.classList.remove('nspp-sweep-shine'); info.removeAttribute('aria-busy'); control.removeAttribute('aria-busy'); refresh.disabled = false; more.disabled = false; render(); } }
  }
  async function select(item: Notice) {
    if (!category || !current()) return;
    const kind = category; selected = item.id; root.classList.add('has-detail'); back.hidden = false; render();
    previewController.abort(); previewController = new AbortController();
    const requestSignal = AbortSignal.any([signal(), previewController.signal]);
    title.textContent = routes[kind].label;
    original.href = noticeHref(item); original.hidden = false;
    const floor = noticeFloor(item);
    const summary = node('div', 'nspp-notice-summary');
    const postTitle = node('a', '', previews.get(item.id)?.title || item.post_title || item.title || `帖子 ${item.post_id}`); postTitle.href = original.href; postTitle.target = '_blank'; postTitle.rel = 'noopener noreferrer';
    const heading = node('h3'); heading.append(postTitle);
    const date = forumTime(item.created_at || '');
    summary.append(heading, node('p', '', `${item.commenter_name || '用户'} ${kind === 'atMe' ? '@了你' : '回复了你的主题'}${floor === null ? '' : ` · #${floor}`}${date ? ` · ${date.full}` : ''}`));
    content.replaceChildren(summary);
    const body = node('div', 'nspp-notice-body nspp-sweep-shine', '正在加载回复内容…'); body.setAttribute('aria-busy', 'true'); content.append(body);
    try {
      const preview = await getPreview(item);
      if (!current() || requestSignal.aborted) return;
      postTitle.textContent = preview.title;
      if (!preview.available) throw new Error('未找到对应回复，可能已删除或不可见，请打开原帖查看。');
      body.replaceChildren(preview.body.cloneNode(true));
      body.classList.remove('nspp-sweep-shine'); body.removeAttribute('aria-busy');
      if (unread(item) && !document.hidden) {
        await api(`/api/notification/${routes[kind].endpoint}/markViewed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [routes[kind].field]: [item.id] }), signal: requestSignal });
        if (!requestSignal.aborted) { item.viewed = true; notices.set(item.id, item); render(); onRead(); }
      }
    } catch (error) {
      if (!current() || requestSignal.aborted) return;
      const message = error instanceof Error ? error.message : '内容加载失败';
      if (body.getAttribute('aria-busy') === 'true') body.textContent = message;
      else body.append(node('p', 'nspp-notice-hint', '内容已加载，已读状态同步失败'));
    } finally { body.classList.remove('nspp-sweep-shine'); body.removeAttribute('aria-busy'); }
  }
  async function markAll() {
    if (!current()) return;
    const kind = category!; const requestSignal = signal();
    await api(`/api/notification/${routes[kind].endpoint}/markViewed?all=true`, { method: 'POST', signal: requestSignal });
    if (!requestSignal.aborted) { notices.forEach(item => { item.viewed = true; }); render(); onRead(); }
  }
  function show(kind?: Category) {
    if (category === kind && !root.hidden) return;
    controller.abort(); previewController.abort(); controller = new AbortController(); busy = false; loaded = false; autoPaused = false; moreObserver?.disconnect();
    info.classList.remove('nspp-sweep-shine'); [info, more, refresh].forEach(el => el.removeAttribute('aria-busy'));
    category = kind; root.hidden = !kind; header.hidden = !kind; back.hidden = true; root.classList.remove('has-detail'); selected = undefined;
    observer?.disconnect(); pages.clear(); previews.clear(); loading.clear();
    notices.clear(); page = 1; more.hidden = false; more.disabled = false; refresh.disabled = false;
    search.value = ''; info.textContent = ''; original.hidden = true; render(); empty();
    if (kind) { title.textContent = routes[kind].label; categoryAvatar.src = notificationAvatar(kind); void load(); }
  }
  search.addEventListener('input', render, { signal: ctx.signal });
  refresh.addEventListener('click', () => {
    if (busy) return;
    controller.abort(); previewController.abort(); controller = new AbortController();
    pages.clear(); previews.clear(); loading.clear(); autoPaused = false; void load();
  }, { signal: ctx.signal });
  more.addEventListener('click', () => { autoPaused = false; void load(true); }, { signal: ctx.signal });
  back.addEventListener('click', () => { previewController.abort(); root.classList.remove('has-detail'); back.hidden = true; original.hidden = true; render(); }, { signal: ctx.signal });
  return { element: root, heading: header, show, refresh: () => load(), markAll, stop: () => { controller.abort(); previewController.abort(); observer?.disconnect(); moreObserver?.disconnect(); pages.clear(); previews.clear(); loading.clear(); root.remove(); header.remove(); } };
}
