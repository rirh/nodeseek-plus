import type { Feature } from '../../core/types';
import { SITE } from '../../lib/site';
import { unsafeWindow } from '../../lib/userscript';
import { rankings, requestRanking, type Post, type Ranking } from '../hot-rankings';
import { MESSAGE_ROUTE_EVENT, mountChat, type MessageHost } from '../messages';
import { createChat } from './chat';
import { el, icon } from './icons';
import { postTarget } from './parse';
import { remoteMoyu } from './remote';
import { nodeseekThread } from './sites/nodeseek';
import { listTime } from './time';
import { conversationRow, createResizer, createToolMenu, fishIcon, hoverFlyout, railItem } from './ui';
import './wecom.css';

const LIST = '#nsk-body-left ul.post-list:not(.topic-carousel-panel)';
const ROWS = `${LIST} > .post-list-item`;
const ACTIVE = 'data-nspp-wecom-active';
const FILTERED = 'data-nspp-wecom-filtered';
const TIME = 'data-nspp-wecom-time';
// Pages whose post list 摸鱼模式 can swap in place: home, its pages and sections.
const LIST_PATH = /^\/(?:page-\d+\/?|categories\/[^/]+(?:\/page-\d+)?\/?)?$/;
// NodeSeek's sections, offered as the column 摸鱼模式 opens with; a section the current site lacks falls back to the home list.
const SECTIONS = [['daily', '日常'], ['tech', '技术'], ['info', '情报'], ['review', '测评'], ['trade', '交易'], ['carpool', '拼车'], ['promotion', '推广'], ['life', '生活'], ['dev', 'Dev'], ['photo-share', '贴图'], ['expose', '曝光'], ['inside', '内版'], ['sandbox', '沙盒'], ['meaningless', '无意义']] as const;

