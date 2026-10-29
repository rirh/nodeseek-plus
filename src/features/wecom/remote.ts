// 摸鱼模式 on linux.do and V2EX: the same columns as on NodeSeek, built from the site's data instead of its native list.
import type { Context, Feature } from '../../core/types';
import type { SiteKind } from '../../lib/site';
import { setShine } from '../../views/sweep-shine';
import { createChat } from './chat';
import { el, icon } from './icons';
import { linuxdoSite } from './sites/linuxdo';
import { V2EX_TABS } from './sites/v2ex-parse';
import { v2exSite } from './sites/v2ex';
import type { Row, Section, SiteSource } from './source';
import { listTime } from './time';
import { conversationRow, createResizer, createToolMenu, fishIcon, railItem } from './ui';

const ACTIVE = 'data-nspp-wecom-active';
const FILTERED = 'data-nspp-wecom-filtered';
// V2EX only updates its unread count on page loads; the open layout asks every few minutes instead.
const POLL = 3 * 60 * 1000;

const VIEWS = {
  linuxdo: [['/new', '新话题'], ['/unread', '未读'], ['/top?period=daily', '日榜']],
  v2ex: V2EX_TABS.map(tab => [tab.path, tab.name]),
} as const;

export function remoteMoyu(kind: Exclude<SiteKind, 'nodeseek'>): Feature {
  const name = kind === 'linuxdo' ? 'linux.do' : 'V2EX';
  return {
    id: 'moyu-mode', title: '摸鱼模式', group: '外观',
    description: `默认保持 ${name} 原样式。桌面端（宽度 ≥ 1000px）的列表和帖子页在工具栏多一个小鱼按钮，点击切换为聊天式三栏：左侧导航（通知、帖子、${kind === 'linuxdo' ? '分类' : '节点'}、热榜，底部菜单收纳 NodeSeek++ 工具）、可拖拽调宽的帖子列表、气泡式阅读区。底部输入框直接回复，右键消息可${kind === 'linuxdo' ? '点赞' : '感谢'}、引用和回复。再点一次小鱼恢复原样式。`,
    defaults: { enabled: true, defaultView: 'home' },
    fields: {
      defaultView: { label: '进入摸鱼模式时默认打开', type: 'select', options: [
        { label: kind === 'linuxdo' ? '最新话题（默认）' : '最近主题（默认）', value: 'home' },
        { label: '热榜', value: 'hot' },
        { label: '通知', value: 'notices' },
        ...VIEWS[kind].map(([value, label]) => ({ label: `${kind === 'linuxdo' ? '列表' : '标签'}：${label}`, value })),
      ] },
    },
    mount: ctx => mountRemote(ctx, kind === 'linuxdo' ? linuxdoSite(ctx) : v2exSite(ctx), kind),
  };
}

type View = 'posts' | 'hot' | 'notices';

