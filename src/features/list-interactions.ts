import { forumTime } from '../lib/forum-time';
import type { Feature } from '../core/types';
import { createPostInteraction } from '../views/post-interaction';
import { createQuickReplies } from '../views/quick-replies';
import { readPostCounts } from './read-post-counts';
import { postURL, reactions, siteIcon } from './post-interaction-data';

export const listInteractions: Feature = {
  id: 'list-interactions', title: '原生列表增强', group: '阅读',
  description: '保留官网列表布局与分类位置，增强相对时间和悬停预览中的互动操作。',
  defaults: { enabled: true },
  mount(ctx) {
    const rows = new Map<Element, { url: string; bar: HTMLElement; counts: HTMLElement[] }>();
    const categoryGroups: { group: HTMLElement; category: HTMLElement; style: string | null }[] = [];
    const times = new Map<HTMLElement, { value: string; text: string; title: string | null }>();
    const refreshTimes = () => {
      times.forEach((original, el) => {
        if (!el.isConnected) { times.delete(el); return; }
        const result = forumTime(original.value);
        if (result) { if (el.textContent !== result.text) el.textContent = result.text; el.title = result.full; }
      });
    };
    const timeTimer = setInterval(refreshTimes, 60000);
    const cache = new Map<string, (number | null)[]>();
    const inflight = new Set<string>();
    const queue = new Map<string, HTMLElement>();
    const revisions = new Map<string, number>();
    let disposed = false;
    const apply = (url: string, values: (number | null)[]) => {
      values = values.map((value, i) => value ?? cache.get(url)?.[i] ?? null);
      if (!values.some(value => value !== null)) return;
      cache.set(url, values);
      if (cache.size > 100) cache.delete(cache.keys().next().value!);
      rows.forEach(row => { if (row.url === url) row.counts.forEach((node, i) => { const value = values[i] == null ? '' : String(values[i]); if (node.textContent !== value) node.textContent = value; }); });
    };
    const view = createPostInteraction(ctx, (url, values) => {
      if (values.some(value => value !== null)) revisions.set(url, (revisions.get(url) || 0) + 1);
      apply(url, values);
    });
    const quickReplies = createQuickReplies(ctx, (link, text) => view.quickReply(link, text));
    const markBusy = (url: string, busy: boolean) => rows.forEach(row => {
      if (row.url !== url) return;
      const label = row.bar.querySelector<HTMLElement>('.nspp-count-loading');
      if (label) { label.hidden = !busy; if (busy) label.setAttribute('aria-busy', 'true'); else label.removeAttribute('aria-busy'); }
    });
    const drain = () => {
      while (!disposed && !ctx.signal.aborted && inflight.size < 2 && queue.size) {
        const [url, bar] = queue.entries().next().value!; queue.delete(url);
        if (!bar.isConnected) continue;
        inflight.add(url); markBusy(url, true);
        const revision = revisions.get(url) || 0;
        void readPostCounts(ctx, url).then(values => {
          if (!disposed && !ctx.signal.aborted && revision === (revisions.get(url) || 0)) apply(url, values);
        }).catch(() => { /* Leave unknown values empty and allow hover/focus to retry. */ })
          .finally(() => { inflight.delete(url); markBusy(url, false); drain(); });
      }
    };
    const load = (url: string, bar: HTMLElement) => {
      if (disposed || cache.get(url)?.every(value => value !== null) || inflight.has(url) || queue.has(url)) return;
      queue.set(url, bar); markBusy(url, true); drain();
    };
    const visible = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        visible?.unobserve(entry.target);
        const state = rows.get(entry.target); if (state) load(state.url, state.bar);
      }
    }, { rootMargin: '0px' }) : null;
    const stop = ctx.watch(() => {
      for (const [row, state] of rows) if (!row.isConnected) { visible?.unobserve(row); state.bar.remove(); rows.delete(row); }
      ctx.root.querySelectorAll<HTMLElement>('.post-list-item:not(.topic-carousel-item)').forEach(row => {
        if (rows.has(row)) return;
        const link = row.querySelector<HTMLAnchorElement>('.post-title a');
        const content = row.querySelector('.post-list-content');
        if (!link || !content) return;
        const url = postURL(link.href, location.origin); if (!url) return;
        const bar = document.createElement('div'); bar.className = 'nspp-list-actions'; bar.hidden = true; bar.setAttribute('aria-label', '帖子互动');
        const counts: HTMLElement[] = [];
        const actions = reactions;
        actions.forEach(({ title, icon }, index) => {
          const button = document.createElement('button'); button.type = 'button'; button.title = title; button.setAttribute('aria-label', title);
          button.append(siteIcon(icon));
          const label = document.createElement('span'); label.textContent = title; label.hidden = index < 4; button.append(label);
          if (index < 4) { const count = document.createElement('span'); count.textContent = cache.get(url.href)?.[index] == null ? '' : String(cache.get(url.href)![index]); counts.push(count); button.append(count); }
          button.addEventListener('click', () => view.open(link, title), { signal: ctx.signal }); bar.append(button);
        });
        const quick = document.createElement('button'); quick.type = 'button'; quick.title = '快速回复'; quick.setAttribute('aria-label', '快速回复'); quick.textContent = '快速回复';
        quick.addEventListener('click', () => quickReplies.open(link), { signal: ctx.signal }); bar.append(quick);
        const category = row.querySelector<HTMLElement>('.post-category');
        if (category) {
          const shortcut = quick.cloneNode(true) as HTMLButtonElement; shortcut.className = 'nspp-category-reply';
          const computed = getComputedStyle(category);
          for (const property of ['font', 'color', 'background-color', 'border', 'border-radius', 'box-shadow', 'padding', 'line-height']) {
            shortcut.style.setProperty(property, computed.getPropertyValue(property));
          }
          shortcut.addEventListener('click', () => quickReplies.open(link), { signal: ctx.signal });
          const group = document.createElement('span'); group.className = 'nspp-category-actions';
          for (const property of ['position', 'top', 'right', 'bottom', 'left', 'transform', 'float', 'margin', 'z-index']) {
            group.style.setProperty(property, computed.getPropertyValue(property));
          }
          // Computed styles resolve both insets; keep the right edge anchored as the group grows.
          if (computed.position === 'absolute' || computed.position === 'fixed') group.style.left = 'auto';
          const style = category.getAttribute('style');
          for (const [property, value] of Object.entries({ position: 'static', inset: 'auto', transform: 'none', float: 'none', margin: '0', width: 'auto', minWidth: 'max-content', maxWidth: 'none', flex: '0 0 auto' })) {
            category.style.setProperty(property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`), value, 'important');
          }
          category.before(group); group.append(category, shortcut); categoryGroups.push({ group, category, style });
        }
        const loading = document.createElement('span'); loading.className = 'nspp-count-loading'; loading.textContent = '加载中'; loading.setAttribute('role', 'status'); loading.hidden = true; bar.append(loading);
        content.append(bar); rows.set(row, { url: url.href, bar, counts });
        if (visible) visible.observe(row); else load(url.href, bar);
        row.addEventListener('mouseenter', () => { void load(url.href, bar); }, { signal: ctx.signal });
        bar.addEventListener('focusin', () => { void load(url.href, bar); }, { signal: ctx.signal });
        const time = row.querySelector<HTMLElement>('.info-last-comment-time');
        if (time) {
          const text = time.textContent || '';
          const value = [time.getAttribute('datetime'), time.getAttribute('title'), text].find(value => value && forumTime(value));
          if (value) { times.set(time, { value, text, title: time.getAttribute('title') }); refreshTimes(); }
        }
      });
    });
    return () => { categoryGroups.forEach(({ group, category, style }) => { group.before(category); if (style === null) category.removeAttribute('style'); else category.setAttribute('style', style); group.remove(); }); clearInterval(timeTimer); times.forEach((original, el) => { el.textContent = original.text; if (original.title === null) el.removeAttribute('title'); else el.title = original.title; }); disposed = true; queue.clear(); visible?.disconnect(); stop(); quickReplies.destroy(); view.destroy(); rows.forEach(state => state.bar.remove()); };
  },
};
