import type { Feature } from '../../core/types';
import { contentSelector } from './shared';

export const navigationFeature: Feature = {
    id: 'reading-navigation', title: '夜间模式与阅读导航', description: 'Alt + ↑ / ↓ 跳转页首或页尾，不占用编辑器按键。', group: '外观',
    defaults: { enabled: true, dark: false, keyboard: true },
    fields: { dark: { label: '启用夜间模式', type: 'text' }, keyboard: { label: '启用阅读快捷键', type: 'text' } },
    mount(ctx) {
        const previous = document.body.classList.contains('dark-layout');
        if (ctx.get('dark'))
            document.body.classList.add('dark-layout');
        if (ctx.get('keyboard'))
            document.addEventListener('keydown', e => {
                if (!e.altKey || !['ArrowUp', 'ArrowDown'].includes(e.key) || (e.target as Element).closest('input,textarea,select,[contenteditable="true"]'))
                    return;
                e.preventDefault();
                window.scrollTo(0, e.key === 'ArrowUp' ? 0 : document.documentElement.scrollHeight);
            }, { signal: ctx.signal });
        return () => { document.body.classList.toggle('dark-layout', previous); };
    },
};

export const focusFeature: Feature = {
    id: 'reading-focus', title: '只看楼主与长文折叠', description: '可选只看楼主回复，长内容提供展开按钮；默认关闭。', group: '阅读',
    defaults: { enabled: false, authorOnly: false, collapse: true, height: 600 },
    fields: { authorOnly: { label: '只看楼主回复', type: 'text' }, collapse: { label: '折叠长内容', type: 'text' }, height: { label: '折叠高度（像素，最小 200）', type: 'number' } },
    mount(ctx) {
        const spaceId = (anchor: HTMLAnchorElement | null) => anchor?.getAttribute('href')?.match(/\/space\/(\d+)/)?.[1];
        const owner = spaceId(document.querySelector<HTMLAnchorElement>('.nsk-content-meta-info .author-info > a[href*="/space/"]'));
        const authorOnly = !!ctx.get('authorOnly') && !!owner, collapse = !!ctx.get('collapse');
        const height = Math.max(200, Number(ctx.get('height')) || 600);
        const hidden = new Map<HTMLElement, boolean | 'until-found'>(), checked = new WeakSet<Element>(), folded = new WeakSet<Element>(), cleanups: (() => void)[] = [];
        const fold = (el: HTMLElement) => {
            folded.add(el);
            const previousHeight = el.style.maxHeight, previousOverflow = el.style.overflow;
            el.style.maxHeight = `${height}px`;
            el.style.overflow = 'hidden';
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = '展开长内容';
            button.setAttribute('aria-expanded', 'false');
            el.after(button);
            button.addEventListener('click', () => { const open = button.getAttribute('aria-expanded') !== 'true'; el.style.maxHeight = open ? previousHeight : `${height}px`; el.style.overflow = open ? previousOverflow : 'hidden'; button.setAttribute('aria-expanded', String(open)); button.textContent = open ? '收起长内容' : '展开长内容'; }, { signal: ctx.signal });
            cleanups.push(() => { el.style.maxHeight = previousHeight; el.style.overflow = previousOverflow; button.remove(); });
        };
        const stop = ctx.watch(() => {
            if (authorOnly)
                document.querySelectorAll<HTMLElement>('ul.comments > li').forEach(item => {
                    if (checked.has(item)) return;
                    const uid = spaceId(item.querySelector<HTMLAnchorElement>('.author-info > a[href*="/space/"]'));
                    if (!uid) return; // Not rendered yet; check again on the next change.
                    checked.add(item);
                    if (uid !== owner) {
                        hidden.set(item, item.hidden);
                        item.hidden = true;
                    }
                });
            if (collapse) {
                // Measure every candidate before folding any, so each tick forces one layout instead of one per post.
                const tall = Array.from(document.querySelectorAll<HTMLElement>(contentSelector))
                    .filter(el => !folded.has(el) && !el.parentElement?.closest(contentSelector))
                    .filter(el => el.scrollHeight > height);
                tall.forEach(fold);
            }
        });
        return () => { stop(); hidden.forEach((value, el) => { el.hidden = value; }); cleanups.forEach(fn => fn()); };
    },
};

export const postStatusFeature: Feature = {
    id: 'post-status-style', title: '紧凑帖子状态', description: '统一只读与置顶标记的尺寸、颜色和间距。', group: '外观', defaults: { enabled: true },
    mount(ctx) {
        const marked = new Set<HTMLElement | SVGElement>();
        const stop = ctx.watch(() => {
            document.querySelectorAll<HTMLElement>('.post-title span, .post-title small, .post-title em').forEach(node => {
                if (node.children.length || node.textContent?.trim() !== '只读' || node.closest('a[href*="/post-"]')) return;
                node.classList.add('nspp-readonly'); marked.add(node);
            });
            document.querySelectorAll<SVGUseElement>('.post-title use').forEach(use => {
                const href = use.getAttribute('href') || use.getAttribute('xlink:href') || '';
                if (!/^#(?:pin|pushpin|push-pin|top)(?:-|$)/i.test(href)) return;
                const svg = use.closest('svg'); if (!svg) return;
                svg.classList.add('nspp-pinned'); marked.add(svg);
                const parent = svg.parentElement;
                if (parent && parent.children.length === 1 && !parent.textContent?.trim() && !parent.matches('a, .post-title')) {
                    parent.classList.add('nspp-pin-wrap'); marked.add(parent);
                }
            });
        });
        return () => { stop(); marked.forEach(node => node.classList.remove('nspp-readonly', 'nspp-pinned', 'nspp-pin-wrap')); };
    },
};
