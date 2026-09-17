import type { Context, Feature } from '../core/types';
import { unsafeWindow } from '../lib/userscript';
import { toolIcon } from '../lib/tool-icon';
import { createNotificationInbox } from './notification-inbox';
import { notificationAvatar } from '../views/notification-avatar';
import { forumTime } from '../lib/forum-time';
import { createMessageArchive, mergeMessages, type Message, type Conversation } from './messages-storage';
import { renderMessageMarkdown } from '../views/message-markdown';
import { createMessageEditor } from '../views/message-editor';
import { findNotificationContainer } from '../views/message-container';
import { createChatProfile } from '../views/chat-profile';
import './messages.css';

// Protocol reference: nodyssey's MessageRepository / NodeSeekJsonClient.
type Result = { success?: boolean; message?: string; msgArray?: Message[]; data?: Message; talkTo?: { member_id: number; member_name: string } };
const endpoint = '/api/notification/message';
const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = '') => {
  const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
};
const button = (label: string, className = '') => { const node = element('button', className, label); node.type = 'button'; return node; };
const time = (value: string) => { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.getTime() : 0; };
const preview = (text: string) => text.replace(/!\[[^\]]*\]\([^)]+\)/g, '[图片]').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
const unread = (message: Message) => message.viewed === false || message.viewed === 0;

