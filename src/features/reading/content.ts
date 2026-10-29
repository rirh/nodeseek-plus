import { copyButton } from '../../views/copy-button';
import { forumTime } from '../../lib/forum-time';
import type { Feature } from '../../core/types';
import { linksElsewhere, openImagePreview } from '../../views/image-preview';
import { directLink } from '../reading-logic';
import { contentSelector } from './shared';
const units: Record<string, string> = { y: '年', mo: '月', d: '天', h: '小时', min: '分钟', s: '秒' };
export const contentFeature: Feature = {
    id: 'reading-content', title: '内容增强', description: '外链直达、新标签、图片预览、代码复制、Callout 和中文时间。', group: '阅读',
    defaults: { enabled: true, cleanLinks: true, newTab: true, images: true, copyCode: true, callouts: true, chineseTime: true },
    fields: { cleanLinks: { label: '外链直达', type: 'text' }, newTab: { label: '链接在新标签页打开', type: 'text' }, images: { label: '图片预览', type: 'text' }, copyCode: { label: '代码复制', type: 'text' }, callouts: { label: 'Callout 渲染', type: 'text' }, chineseTime: { label: '中文时间', type: 'text' } },
    mount(ctx) {
        // Saving settings reloads the page, so options are fixed for this mount.
        const [cleanLinks, newTab, images, copyCode, callouts, chineseTime] = (['cleanLinks', 'newTab', 'images', 'copyCode', 'callouts', 'chineseTime'] as const).map(key => !!ctx.get(key));
        if (cleanLinks && location.pathname === '/jump') {
            const target = directLink(location.href, location.href);
            if (target && target !== location.href && new URL(target).pathname !== '/jump') location.replace(target);
        }
        const processed = new WeakSet<Element>();
        const undo: (() => void)[] = [];
        const stop = ctx.watch(() => {
            if (cleanLinks || newTab)
                document.querySelectorAll<HTMLAnchorElement>(`${contentSelector} a, .post-title a, a[href*="/jump?to="]`).forEach(a => {
                    if (processed.has(a))
                        return;
                    processed.add(a);
                    const old = [a.getAttribute('href'), a.getAttribute('target'), a.getAttribute('rel')];
                    try {
                        let url = new URL(a.href);
                        if (cleanLinks) {
                            const resolved = directLink(a.href, location.href);
                            if (!resolved)
                                return;
                            url = new URL(resolved);
                        }
                        if (!/^https?:$/.test(url.protocol))
                            return;
                        const retarget = newTab && !url.hash;
                        if (!(cleanLinks && a.href !== url.href) && !retarget)
                            return;
                        if (cleanLinks)
                            a.href = url.href;
                        if (retarget) {
                            a.target = '_blank';
                            a.rel = 'noopener noreferrer';
                        }
                        undo.push(() => ['href', 'target', 'rel'].forEach((key, i) => old[i] === null ? a.removeAttribute(key) : a.setAttribute(key, old[i]!)));
                    }
                    catch { /* Leave unknown URL formats unchanged. */ }
                });
            if (copyCode)
                document.querySelectorAll<HTMLElement>(`${contentSelector} pre`).forEach(pre => {
                    if (processed.has(pre))
                        return;
                    processed.add(pre);
                    const button = copyButton(ctx, () => pre.querySelector('code')?.textContent || pre.textContent || '', '复制代码');
                    button.dataset.nsppCopy = 'true';
                    pre.before(button);
                    undo.push(() => button.remove());
                });
            if (chineseTime)
                document.querySelectorAll<HTMLElement>('time, .date-created, .date-updated').forEach(el => {
                    if (processed.has(el) || el.children.length)
                        return;
                    processed.add(el);
                    const old = el.textContent;
                    const value = forumTime(el.getAttribute('datetime') || old || '')?.text || (old || '').replace(/just now/gi, '刚刚').replace(/^edited\s*/i, '编辑于 ').replace(/(\d+)\s*(mo(?:nths?)?|min(?:utes?)?|y(?:ears?)?|d(?:ays?)?|h(?:ours?)?|s(?:econds?)?)\b/gi, (_, n: string, unit: string) => `${n}${units[unit.toLowerCase().startsWith('mo') ? 'mo' : unit.toLowerCase().startsWith('min') ? 'min' : unit[0]!.toLowerCase()]}`).replace(/\s*ago/gi, '前');
                    if (old !== value) {
                        el.textContent = value;
                        undo.push(() => { el.textContent = old; });
                    }
                });
            if (callouts)
                document.querySelectorAll<HTMLElement>(`${contentSelector} blockquote`).forEach(el => {
                    if (processed.has(el))
                        return;
                    processed.add(el);
                    const p = el.querySelector('p');
                    const match = p?.textContent?.match(/^\[!([a-z]+)\]([+-])?\s*([^\n]*)/i);
                    if (!p || !match)
                        return;
                    const details = document.createElement('details');
                    details.className = 'nspp-callout';
                    details.open = match[2] !== '-';
                    const title = document.createElement('summary');
                    title.textContent = match[3] || match[1]!.toUpperCase();
                    details.append(title);
                    const clone = el.cloneNode(true) as HTMLElement;
                    clone.querySelectorAll('[data-nspp-copy]').forEach(button => button.remove());
                    const first = clone.querySelector('p');
                    if (first)
                        first.textContent = (first.textContent || '').slice(match[0].length);
                    details.append(...Array.from(clone.childNodes));
                    el.replaceWith(details);
                    undo.push(() => details.replaceWith(el));
                });
        });
        let closeViewer: (() => void) | undefined;
        if (images)
            window.addEventListener('click', e => {
                if (!(e.target instanceof Element) || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)
                    return;
                const img = (e.target as Element).closest<HTMLImageElement>(`${contentSelector} img`);
                if (!img)
                    return;
                // Linked banners follow their link; also keep the site's own viewer from enlarging them.
                if (linksElsewhere(img)) {
                    e.stopImmediatePropagation();
                    return;
                }
                e.preventDefault();
                // Claim the image before the site's document/element viewer handlers.
                e.stopImmediatePropagation();
                closeViewer?.();
                const gallery = Array.from(document.querySelectorAll<HTMLImageElement>(`${contentSelector} img`)).filter(image => image === img || !linksElsewhere(image));
                closeViewer = openImagePreview(gallery, img, () => { closeViewer = undefined; });
            }, { capture: true, signal: ctx.signal });
        return () => { stop(); closeViewer?.(); undo.reverse().forEach(fn => fn()); };
    },
};
