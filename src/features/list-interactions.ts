import type { Feature } from '../core/types';
import { createPostInteraction } from '../views/post-interaction';
import { createQuickReplies } from '../views/quick-replies';
import { readPostCounts } from './read-post-counts';
import { postURL, reactions, siteIcon } from './post-interaction-data';

export const listInteractions: Feature = {
  id: 'list-interactions', title: '三行列表与互动', group: '阅读',
  description: '标题、信息、互动分为三行；第三行提供点赞、加鸡腿、反对、收藏和快捷回复。',
  defaults: { enabled: true },
  mount(ctx) {
    const rows = new Map<Element, { url: string; bar: HTMLElement; counts: HTMLElement[] }>();
    const labels: HTMLElement[] = [];
    const movedBlocks = new Map<HTMLElement, Comment>();
    const moveBlock = (row: Element, bar: HTMLElement) => {
      const button = row.querySelector<HTMLElement>('.info-author .nspp-block-toggle');
      if (!button) return;
      const marker = document.createComment('nspp-block-position'); button.before(marker); movedBlocks.set(button, marker);
      bar.insertBefore(button, bar.querySelector('.nspp-action-category'));
    };
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
        if (rows.has(row)) { moveBlock(row, rows.get(row)!.bar); return; }
        const link = row.querySelector<HTMLAnchorElement>('.post-title a');
        const content = row.querySelector('.post-list-content');
        if (!link || !content) return;
        const url = postURL(link.href, location.origin); if (!url) return;
        row.classList.add('nspp-three-line');
        const bar = document.createElement('div'); bar.className = 'nspp-list-actions'; bar.setAttribute('aria-label', '帖子互动');
        const counts: HTMLElement[] = [];
        const actions = reactions;
        actions.forEach(({ title, icon }, index) => {
          const button = document.createElement('button'); button.type = 'button'; button.title = title; button.setAttribute('aria-label', title);
          button.append(siteIcon(icon));
          const label = document.createElement('span'); label.textContent = title; label.hidden = index < 4; button.append(label);
          if (index < 4) { const count = document.createElement('span'); count.textContent = cache.get(url.href)?.[index] == null ? '' : String(cache.get(url.href)![index]); counts.push(count); button.append(count); }
          button.addEventListener('click', () => view.open(link, title), { signal: ctx.signal }); bar.append(button);
        });
        const quick = document.createElement('button'); quick.type = 'button'; quick.title = '快速回复'; quick.setAttribute('aria-label', '快速回复'); quick.append(siteIcon('lightning'));
        quick.addEventListener('click', () => quickReplies.open(link), { signal: ctx.signal }); bar.append(quick);
        const loading = document.createElement('span'); loading.className = 'nspp-count-loading'; loading.textContent = '加载中'; loading.setAttribute('role', 'status'); loading.hidden = true; bar.append(loading);
        const category = row.querySelector<HTMLAnchorElement>('.post-category');
        if (category) { const link = document.createElement('a'); link.className = 'nspp-action-category'; link.href = category.href; link.textContent = category.textContent?.trim() || ''; bar.append(link); }
        content.append(bar); moveBlock(row, bar); rows.set(row, { url: url.href, bar, counts });
        if (visible) visible.observe(row); else load(url.href, bar);
        row.addEventListener('mouseenter', () => { void load(url.href, bar); }, { signal: ctx.signal });
        bar.addEventListener('focusin', () => { void load(url.href, bar); }, { signal: ctx.signal });
        for (const [selector, text] of [['.info-author', '作者'], ['.info-views', '浏览'], ['.info-comments-count', '回复'], ['.info-last-commenter', '最后回复']] as const) {
          const group = row.querySelector(selector); if (!group) continue;
          const label = document.createElement('span'); label.className = 'nspp-meta-label'; label.textContent = text;
          const icon = group.querySelector('svg'); if (icon) icon.after(label); else group.prepend(label); labels.push(label);
        }
        const time = row.querySelector('.info-last-comment-time');
        if (time) { const icon = siteIcon('calendar-thirty'); icon.classList.add('nspp-time-icon'); time.prepend(icon); }
      });
    });
    return () => { disposed = true; queue.clear(); visible?.disconnect(); stop(); quickReplies.destroy(); view.destroy(); movedBlocks.forEach((marker, button) => { if (marker.isConnected) marker.replaceWith(button); }); rows.forEach((state, row) => { state.bar.remove(); row.classList.remove('nspp-three-line'); row.querySelector('.nspp-time-icon')?.remove(); }); labels.forEach(label => label.remove()); };
  },
};