function mountChat(ctx: Context, account: number) {
  const lifetime = new AbortController();
  ctx = { ...ctx, signal: AbortSignal.any([ctx.signal, lifetime.signal]) };
  const root = element('section', 'nspp-messages'); root.hidden = true; root.setAttribute('aria-label', '消息中心');
  const top = element('header', 'nspp-messages-top');
  const navigation = element('nav', 'nspp-messages-fixed-contacts'); navigation.setAttribute('aria-label', '固定联系人');
  for (const [label, kind, description] of [['@我', 'atMe', '查看提到我的消息'], ['回复主题', 'reply', '查看主题回复']] as const) {
    const link = element('a', 'nspp-messages-peer'); link.href = `/notification#/${kind}`;
    link.dataset.category = kind;
    const avatar = element('img', 'nspp-messages-avatar'); avatar.src = notificationAvatar(kind); avatar.alt = '';
    const details = element('span', 'nspp-messages-peer-details'); details.append(element('strong', '', label), element('span', 'nspp-messages-snippet', description));
    link.append(avatar, details);
    const count = element('span', 'nspp-messages-count'); count.hidden = true; link.append(count); navigation.append(link);
  }
  const original = button('原版页面'); original.title = '本次返回站点原有通知页面';
  const markAll = button('全部已读'); markAll.title = '将当前分类全部标为已读';
  const topActions = element('div', 'nspp-messages-top-actions'); topActions.append(markAll, original);
  top.append(topActions);
  const workspace = element('div', 'nspp-messages-workspace');
  const sidebar = element('aside', 'nspp-messages-sidebar');
  const searchBar = element('div', 'nspp-messages-search');
  const search = element('input'); search.type = 'search'; search.placeholder = '搜索联系人或消息'; search.setAttribute('aria-label', search.placeholder);
  const refresh = button('', 'nspp-messages-refresh'); refresh.append(toolIcon('refresh')); refresh.title = '刷新会话'; refresh.setAttribute('aria-label', refresh.title);
  searchBar.append(search, refresh);
  const conversations = element('div', 'nspp-messages-conversations'); conversations.setAttribute('aria-label', '会话列表');
  const listStatus = element('p', 'nspp-messages-list-status'); listStatus.setAttribute('role', 'status');
  const more = button('加载更多会话', 'nspp-messages-more');
  const contactList = element('div', 'nspp-messages-contact-list'); contactList.append(navigation, conversations, more);
  sidebar.append(searchBar, contactList, listStatus);
  const chat = element('section', 'nspp-messages-chat');
  const userCard = createChatProfile(ctx);
  const avatarLink = (avatar: HTMLImageElement, id: number) => {
    const link = element('a', 'nspp-chat-avatar-link'); link.href = `/space/${id}`; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.append(avatar);
    link.addEventListener('click', event => event.stopPropagation()); return link;
  };
  const chatHeader = element('div', 'nspp-messages-heading');
  const back = button('返回', 'nspp-messages-back');
  const name = element('strong', '', '消息');
  const profile = element('a', 'nspp-messages-profile', '用户主页'); profile.target = '_blank'; profile.rel = 'noopener noreferrer'; profile.hidden = true;
  chatHeader.append(back, name, profile);
  top.prepend(chatHeader);
  const thread = element('div', 'nspp-messages-thread'); thread.setAttribute('role', 'log'); thread.setAttribute('aria-label', '聊天记录'); thread.tabIndex = 0;
  const empty = element('div', 'nspp-messages-empty', '选择左侧会话，开始聊天'); thread.append(empty);
  const status = element('p', 'nspp-messages-status'); status.setAttribute('role', 'status');
  const retrySync = button('重试', 'nspp-messages-sync-retry'); retrySync.hidden = true;
  const syncStatus = element('div', 'nspp-messages-sync-status'); syncStatus.append(status, retrySync);
  const composer = element('form', 'nspp-messages-composer'); composer.hidden = true;
  const input = element('textarea'); input.placeholder = '输入消息…'; input.setAttribute('aria-label', '消息内容'); input.rows = 3;
  const controls = element('div', 'nspp-messages-compose-actions');
  const markdownLabel = element('label'); const markdown = element('input'); markdown.type = 'checkbox'; markdown.checked = true; markdownLabel.append(markdown, ' Markdown');
  const hint = element('small', '', 'Enter 发送，Shift + Enter 换行');
  const send = element('button', 'nspp-messages-send', '发送'); send.type = 'submit'; send.disabled = true;
  send.title = hint.textContent!;
  input.setAttribute('aria-description', hint.textContent!);
  controls.append(markdownLabel, hint, send); composer.append(input, controls); chat.append(userCard.element, thread, syncStatus, composer);
  workspace.append(sidebar, chat); root.append(top, workspace);
  const nativeToolbar = element('div', 'nspp-message-native-toolbar');
  const returnToNew = button('切回新版聊天', 'nspp-message-return'); returnToNew.hidden = true; nativeToolbar.append(returnToNew);
  let nativeContainer: HTMLElement | undefined;
  function attachToNative() {
    if (!nativeContainer?.isConnected) {
      nativeContainer?.classList.remove('nspp-messages-container');
      nativeContainer?.removeAttribute('data-nspp-message-view');
      nativeContainer = findNotificationContainer();
    }
    if (!nativeContainer) return false;
    nativeContainer.classList.add('nspp-messages-container');
    if (root.parentElement !== nativeContainer) nativeContainer.append(root);
    if (nativeToolbar.parentElement !== nativeContainer) nativeContainer.prepend(nativeToolbar);
    return true;
  }

  const drafts = new Map<number, { text: string; markdown: boolean }>();
  const peers = new Map<number, Conversation>();
  const archive = createMessageArchive(account);
  const histories = new Map<number, Message[]>();
  const visibleHistory = new Map<number, number>();
  const sending = new Set<number>();
  const uncertain = new Set<number>();
  const deliveryStatus = new Map<number, string>();
  let active: number | undefined, page = 1, listBusy = false, listReady = false, suppressed = false;
  let category: 'atMe' | 'reply' | 'message' | undefined;
  let countsBusy = false;
  let listPageSignature = '';
  let threadKey = '', threadBusy = false;
  let routeController = new AbortController(), threadController = new AbortController();
  const owner = () => (unsafeWindow as Window & { __config__?: { user?: { member_id?: number } } }).__config__?.user?.member_id;
  const panelValid = () => !ctx.signal.aborted && !root.hidden && owner() === account;
  const valid = () => panelValid() && category === 'message';
  const signal = () => AbortSignal.any([ctx.signal, routeController.signal]);
  let autoPaused = false;
  const moreObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting) && panelValid() && listReady && !listBusy && !autoPaused && !more.hidden && !search.value.trim() && !document.hidden) void loadList(true);
  }, { root: contactList, rootMargin: '150px' }) : undefined;
  const observeMore = () => {
    moreObserver?.disconnect();
    if (panelValid() && listReady && !listBusy && !autoPaused && !more.hidden && !search.value.trim()) moreObserver?.observe(more);
  };
  const inbox = createNotificationInbox(ctx, () => { void refreshCounts(); }, () => navigate()); workspace.append(inbox.element);
  top.insertBefore(inbox.heading, topActions);
  const editor = createMessageEditor(ctx, input, markdown, {
    peer: () => active, original: () => original.click(), changed: () => updateSend(),
    insert: (peer, text) => {
      if (ctx.signal.aborted || owner() !== account) return;
      if (active === peer && valid()) {
        markdown.checked = true; input.setRangeText(text, input.selectionStart, input.selectionEnd, 'end'); input.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        const draft = drafts.get(peer); drafts.set(peer, { text: `${draft?.text || ''}${draft?.text ? '\n' : ''}${text}`, markdown: true });
      }
    },
  });
  composer.insertBefore(editor.element, controls);
  controls.prepend(editor.toolbar);
  async function refreshCounts() {
    if (!panelValid() || countsBusy) return;
    countsBusy = true;
    try {
      const result = await ctx.request<{ success?: boolean; unreadCount?: Record<string, number> }>('/api/notification/unread-count', { signal: ctx.signal });
      if (!panelValid() || !result.success || !result.unreadCount) return;
      navigation.querySelectorAll<HTMLAnchorElement>('a').forEach(link => {
        const value = result.unreadCount![link.dataset.category!]; const badge = link.querySelector<HTMLElement>('.nspp-messages-count')!;
        badge.hidden = !Number.isSafeInteger(value) || value <= 0; badge.textContent = badge.hidden ? '' : String(value);
      });
    } catch { /* Keep the last known counts while the site is unavailable. */ }
    finally { countsBusy = false; }
  }
  const saveDraft = () => { if (active) drafts.set(active, { text: input.value, markdown: markdown.checked }); };
  const updateSend = () => {
    const busy = !!active && sending.has(active);
    send.disabled = !active || busy || !input.value.trim() || uncertain.has(active) || editor.busy(active);
    send.textContent = busy ? '发送中…' : '发送';
    if (busy) send.setAttribute('aria-busy', 'true'); else send.removeAttribute('aria-busy');
    input.disabled = busy; markdown.disabled = busy;
    editor.setDisabled(busy);
  };
  const refocusComposer = (id: number) => {
    if (active !== id || !valid() || composer.hidden || input.disabled) return;
    queueMicrotask(() => {
      if (active !== id || !valid() || composer.hidden || input.disabled) return;
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
    });
  };
  async function api(path: string, options: RequestInit = {}) {
    const result = await ctx.request<Result>(`${endpoint}${path}`, { ...options, signal: options.signal || signal() });
    if (result?.success !== true) throw new Error(result?.message || '私信请求未成功，请重试');
    return result;
  }
  function rows(result: Result) {
    if (!Array.isArray(result.msgArray) || result.msgArray.some(row => !row || !Number.isSafeInteger(row.sender_id) || !Number.isSafeInteger(row.receiver_id) || typeof row.content !== 'string')) throw new Error('私信数据格式已变化，可返回原版页面');
    return result.msgArray;
  }
  function renderList() {
    const query = search.value.trim().toLocaleLowerCase(); conversations.replaceChildren();
    const items = [...peers.values()].sort((a, b) => Number(b.name === '系统通知') - Number(a.name === '系统通知') || time(b.latest.created_at) - time(a.latest.created_at));
    for (const peer of items) {
      if (query && !`${peer.name} ${peer.latest.content}`.toLocaleLowerCase().includes(query)) continue;
      const row = element('div', 'nspp-messages-peer'); row.tabIndex = 0; row.setAttribute('role', 'button'); row.dataset.id = String(peer.id); row.setAttribute('aria-pressed', String(peer.id === active));
      row.addEventListener('keydown', event => { if (event.target === row && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); navigate(peer.id); } });
      const avatar = element('img', 'nspp-messages-avatar'); avatar.src = peer.name === '系统通知' ? notificationAvatar('system') : `/avatar/${peer.id}.png`; avatar.alt = ''; avatar.loading = 'lazy';
      const details = element('span', 'nspp-messages-peer-details');
      const title = element('span', 'nspp-messages-peer-title'); title.append(element('strong', '', peer.name === '系统通知' ? '系统消息' : peer.name));
      const date = element('time'); date.dateTime = peer.latest.created_at;
      const formatted = forumTime(peer.latest.created_at); date.textContent = formatted?.text || ''; date.title = formatted?.full || '';
      title.append(date);
      const snippet = element('span', 'nspp-messages-snippet', `${peer.latest.sender_id === account ? '我：' : ''}${preview(peer.latest.content)}`);
      details.append(title, snippet); avatar.alt = peer.name; row.append(peer.name === '系统通知' ? avatar : avatarLink(avatar, peer.id), details);
      if (peer.unread) { const dot = element('span', 'nspp-messages-unread'); dot.setAttribute('aria-label', '有未读消息'); row.append(dot); }
      row.addEventListener('click', () => navigate(peer.id), { signal: ctx.signal }); conversations.append(row);
    }
    if (!conversations.childElementCount && listReady && !listBusy && !listStatus.textContent) conversations.append(element('p', 'nspp-messages-list-status', query ? '没有匹配的会话' : '还没有私信会话'));
    observeMore();
  }
  function restoreContacts(contacts: Conversation[]) {
    for (const peer of contacts) {
      const old = peers.get(peer.id);
      if (!old || time(peer.latest.created_at) >= time(old.latest.created_at)) peers.set(peer.id, peer);
    }
    if (peers.size) listReady = true;
    renderList();
  }
  void archive.contacts().then(contacts => {
    if (!ctx.signal.aborted && owner() === account) restoreContacts(contacts);
  }).catch(error => { if (!ctx.signal.aborted && !listBusy) listStatus.textContent = error instanceof Error ? error.message : '本地存档读取失败'; });
  async function loadList(next = false) {
    if (!panelValid() || listBusy) return;
    const requestSignal = signal(); listBusy = true; refresh.disabled = true; more.disabled = true;
    const targetPage = next ? page + 1 : 1; listStatus.textContent = next ? '正在加载更多会话…' : listReady ? '正在刷新会话…' : '正在加载私信会话…';
    listStatus.classList.add('nspp-sweep-shine'); listStatus.setAttribute('aria-busy', 'true'); renderList();
    try {
      const messages = rows(await api(`/list?page=${targetPage}`, { signal: requestSignal }));
      if (!panelValid() || requestSignal.aborted) return;
      for (const message of messages) {
        if (message.sender_id !== account && message.receiver_id !== account) continue;
        const id = message.sender_id === account ? message.receiver_id : message.sender_id;
        const old = peers.get(id);
        if (!old || time(message.created_at) >= time(old.latest.created_at)) peers.set(id, { id, name: (message.sender_id === account ? message.receiver_name : message.sender_name) || `用户 ${id}`, latest: message, unread: message.receiver_id === account && unread(message) });
      }
      listReady = true; if (next) page = targetPage;
      const signature = messages.map(row => row.max_id ?? row.id ?? `${row.sender_id}:${row.receiver_id}:${row.created_at}`).join('|');
      if (next || page === 1) { more.hidden = messages.length === 0 || (next && signature === listPageSignature); listPageSignature = signature; }
      listStatus.textContent = ''; renderList();
      try {
        const contacts = await archive.mergeList(messages);
        if (panelValid() && !requestSignal.aborted) restoreContacts(contacts);
      } catch (error) { if (panelValid() && !requestSignal.aborted) listStatus.textContent = error instanceof Error ? error.message : '本地存档保存失败'; }
    } catch (error) { if (panelValid() && !requestSignal.aborted) { autoPaused = true; listStatus.textContent = error instanceof Error ? error.message : '会话读取失败'; } }
    finally { if (!requestSignal.aborted) { listBusy = false; listStatus.classList.remove('nspp-sweep-shine'); listStatus.removeAttribute('aria-busy'); refresh.disabled = false; more.disabled = false; renderList(); } }
  }
  function renderThread(id: number, peerName: string, messages: Message[], first: boolean) {
    if (!valid() || active !== id) return;
    const system = peerName === '系统通知';
    name.textContent = peerName === '系统通知' ? '系统消息' : peerName; profile.href = `/space/${id}`; profile.hidden = false;
    void userCard.show(peerName === '系统通知' ? undefined : id, peerName);
    composer.hidden = peerName === '系统通知'; updateSend();
    const limit = visibleHistory.get(id) || 200;
    const visible = messages.slice(-limit);
    const key = JSON.stringify([system, limit, messages.length, visible.map(row => [row.id, row.max_id, row.local_id, row.content, row.created_at, row.is_markdown])]);
    if (key === threadKey && !first) return;
    const nearBottom = first || thread.scrollHeight - thread.scrollTop - thread.clientHeight < 100;
    const scrollTop = thread.scrollTop; thread.replaceChildren(); let previous = 0;
    if (messages.length > limit) {
      const earlier = button(`加载更早的本地记录（还有 ${messages.length - limit} 条）`, 'nspp-messages-earlier');
      earlier.addEventListener('click', () => {
        const oldHeight = thread.scrollHeight, oldTop = thread.scrollTop;
        visibleHistory.set(id, limit + 200); renderThread(id, peerName, histories.get(id) || messages, false);
        thread.scrollTop = oldTop + thread.scrollHeight - oldHeight;
      }); thread.append(earlier);
    }
    for (const message of visible) {
      const timestamp = time(message.created_at);
      if (!system && timestamp && (!previous || timestamp - previous > 5 * 60000)) {
        const stamp = element('time', 'nspp-messages-stamp', forumTime(message.created_at)?.full || ''); stamp.dateTime = message.created_at; thread.append(stamp);
      }
      previous = timestamp; const mine = message.sender_id === account;
      const row = element('div', `nspp-messages-message${mine ? ' is-mine' : system ? ' is-system' : ''}`);
      const avatar = element('img', 'nspp-messages-avatar'); avatar.src = !mine && peerName === '系统通知' ? notificationAvatar('system') : `/avatar/${message.sender_id}.png`; avatar.alt = mine ? '我' : peerName; avatar.loading = 'lazy';
      const bubble = element('div', 'nspp-messages-bubble');
      const isMarkdown = message.is_markdown !== false && message.is_markdown !== 0; bubble.classList.toggle('is-markdown', isMarkdown);
      bubble.append(renderMessageMarkdown(message.content, isMarkdown)); row.append(!mine && peerName === '系统通知' ? avatar : avatarLink(avatar, message.sender_id), bubble); thread.append(row);
      if (system && !mine) {
        const date = forumTime(message.created_at);
        if (date) { const stamp = element('time', 'nspp-messages-system-time', date.text); stamp.dateTime = message.created_at; stamp.title = date.full; row.append(stamp); }
      }
    }
    if (!messages.length) thread.append(element('div', 'nspp-messages-empty', '还没有聊天记录，发送第一条消息吧'));
    threadKey = key; thread.scrollTop = nearBottom ? thread.scrollHeight : scrollTop;
  }
  async function loadThread(first = false) {
    const id = active; if (!id || !valid() || (threadBusy && !first)) return;
    threadController.abort(); threadController = new AbortController();
    const requestSignal = AbortSignal.any([signal(), threadController.signal]); threadBusy = true;
    retrySync.disabled = true; retrySync.textContent = '重试中…';
    let peerName = peers.get(id)?.name || `用户 ${id}`;
    if (first) {
      const known = histories.get(id);
      if (known?.length) renderThread(id, peerName, known, true);
      else { const loading = element('div', 'nspp-messages-empty nspp-sweep-shine', '正在加载聊天记录…'); loading.setAttribute('aria-busy', 'true'); thread.replaceChildren(loading); }
      status.textContent = '';
    }
    try {
      try {
        const saved = await archive.messages(id);
        if (!valid() || requestSignal.aborted || active !== id) return;
        const combined = mergeMessages(saved, histories.get(id) || []); histories.set(id, combined);
        peerName = peers.get(id)?.name || peerName;
        if (combined.length) renderThread(id, peerName, combined, first);
      } catch { if (first && valid() && active === id) status.textContent = '本地存档暂不可用，正在读取服务器记录'; }
      const result = await api(`/with/${id}`, { signal: requestSignal });
      const incoming = rows(result).filter(row => (row.sender_id === id && row.receiver_id === account) || (row.sender_id === account && row.receiver_id === id));
      if (!valid() || requestSignal.aborted || active !== id) return;
      peerName = result.talkTo?.member_name || peers.get(id)?.name || `用户 ${id}`;
      let messages = mergeMessages(histories.get(id) || [], incoming);
      let saveError = '';
      try { messages = await archive.merge(id, peerName, messages); }
      catch (error) { saveError = error instanceof Error ? error.message : '本地存档保存失败'; }
      if (!valid() || requestSignal.aborted || active !== id) return;
      histories.set(id, messages); renderThread(id, peerName, messages, first && !threadKey);
      if (messages.length) {
        const latest = messages.at(-1)!;
        peers.set(id, { id, name: peerName, latest, unread: latest.receiver_id === account && unread(latest) }); renderList();
      }
      status.textContent = deliveryStatus.get(id) || saveError;
      retrySync.hidden = !saveError;
      const ids = incoming.filter(row => row.receiver_id === account && unread(row) && Number.isSafeInteger(row.id)).map(row => row.id!);
      if (ids.length && !document.hidden) {
        try {
          await api('/markViewed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: ids }), signal: requestSignal });
          if (!valid() || requestSignal.aborted) return;
          const peer = peers.get(id); if (peer) peer.unread = false;
          renderList(); void refreshCounts();
          try { histories.set(id, await archive.merge(id, peerName, [], ids)); }
          catch { if (active === id) { status.textContent = '已读状态已同步，本地存档保存失败'; retrySync.hidden = false; } }
        } catch { if (valid() && active === id && !requestSignal.aborted) { status.textContent = '消息已加载，已读状态同步失败'; retrySync.hidden = false; } }
      }
    } catch (error) {
      if (valid() && active === id && !requestSignal.aborted) {
        const cached = histories.get(id) || [];
        status.textContent = cached.length ? '同步失败，当前显示本地保存的聊天记录' : error instanceof Error ? error.message : '聊天记录读取失败';
        retrySync.hidden = false;
        if (first && !cached.length) {
          thread.replaceChildren(element('div', 'nspp-messages-empty', '聊天记录加载失败，请点击下方重试'));
        }
      }
    } finally { if (!requestSignal.aborted) { threadBusy = false; retrySync.disabled = false; retrySync.textContent = '重试'; } }
  }
  function navigate(id?: number) {
    history.pushState(null, '', `/notification#/message?mode=${id ? `talk&to=${id}` : 'list'}`); syncRoute();
  }
  function syncRoute() {
    const next = (location.hash.match(/^#\/(atMe|reply|message)(?:\?|$)/)?.[1] as typeof category) || (!location.hash || location.hash === '#/' ? 'atMe' : undefined);
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    returnToNew.hidden = params.get('native') !== '1';
    if (!next) suppressed = false;
    const attached = attachToNative();
    const show = attached && !!next && !suppressed && params.get('native') !== '1';
    const wasHidden = root.hidden;
    root.hidden = !show;
    if (nativeContainer) nativeContainer.dataset.nsppMessageView = show ? 'new' : 'native';
    nativeToolbar.hidden = show || !next;
    if (!show) { saveDraft(); routeController.abort(); threadController.abort(); threadBusy = false; listBusy = false; active = undefined; category = undefined; inbox.show(); return; }
    const changed = wasHidden || category !== next;
    if (changed) {
      saveDraft(); active = undefined; routeController.abort(); threadController.abort();
      routeController = new AbortController(); threadBusy = false; listBusy = false; category = next;
      root.classList.toggle('has-conversation', category !== 'message'); chat.hidden = category !== 'message'; chatHeader.hidden = category !== 'message'; void userCard.show();
      inbox.show(category === 'message' ? undefined : category);
      navigation.querySelectorAll<HTMLAnchorElement>('a').forEach(link => { if (link.dataset.category === category) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
      void refreshCounts();
      more.disabled = false; refresh.disabled = false; void loadList(); renderList();
    }
    if (category !== 'message') return;
    const idText = params.get('to') || '';
    const id = /^[1-9]\d*$/.test(idText) && Number.isSafeInteger(Number(idText)) ? Number(idText) : undefined;
    if (active === id && !changed) return;
    saveDraft(); active = id; threadController.abort(); threadBusy = false; threadKey = '';
    void userCard.show(id && peers.get(id)?.name !== '系统通知' ? id : undefined, id ? peers.get(id)?.name : '');
    retrySync.hidden = true; retrySync.disabled = false; retrySync.textContent = '重试';
    root.classList.toggle('has-conversation', !!id); profile.hidden = true; composer.hidden = true;
    const draft = id ? drafts.get(id) : undefined; input.value = draft?.text || ''; markdown.checked = draft?.markdown ?? true;
    editor.activate();
    name.textContent = id ? peers.get(id)?.name || '聊天' : '消息'; back.hidden = !id; status.textContent = id ? deliveryStatus.get(id) || '' : ''; updateSend(); renderList();
    if (id) void loadThread(true); else thread.replaceChildren(empty);
  }
  composer.addEventListener('submit', async event => {
    event.preventDefault(); const id = active, content = input.value.trim(), markdownEnabled = markdown.checked;
    if (!id || !content || !valid() || sending.has(id) || uncertain.has(id) || editor.busy(id)) return;
    saveDraft(); sending.add(id); updateSend(); status.textContent = '';
    try {
      const result = await ctx.request<Result>(`${endpoint}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiverUid: id, content, markdown: markdownEnabled }), signal: ctx.signal });
      if (owner() !== account || ctx.signal.aborted) return;
      if (result?.success === false) { deliveryStatus.set(id, result.message || '发送失败，请稍后重试'); return; }
      if (result?.success !== true) throw new Error('发送结果未确认');
      drafts.delete(id); deliveryStatus.delete(id);
      if (active === id) { input.value = ''; editor.activate(); }
      const acceptedId = Number.isSafeInteger(result.data?.id) ? result.data!.id : undefined;
      const latest: Message = { id: acceptedId, local_id: acceptedId === undefined ? crypto.randomUUID() : undefined,
        after_id: (histories.get(id) || []).reduce((last, row) => Math.max(last, row.id || row.max_id || 0), 0),
        sender_id: account, receiver_id: id, content, created_at: result.data?.created_at || new Date().toISOString(), viewed: true, is_markdown: markdownEnabled };
      const peerName = peers.get(id)?.name || (active === id ? name.textContent! : `用户 ${id}`);
      histories.set(id, mergeMessages(histories.get(id) || [], [latest]));
      peers.set(id, { id, name: peerName, latest, unread: false }); renderList();
      if (active === id && valid()) renderThread(id, peerName, histories.get(id)!, true);
      try { histories.set(id, await archive.merge(id, peerName, [latest])); }
      catch { deliveryStatus.set(id, '消息已发送，本地保存失败，请检查浏览器存储空间'); }
      if (active === id && valid()) await loadThread(true);
    } catch {
      if (!ctx.signal.aborted && owner() === account) { uncertain.add(id); deliveryStatus.set(id, '发送结果未确认，草稿已保留。请刷新聊天记录核对后，再编辑草稿发送，避免重复。'); }
    } finally {
      sending.delete(id);
      if (active === id && valid()) {
        if (deliveryStatus.has(id)) status.textContent = deliveryStatus.get(id)!;
        updateSend();
        refocusComposer(id);
      }
    }
  }, { signal: ctx.signal });
  input.addEventListener('input', () => { if (active) { uncertain.delete(active); deliveryStatus.delete(active); } saveDraft(); status.textContent = ''; updateSend(); }, { signal: ctx.signal });
  markdown.addEventListener('change', saveDraft, { signal: ctx.signal });
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    if (!event.repeat && !send.disabled) composer.requestSubmit();
  }, { signal: ctx.signal });
  search.addEventListener('input', renderList, { signal: ctx.signal });
  retrySync.addEventListener('click', () => { if (!retrySync.disabled) void loadThread(); }, { signal: ctx.signal });
  refresh.addEventListener('click', () => { autoPaused = false; void loadList(); if (active) void loadThread(); }, { signal: ctx.signal });
  more.addEventListener('click', () => { autoPaused = false; void loadList(true); }, { signal: ctx.signal });
  back.addEventListener('click', () => navigate(), { signal: ctx.signal });
  original.addEventListener('click', () => {
    suppressed = true; const params = new URLSearchParams(location.hash.split('?')[1] || ''); params.set('native', '1');
    location.hash = `#/${category || 'atMe'}?${params}`; syncRoute();
  }, { signal: ctx.signal });
  returnToNew.addEventListener('click', () => {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const id = Number(params.get('to'));
    const nativeHost = Array.from(nativeContainer?.querySelectorAll<HTMLElement>('.md-editor') || []).find(host => !root.contains(host));
    const cm = (nativeHost?.querySelector('.CodeMirror') as (HTMLElement & { CodeMirror?: { getValue(): string } }) | null)?.CodeMirror;
    const text = cm?.getValue() || nativeHost?.querySelector<HTMLTextAreaElement>('textarea')?.value || '';
    if (Number.isSafeInteger(id) && id > 0 && text) drafts.set(id, { text, markdown: true });
    params.delete('native'); suppressed = false;
    history.pushState(null, '', `/notification${location.hash.split('?')[0] || '#/message'}${params.size ? `?${params}` : ''}`); syncRoute();
  }, { signal: ctx.signal });
  markAll.addEventListener('click', async () => {
    if (!panelValid() || markAll.disabled) return;
    markAll.disabled = true; const kind = category; const requestSignal = signal();
    try {
      if (kind === 'message') {
        await api('/markViewed?all=true', { method: 'POST', signal: requestSignal });
        if (!requestSignal.aborted) {
          peers.forEach(peer => { peer.unread = false; }); renderList();
          await Promise.all([...peers.values()].map(async peer => { histories.set(peer.id, await archive.merge(peer.id, peer.name, [], 'all')); }));
        }
      } else await inbox.markAll();
      if (panelValid()) void refreshCounts();
    } catch (error) { if (panelValid() && !requestSignal.aborted) ctx.notify(error instanceof Error ? error.message : '标记已读失败'); }
    finally { markAll.disabled = false; }
  }, { signal: ctx.signal });
  const followLink = (event: MouseEvent) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>('a[href]'); if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== '/notification' || (url.hash && !/^#\/(atMe|reply|message)(?:\?|$)/.test(url.hash)) || suppressed || new URLSearchParams(location.hash.split('?')[1] || '').get('native') === '1') return;
    event.preventDefault(); event.stopImmediatePropagation(); history.pushState(null, '', url); syncRoute();
  };
  document.addEventListener('click', followLink, { capture: true, signal: ctx.signal });
  window.addEventListener('hashchange', syncRoute, { signal: ctx.signal });
  window.addEventListener('popstate', syncRoute, { signal: ctx.signal });
  const poll = () => {
    if (!panelValid() || document.hidden) return;
    void refreshCounts();
    if (category === 'message') { void loadList(); if (active && !sending.has(active)) void loadThread(); }
    else void inbox.refresh();
  };
  const timer = setInterval(poll, 30000); document.addEventListener('visibilitychange', poll, { signal: ctx.signal });
  const stopMount = ctx.watch(() => {
    const wasAttached = root.isConnected && root.parentElement === nativeContainer && nativeToolbar.parentElement === nativeContainer;
    if (!wasAttached && attachToNative()) syncRoute();
  });
  syncRoute();
  return () => {
    stopMount(); lifetime.abort(); clearInterval(timer); moreObserver?.disconnect(); routeController.abort(); threadController.abort(); inbox.stop(); archive.close();
    userCard.stop(); root.remove(); nativeToolbar.remove(); nativeContainer?.classList.remove('nspp-messages-container'); nativeContainer?.removeAttribute('data-nspp-message-view');
    drafts.clear(); histories.clear(); visibleHistory.clear();
  };
}

export const messagesFeature: Feature = {
  id: 'private-messages', title: '紧凑消息中心', description: '会话与消息按账号本地存档、去重合并；默认 Markdown 编辑器支持图片上传与预览，可切回原版。', group: '操作辅助', defaults: { enabled: true },
  mount(ctx) {
    if (location.pathname !== '/notification') return;
    let account: number | undefined, dispose: (() => void) | undefined;
    const stop = ctx.watch(() => {
      const uid = (unsafeWindow as Window & { __config__?: { user?: { member_id?: number } } }).__config__?.user?.member_id;
      if (uid === account) return;
      dispose?.(); dispose = undefined; account = uid;
      if (uid) dispose = mountChat(ctx, uid);
    });
    return () => { stop(); dispose?.(); };
  },
};
