import type { Feature } from '../core/types';
import { createPostPreview } from '../views/post-preview';

export const postPreview: Feature = {
  id: 'post-preview', title: '帖子卡片预览', group: '阅读',
  description: '桌面悬停打开卡片，移动端点击标题直接进入详情；点击图片放大，支持缩放和切换，可从卡片进入原帖。',
  defaults: { enabled: true },
  mount(ctx) {
    const preview = createPostPreview(ctx);
    const bound = new Map<HTMLAnchorElement, string | null>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = ctx.watch(() => {
      for (const link of bound.keys()) if (!link.isConnected) bound.delete(link);
      document.querySelectorAll<HTMLAnchorElement>('.post-list-item .post-title a').forEach(link => {
        if (bound.has(link)) return;
        const url = new URL(link.href, location.origin);
        if (url.origin !== location.origin || !/^\/post-\d+(?:-\d+)?(?:\.html)?\/?$/.test(url.pathname)) return;
        bound.set(link, link.getAttribute('title')); link.removeAttribute('title');
        link.addEventListener('mouseenter', () => {
          if (!matchMedia('(hover: hover)').matches) return;
          preview.keepOpen();
          clearTimeout(timer); timer = setTimeout(() => preview.open(link, 'preview'), 400);
        }, { signal: ctx.signal });
        link.addEventListener('mouseleave', () => { clearTimeout(timer); preview.scheduleClose(); }, { signal: ctx.signal });
        link.addEventListener('click', event => {
          if (matchMedia('(max-width: 600px), (hover: none)').matches || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          clearTimeout(timer);
          preview.open(link, 'preview');
        }, { signal: ctx.signal });
      });
    });
    return () => { stop(); clearTimeout(timer); bound.forEach((title, link) => { if (title !== null) link.setAttribute('title', title); }); bound.clear(); preview.destroy(); };
  },
};