function mountRemote(ctx: Context, site: SiteSource, kind: string) {
  const desktop = matchMedia('(min-width: 1000px)');
  const here = () => site.route(new URL(location.href));
  // A page the layout does not cover (the editor, settings) keeps the site's own look, even after the single-page
  // site moves on from it, until the fish is clicked there.
  let native = !here();
  let moyu = ctx.get<boolean>('moyu') === true;
  let view: View = 'posts';
  let activeId: number | null = null;
  const isOn = () => desktop.matches && moyu && !native;
  const tools = document.getElementById('nspp-tools');
  const root = document.documentElement;

  // Rail
  const rail = el('nav', 'nspp-wecom-rail'); rail.setAttribute('aria-label', '摸鱼模式导航');
  const person = site.user();
  // Profile and sign-in open beside the layout, which covers the site's own pages.
  const me = el('a', 'nspp-wecom-me'); me.href = person?.profile || site.signIn; me.target = '_blank'; me.rel = 'noopener';
  me.dataset.tip = person?.name || '登录'; me.setAttribute('aria-label', me.dataset.tip);
  if (person?.avatar) {
    const img = el('img'); img.alt = ''; img.src = person.avatar;
    img.addEventListener('error', () => img.replaceWith(icon('user')), { once: true, signal: ctx.signal });
    me.append(img);
  } else me.append(icon('user'));
  // Modules that need an account (通知, 发帖, the input box) are left out for visitors.
  const notices = railItem('通知', 'messages'); notices.hidden = !person;
  const badge = el('b', 'nspp-wecom-badge'); badge.hidden = true; notices.append(badge);
  const posts = railItem('帖子', 'posts');
  const sectionsButton = railItem(kind === 'linuxdo' ? '分类' : '节点', 'sections');
  sectionsButton.setAttribute('aria-expanded', 'false');
  const hot = railItem('热榜', 'hot');
  const theme = railItem('主题', 'moon');
  const more = railItem('更多', 'menu');
  more.setAttribute('aria-haspopup', 'menu'); more.setAttribute('aria-expanded', 'false');
  const moreDot = el('b', 'nspp-wecom-dot'); moreDot.hidden = true; more.append(moreDot);
  const top = el('div', 'nspp-wecom-rail-top'); top.append(me, notices, posts, sectionsButton, hot);
  const bottom = el('div', 'nspp-wecom-rail-bottom'); bottom.append(theme, more);
  rail.append(top, bottom);
  const tool = createToolMenu(ctx, tools, more);

  // Sections flyout, filled on first open.
  const flyout = el('nav', 'nspp-wecom-categories'); flyout.hidden = true; flyout.setAttribute('aria-label', sectionsButton.dataset.tip!);
  const sectionList = el('ul');
  flyout.append(el('h2', '', kind === 'linuxdo' ? '所有分类' : '标签'), sectionList);
  let sectionsLoaded: Promise<void> | undefined;
  const fillSections = (sections: Section[]) => sectionList.replaceChildren(...sections.map(section => {
    const li = el('li'); const link = el('a'); link.href = section.path; link.dataset.path = section.path;
    if (section.depth) link.dataset.depth = String(section.depth);
    const dot = el('i', 'nspp-wecom-section-dot'); if (section.color) dot.style.background = section.color;
    link.append(dot, section.name); li.append(link); return li;
  }));
  const setFlyout = (open: boolean) => {
    flyout.hidden = !open; sectionsButton.setAttribute('aria-expanded', String(open));
    if (open && !sectionsLoaded) sectionsLoaded = site.sections(ctx.signal).then(sections => { fillSections(sections); syncCurrent(); }).catch(() => { sectionsLoaded = undefined; sectionList.replaceChildren(el('li', 'nspp-wecom-muted', '暂时无法读取，请稍后重试')); });
  };

  // List column: search, sort and compose above the rows.
  const listHead = el('div', 'nspp-wecom-listhead');
  const search = el('input'); search.type = 'search'; search.placeholder = '搜索'; search.setAttribute('aria-label', '按标题、作者或分类筛选已加载的帖子');
  const sort = el('button', 'nspp-wecom-sort'); sort.type = 'button'; sort.hidden = true;
  const compose = el('a', 'nspp-wecom-compose'); compose.href = site.compose; compose.target = '_blank'; compose.rel = 'noopener';
  compose.title = '发帖'; compose.setAttribute('aria-label', '发帖'); compose.append(icon('compose', 20)); compose.hidden = !person;
  listHead.append(search, sort, compose);
  const feed = el('section', 'nspp-wecom-feed'); feed.setAttribute('aria-label', '帖子列表');
  const feedList = el('ol', 'nspp-wecom-hot-list');
  const feedStatus = el('p', 'nspp-wecom-hot-status'); feedStatus.setAttribute('role', 'status');
  const feedMore = el('button', 'nspp-wecom-more', '加载更多'); feedMore.type = 'button'; feedMore.hidden = true;
  feed.append(feedList, feedStatus, feedMore);

  // 热榜 and 通知 take the middle column the same way.
  const panel = (label: string, className: string) => {
    const section = el('section', `nspp-wecom-hot ${className}`); section.hidden = true; section.setAttribute('aria-label', label);
    const head = el('div', 'nspp-wecom-hot-head');
    const refresh = el('button', 'nspp-wecom-hot-refresh'); refresh.type = 'button'; refresh.setAttribute('aria-label', `刷新${label}`); refresh.title = '刷新';
    refresh.append(icon('refresh', 16));
    const list = el('ol', 'nspp-wecom-hot-list');
    const status = el('p', 'nspp-wecom-hot-status'); status.setAttribute('role', 'status');
    section.append(head, list, status);
    return { section, head, refresh, list, status };
  };
  const hotPanel = panel('热榜', 'nspp-wecom-ranking');
  const tabs = el('div', 'nspp-wecom-tabs'); tabs.setAttribute('role', 'tablist');
  let hotPath = site.hot[0]?.path || '';
  const tabButtons = site.hot.map(entry => {
    const tab = el('button', '', entry.label); tab.type = 'button'; tab.setAttribute('role', 'tab'); tab.dataset.path = entry.path;
    tab.addEventListener('click', () => { hotPath = entry.path; void loadHot(); }, { signal: ctx.signal });
    tabs.append(tab); return tab;
  });
  hotPanel.head.append(tabs, hotPanel.refresh);
  const noticePanel = panel('通知', 'nspp-wecom-notices');
  noticePanel.head.append(el('strong', 'nspp-wecom-panel-title', '通知'), noticePanel.refresh);

  const { resizer, apply: applyWidth, clear: clearWidth } = createResizer(ctx);
  const chat = createChat(ctx, site.thread, id => { activeId = id; markActive(); });

  const markActive = () => {
    for (const list of [feedList, hotPanel.list, noticePanel.list]) list.querySelectorAll<HTMLElement>(':scope > li').forEach(row => row.toggleAttribute(ACTIVE, Number(row.dataset.id) === activeId));
  };
  const openRow = (row: Row, event: MouseEvent) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey) { window.open(site.thread.href(row.id, row.page || 1, row.floor), '_blank', 'noopener'); return; }
    chat.open({ id: row.id, page: row.page ?? (row.floor ? 0 : 1), floor: row.floor }, row.title, row.count || 0);
  };

  // The current list: its path, loaded rows and the next page, loaded in place without touching the site's own page.
  let listPath = site.home;
  let next: string | null = null;
  let listing: AbortController | undefined;
  const seen = new Set<number>();
  const filter = () => {
    const query = search.value.trim().toLowerCase();
    feedList.querySelectorAll<HTMLElement>(':scope > li').forEach(row => row.toggleAttribute(FILTERED, !!query && !(row.textContent || '').toLowerCase().includes(query)));
  };
  /** Loads a list page; resolves false when the site did not answer with one. */
  async function loadList(path: string, append = false): Promise<boolean> {
    listing?.abort(); const controller = new AbortController(); listing = controller;
    const signal = AbortSignal.any([ctx.signal, controller.signal]);
    if (!append) { listPath = path; next = null; seen.clear(); feedList.replaceChildren(); feed.scrollTop = 0; syncSort(); syncCurrent(); }
    feedMore.hidden = true;
    feedStatus.textContent = append ? '正在加载更多…' : '正在加载…'; setShine(feedStatus, true);
    try {
      const page = await site.list(append ? next! : path, signal);
      if (controller.signal.aborted) return true;
      const rows = page.rows.filter(row => !seen.has(row.id));
      rows.forEach(row => seen.add(row.id));
      feedList.append(...rows.map(row => conversationRow(ctx, row, openRow)));
      next = page.next;
      feedStatus.textContent = seen.size ? '' : '这里还没有帖子';
      feedMore.hidden = !next;
      filter(); markActive(); syncBadge();
      return true;
    } catch (error) {
      if (controller.signal.aborted) return true;
      feedStatus.textContent = `列表暂时无法加载：${error instanceof Error ? error.message : '请稍后重试'}`;
      feedMore.hidden = !append || !next;
      return false;
    } finally {
      if (listing === controller) { listing = undefined; setShine(feedStatus, false); }
    }
  }
  const moreObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting) && next && !listing && isOn() && view === 'posts') void loadList(listPath, true);
  }, { root: feed, rootMargin: '0px 0px 200px 0px' }) : undefined;
  moreObserver?.observe(feedMore);
  feedMore.addEventListener('click', () => { if (next && !listing) void loadList(listPath, true); }, { signal: ctx.signal });
  search.addEventListener('input', filter, { signal: ctx.signal });

  // Two orders, as one switch beside the search box; lists that cannot be sorted hide it.
  const sortable = () => !!site.sorts && /^\/(?:latest|c\/|tag\/)/.test(listPath);
  const syncSort = () => {
    sort.hidden = !sortable();
    if (sort.hidden) return;
    const current = site.sorts!.find(entry => entry.matches(listPath)) || site.sorts![0];
    sort.replaceChildren(icon('sort', 13), current.label);
    sort.title = `按${current.label}排序，点击切换`; sort.setAttribute('aria-label', sort.title);
  };
  sort.addEventListener('click', () => {
    const other = site.sorts?.find(entry => !entry.matches(listPath));
    if (other) void loadList(other.apply(listPath));
  }, { signal: ctx.signal });

  // 热榜 and 通知 cache what they loaded for a few minutes; the refresh buttons reload.
  const cache = new Map<string, { rows: Row[]; at: number }>();
  let panelRequest: AbortController | undefined;
  async function fill(target: ReturnType<typeof panel>, key: string, load: (signal: AbortSignal) => Promise<Row[]>, ranked: boolean, force = false) {
    const cached = cache.get(key);
    const render = (rows: Row[], at: number) => {
      target.list.replaceChildren(...rows.map((row, index) => conversationRow(ctx, row, (clicked, event) => {
        const dot = (event.currentTarget as Element).querySelector('.nspp-wecom-row-dot');
        openRow(clicked, event);
        // Opening an unread notification marks it read, on sites that track that per notification.
        if (clicked.read === false && site.read) void site.read(clicked).then(() => dot?.remove()).catch(() => {});
        else if (clicked.read === false) dot?.remove();
      }, ranked ? index + 1 : undefined)));
      target.status.textContent = rows.length ? `更新于 ${listTime(new Date(at))}` : '暂无内容';
      markActive();
    };
    if (cached) render(cached.rows, cached.at);
    if (!force && cached && Date.now() - cached.at < 5 * 60 * 1000) return;
    panelRequest?.abort(); const controller = new AbortController(); panelRequest = controller;
    if (!cached) { target.list.replaceChildren(); target.status.textContent = '正在加载…'; }
    try {
      const rows = await load(AbortSignal.any([ctx.signal, controller.signal]));
      if (controller.signal.aborted) return;
      cache.set(key, { rows, at: Date.now() });
      render(rows, Date.now()); syncBadge();
    } catch (error) {
      if (!controller.signal.aborted) target.status.textContent = `暂时无法加载：${error instanceof Error ? error.message : '请稍后重试'}`;
    }
  }
  const loadHot = (force = false) => {
    tabButtons.forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.path === hotPath)));
    return fill(hotPanel, `hot:${hotPath}`, async signal => (await site.list(hotPath, signal)).rows, true, force);
  };
  const loadNotices = (force = false) => fill(noticePanel, 'notices', async signal => (await site.notices(signal)).rows, false, force);
  hotPanel.refresh.addEventListener('click', () => { void loadHot(true); }, { signal: ctx.signal });
  noticePanel.refresh.addEventListener('click', () => { void loadNotices(true); }, { signal: ctx.signal });

  const toggle = el('button', 'nspp-tool-icon'); toggle.type = 'button'; toggle.dataset.nsppWecomLauncher = '';
  toggle.append(fishIcon());
  (tools || document.body).prepend(toggle);

  // Theme: the forum's own scheme until the user picks one here.
  const dark = () => { const choice = ctx.get<boolean | undefined>('dark'); return typeof choice === 'boolean' ? choice : site.dark(); };
  const syncTheme = () => {
    const on = dark();
    root.toggleAttribute('data-nspp-wecom-dark', isOn() && on);
    theme.replaceChildren(icon(on ? 'sun' : 'moon'));
    theme.dataset.tip = on ? '切换到浅色' : '切换到深色'; theme.setAttribute('aria-label', theme.dataset.tip);
  };

  const syncBadge = () => {
    const count = site.unread();
    const label = count > 99 ? '99+' : String(count);
    if (badge.textContent !== label) badge.textContent = label;
    badge.hidden = count <= 0;
  };
  const syncCurrent = () => {
    const inSection = /^\/(?:c\/|tag\/|go\/)|[?&]tab=/.test(listPath);
    posts.toggleAttribute('aria-current', view === 'posts' && !inSection);
    sectionsButton.toggleAttribute('aria-current', view === 'posts' && inSection);
    hot.toggleAttribute('aria-current', view === 'hot');
    notices.toggleAttribute('aria-current', view === 'notices');
    for (const node of [posts, sectionsButton, hot, notices]) if (node.hasAttribute('aria-current')) node.setAttribute('aria-current', 'page');
    sectionList.querySelectorAll<HTMLAnchorElement>('a').forEach(link => {
      const match = view === 'posts' && link.dataset.path === listPath.replace(/([?&])order=created&?/, '$1').replace(/[?&]$/, '');
      if (match) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
  };

  let started = false;
  const syncToggle = () => {
    toggle.hidden = !desktop.matches || (!isOn() && !here());
    toggle.title = isOn() ? '退出摸鱼模式' : '摸鱼模式';
    toggle.setAttribute('aria-label', toggle.title); toggle.setAttribute('aria-pressed', String(isOn()));
  };
  const apply = () => {
    const on = isOn();
    if (on && !started) begin();
    root.toggleAttribute('data-nspp-wecom', on);
    if (on) { root.dataset.nsppWecomView = view; root.dataset.nsppWecomSite = kind; }
    else { delete root.dataset.nsppWecomView; delete root.dataset.nsppWecomSite; }
    rail.hidden = resizer.hidden = !on;
    listHead.hidden = feed.hidden = !on || view !== 'posts';
    hotPanel.section.hidden = !on || view !== 'hot';
    noticePanel.section.hidden = !on || view !== 'notices';
    chat.root.hidden = !on;
    if (on) {
      applyWidth();
      if (view === 'hot') void loadHot();
      if (view === 'notices') void loadNotices();
    } else { setFlyout(false); tool.set(false); clearWidth(); }
    syncToggle(); syncTheme(); syncCurrent(); syncBadge();
  };
  const showView = (next: View) => { view = next; setFlyout(false); tool.set(false); apply(); };

  /** First time the layout shows: the page's own list or topic, else the column chosen in settings. */
  function begin() {
    started = true;
    const page = here();
    let choice = String(ctx.get('defaultView') || 'home');
    // Lists that need an account (通知, 未读, 新话题) fall back to the home list for visitors.
    if (!person && (choice === 'notices' || /^\/(?:new|unread)\b/.test(choice))) choice = 'home';
    if (page?.topic) chat.open(page.topic, document.title.replace(/\s+[-–|]\s+[^-–|]+$/, ''));
    // A list the user opened themselves wins over the column chosen in settings.
    const opened = page?.list && page.list !== '/' && page.list !== site.home ? page.list : null;
    if (!opened && !page?.topic && (choice === 'hot' || choice === 'notices')) view = choice;
    void loadList(opened || (choice.startsWith('/') ? choice : site.home)).then(ok => { if (!ok && !seen.size) fallback(); });
  }
  /** The site is not answering (rate limit, a Cloudflare check, an outage): show it as it is instead of an empty layout. */
  function fallback() {
    if (!isOn()) return;
    native = true; started = false;
    apply();
    ctx.notify(`${site.name} 暂时无法读取，已切回原网站；恢复后点小鱼重新进入摸鱼模式`);
  }

  document.body.append(rail, tool.menu, flyout, listHead, feed, hotPanel.section, noticePanel.section, resizer, chat.root);
  apply();

  desktop.addEventListener('change', apply, { signal: ctx.signal });
  toggle.addEventListener('click', () => { moyu = !isOn(); native = false; ctx.set('moyu', moyu); apply(); }, { signal: ctx.signal });
  theme.addEventListener('click', () => { ctx.set('dark', !dark()); syncTheme(); }, { signal: ctx.signal });
  notices.addEventListener('click', () => showView('notices'), { signal: ctx.signal });
  posts.addEventListener('click', () => {
    if (view !== 'posts') showView('posts');
    else { setFlyout(false); tool.set(false); void loadList(site.home); }
  }, { signal: ctx.signal });
  hot.addEventListener('click', () => showView('hot'), { signal: ctx.signal });
  sectionsButton.addEventListener('click', () => { tool.set(false); setFlyout(!!flyout.hidden); }, { signal: ctx.signal });
  more.addEventListener('click', () => { setFlyout(false); tool.set(!!tool.menu.hidden); }, { signal: ctx.signal });
  sectionList.addEventListener('click', event => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-path]');
    const mouse = event as MouseEvent;
    if (!link || mouse.button !== 0 || mouse.ctrlKey || mouse.metaKey || mouse.shiftKey || mouse.altKey) return;
    event.preventDefault(); setFlyout(false);
    if (view !== 'posts') { view = 'posts'; apply(); }
    void loadList(link.dataset.path!);
  }, { signal: ctx.signal });
  document.addEventListener('click', event => {
    const target = event.target as Node;
    if (!flyout.hidden && !flyout.contains(target) && !sectionsButton.contains(target)) setFlyout(false);
    if (!tool.menu.hidden && !tool.menu.contains(target) && !more.contains(target)) tool.set(false);
  }, { capture: true, signal: ctx.signal });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!flyout.hidden) { setFlyout(false); sectionsButton.focus(); }
    if (!tool.menu.hidden) { tool.set(false); more.focus(); }
  }, { signal: ctx.signal });
  // Back and forward still move the site underneath; a topic it lands on opens in the pane.
  window.addEventListener('popstate', () => {
    const topic = site.route(new URL(location.href))?.topic;
    if (isOn() && topic && topic.id !== activeId) chat.open(topic);
  }, { signal: ctx.signal });

  const stop = ctx.watch(() => {
    syncBadge();
    moreDot.hidden = !tool.flagged();
    // Single-page sites change route without a reload; the toggle follows whether the new page can be covered.
    syncToggle();
  });
  const poll = site.poll ? setInterval(() => {
    if (isOn() && !document.hidden) site.poll!(ctx.signal).then(syncBadge).catch(() => {});
  }, POLL) : undefined;

  return () => {
    stop(); clearInterval(poll);
    listing?.abort(); panelRequest?.abort(); moreObserver?.disconnect();
    chat.destroy();
    for (const node of [rail, tool.menu, flyout, listHead, feed, hotPanel.section, noticePanel.section, resizer, toggle]) node.remove();
    clearWidth();
    root.removeAttribute('data-nspp-wecom'); root.removeAttribute('data-nspp-wecom-dark');
    delete root.dataset.nsppWecomView; delete root.dataset.nsppWecomSite;
  };
}