const nodeseekMoyu: Feature = {
  id: 'moyu-mode', title: '摸鱼模式', group: '外观',
  description: '默认保持论坛原样式。桌面端（宽度 ≥ 1000px）的首页和版块列表在工具栏多一个小鱼按钮，点击切换为微信聊天式三栏：左侧导航（消息、帖子、版块、热榜，鼠标停在版块上即展开版块列表，底部菜单收纳 NodeSeek++ 工具）、可拖拽调宽的帖子列表、气泡式阅读区；消息在原位打开消息中心。再点一次小鱼恢复原样式。底部输入框直接调用论坛的评论接口发送回复。从首页进入时默认打开的栏目可选：首页帖子、热榜或某个版块。',
  defaults: { enabled: true, defaultView: 'home' },
  fields: {
    defaultView: { label: '进入摸鱼模式时默认打开', type: 'select', options: [
      { label: '首页帖子（默认）', value: 'home' },
      { label: '热榜', value: 'hot' },
      ...SECTIONS.map(([slug, name]) => ({ label: `版块：${name}`, value: `categories/${slug}` })),
    ] },
  },
  mount(ctx) {
    // List pages only: post pages keep the native layout so the forum's own editor and reactions stay intact.
    if (location.pathname.startsWith('/post-') || !document.querySelector(LIST)) return;
    const desktop = matchMedia('(min-width: 1000px)');
    // Off until the user switches it on; the choice is remembered across list pages.
    let moyu = ctx.get<boolean>('moyu') === true;
    let activeId: number | null = null;
    // The middle column shows posts, hot rankings or (with the right pane) the message center.
    let view: 'posts' | 'hot' | 'messages' = 'posts';
    const isOn = () => desktop.matches && moyu;
    const tools = document.getElementById('nspp-tools');

    const rail = el('nav', 'nspp-wecom-rail'); rail.setAttribute('aria-label', '摸鱼模式导航');
    // The page config is authoritative; the sidebar card's image may still be a loading placeholder.
    const user = (unsafeWindow as Window & { __config__?: { user?: { member_id?: number; member_name?: string } | null } }).__config__?.user;
    const me = el('a', 'nspp-wecom-me');
    me.href = user?.member_id ? `/space/${user.member_id}` : '/signIn.html';
    me.dataset.tip = user?.member_name || (user?.member_id ? '个人主页' : '登录'); me.setAttribute('aria-label', me.dataset.tip);
    if (user?.member_id) {
      // Fall back to the sidebar card's image, then to an icon, so the rail never shows a broken image.
      const img = el('img'); img.alt = '';
      const card = document.querySelector<HTMLImageElement>('.user-card .user-head img')?.getAttribute('src');
      img.addEventListener('error', () => { if (card && img.getAttribute('src') !== card) img.src = card; else img.replaceWith(icon('user')); }, { signal: ctx.signal });
      img.src = `/avatar/${user.member_id}.png`; me.append(img);
    } else me.append(icon('user'));
    // The message center and posting need an account; visitors get neither.
    const chats = railItem('消息', 'messages', '/notification'); chats.hidden = !user?.member_id;
    const badge = el('b', 'nspp-wecom-badge'); badge.hidden = true; chats.append(badge);
    const posts = railItem('帖子', 'posts', '/');
    const sections = railItem('版块', 'sections');
    sections.setAttribute('aria-expanded', 'false');
    // Ranking data carries NodeSeek post IDs, so 热榜 only appears there.
    const hot = railItem('热榜', 'hot'); hot.hidden = location.hostname !== 'www.nodeseek.com';
    const theme = railItem('主题', 'moon');
    const more = railItem('更多', 'menu');
    more.setAttribute('aria-haspopup', 'menu'); more.setAttribute('aria-expanded', 'false');
    const moreDot = el('b', 'nspp-wecom-dot'); moreDot.hidden = true; more.append(moreDot);
    const top = el('div', 'nspp-wecom-rail-top'); top.append(me, chats, posts, sections, hot);
    const bottom = el('div', 'nspp-wecom-rail-bottom'); bottom.append(theme, more);
    rail.append(top, bottom);

    const tool = createToolMenu(ctx, tools, more);
    const { menu } = tool, setMenu = tool.set;

    const flyout = el('nav', 'nspp-wecom-categories'); flyout.hidden = true; flyout.setAttribute('aria-label', '版块');
    flyout.append(el('h2', '', '所有版块'));
    const categoryList = el('ul');
    const seen = new Set<string>();
    document.querySelectorAll<HTMLAnchorElement>('.category-list a[href^="/categories/"]').forEach(source => {
      const href = source.getAttribute('href')!;
      if (seen.has(href)) return;
      seen.add(href);
      const li = el('li'); const link = source.cloneNode(true) as HTMLAnchorElement;
      link.removeAttribute('id');
      li.append(link); categoryList.append(li);
    });
    const syncSections = () => categoryList.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href') || '';
      link.toggleAttribute('aria-current', location.pathname === href || location.pathname.startsWith(`${href}/`));
      if (link.hasAttribute('aria-current')) link.setAttribute('aria-current', 'page');
    });
    flyout.append(categoryList);
    const setFlyout = (open: boolean) => { flyout.hidden = !open; sections.setAttribute('aria-expanded', String(open)); };

    const listHead = el('div', 'nspp-wecom-listhead');
    const search = el('input'); search.type = 'search'; search.placeholder = '搜索'; search.setAttribute('aria-label', '按标题、作者或版块筛选已加载的帖子');
    const compose = el('a', 'nspp-wecom-compose'); compose.href = '/new-discussion'; compose.title = '发帖'; compose.setAttribute('aria-label', '发帖'); compose.append(icon('compose', 20)); compose.hidden = !user?.member_id;
    // The forum's 新评论 / 新帖子 tabs collapse into one switch beside the search box; clicks go to the native tabs.
    const sort = el('button', 'nspp-wecom-sort'); sort.type = 'button'; sort.hidden = true;
    const sortLinks = () => Array.from(document.querySelectorAll<HTMLElement>('#nsk-body-left .sorter a'));
    const syncSort = () => {
      const label = sortLinks().find(link => link.classList.contains('selected'))?.textContent?.trim() || '';
      sort.hidden = sortLinks().length < 2 || !label;
      if (sort.dataset.label === label) return;
      sort.dataset.label = label;
      sort.replaceChildren(icon('sort', 13), label);
      sort.title = `按${label}排序，点击切换`; sort.setAttribute('aria-label', sort.title);
    };
    sort.addEventListener('click', () => {
      // The forum sorts with ?sortBy=…; load that list in place instead of letting the page reload.
      const other = sortLinks().find(link => !link.classList.contains('selected'))?.dataset.sort;
      if (!other) return;
      const url = new URL(location.href);
      url.pathname = url.pathname.replace(/\/?page-\d+\/?$/, '') || '/';
      url.searchParams.set('sortBy', other);
      void navigate(url.href, true);
    }, { signal: ctx.signal });
    listHead.append(search, sort, compose);

    const { resizer, apply: applyWidth, clear: clearWidth } = createResizer(ctx);

    const markActive = () => {
      document.querySelectorAll<HTMLElement>(ROWS).forEach(row => {
        const href = row.querySelector<HTMLAnchorElement>('.post-title a')?.href;
        row.toggleAttribute(ACTIVE, activeId != null && !!href && postTarget(href, location.origin)?.id === activeId);
      });
      hotList.querySelectorAll<HTMLElement>('[data-id]').forEach(row => row.toggleAttribute(ACTIVE, Number(row.dataset.id) === activeId));
    };

    // 热榜 in the middle column: tabs on top, rows like the post list; a row opens the post in the chat pane.
    const hotPanel = el('section', 'nspp-wecom-hot'); hotPanel.hidden = true; hotPanel.setAttribute('aria-label', '热榜');
    const hotHead = el('div', 'nspp-wecom-hot-head');
    const tabs = el('div', 'nspp-wecom-tabs'); tabs.setAttribute('role', 'tablist');
    let ranking: Ranking = 'hot';
    const tabButtons = (Object.keys(rankings) as Ranking[]).map(kind => {
      const tab = el('button', '', rankings[kind].replace('实时热榜', '实时')); tab.type = 'button'; tab.setAttribute('role', 'tab'); tab.dataset.kind = kind;
      tab.addEventListener('click', () => { ranking = kind; void loadHot(); }, { signal: ctx.signal });
      tabs.append(tab); return tab;
    });
    const hotRefresh = el('button', 'nspp-wecom-hot-refresh'); hotRefresh.type = 'button'; hotRefresh.setAttribute('aria-label', '刷新热榜'); hotRefresh.dataset.tip = '刷新';
    hotRefresh.append(icon('refresh', 16));
    hotHead.append(tabs, hotRefresh);
    const hotStatus = el('p', 'nspp-wecom-hot-status'); hotStatus.setAttribute('role', 'status');
    const hotList = el('ol', 'nspp-wecom-hot-list');
    hotPanel.append(hotHead, hotList, hotStatus);
    const hotCache = new Map<Ranking, { posts: Post[]; updated: number; fetched: number }>();
    let hotRequest: AbortController | undefined;
    const renderHot = () => {
      tabButtons.forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.kind === ranking)));
      const snapshot = hotCache.get(ranking);
      hotList.replaceChildren(...(snapshot?.posts || []).map((post, index) => conversationRow(ctx, {
        id: post.id, title: post.title, author: post.author, avatar: post.authorId ? `/avatar/${post.authorId}.png` : '',
        meta: [post.author, `${post.views} 浏览`].filter(Boolean).join(' · '), time: post.posted ? new Date(post.posted) : null, count: post.comments, floor: null,
      }, () => chat.open({ id: post.id, page: 1, floor: null }, post.title, post.comments), index + 1)));
      markActive();
    };
    async function loadHot(force = false) {
      renderHot();
      const cached = hotCache.get(ranking);
      if (!force && cached && Date.now() - cached.fetched < 5 * 60 * 1000) { hotStatus.textContent = cached.updated ? `更新于 ${listTime(new Date(cached.updated))}` : ''; return; }
      hotRequest?.abort(); const controller = new AbortController(); hotRequest = controller;
      const kind = ranking;
      hotStatus.textContent = '正在加载热榜…';
      try {
        const snapshot = await requestRanking(kind, AbortSignal.any([ctx.signal, controller.signal]));
        hotCache.set(kind, snapshot);
        if (ranking === kind) { renderHot(); hotStatus.textContent = snapshot.updated ? `更新于 ${listTime(new Date(snapshot.updated))}` : ''; }
      } catch { if (!controller.signal.aborted && ranking === kind) hotStatus.textContent = '热榜暂时无法加载，点右上角刷新重试'; }
    }
    hotRefresh.addEventListener('click', () => { void loadHot(true); }, { signal: ctx.signal });

    // Swaps the post list for another sort, section or page in place, keeping the same <ul> so other modules follow along.
    let swapping: AbortController | undefined;
    async function navigate(href: string, push: boolean) {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin || !LIST_PATH.test(url.pathname)) { location.assign(url.href); return; }
      swapping?.abort(); const controller = new AbortController(); swapping = controller;
      const column = document.querySelector<HTMLElement>('#nsk-body-left');
      column?.setAttribute('aria-busy', 'true');
      try {
        const html = await ctx.request<string>(url.href, { responseType: 'text', signal: AbortSignal.any([ctx.signal, controller.signal]) });
        if (controller.signal.aborted) return;
        const page = new DOMParser().parseFromString(html, 'text/html');
        const source = page.querySelector(LIST), list = document.querySelector(LIST);
        if (!source || !list) throw new Error('列表不可用');
        source.querySelectorAll('script, iframe, object, embed, base, link, style').forEach(node => node.remove());
        source.querySelectorAll('*').forEach(node => { for (const attr of Array.from(node.attributes)) if (/^on/i.test(attr.name)) node.removeAttribute(attr.name); });
        list.replaceChildren(...Array.from(source.children, child => document.importNode(child, true)));
        const pagers = page.querySelectorAll('#nsk-body-left .nsk-pager');
        document.querySelectorAll('#nsk-body-left .nsk-pager').forEach((pager, index) => { if (pagers[index]) pager.replaceWith(document.importNode(pagers[index], true)); });
        const selected = page.querySelector<HTMLElement>('.sorter a.selected')?.dataset.sort;
        if (selected) sortLinks().forEach(link => link.classList.toggle('selected', link.dataset.sort === selected));
        if (push) history.pushState(null, '', url.href); else if (location.href !== url.href) history.replaceState(null, '', url.href);
        if (page.title) document.title = page.title;
        if (column) column.scrollTop = 0;
        syncCurrent(); syncSort(); stamp(); filter(); markActive();
        document.dispatchEvent(new Event('nspp:list-replaced'));
      } catch {
        // Fall back to an ordinary page load (for example when the forum asks for a check).
        if (!controller.signal.aborted && !ctx.signal.aborted) location.assign(url.href);
      } finally {
        if (swapping === controller) column?.removeAttribute('aria-busy');
      }
    }
    const chat = createChat(ctx, nodeseekThread(ctx), id => { activeId = id; markActive(); });
    const stamp = () => document.querySelectorAll<HTMLElement>(`${ROWS} .info-last-comment-time`).forEach(link => {
      const date = new Date(link.querySelector('time')?.getAttribute('datetime') || '');
      if (Number.isNaN(date.getTime())) return;
      const label = listTime(date);
      if (link.getAttribute(TIME) !== label) link.setAttribute(TIME, label);
    });

    const filter = () => {
      const query = search.value.trim().toLowerCase();
      document.querySelectorAll<HTMLElement>(ROWS).forEach(row => {
        row.toggleAttribute(FILTERED, !!query && !(row.textContent || '').toLowerCase().includes(query));
      });
    };
    search.addEventListener('input', filter, { signal: ctx.signal });

    const toggle = el('button', 'nspp-tool-icon'); toggle.type = 'button'; toggle.dataset.nsppWecomLauncher = '';
    toggle.append(fishIcon());
    (tools || document.body).prepend(toggle);

    // The message center mounts into this host on first use; its route lives in memory so the URL stays on the list page.
    const messages = el('div', 'nspp-wecom-messages'); messages.hidden = true;
    const host: MessageHost = { container: messages, hash: '#/atMe', visible: () => isOn() && view === 'messages' };
    let stopMessages: (() => void) | undefined;
    const showView = (next: typeof view) => {
      view = next;
      if (view === 'messages' && !stopMessages && user?.member_id) stopMessages = mountChat(ctx, user.member_id, host);
      apply();
    };
    const syncCurrent = () => {
      const section = location.pathname.startsWith('/categories/');
      posts.toggleAttribute('aria-current', view === 'posts' && !section);
      sections.toggleAttribute('aria-current', view === 'posts' && section);
      hot.toggleAttribute('aria-current', view === 'hot');
      chats.toggleAttribute('aria-current', view === 'messages');
      for (const node of [posts, sections, hot, chats]) if (node.hasAttribute('aria-current')) node.setAttribute('aria-current', 'page');
      syncSections();
    };

    const syncTheme = () => {
      const dark = document.body.classList.contains('dark-layout');
      theme.replaceChildren(icon(dark ? 'sun' : 'moon'));
      theme.dataset.tip = dark ? '切换到浅色' : '切换到深色'; theme.setAttribute('aria-label', theme.dataset.tip);
    };
    const apply = () => {
      const on = isOn();
      document.documentElement.toggleAttribute('data-nspp-wecom', on);
      if (on) document.documentElement.dataset.nsppWecomView = view; else delete document.documentElement.dataset.nsppWecomView;
      rail.hidden = resizer.hidden = !on;
      listHead.hidden = !on || view !== 'posts';
      hotPanel.hidden = !on || view !== 'hot';
      chat.root.hidden = !on || view === 'messages';
      messages.hidden = !on || view !== 'messages';
      if (on && view === 'hot') void loadHot();
      messages.dispatchEvent(new Event(MESSAGE_ROUTE_EVENT));
      syncCurrent();
      if (on) { stamp(); applyWidth(); } else { setFlyout(false); setMenu(false); clearWidth(); }
      toggle.hidden = !desktop.matches;
      toggle.title = on ? '退出摸鱼模式' : '摸鱼模式';
      toggle.setAttribute('aria-label', toggle.title); toggle.setAttribute('aria-pressed', String(on));
      syncTheme();
    };
    // The column chosen in settings opens only when 摸鱼模式 starts on the plain home page; a section, page or sort the user picked wins.
    const openDefault = () => {
      if (!isOn() || location.pathname !== '/' || location.search) return;
      const choice = String(ctx.get('defaultView') || 'home');
      if (choice === 'hot') { if (!hot.hidden) showView('hot'); return; }
      const section = Array.from(categoryList.querySelectorAll('a'), link => link.getAttribute('href')).find(href => href === `/${choice}`);
      if (section) void navigate(section, false);
    };
    document.body.append(rail, menu, flyout, listHead, hotPanel, resizer, chat.root, messages);
    apply();
    openDefault();

    desktop.addEventListener('change', apply, { signal: ctx.signal });
    toggle.addEventListener('click', () => { moyu = !moyu; ctx.set('moyu', moyu); apply(); if (moyu) openDefault(); }, { signal: ctx.signal });
    hoverFlyout(ctx, sections, flyout, open => { if (open) setMenu(false); setFlyout(open); });
    more.addEventListener('click', () => { setFlyout(false); setMenu(!!menu.hidden); }, { signal: ctx.signal });
    hot.addEventListener('click', () => { setFlyout(false); setMenu(false); showView('hot'); }, { signal: ctx.signal });
    // In 摸鱼模式 消息 and 帖子 switch columns in place instead of leaving the page.
    const plain = (event: MouseEvent) => isOn() && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
    chats.addEventListener('click', event => {
      if (!plain(event as MouseEvent) || !user?.member_id) return;
      event.preventDefault(); setFlyout(false); setMenu(false); showView('messages');
    }, { signal: ctx.signal });
    posts.addEventListener('click', event => {
      if (!plain(event as MouseEvent)) return;
      event.preventDefault(); setFlyout(false); setMenu(false);
      if (view !== 'posts') showView('posts');
      else if (location.pathname !== '/') void navigate('/', true);
    }, { signal: ctx.signal });
    // Sections, pages and back/forward stay inside the list too, so the forum's own page never flashes in between.
    categoryList.addEventListener('click', event => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
      if (!link || !plain(event)) return;
      event.preventDefault(); setFlyout(false);
      if (view !== 'posts') showView('posts');
      void navigate(link.href, true);
    }, { signal: ctx.signal });
    document.querySelector('#nsk-body-left')?.addEventListener('click', event => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('.nsk-pager a[href]');
      if (!link || !plain(event as MouseEvent)) return;
      event.preventDefault(); void navigate(link.href, true);
    }, { signal: ctx.signal });
    window.addEventListener('popstate', () => {
      if (isOn() && LIST_PATH.test(location.pathname)) void navigate(location.href, false);
    }, { signal: ctx.signal });
    theme.addEventListener('click', () => {
      document.querySelector<HTMLElement>('#nsk-head .color-theme-switcher, .color-theme-switcher')?.click();
      setTimeout(syncTheme, 50);
    }, { signal: ctx.signal });
    document.addEventListener('click', event => {
      const target = event.target as Node;
      if (!flyout.hidden && !flyout.contains(target) && !sections.contains(target)) setFlyout(false);
      if (!menu.hidden && !menu.contains(target) && !more.contains(target)) setMenu(false);
    }, { capture: true, signal: ctx.signal });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (!flyout.hidden) { setFlyout(false); sections.focus(); }
      if (!menu.hidden) { setMenu(false); more.focus(); }
    }, { signal: ctx.signal });

    // A plain click anywhere on a row opens it in the conversation pane; author links and modified clicks stay native.
    document.querySelector('#nsk-body-left')?.addEventListener('click', event => {
      const mouse = event as MouseEvent;
      if (!isOn() || mouse.button !== 0 || mouse.ctrlKey || mouse.metaKey || mouse.shiftKey || mouse.altKey) return;
      const target = event.target as Element;
      const row = target.closest<HTMLElement>('.post-list-item');
      if (!row || row.classList.contains('topic-carousel-item') || !row.closest(LIST)) return;
      if (target.closest('.info-author a, .info-last-commenter a, .post-category, .nspp-list-actions, button, input, select, textarea')) return;
      const titleLink = row.querySelector<HTMLAnchorElement>('.post-title a');
      const link = target.closest<HTMLAnchorElement>('a.info-last-comment-time') || titleLink;
      const next = link ? postTarget(link.href, location.origin) : null;
      if (!next) return;
      event.preventDefault();
      chat.open(next, titleLink?.textContent?.trim() || '', Number(row.querySelector('.info-comments-count')?.textContent?.trim()) || 0);
    }, { signal: ctx.signal });

    const stop = ctx.watch(() => {
      const count = Number(document.querySelector('.user-card .notify-count')?.textContent?.trim()) || 0;
      const label = count > 99 ? '99+' : String(count);
      if (badge.textContent !== label) badge.textContent = label;
      badge.hidden = count <= 0;
      moreDot.hidden = !tool.flagged();
      if (activeId != null) markActive();
      if (search.value.trim()) filter();
      if (isOn()) stamp();
      syncSort();
    });

    return () => {
      stop();
      chat.destroy();
      stopMessages?.(); messages.remove();
      hotRequest?.abort(); swapping?.abort(); hotPanel.remove();
      delete document.documentElement.dataset.nsppWecomView;
      clearWidth();
      rail.remove(); menu.remove(); flyout.remove(); listHead.remove(); resizer.remove(); toggle.remove();
      document.documentElement.removeAttribute('data-nspp-wecom');
      document.querySelectorAll(`[${ACTIVE}], [${FILTERED}], [${TIME}]`).forEach(node => { node.removeAttribute(ACTIVE); node.removeAttribute(FILTERED); node.removeAttribute(TIME); });
    };
  },
};

export const moyuMode: Feature = SITE === 'nodeseek' ? nodeseekMoyu : remoteMoyu(SITE);
