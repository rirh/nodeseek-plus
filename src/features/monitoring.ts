import { parseMonitorRSS } from './monitor-rss';
import { requestMonitorRSS } from './monitor-rss-request';
import { gsap } from 'gsap';
import { GM_getValue } from '../lib/userscript';
import { compileMonitorRules } from './monitor-rules';
import { toolIcon } from '../lib/tool-icon';
import { withTabLock } from '../lib/tab-lock';
import type { Context, Feature } from '../core/types';
import { currentUser } from './actions';

type Post = { id: string; title: string; url: string };
type Tracked = Post & { added: number; checked?: number; signal?: string };
export function parsePosts(doc: Document): Post[] {
  const seen = new Set<string>(); const posts: Post[] = [];
  doc.querySelectorAll<HTMLAnchorElement>('.post-title a[href*="/post-"]').forEach(link => {
    const path = link.getAttribute('href') || '';
    const id = path.match(/\/post-(\d+)/)?.[1]; const title = link.textContent?.trim();
    if (!id || !title || title.length < 3 || seen.has(id) || link.closest('.pagination')) return;
    const url = new URL(path, location.origin);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
    seen.add(id); posts.push({ id, title, url: url.href });
  });
  return posts;
}
function control(label: string, fn: () => void, ctx: Context) {
  const el = document.createElement('button'); el.type = 'button'; el.textContent = label;
  const icon = label === '关闭' ? 'close' : label === '刷新' || label === '更新' ? 'refresh' : label === '停止' ? 'stop' : undefined;
  if (icon) el.prepend(toolIcon(icon));
  el.addEventListener('click', fn, { signal: ctx.signal }); return el;
}
const monitor: Feature = {
  id: 'monitor', title: '帖子监控与抽奖追踪', description: '使用 NodeSeek RSS 监控新帖，正则匹配标题，后台标签页可运行。开奖提示仅为线索，需人工核实中奖。', group: '监控',
  defaults: { enabled: true, interval: 300 },
  fields: {
    interval: { label: '刷新间隔（秒，60–3600）', type: 'number' },
  },
  mount(ctx) {
    if (location.hostname !== 'www.nodeseek.com') return;
    const panel = document.createElement('dialog'); panel.className = 'nspp-monitor'; panel.setAttribute('aria-label', '帖子监控');
    const header = document.createElement('header');
    const title = document.createElement('h3'); title.textContent = '帖子监控'; header.append(title, control('关闭', () => panel.close(), ctx)); panel.append(header);
    const launch = control('帖子监控', () => { renderUnread(); panel.showModal(); }, ctx);
    launch.className = 'nspp-tool-icon'; launch.title = '帖子监控'; launch.setAttribute('aria-label', launch.title); launch.replaceChildren(toolIcon('monitor'));
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    const spinner = document.createElement('span'); spinner.className = 'nspp-monitor-spinner'; spinner.hidden = true; spinner.setAttribute('aria-hidden', 'true');
    const statusText = document.createElement('span'); status.append(spinner, statusText); panel.append(status);
    let spin: gsap.core.Tween | undefined;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    function syncAnimation() {
      const active = busy && (!paused || manualCheck) && !cooling();
      spinner.hidden = !active;
      if (!active || reducedMotion.matches) { spin?.kill(); spin = undefined; spinner.style.transform = ''; }
      else if (!spin) spin = gsap.to(spinner, { rotation: 360, duration: .8, repeat: -1, ease: 'none' });
    }
    reducedMotion.addEventListener('change', syncAnimation, { signal: ctx.signal });
    const output = document.createElement('div'); output.className = 'nspp-monitor-results'; panel.append(output);
    const user = currentUser()?.member_id; const trackKey = `tracked:${user}`;
    const unreadKey = `unread-posts:${user || 'guest'}`;
    const unreadList = document.createElement('section'); unreadList.className = 'nspp-monitor-unread'; output.before(unreadList);
    const readUnread = () => (ctx.get<(Post & { found: number })[]>(unreadKey) || []).filter(post => match(post));
    function renderUnread() {
      const posts = readUnread();
      unreadList.replaceChildren(); unreadList.hidden = !posts.length;
      launch.toggleAttribute('data-unread', posts.length > 0);
      if (posts.length) launch.dataset.unread = 'true';
      renderState();
      const heading = document.createElement('h4'); heading.textContent = `新发现 · ${posts.length}`;
      heading.append(control('全部已读', () => { ctx.set(unreadKey, []); renderUnread(); }, ctx)); unreadList.append(heading);
      const list = document.createElement('ul');
      for (const post of posts) {
        const item = document.createElement('li'); const link = document.createElement('a'); link.href = post.url; link.textContent = post.title;
        link.addEventListener('click', () => { ctx.set(unreadKey, readUnread().filter(x => x.id !== post.id)); renderUnread(); }, { signal: ctx.signal });
        item.append(link); list.append(item);
      }
      unreadList.append(list);
    }
    const readTracked = () => (ctx.get<Tracked[]>(trackKey) || []).filter(x => x.added > Date.now() - 30 * 86400000).slice(0, 50);
    const trackList = document.createElement('section'); trackList.className = 'nspp-monitor-tracked'; panel.append(trackList);
    function renderTracks() {
      trackList.replaceChildren();
      trackList.hidden = !readTracked().length;
      const heading = document.createElement('h4'); heading.textContent = '正在追踪'; trackList.append(heading);
      for (const post of readTracked()) {
        const row = document.createElement('div'); const link = document.createElement('a');
        link.href = post.url; link.textContent = `${post.title}${post.signal ? ' · 检测到开奖文字，请核实' : ''}`;
        row.append(link, control('取消追踪', () => { ctx.set(trackKey, readTracked().filter(x => x.id !== post.id)); renderTracks(); }, ctx)); trackList.append(row);
      }
    }
    const currentId = location.pathname.match(/^\/post-(\d+)/)?.[1];
    if (currentId && user) panel.append(control('追踪当前抽奖帖', () => {
      const existing = readTracked();
      if (!existing.some(x => x.id === currentId)) ctx.set(trackKey, [{ id: currentId, title: document.title, url: location.href, added: Date.now() }, ...existing].slice(0, 50));
      renderTracks(); ctx.notify('已追踪；检测到开奖文字会提示人工核实');
    }, ctx));
    if (user) renderTracks();
    let interval = Math.min(3600, Math.max(60, Number(ctx.get<number>('interval')) || 300)) * 1000;
    let busy = false; let last = 0; let paused = false; let manualCheck = false;
    const cooldownKey = 'rss-request-cooldown';
    const hasWork = () => !!(rules.length || readTracked().length);
    const cooling = () => (ctx.get<number>(cooldownKey) || 0) > Date.now();
    function renderState() {
      syncAnimation();
      const state = !hasWork() ? 'idle' : paused ? 'paused' : cooling() ? 'cooldown' : 'running';
      if (launch.dataset.monitorState !== state) launch.dataset.monitorState = state;
      const label = { idle: '未配置监控', paused: '监控已暂停', cooldown: '监控冷却中', running: '监控中' }[state];
      const count = readUnread().length;
      launch.title = `帖子监控 · ${label}${count ? ` · ${count} 条未读` : ''}`;
      launch.setAttribute('aria-label', launch.title);
    }
    const wait = () => new Promise<void>(resolve => {
      const done = () => { clearTimeout(timer); ctx.signal.removeEventListener('abort', done); resolve(); };
      const timer = setTimeout(done, 5000);
      ctx.signal.addEventListener('abort', done, { once: true });
    });
    let requests = Promise.resolve();
    function requestPage(url: string): Promise<string> {
      const result = requests.then(async () => {
        while (!ctx.signal.aborted && (!paused || manualCheck) && !cooling()) {
          let html = '';
          const ran = await withTabLock('monitor-requests', 5000, async () => {
            const now = Date.now();
            const budget = ctx.get<{ start: number; count: number }>('request-budget');
            const next = !budget || now - budget.start >= 300000 ? { start: now, count: 0 } : budget;
            if (next.count >= 12) { ctx.set(cooldownKey, next.start + 300000); throw new Error('监控请求配额已用完'); }
            ctx.set('request-budget', { ...next, count: next.count + 1 });
            try { html = await ctx.request<string>(url, { responseType: 'text', signal: ctx.signal }); }
            catch (error) { if (!ctx.signal.aborted) ctx.set(cooldownKey, Date.now() + 600000); throw error; }
          });
          if (ran) return html;
          await wait();
        }
        throw new Error('监控暂停或冷却中');
      });
      requests = result.then(() => {}, () => { renderState(); });
      return result;
    }
    function render(label: string, posts: Post[]) {
      const section = document.createElement('section'); output.append(section);
      const heading = document.createElement('h4'); heading.textContent = label;
      const count = document.createElement('small'); count.textContent = String(posts.length); heading.append(count); section.append(heading);
      if (!posts.length) { const empty = document.createElement('p'); empty.textContent = '暂无匹配帖子'; section.append(empty); return; }
      const list = document.createElement('ul');
      for (const post of posts) { const item = document.createElement('li'); const link = document.createElement('a'); link.href = post.url; link.textContent = post.title; item.append(link); highlight(item, post); list.append(item); }
      section.append(list);
    }
    async function checkTracked() {
      if (!user) return;
      const pending = readTracked().filter(x => !x.signal && Date.now() - (x.checked || 0) >= 600000).sort((a, b) => (a.checked || 0) - (b.checked || 0)).slice(0, 2);
      for (const entry of pending) {
        if (ctx.signal.aborted) break;
        const html = await requestPage(entry.url);
        const doc = new DOMParser().parseFromString(html, 'text/html');
        // Only the title is authoritative enough for a change signal. Never claim a winner from a full-page username match.
        const signal = /已开奖|开奖结果|中奖名单|已结束/.test(doc.title) ? doc.title : '';
        const updated = readTracked().map(x => x.id === entry.id ? { ...x, checked: Date.now(), signal } : x);
        if (signal && updated.some(x => x.id === entry.id)) notify(`抽奖状态可能已更新：${entry.title}，请打开帖子核实`);
        ctx.set(trackKey, updated); renderTracks();
      }
    }
    type Snapshot = { home: Post[]; trades: Post[]; at: number };
    const snapshotKey = `rss-snapshot:${user || 'guest'}`;
    const legacy = GM_getValue<Record<string, { keywords?: string }>>(`nspp:settings:${location.hostname}`, {});
    let keywordText = ctx.get<string | undefined>('match-keywords') ?? legacy.monitor?.keywords ?? '';
    ctx.set('match-keywords', keywordText);
    let { rules, errors } = compileMonitorRules(keywordText);
    const editor = document.createElement('form'); editor.className = 'nspp-monitor-editor';
    const label = document.createElement('label'); label.textContent = '监控正则';
    const input = document.createElement('textarea'); input.rows = 2; input.value = keywordText; input.placeholder = '每行一个正则，如 vmiss|搬瓦工 或 /香港.*年付/i';
    const help = document.createElement('a'); help.className = 'nspp-regex-help'; help.href = 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_expressions'; help.target = '_blank'; help.rel = 'noopener noreferrer'; help.textContent = '?'; help.title = '正则怎么写？查看 MDN 文档（新标签页）'; help.setAttribute('aria-label', help.title);
    label.append(help, input);
    const apply = control('更新', () => {}, ctx); apply.type = 'submit';
    const feedback = document.createElement('span'); feedback.setAttribute('role', 'status');
    const explanation = document.createElement('small'); explanation.textContent = '每行一个正则，任意命中RSS 标题即收录。默认忽略大小写；例如 vmiss|搬瓦工，或 /香港.*年付/i。更新会清空旧结果并重新检查。';
    const configDialog = document.createElement('dialog'); configDialog.className = 'nspp-monitor nspp-monitor-config'; configDialog.setAttribute('aria-label', '监控配置');
    const configHeader = document.createElement('header'); const configTitle = document.createElement('h3'); configTitle.textContent = '监控配置';
    configHeader.append(configTitle, control('关闭', () => configDialog.close(), ctx));
    const frequencyLabel = document.createElement('label'); frequencyLabel.textContent = '刷新间隔（秒）';
    const frequency = document.createElement('input'); frequency.type = 'number'; frequency.min = '60'; frequency.max = '3600'; frequency.step = '1'; frequency.required = true; frequency.value = String(interval / 1000); frequencyLabel.append(frequency);
    const frequencyHelp = document.createElement('small'); frequencyHelp.textContent = '支持 60–3600 秒。后台标签页继续检查，请求限速与冷却保护保持开启。';
    const aiHelp = document.createElement('small'); aiHelp.textContent = '不会写正则？可以让 AI 帮你生成。例如：请生成 JavaScript 正则，匹配包含 vmiss 或搬瓦工、但不包含已出的帖子，忽略大小写，按 /表达式/i 格式输出，每行一个，不要代码块。复制结果到上方，检查是否符合需求后点击更新。';
    editor.append(label, explanation, aiHelp, frequencyLabel, frequencyHelp, feedback, apply);
    configDialog.append(configHeader, editor); document.body.append(configDialog);
    const configure = control('配置', () => { input.value = keywordText; frequency.value = String(interval / 1000); feedback.textContent = ''; configDialog.showModal(); }, ctx); configure.prepend(toolIcon('settings')); header.insertBefore(configure, header.lastElementChild);
    configDialog.addEventListener('close', () => configure.focus(), { signal: ctx.signal });
    editor.addEventListener('submit', event => {
      event.preventDefault(); if (busy) { ctx.notify('正在检查，请完成后再更新'); return; }
      const seconds = Number(frequency.value);
      if (!Number.isInteger(seconds) || seconds < 60 || seconds > 3600) { feedback.textContent = '刷新间隔需为 60–3600 秒的整数'; ctx.notify(feedback.textContent); return; }
      const compiled = compileMonitorRules(input.value);
      if (compiled.errors.length) { feedback.textContent = `无效规则：${compiled.errors.join('、')}`; ctx.notify(feedback.textContent); return; }
      interval = seconds * 1000; ctx.set('interval', seconds);
      clearInterval(timer); timer = setInterval(() => { void refresh(); }, interval);
      hint.textContent = `${seconds} 秒 / 次 · NodeSeek RSS`; refreshButton.title = '立即检查一次（不等待自动刷新周期）';
      keywordText = input.value; rules = compiled.rules; errors = compiled.errors;
      ctx.set('match-keywords', keywordText); ctx.set(unreadKey, []); ctx.set(`seen-posts:${user || 'guest'}`, undefined);
      highlighted.forEach(node => node.removeAttribute('data-nspp-monitor-match')); highlighted.clear(); scanned.clear();
      ctx.set(snapshotKey, undefined); output.replaceChildren();
      paused = false; pause.replaceChildren(toolIcon('stop'), document.createTextNode('停止'));
      renderUnread(); feedback.textContent = '已更新，正在重新检查';
      configDialog.close(); void refresh(true, '配置已更新，旧结果已清空，开始检查');
    }, { signal: ctx.signal });
    const match = (post: Post) => rules.find(rule => rule.matches(post.title));
    const highlighted = new Set<HTMLElement>();
    function highlight(node: HTMLElement, post: Post) {
      const rule = match(post);
      if (rule) {
        if (node.dataset.nsppMonitorMatch !== rule.color) node.dataset.nsppMonitorMatch = rule.color;
        highlighted.add(node);
      } else { node.removeAttribute('data-nspp-monitor-match'); highlighted.delete(node); }
    }
    const scanned = new Map<HTMLElement, string>();
    const scan = () => {
      if (!rules.length || paused || cooling() || ctx.signal.aborted) return;
      for (const node of scanned.keys()) if (!node.isConnected) { scanned.delete(node); highlighted.delete(node); }
      for (const post of parsePosts(document)) {
        const link = Array.from(document.querySelectorAll<HTMLAnchorElement>('.post-title a')).find(link => link.href === post.url);
        const row = link?.closest<HTMLElement>('.post-list-item');
        if (!row || scanned.get(row) === post.title) continue;
        scanned.set(row, post.title);
        const cached = ctx.get<Snapshot>(snapshotKey)?.home.find(item => item.url === post.url);
        highlight(row, cached || post);
      }
    };
    function display(snapshot: Snapshot) {
      output.replaceChildren();
      for (const node of highlighted) if (!node.isConnected) highlighted.delete(node);
      render('匹配帖子', [...new Map([...snapshot.home, ...snapshot.trades].map(post => [post.id, post])).values()].filter(post => match(post)));
      statusText.textContent = busy ? '正在检查匹配帖子…' : `更新于 ${new Date(snapshot.at).toLocaleTimeString()}${errors.length ? ` · 无效正则：${errors.join('、')}` : ''}`;
      renderTracks();
    }
    async function refresh(force = false, message = '已开始手动刷新') {
      renderState();
      if (!hasWork()) { statusText.textContent = '添加正则后开始监控'; if (force) ctx.notify(statusText.textContent); return; }
      if ((!force && paused) || ctx.signal.aborted) return;
      if (busy) { if (force) ctx.notify('正在检查，请稍候'); return; }
      if (cooling()) { statusText.textContent = '请求冷却中，请稍后手动刷新'; if (force) ctx.notify(statusText.textContent); return; }
      if (!force && Date.now() - last < interval) { statusText.textContent = `等待下次检查 · 约 ${Math.ceil((interval - (Date.now() - last)) / 1000)} 秒后可刷新`; return; }
      if (force) ctx.notify(message);
      manualCheck = force; busy = true; syncAnimation(); apply.disabled = true; panel.dataset.checking = 'true'; status.setAttribute('aria-busy', 'true'); last = Date.now(); statusText.textContent = '正在检查匹配帖子…'; refreshButton.disabled = true; refreshButton.setAttribute('aria-busy', 'true');
      try {
        const executed = await withTabLock(`monitor:${user || 'guest'}`, force ? 0 : interval, async () => {
          if (ctx.signal.aborted) return;
          const home = parseMonitorRSS(await requestMonitorRSS(ctx.signal));
          const trades: Post[] = [];
          if (ctx.signal.aborted) return;
          const snapshot = { home, trades, at: Date.now() }; ctx.set(snapshotKey, snapshot); display(snapshot);
          scanned.clear(); scan();
          const matches = [...new Map([...home, ...trades].map(post => [post.id, post])).values()].filter(post => match(post));
          const seenKey = `seen-posts:${user || 'guest'}`;
          const seen = ctx.get<Record<string, number> | undefined>(seenKey);
          const next = Object.fromEntries(Object.entries(seen || {}).filter(([, time]) => Date.now() - time < 30 * 86400000));
          const fresh = [...new Map(matches.map(post => [post.id, post])).values()].filter(post => !seen?.[post.id]);
          for (const post of matches) next[post.id] = Date.now();
          ctx.set(seenKey, Object.fromEntries(Object.entries(next).sort((a, b) => b[1] - a[1]).slice(0, 5000)));
          if (seen && fresh.length) {
            const message = `发现 ${fresh.length} 条新帖：${fresh.slice(0, 2).map(post => post.title).join('；')}`;
            ctx.set(unreadKey, [...new Map([...fresh.map(post => ({ id: post.id, title: post.title, url: post.url, found: Date.now() })), ...readUnread()].map(post => [post.id, post])).values()].slice(0, 200));
            renderUnread();
            notify(message);
          }
          await checkTracked();
          if (force && !ctx.signal.aborted) ctx.notify(`检查完成，匹配 ${matches.length} 条帖子`);
        });
        if (!executed && !ctx.signal.aborted) {
          if (force) ctx.notify('其他标签页正在检查，已读取可用缓存');
          const cached = ctx.get<Snapshot>(snapshotKey);
          if (cached) { display(cached); renderUnread(); } else statusText.textContent = '其他标签页正在刷新，下个周期读取共享结果';
        }
      } catch { if (!ctx.signal.aborted) {
        ctx.set(cooldownKey, Date.now() + 60000);
        if (force) ctx.notify('检查未完成，请检查登录、站点验证或冷却状态');
        const cached = ctx.get<Snapshot>(snapshotKey);
        statusText.textContent = `检查未完成，将在冷却结束后的监控周期重试${cached ? ` · 保留 ${new Date(cached.at).toLocaleTimeString()} 的结果` : ' · 请确认论坛可正常访问'}；可检查登录或站点验证`;
      } }
      finally { busy = false; manualCheck = false;
        if (statusText.textContent === '正在检查匹配帖子…') { const snapshot = ctx.get<Snapshot>(snapshotKey); statusText.textContent = snapshot ? `更新于 ${new Date(snapshot.at).toLocaleTimeString()}` : '检查结束'; }
        apply.disabled = false; delete panel.dataset.checking; status.removeAttribute('aria-busy'); renderState(); refreshButton.disabled = false; refreshButton.removeAttribute('aria-busy'); }
    }
    function notify(message: string) {
      ctx.notify(message);
      if (ctx.get<boolean>('desktop-notifications') && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try { new Notification('NodeSeek++ 帖子监控', { body: message, tag: 'nspp-monitor' }); } catch { /* In-page notification remains available. */ }
      }
    }
    const footer = document.createElement('footer');
    const permission = control('开启系统通知', () => { void (async () => {
      if (typeof Notification === 'undefined') { ctx.notify('当前浏览器不支持系统通知，仍会显示页面提示'); return; }
      if (ctx.get<boolean>('desktop-notifications')) { ctx.set('desktop-notifications', false); permission.textContent = '开启系统通知'; return; }
      try {
        const result = await Notification.requestPermission();
        ctx.set('desktop-notifications', result === 'granted');
        permission.textContent = result === 'granted' ? '关闭系统通知' : '开启系统通知';
        ctx.notify(result === 'granted' ? '系统通知已开启' : '系统通知未授权，仍会显示页面提示；可在浏览器站点设置中调整');
      } catch { ctx.notify('无法申请系统通知权限，仍会显示页面提示'); }
    })(); }, ctx);
    if (ctx.get<boolean>('desktop-notifications') && typeof Notification !== 'undefined' && Notification.permission === 'granted') permission.textContent = '关闭系统通知';
    const refreshButton = control('刷新', () => { void refresh(true); }, ctx);
    refreshButton.title = '立即检查一次（不等待自动刷新周期）';
    const hint = document.createElement('span'); hint.textContent = `${interval / 1000} 秒 / 次 · NodeSeek RSS`;
    const pause = control('停止', () => { paused = !paused; pause.replaceChildren(toolIcon(paused ? 'play' : 'stop'), document.createTextNode(paused ? '启动' : '停止')); statusText.textContent = paused ? '监控已暂停' : '监控已恢复'; renderState(); if (!paused) void refresh(); }, ctx);
    footer.append(hint, pause, permission, refreshButton); panel.append(footer);
    document.body.append(panel, configDialog); (document.querySelector('#nspp-tools') || document.body).prepend(launch);
    const cached = ctx.get<Snapshot>(snapshotKey); if (cached) display(cached); renderUnread(); void refresh();
    const stopScan = ctx.watch(scan);
    let timer = setInterval(() => { void refresh(); }, interval);
    document.addEventListener('visibilitychange', () => { void refresh(); }, { signal: ctx.signal });
    return () => { configDialog.remove(); spin?.kill(); stopScan(); highlighted.forEach(node => node.removeAttribute('data-nspp-monitor-match')); clearInterval(timer); panel.close(); panel.remove(); launch.remove(); };
  },
};
const autoPage: Feature = {
  id: 'timed-pagination', title: '定时翻页', description: '手动开始后按计时前往真实下一页链接，隐藏页面暂停；不会猜测下一页 URL。', group: '监控',
  defaults: { enabled: false, interval: 60 }, fields: { interval: { label: '翻页等待秒数（最少 15）', type: 'number' } },
  mount(ctx) {
    const next = ctx.root.querySelector<HTMLAnchorElement>('.nsk-pager a.pager-next, a.next, a[rel="next"]'); if (!next) return;
    const url = new URL(next.href, location.href); if (url.origin !== location.origin || url.href === location.href) return;
    let running = false; const seconds = Math.max(15, Number(ctx.get<number>('interval')) || 60); let remaining = seconds;
    const bar = document.createElement('div'); bar.className = 'nspp-pagination';
    const status = document.createElement('span'); status.textContent = '定时翻页已停止';
    const toggle = control('开始翻页', () => { running = !running; remaining = seconds; toggle.textContent = running ? '停止翻页' : '开始翻页'; status.textContent = running ? `${remaining} 秒后前往下一页` : '定时翻页已停止'; }, ctx);
    bar.append(status, toggle); next.parentElement?.append(bar);
    const timer = setInterval(() => {
      if (!running || document.hidden) return;
      remaining--; status.textContent = `${remaining} 秒后前往下一页`;
      if (remaining <= 0) { running = false; location.assign(url.href); }
    }, 1000);
    return () => { clearInterval(timer); bar.remove(); };
  },
};
export const monitoringFeatures: Feature[] = [monitor, autoPage];
