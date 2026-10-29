import type { Context } from '../../core/types';
import { forumTime } from '../../lib/forum-time';
import { linksElsewhere, openImagePreview } from '../../views/image-preview';
import { createMessageEditor } from '../../views/message-editor';
import { readingContent } from '../../views/post-preview';
import { setShine } from '../../views/sweep-shine';
import { el, icon } from './icons';
import type { Floor, PostPage, PostTarget } from './parse';
import type { FloorAction, ThreadSource } from './source';
import { chatTime } from './time';

// WeChat shows a time separator when more than five minutes pass between messages.
const GAP = 5 * 60 * 1000;
const absolute = (path: string) => new URL(path, location.origin).href;

/** A plain text box for sites whose replies are not Markdown; same shape as the Markdown editor. */
function plainEditor(input: HTMLTextAreaElement) {
  const element = el('div', 'nspp-message-editor'); const body = el('div', 'nspp-message-editor-body');
  body.append(input); element.append(body);
  return { element, toolbar: el('div'), activate() {}, busy: () => false, setDisabled(disabled: boolean) { input.disabled = disabled; } };
}

/** WeChat-style conversation pane: the source loads pages and sends replies for its site. */
export function createChat(ctx: Context, source: ThreadSource, onOpen: (id: number) => void) {
  const me = source.me;
  const root = el('section', 'nspp-wecom-chat'); root.setAttribute('aria-label', '帖子会话');
  // Plain divs: the forum styles every <header>/<footer> element.
  const head = el('div', 'nspp-wecom-chat-head');
  const heading = el('div', 'nspp-wecom-chat-title');
  const title = el('a'); title.target = '_blank'; title.rel = 'noopener noreferrer';
  // WeChat shows a group's member count after its name; here it is the reply count.
  const count = el('span', 'nspp-wecom-chat-count');
  heading.append(title, count);
  const actions = el('div', 'nspp-wecom-chat-actions');
  const moreButton = el('button', 'nspp-wecom-more-button'); moreButton.type = 'button';
  moreButton.title = '更多'; moreButton.setAttribute('aria-label', '更多'); moreButton.setAttribute('aria-haspopup', 'menu'); moreButton.setAttribute('aria-expanded', 'false');
  moreButton.append(icon('dots', 20, 1.8));
  const menu = el('div', 'nspp-wecom-menu'); menu.setAttribute('role', 'menu'); menu.hidden = true;
  const menuItem = (label: string) => { const item = el('button', '', label); item.type = 'button'; item.setAttribute('role', 'menuitem'); menu.append(item); return item; };
  const latest = menuItem('跳到最新回复');
  const refresh = menuItem('刷新');
  const openOriginal = menuItem('在新标签页打开原帖');
  actions.append(moreButton, menu);
  head.append(heading, actions);
  const body = el('div', 'nspp-wecom-chat-body'); body.tabIndex = -1;
  const older = el('button', 'nspp-wecom-more', '查看更早的回复'); older.type = 'button';
  const stream = el('div', 'nspp-wecom-stream'); stream.setAttribute('role', 'log');
  const status = el('p', 'nspp-wecom-status'); status.setAttribute('role', 'status');
  const newer = el('button', 'nspp-wecom-more', '加载更多回复'); newer.type = 'button';
  body.append(older, stream, status, newer);

  const foot = el('div', 'nspp-wecom-composer');
  const tools = el('div', 'nspp-wecom-composer-tools');
  const input = el('textarea'); input.setAttribute('aria-label', '回复内容');
  input.placeholder = me == null ? '登录后可回复' : '';
  input.disabled = me == null;
  const bar = el('div', 'nspp-wecom-composer-bar');
  const sendStatus = el('span', 'nspp-wecom-send-status'); sendStatus.setAttribute('role', 'status');
  const idleHint = me == null ? '' : 'Ctrl / ⌘ + Enter 发送';
  const send = el('button', 'nspp-wecom-send', '发送'); send.type = 'button'; send.title = 'Ctrl / ⌘ + Enter 发送'; send.disabled = true;
  bar.append(sendStatus, send);
  // The private-message editor, keyed by post: Markdown toolbar, image upload (also paste and drag), preview and undo.
  const markdown = el('input'); markdown.type = 'checkbox'; markdown.checked = true;
  const editor = source.markdown ? createMessageEditor(ctx, input, markdown, {
    peer: () => current?.id,
    insert: (id, text) => {
      if (current?.id === id) { input.setRangeText(text, input.selectionStart, input.selectionEnd, 'end'); input.dispatchEvent(new Event('input', { bubbles: true })); }
      else drafts.set(id, `${drafts.get(id) || ''}${drafts.get(id) ? '\n' : ''}${text}`);
    },
    changed: () => syncSend(),
    original: () => { if (current) window.open(absolute(source.href(current.id, current.pages)), '_blank', 'noopener,noreferrer'); },
  }) : plainEditor(input);
  editor.setDisabled(me == null);
  tools.append(editor.toolbar);
  foot.append(tools, editor.element, bar);

  const empty = el('div', 'nspp-wecom-empty');
  empty.append(icon('fish', 96, 1.1), el('p', '', '选择左侧帖子开始阅读'));
  // Right-click menu on a message, offering what the forum's comment menu under each floor offers.
  const floorMenu = el('div', 'nspp-wecom-context'); floorMenu.setAttribute('role', 'menu'); floorMenu.setAttribute('aria-label', '楼层操作'); floorMenu.hidden = true;
  root.append(empty, head, body, foot, floorMenu);

  let current: { id: number; title: string; pages: number; replies: number; loaded: Map<number, PostPage>; floor: number | null } | null = null;
  let loading: AbortController | undefined;
  let closeImage: (() => void) | undefined;
  let sending = false;
  // The floor picked with 回复, while its mention is still in the box: sites that thread replies get told.
  let replyTo: { id: number; floor: Floor; text: string } | null = null;
  const drafts = new Map<number, string>();

  // Visitors read only: the input box needs an account, so it is left out.
  const showEmpty = (on: boolean) => {
    root.toggleAttribute('data-empty', on);
    empty.hidden = !on; head.hidden = body.hidden = on; foot.hidden = on || me == null;
  };
  showEmpty(true);
  const setStatus = (text: string, busy = false) => { status.textContent = text; status.hidden = !text; setShine(status, busy); };
  const setSendStatus = (text: string, busy = false) => { sendStatus.textContent = text || idleHint; sendStatus.toggleAttribute('data-idle', !text); setShine(sendStatus, busy); };
  const setMenu = (open: boolean) => { menu.hidden = !open; moreButton.setAttribute('aria-expanded', String(open)); };
  const syncSend = () => { send.disabled = sending || !current || me == null || !input.value.trim() || editor.busy(current.id); };
  const floorHref = (page: number, floor: Floor) => absolute(source.href(current!.id, page, floor.floor));
  // As WeChat Work does: the empty box names the conversation it sends to.
  const setPlaceholder = () => { if (me != null && current) input.placeholder = `发送给 ${current.title}`; };
  setStatus('');

  const range = () => {
    const pages = current ? [...current.loaded.keys()] : [];
    return { min: pages.length ? Math.min(...pages) : 0, max: pages.length ? Math.max(...pages) : 0 };
  };

  const fillReactions = (foot: HTMLElement, floor: Floor, data: PostPage) => {
    foot.replaceChildren(...source.chips(floor, data).filter(({ count, on }) => count > 0 || on).map(({ title: label, count: total, on, icon: glyph }) => {
      const chip = el('span', 'nspp-wecom-reaction'); chip.title = on ? `已${label}` : label;
      chip.toggleAttribute('data-on', on);
      chip.append(glyph ? glyph() : label, String(total));
      return chip;
    }));
    foot.hidden = !foot.childElementCount;
  };

  const message = (floor: Floor, page: number) => {
    const base = absolute(source.href(current!.id, page));
    const item = el('article', 'nspp-wecom-msg');
    item.dataset.floor = String(floor.floor);
    item.dataset.page = String(page);
    item.toggleAttribute('data-op', floor.op);
    item.toggleAttribute('data-mine', source.mine(floor));
    // Profiles open beside the pane, so the conversation stays where it is.
    const avatar = el('a', 'nspp-wecom-avatar'); avatar.href = floor.profile || '#'; avatar.title = floor.author;
    if (floor.profile) { avatar.target = '_blank'; avatar.rel = 'noopener noreferrer'; }
    if (floor.avatar) { const img = el('img'); img.src = floor.avatar; img.alt = floor.author; img.loading = 'lazy'; avatar.append(img); }
    else avatar.append(el('span', 'nspp-wecom-letter', floor.author.slice(0, 1).toUpperCase()));
    const main = el('div', 'nspp-wecom-msg-main');
    const info = el('div', 'nspp-wecom-msg-meta');
    const name = el('a', 'nspp-wecom-name', floor.author); name.href = floor.profile || '#';
    if (floor.profile) { name.target = '_blank'; name.rel = 'noopener noreferrer'; }
    info.append(name);
    if (floor.poster) info.append(el('span', 'nspp-wecom-tag nspp-wecom-tag-op', '楼主'));
    if (source.author?.(floor)) {
      item.setAttribute('data-author', '');
      const author = el('button', 'nspp-wecom-tag nspp-wecom-tag-author', '插件作者'); author.type = 'button'; author.title = 'NodeSeek++ 作者，也在摸鱼';
      info.append(author);
    }
    floor.roles.forEach(role => info.append(el('span', 'nspp-wecom-tag', role)));
    if (floor.hot) info.append(el('span', 'nspp-wecom-tag nspp-wecom-tag-hot', '热评'));
    const floorLink = el('a', 'nspp-wecom-floor', floor.label ?? `#${floor.floor}`);
    floorLink.href = floorHref(page, floor); floorLink.target = '_blank'; floorLink.rel = 'noopener noreferrer'; floorLink.title = '在原帖中查看这一楼';
    info.append(floorLink);
    // Reactions sit under the bubble, like WeChat's quoted line, so the nickname line stays clean.
    const foot = el('div', 'nspp-wecom-msg-foot');
    fillReactions(foot, floor, current!.loaded.get(page)!);
    const bubble = el('div', 'nspp-wecom-bubble');
    const time = forumTime(floor.time);
    bubble.title = [time?.full || floor.timeTitle, floor.edited].filter(Boolean).join('\n');
    if (floor.content) bubble.append(readingContent(floor.content, base));
    else bubble.append(el('p', 'nspp-wecom-muted', '（内容不可见）'));
    main.append(info, bubble, foot);
    item.append(avatar, main);
    return item;
  };

  const render = () => {
    if (!current) return;
    const fragment = document.createDocumentFragment();
    let previous: number | null = null;
    for (const page of [...current.loaded.keys()].sort((a, b) => a - b)) {
      const data = current.loaded.get(page)!;
      if (data.replies != null) current.replies = Math.max(current.replies, data.replies);
      for (const floor of data.floors) {
        if (data.replies == null) current.replies = Math.max(current.replies, floor.floor);
        const date = new Date(floor.time);
        const at = date.getTime();
        if (!Number.isNaN(at) && (previous == null || at - previous > GAP)) {
          const divider = el('div', 'nspp-wecom-divider'); divider.append(el('span', '', chatTime(date))); fragment.append(divider);
        }
        if (!Number.isNaN(at)) previous = at;
        fragment.append(message(floor, page));
      }
    }
    closeFloorMenu();
    stream.replaceChildren(fragment);
    const { min, max } = range();
    older.hidden = min <= 1;
    newer.hidden = max >= current.pages;
    title.textContent = current.title; setPlaceholder();
    count.textContent = current.replies ? `(${current.replies})` : '';
    const first = current.loaded.get(min);
    heading.title = [current.title, [first?.category?.name, `${current.pages} 页`, first?.views ? `${first.views} 浏览` : '', min === max ? `已加载第 ${min} 页` : `已加载第 ${min}–${max} 页`].filter(Boolean).join(' · ')].join('\n');
  };

  async function load(page: number, mode: 'replace' | 'append' | 'prepend') {
    if (!current) return;
    loading?.abort();
    const controller = new AbortController(); loading = controller;
    const topic = current;
    older.disabled = newer.disabled = refresh.disabled = latest.disabled = true;
    setStatus(mode === 'replace' ? '正在加载…' : `正在加载第 ${page} 页…`, true);
    try {
      const signal = AbortSignal.any([ctx.signal, controller.signal]);
      // A link to a floor without a page: the source finds the page first.
      if (!page) page = topic.floor != null && source.locate ? await source.locate({ id: topic.id, page: 0, floor: topic.floor }, signal) : 1;
      if (controller.signal.aborted || current !== topic) return;
      const data = await source.load(topic.id, page, signal);
      if (controller.signal.aborted || current !== topic) return;
      if (mode === 'replace') topic.loaded.clear();
      topic.loaded.set(page, data);
      topic.pages = Math.max(data.pages, ...[...topic.loaded.values()].map(p => p.pages));
      if (data.title) topic.title = data.title;
      const anchor = mode === 'prepend' ? body.scrollHeight - body.scrollTop : 0;
      render();
      setStatus('');
      if (mode === 'prepend') body.scrollTop = body.scrollHeight - anchor;
      else if (mode === 'replace') {
        const target = topic.floor == null ? null : stream.querySelector<HTMLElement>(`[data-floor="${topic.floor}"]`);
        if (target) { target.scrollIntoView({ block: 'center' }); target.setAttribute('data-flash', ''); setTimeout(() => target.removeAttribute('data-flash'), 1600); }
        else body.scrollTop = 0;
      }
    } catch {
      if (controller.signal.aborted || current !== topic) return;
      setStatus('暂时无法读取帖子，请稍后重试，或在原帖页面完成登录与站点验证。');
    } finally {
      if (loading === controller) { loading = undefined; older.disabled = newer.disabled = refresh.disabled = latest.disabled = false; }
    }
  }

  /** Loads the last page; if the thread grew meanwhile (e.g. after sending), follows it to the new last page. */
  async function jumpToLatest() {
    if (!current) return;
    const topic = current;
    topic.floor = null;
    const page = topic.pages;
    await load(page, 'replace');
    if (current === topic && topic.pages > page) await load(topic.pages, 'replace');
    if (current === topic) body.scrollTop = body.scrollHeight;
  }

  async function submit() {
    syncSend();
    if (send.disabled || !current) return;
    const topic = current;
    const text = input.value;
    const to = replyTo?.id === topic.id && text.includes(replyTo.text) ? replyTo.floor : null;
    sending = true; syncSend(); editor.setDisabled(true); setSendStatus(source.sending, true);
    let result: string;
    try { result = await source.reply(topic.id, text, to); } catch (error) { result = error instanceof Error ? error.message : '发送失败，请稍后重试'; }
    sending = false; editor.setDisabled(false);
    if (ctx.signal.aborted) return;
    if (!result) {
      drafts.delete(topic.id); replyTo = null;
      source.replied?.(topic.id);
      if (current === topic) { input.value = ''; setSendStatus('已发送'); void jumpToLatest(); }
    } else setSendStatus(result);
    syncSend();
  }

  const menuActions = new WeakMap<Element, () => void>();
  let menuToken = 0, menuX = 0, menuY = 0;
  const closeFloorMenu = () => { menuToken++; if (!floorMenu.hidden) { floorMenu.hidden = true; floorMenu.replaceChildren(); } };
  const placeFloorMenu = () => {
    const { width, height } = floorMenu.getBoundingClientRect();
    floorMenu.style.left = `${Math.max(8, Math.min(menuX, innerWidth - width - 8))}px`;
    floorMenu.style.top = `${Math.max(8, menuY + height > innerHeight - 8 ? menuY - height : menuY)}px`;
  };
  const menuButton = (label: string, run: () => void, detail = '') => {
    const button = el('button', '', label); button.type = 'button'; button.setAttribute('role', 'menuitem');
    if (detail) button.append(el('small', '', detail));
    menuActions.set(button, run); floorMenu.append(button);
    return button;
  };
  const menuSeparator = () => { const line = el('div'); line.setAttribute('role', 'separator'); floorMenu.append(line); };
  /** Writes into the input box the way the forum's editor does, then leaves the caret at the end. */
  const insertDraft = (value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus(); input.setSelectionRange(value.length, value.length); input.scrollTop = input.scrollHeight;
  };
  const refreshReactions = (floor: Floor, data: PostPage) => {
    if (current?.loaded.get(data.page) !== data) return;
    const foot = stream.querySelector<HTMLElement>(`.nspp-wecom-msg[data-floor="${floor.floor}"] .nspp-wecom-msg-foot`);
    if (foot) fillReactions(foot, floor, data);
  };
  async function act(action: FloorAction, floor: Floor, data: PostPage) {
    try { await action.run(); refreshReactions(floor, data); }
    catch (error) { ctx.notify(error instanceof Error && error.message ? error.message : `${action.label}未成功`); }
  }
  /** Actions that cost something turn the menu into the site's own question before anything is sent. */
  async function confirmAction(action: FloorAction, floor: Floor, data: PostPage) {
    const token = ++menuToken;
    const pending = action.confirm!();
    let prompt: string;
    if (typeof pending === 'string') prompt = pending;
    else {
      floorMenu.replaceChildren(el('p', '', '正在查询…')); placeFloorMenu();
      prompt = await pending;
      if (token !== menuToken) return;
    }
    floorMenu.replaceChildren(el('p', '', prompt));
    const row = el('div', 'nspp-wecom-context-confirm');
    const cancel = el('button', '', '取消'); cancel.type = 'button'; menuActions.set(cancel, closeFloorMenu);
    const ok = el('button', '', '确定'); ok.type = 'button'; ok.dataset.primary = '';
    menuActions.set(ok, () => { closeFloorMenu(); void act(action, floor, data); });
    row.append(cancel, ok); floorMenu.append(row); placeFloorMenu(); cancel.focus();
  }
  function quote(item: HTMLElement, floor: Floor, page: number) {
    const bubble = item.querySelector<HTMLElement>('.nspp-wecom-bubble');
    const text = bubble?.innerText || bubble?.textContent?.trim() || '';
    let value = input.value;
    if (value && !value.endsWith('\n\n')) value += value.endsWith('\n') ? '\n' : '\n\n';
    insertDraft(value + source.quote(floor, floorHref(page, floor), text, current!.id));
  }
  function openFloorMenu(item: HTMLElement, x: number, y: number, selected: string) {
    const data = current?.loaded.get(Number(item.dataset.page));
    const floor = data?.floors.find(each => each.floor === Number(item.dataset.floor));
    if (!data || !floor) return;
    closeFloorMenu(); setMenu(false);
    const page = data.page;
    const actions = source.actions(floor, data);
    for (const action of actions) {
      menuButton(action.label, () => { if (action.confirm) void confirmAction(action, floor, data); else { closeFloorMenu(); void act(action, floor, data); } }, action.detail).disabled = !!action.disabled;
    }
    if (actions.length) menuSeparator();
    if (me != null && !input.disabled) {
      menuButton('引用', () => { closeFloorMenu(); quote(item, floor, page); });
      if (source.canReply(floor)) menuButton('回复', () => {
        closeFloorMenu();
        const text = source.mention(floor, floorHref(page, floor));
        replyTo = { id: current!.id, floor, text };
        insertDraft(input.value.endsWith(text) ? input.value : input.value + text);
      });
    }
    menuButton(selected ? '复制选中内容' : '复制', () => {
      closeFloorMenu();
      const text = selected || source.source?.(floor) || item.querySelector<HTMLElement>('.nspp-wecom-bubble')?.innerText || '';
      (navigator.clipboard?.writeText(text) ?? Promise.reject()).catch(() => ctx.notify('复制失败，请手动选择文字复制'));
    });
    menuButton('在原帖中查看', () => { closeFloorMenu(); window.open(floorHref(page, floor), '_blank', 'noopener,noreferrer'); });
    menuX = x; menuY = y;
    floorMenu.hidden = false; placeFloorMenu();
    floorMenu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
  }

  const sentinel = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting) || loading || !current || newer.hidden) return;
    void load(range().max + 1, 'append');
  }, { root: body, rootMargin: '0px 0px 240px 0px' }) : undefined;
  sentinel?.observe(newer);

  older.addEventListener('click', () => { if (current) void load(range().min - 1, 'prepend'); }, { signal: ctx.signal });
  newer.addEventListener('click', () => { if (current) void load(range().max + 1, 'append'); }, { signal: ctx.signal });
  refresh.addEventListener('click', () => { setMenu(false); if (current) { current.floor = null; void load(range().min || 1, 'replace'); } }, { signal: ctx.signal });
  latest.addEventListener('click', () => { setMenu(false); void jumpToLatest(); }, { signal: ctx.signal });
  openOriginal.addEventListener('click', () => { setMenu(false); if (current) window.open(absolute(source.href(current.id, range().min || 1)), '_blank', 'noopener,noreferrer'); }, { signal: ctx.signal });
  moreButton.addEventListener('click', () => setMenu(!!menu.hidden), { signal: ctx.signal });
  document.addEventListener('click', event => { if (!menu.hidden && !actions.contains(event.target as Node)) setMenu(false); }, { capture: true, signal: ctx.signal });
  root.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { setMenu(false); moreButton.focus(); } }, { signal: ctx.signal });
  input.addEventListener('input', () => { if (current) drafts.set(current.id, input.value); syncSend(); }, { signal: ctx.signal });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.isComposing) { event.preventDefault(); void submit(); }
  }, { signal: ctx.signal });
  send.addEventListener('click', () => { void submit(); }, { signal: ctx.signal });

  /** The easter egg: a school of fish swims across the pane once, then leaves. */
  const swim = () => {
    if (root.querySelector('.nspp-wecom-school')) return;
    const school = el('div', 'nspp-wecom-school'); school.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 7; i++) {
      const fish = el('span', '', i % 3 ? '🐟' : '🐠');
      fish.style.setProperty('--i', String(i));
      fish.style.setProperty('--top', `${8 + Math.random() * 74}%`);
      fish.style.setProperty('--size', `${18 + Math.round(Math.random() * 14)}px`);
      school.append(fish);
    }
    root.append(school);
    setTimeout(() => school.remove(), 4200);
  };

  // Links to other posts stay in the pane; images open the viewer; everything else keeps opening in a new tab.
  stream.addEventListener('click', event => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = event.target as Element;
    if (target.closest('.nspp-wecom-tag-author')) { swim(); return; }
    const image = target.closest('img');
    const photo = (img: HTMLImageElement) => !linksElsewhere(img) && !img.hasAttribute('data-emoji') && !source.sticker?.(img);
    if (image instanceof HTMLImageElement && image.closest('.nspp-wecom-bubble') && photo(image)) {
      event.preventDefault();
      if (closeImage) return;
      const gallery = Array.from(stream.querySelectorAll<HTMLImageElement>('.nspp-wecom-bubble img')).filter(img => img === image || photo(img));
      closeImage = openImagePreview(gallery, image, () => { closeImage = undefined; });
      return;
    }
    const link = target.closest<HTMLAnchorElement>('.nspp-wecom-bubble a[href]');
    const next = link ? source.target(link.href) : null;
    if (next) { event.preventDefault(); api.open(next); }
  }, { signal: ctx.signal });
  stream.addEventListener('keydown', event => {
    if (!(event.target instanceof HTMLImageElement) || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault(); event.target.click();
  }, { signal: ctx.signal });
  // Links and images keep the browser's own menu (open, copy address, save); Shift+right-click does too.
  stream.addEventListener('contextmenu', event => {
    const target = event.target as Element;
    const item = target.closest<HTMLElement>('.nspp-wecom-msg');
    if (!item || event.shiftKey || target.closest('.nspp-wecom-bubble :is(a[href], img)')) return;
    event.preventDefault();
    const selection = getSelection();
    const selected = selection && !selection.isCollapsed && item.contains(selection.anchorNode) ? selection.toString().trim() : '';
    openFloorMenu(item, event.clientX, event.clientY, selected);
  }, { signal: ctx.signal });
  floorMenu.addEventListener('click', event => {
    const button = (event.target as Element).closest('button');
    if (button && !button.disabled) menuActions.get(button)?.();
  }, { signal: ctx.signal });
  floorMenu.addEventListener('keydown', event => {
    const items = [...floorMenu.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: items.length - 1 }[event.key];
    if (next != null && items.length) { event.preventDefault(); items[(next + items.length) % items.length].focus(); }
    else if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); closeFloorMenu(); body.focus({ preventScroll: true }); }
  }, { signal: ctx.signal });
  document.addEventListener('pointerdown', event => { if (!floorMenu.hidden && !floorMenu.contains(event.target as Node)) closeFloorMenu(); }, { capture: true, signal: ctx.signal });
  body.addEventListener('scroll', closeFloorMenu, { passive: true, signal: ctx.signal });
  for (const type of ['blur', 'resize']) window.addEventListener(type, closeFloorMenu, { signal: ctx.signal });

  const api = {
    root,
    open(target: PostTarget, titleHint = '', replies = 0) {
      if (current?.id === target.id && current.loaded.has(target.page) && target.floor != null) {
        const node = stream.querySelector<HTMLElement>(`[data-floor="${target.floor}"]`);
        if (node) { node.scrollIntoView({ block: 'center' }); return; }
      }
      current = { id: target.id, title: titleHint || `帖子 #${target.id}`, pages: Math.max(1, target.page), replies, loaded: new Map(), floor: target.floor };
      setMenu(false); closeFloorMenu(); setPlaceholder();
      showEmpty(false);
      stream.replaceChildren(); older.hidden = newer.hidden = true;
      // Links work before the page loads, so a failed request still leaves a way to the original post.
      title.textContent = current.title; title.href = absolute(source.href(target.id)); title.title = '在新标签页打开原帖';
      count.textContent = replies ? `(${replies})` : ''; heading.title = current.title;
      input.value = drafts.get(target.id) || '';
      editor.activate();
      if (!sending) setSendStatus('');
      syncSend();
      onOpen(target.id);
      void load(target.page, 'replace');
      body.focus({ preventScroll: true });
    },
    destroy() { loading?.abort(); closeImage?.(); sentinel?.disconnect(); source.destroy?.(); root.remove(); },
  };
  return api;
}
