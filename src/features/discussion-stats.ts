import type { Feature } from '../core/types';
import { discussionStats } from './discussion-stats-data';
import { postURL, siteIcon } from './post-interaction-data';

export const discussionStatsFeature: Feature = {
  id: 'discussion-stats', title: '主题帖浏览与评论数', group: '阅读',
  description: '个人主页主题帖列表显示浏览数和评论数；按可见行加载，每帖最多读取两页，结果缓存 5 分钟。',
  defaults: { enabled: true },
  mount(ctx) {
    if (!/^\/space\/\d+\/?$/.test(location.pathname)) return;
    type Counts = { views: number | null; comments: number | null };
    const cache = new Map<string, Counts & { time: number }>();
    const pending = new Map<string, Promise<Counts>>();
    const rows = new Map<HTMLElement, { href: string; stats: HTMLElement }>();
    let route = '', controller = new AbortController();
    const active = () => /^#\/discussions(?:\/\d+)?\/?(?:\?.*)?$/.test(location.hash);
    const read = (href: string) => {
      const cached = cache.get(href);
      if (cached && Date.now() - cached.time < 300_000) return Promise.resolve(cached);
      const existing = pending.get(href); if (existing) return existing;
      const signal = controller.signal;
      const promise = (async () => {
        const id = href.match(/\/post-(\d+)-1$/)![1]!;
        const page = async (url: string) => discussionStats(new DOMParser().parseFromString(
          await ctx.request<string>(url, { responseType: 'text', signal }), 'text/html'), id);
        const first = await page(href);
        const counts: Counts = { views: first.views, comments: first.comments };
        if (first.lastPage && first.lastPage > 1) {
          try { counts.comments = (await page(`/post-${id}-${first.lastPage}`)).comments; }
          catch { if (signal.aborted) throw new Error('读取已取消'); }
        }
        if (signal.aborted || ctx.signal.aborted) throw new Error('读取已取消');
        if (counts.views !== null && counts.comments !== null) {
          cache.delete(href); cache.set(href, { ...counts, time: Date.now() });
          if (cache.size > 100) cache.delete(cache.keys().next().value!);
        }
        return counts;
      })();
      pending.set(href, promise);
      void promise.finally(() => { if (pending.get(href) === promise) pending.delete(href); }).catch(() => {});
      return promise;
    };
    const load = async (row: HTMLElement) => {
      const entry = rows.get(row); if (!entry) return;
      observer.unobserve(row);
      try {
        const counts = await read(entry.href);
        if (ctx.signal.aborted || !row.isConnected || rows.get(row) !== entry || !active()) return;
        entry.stats.querySelectorAll<HTMLElement>('[data-count]').forEach(value => {
          const key = value.dataset.count as keyof Counts;
          value.parentElement!.hidden = counts[key] === null;
          value.textContent = counts[key] === null ? '' : String(counts[key]);
          value.parentElement!.title = `${key === 'views' ? '浏览' : '评论'}：${counts[key]}`;
        });
        entry.stats.hidden = counts.views === null && counts.comments === null;
      } catch { /* Keep unavailable statistics hidden. */ }
    };
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) void load(entry.target as HTMLElement);
    }, { rootMargin: '200px' });
    const remove = (row: HTMLElement) => {
      observer.unobserve(row); rows.get(row)?.stats.remove(); rows.delete(row); row.classList.remove('nspp-discussion-row');
    };
    const scan = () => {
      if (route !== location.href) {
        route = location.href; controller.abort(); controller = new AbortController(); pending.clear();
        for (const row of rows.keys()) remove(row);
      }
      for (const [row, entry] of rows) {
        if (!row.isConnected || postURL(row.querySelector('a')?.href || '', location.origin)?.href !== entry.href) remove(row);
      }
      if (!active()) return;
      document.querySelectorAll<HTMLElement>('.discussion-wrapper > div.discussion-item').forEach(row => {
        if (rows.has(row)) return;
        const url = postURL(row.querySelector('a')?.href || '', location.origin); if (!url) return;
        const stats = document.createElement('span'); stats.className = 'nspp-discussion-stats'; stats.hidden = true;
        for (const [key, icon] of [['views', 'eyes'], ['comments', 'comments']]) {
          const item = document.createElement('span'); item.hidden = true;
          const value = document.createElement('span'); value.dataset.count = key;
          item.append(siteIcon(icon!), value); stats.append(item);
        }
        row.classList.add('nspp-discussion-row'); row.append(stats);
        rows.set(row, { href: url.href, stats }); observer.observe(row);
      });
    };
    const stop = ctx.watch(scan);
    window.addEventListener('hashchange', scan, { signal: ctx.signal });
    window.addEventListener('popstate', scan, { signal: ctx.signal });
    return () => { stop(); controller.abort(); observer.disconnect(); for (const row of rows.keys()) remove(row); };
  },
};
