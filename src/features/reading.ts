import { toolIcon } from '../lib/tool-icon';
import type { Context, Feature } from '../core/types';
import { format, formatDistance, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { postPath, directLink } from './reading-logic';
const contentSelector = ':is(.post-content,.comment-content,.nsk-content,.markdown-body)';
function style(css: string) { const el = document.createElement('style'); el.textContent = css; document.head.append(el); return () => el.remove(); }
function infinite(ctx: Context) {
    const comments = /^\/post-/.test(location.pathname);
    if (!ctx.get<boolean>(comments ? 'comments' : 'posts'))
        return;
    const selector = comments ? 'ul.comments' : 'ul.post-list:not(.topic-carousel-panel)';
    const list = document.querySelector(selector);
    if (!list)
        return;
    let next = document.querySelector<HTMLAnchorElement>('.nsk-pager a.pager-next')?.href;
    let busy = false, failed = false;
    const visited = new Set([location.href]);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nspp-action';
    button.textContent = '加载下一页';
    list.after(button);
    const load = async () => {
        if (busy || !next || visited.has(next) || ctx.signal.aborted)
            return;
        const url = new URL(next, location.href);
        if (url.origin !== location.origin)
            return;
        busy = true;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.textContent = '正在加载…';
        try {
            const html = await ctx.request<string>(url.href, { responseType: 'text', signal: ctx.signal });
            if (ctx.signal.aborted)
                return;
            const page = new DOMParser().parseFromString(html, 'text/html');
            const source = page.querySelector(selector);
            if (!source || !source.children.length)
                throw new Error('页面内容不可用');
            source.querySelectorAll('script, iframe, object, embed, base, link, style').forEach(el => el.remove());
            source.querySelectorAll('*').forEach(el => {
                for (const attr of Array.from(el.attributes)) {
                    if (/^on/i.test(attr.name) || attr.name === 'srcdoc') {
                        el.removeAttribute(attr.name);
                    } else if (/^(href|src|action|formaction|xlink:href)$/i.test(attr.name)) {
                        try {
                            const resolved = new URL(attr.value, url);
                            if (!['http:', 'https:', 'mailto:', 'tel:'].includes(resolved.protocol)) el.removeAttribute(attr.name);
                            else if (!attr.value.startsWith('#')) el.setAttribute(attr.name, resolved.href);
                        } catch { el.removeAttribute(attr.name); }
                    }
                }
            });
            // Imported comments retain their page link; no private Vue instances or inline scripts are executed.
            const marker = document.createElement('li');
            const link = document.createElement('a');
            link.href = url.href;
            link.textContent = '查看本页原始内容与回复操作';
            marker.append(link);
            list.append(marker);
            for (const child of Array.from(source.children)) {
                const id = child.id;
                if (id && document.getElementById(id))
                    continue;
                if (!comments) {
                    const href = child.querySelector<HTMLAnchorElement>('.post-title a')?.getAttribute('href');
                    if (href && Array.from(list.querySelectorAll<HTMLAnchorElement>('.post-title a')).some(a => postPath(a.href, location.href) === postPath(href, url.href)))
                        continue;
                }
                list.append(document.importNode(child, true));
            }
            visited.add(url.href);
            failed = false;
            const href = page.querySelector<HTMLAnchorElement>('.nsk-pager a.pager-next')?.getAttribute('href');
            next = href ? new URL(href, url).href : undefined;
            if (next && visited.has(next))
                next = undefined;
            button.textContent = next ? '加载下一页' : '已加载全部内容';
        }
        catch {
            failed = true;
            button.textContent = '加载失败，点击重试';
        }
        finally {
            busy = false;
            button.disabled = !next;
            button.removeAttribute('aria-busy');
        }
    };
    button.addEventListener('click', () => { void load(); }, { signal: ctx.signal });
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting) && !failed)
        void load(); }, { rootMargin: '600px' });
    if (next)
        observer.observe(button);
    else
        button.hidden = true;
    return () => { observer.disconnect(); button.remove(); };
}
const historyFeature: Feature = {
    id: 'reading-history', title: '阅读历史与已读标记', description: '本地记录最近 500 个帖子，标题显示已读颜色；不上传记录。', group: '阅读', defaults: { enabled: true },
    mount(ctx) {
        type Entry = {
            path: string;
            title: string;
            time: number;
        };
        const stored = ctx.get<Entry[]>('entries');
        let entries: Entry[] = Array.isArray(stored) ? stored.flatMap(entry => { const path = entry && typeof entry.path === 'string' ? postPath(entry.path, location.href) : undefined; return path ? [{ ...entry, path }] : []; }) : [];
        const record = (path: string, title: string) => { entries = [{ path, title, time: Date.now() }, ...entries.filter(e => e.path !== path)].slice(0, 500); ctx.set('entries', entries); };
        const key = (href: string) => postPath(href, location.href);
        const current = key(location.href);
        if (current)
            record(current, document.title);
        const stop = ctx.watch(() => document.querySelectorAll<HTMLAnchorElement>('.post-title a').forEach(a => { const path = key(a.href); a.classList.toggle('nspp-read', !!path && entries.some(e => e.path === path)); }));
        document.addEventListener('click', e => { const a = (e.target as Element).closest<HTMLAnchorElement>('.post-title a'); if (a) {
            const path = key(a.href);
            if (path) {
                record(path, a.textContent || '');
                a.classList.add('nspp-read');
            }
        } }, { signal: ctx.signal });
        const historyButton = document.createElement('button');
        historyButton.type = 'button';
        historyButton.className = 'nspp-tool-icon'; historyButton.title = '阅读历史'; historyButton.setAttribute('aria-label', '阅读历史'); historyButton.append(toolIcon('history'));
        document.querySelector('#nspp-tools')?.append(historyButton);
        let historyDialog: HTMLDialogElement | undefined;
        historyButton.addEventListener('click', () => {
            historyDialog?.remove();
            historyDialog = document.createElement('dialog');
            historyDialog.className = 'nspp-history';
            historyDialog.setAttribute('aria-label', '阅读历史');
            const close = document.createElement('button');
            close.textContent = '关闭';
            close.type = 'button';
            close.addEventListener('click', () => historyDialog?.close(), { signal: ctx.signal });
            const heading = document.createElement('h2');
            heading.textContent = '阅读历史';
            const search = document.createElement('input');
            search.type = 'search';
            search.placeholder = '搜索历史标题';
            search.setAttribute('aria-label', '搜索阅读历史');
            const clear = document.createElement('button');
            clear.type = 'button';
            clear.textContent = '清空历史';
            const undoButton = document.createElement('button');
            undoButton.type = 'button';
            undoButton.textContent = '撤销删除';
            undoButton.hidden = true;
            let previous: Entry[] | undefined;
            const list = document.createElement('ol');
            const save = () => {
                ctx.set('entries', entries);
                document.querySelectorAll<HTMLAnchorElement>('.post-title a').forEach(a => {
                    a.classList.toggle('nspp-read', entries.some(entry => entry.path === key(a.href)));
                });
            };
            const render = () => {
                list.replaceChildren();
                const now = new Date();
                const monthAgo = subMonths(now, 1);
                const query = search.value.trim().toLowerCase();
                const matches = entries.filter(entry => entry.title.toLowerCase().includes(query));
                for (const entry of matches) {
                    if (!/^\/post-\d+-1$/.test(entry.path))
                        continue;
                    const li = document.createElement('li');
                    const link = document.createElement('a');
                    link.href = entry.path;
                    link.textContent = entry.title;
                    const remove = document.createElement('button');
                    remove.type = 'button';
                    remove.textContent = '删除';
                    remove.setAttribute('aria-label', `删除历史：${entry.title}`);
                    remove.addEventListener('click', () => {
                        previous = [...entries];
                        entries = entries.filter(item => item.path !== entry.path);
                        undoButton.hidden = false;
                        save();
                        render();
                    }, { signal: ctx.signal });
                    const date = document.createElement('time');
                    const visitedAt = new Date(entry.time);
                    date.textContent = visitedAt < monthAgo
                        ? format(visitedAt, 'yyyy-MM-dd')
                        : formatDistance(visitedAt, now, { addSuffix: true, locale: zhCN });
                    date.title = format(visitedAt, 'yyyy-MM-dd HH:mm:ss');
                    link.title = entry.title;
                    li.append(link, date, remove);
                    list.append(li);
                }
                if (!matches.length) {
                    const empty = document.createElement('li');
                    empty.textContent = query ? '没有匹配的记录' : '尚无阅读记录';
                    list.append(empty);
                }
            };
            clear.addEventListener('click', () => {
                previous = [...entries];
                entries = [];
                undoButton.hidden = false;
                save();
                render();
            }, { signal: ctx.signal });
            undoButton.addEventListener('click', () => {
                if (previous)
                    entries = previous;
                previous = undefined;
                undoButton.hidden = true;
                save();
                render();
            }, { signal: ctx.signal });
            search.addEventListener('input', render, { signal: ctx.signal });
            const header = document.createElement('header'); header.append(heading, close);
            const toolbar = document.createElement('div'); toolbar.className = 'nspp-history-toolbar'; toolbar.append(search, clear, undoButton);
            historyDialog.append(header, toolbar, list);
            render();
            document.body.append(historyDialog);
            historyDialog.showModal();
        }, { signal: ctx.signal });
        const remove = style('.post-title a.nspp-read{opacity:.6;text-decoration:underline dotted}');
        return () => { stop(); remove(); historyButton.remove(); historyDialog?.remove(); document.querySelectorAll('.nspp-read').forEach(a => a.classList.remove('nspp-read')); };
    },
};
const content: Feature = {
    id: 'reading-content', title: '内容增强', description: '外链直达、新标签、图片预览、代码复制、Callout 和中文时间。', group: '阅读',
    defaults: { enabled: true, cleanLinks: true, newTab: true, images: true, copyCode: true, callouts: true, chineseTime: true },
    fields: { cleanLinks: { label: '外链直达', type: 'text' }, newTab: { label: '链接在新标签页打开', type: 'text' }, images: { label: '图片预览', type: 'text' }, copyCode: { label: '代码复制', type: 'text' }, callouts: { label: 'Callout 渲染', type: 'text' }, chineseTime: { label: '中文时间', type: 'text' } },
    mount(ctx) {
        const processed = new WeakSet<Element>();
        const undo: (() => void)[] = [];
        const stop = ctx.watch(() => {
            document.querySelectorAll<HTMLAnchorElement>(`${contentSelector} a, .post-title a`).forEach(a => {
                if (processed.has(a))
                    return;
                processed.add(a);
                const old = [a.getAttribute('href'), a.getAttribute('target'), a.getAttribute('rel')];
                try {
                    let url = new URL(a.href);
                    if (ctx.get('cleanLinks')) {
                        const resolved = directLink(a.href, location.href);
                        if (!resolved)
                            return;
                        url = new URL(resolved);
                    }
                    if (!/^https?:$/.test(url.protocol))
                        return;
                    if (ctx.get('cleanLinks'))
                        a.href = url.href;
                    if (ctx.get('newTab') && !url.hash) {
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                    }
                    undo.push(() => ['href', 'target', 'rel'].forEach((key, i) => old[i] === null ? a.removeAttribute(key) : a.setAttribute(key, old[i]!)));
                }
                catch { /* Leave unknown URL formats unchanged. */ }
            });
            if (ctx.get('copyCode'))
                document.querySelectorAll<HTMLElement>(`${contentSelector} pre`).forEach(pre => {
                    if (processed.has(pre))
                        return;
                    processed.add(pre);
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.textContent = '复制代码';
                    button.dataset.nsppCopy = 'true';
                    button.addEventListener('click', async () => { button.disabled = true; button.textContent = '复制中…'; button.setAttribute('aria-busy', 'true'); try {
                        await navigator.clipboard.writeText(pre.querySelector('code')?.textContent || pre.textContent || '');
                        ctx.notify('代码已复制');
                    }
                    catch {
                        ctx.notify('复制失败，请手动选择代码');
                    }
                    finally {
                        button.disabled = false;
                        button.removeAttribute('aria-busy');
                        button.textContent = '复制代码';
                    } }, { signal: ctx.signal });
                    pre.before(button);
                    undo.push(() => button.remove());
                });
            if (ctx.get('chineseTime'))
                document.querySelectorAll<HTMLElement>('time, .date-created, .date-updated').forEach(el => {
                    if (processed.has(el) || el.children.length)
                        return;
                    processed.add(el);
                    const old = el.textContent;
                    const date = new Date(el.getAttribute('datetime') || '');
                    const units: Record<string, string> = { y: '年', mo: '月', d: '天', h: '小时', min: '分钟', s: '秒' };
                    const translated = (old || '').replace(/just now/gi, '刚刚').replace(/^edited\s*/i, '编辑于 ').replace(/(\d+)\s*(mo(?:nths?)?|min(?:utes?)?|y(?:ears?)?|d(?:ays?)?|h(?:ours?)?|s(?:econds?)?)\b/gi, (_, n: string, unit: string) => `${n}${units[unit.toLowerCase().startsWith('mo') ? 'mo' : unit.toLowerCase().startsWith('min') ? 'min' : unit[0]!.toLowerCase()]}`).replace(/\s*ago/gi, '前');
                    const value = Number.isFinite(date.getTime()) ? date.toLocaleString('zh-CN') : translated;
                    if (old !== value) {
                        el.textContent = value;
                        undo.push(() => { el.textContent = old; });
                    }
                });
            if (ctx.get('callouts'))
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
        const remove = style('.nspp-callout{border-inline-start:3px solid currentColor;padding:10px 16px;margin:1em 0}.nspp-callout summary{cursor:pointer;font-weight:600}.nspp-image-viewer{max-width:95vw;max-height:95vh;padding:12px}.nspp-image-viewer img{max-width:90vw;max-height:82vh;object-fit:contain}.nspp-image-viewer::backdrop{background:rgb(0 0 0 / .8)}');
        let dialog: HTMLDialogElement | undefined;
        if (ctx.get('images'))
            document.addEventListener('click', e => {
                const img = (e.target as Element).closest<HTMLImageElement>(`${contentSelector} img`);
                if (!img)
                    return;
                e.preventDefault();
                dialog?.remove();
                dialog = document.createElement('dialog');
                dialog.className = 'nspp-image-viewer';
                const close = document.createElement('button');
                close.textContent = '关闭预览';
                close.type = 'button';
                close.addEventListener('click', () => dialog?.close(), { signal: ctx.signal });
                const large = document.createElement('img');
                const gallery = Array.from(document.querySelectorAll<HTMLImageElement>(`${contentSelector} img`));
                let index = Math.max(0, gallery.indexOf(img));
                const count = document.createElement('span');
                const previous = document.createElement('button');
                previous.type = 'button';
                previous.textContent = '上一张';
                const next = document.createElement('button');
                next.type = 'button';
                next.textContent = '下一张';
                const display = () => {
                    const selected = gallery[index]!;
                    large.src = selected.currentSrc || selected.src;
                    large.alt = selected.alt;
                    count.textContent = `${index + 1} / ${gallery.length}`;
                    previous.disabled = index === 0;
                    next.disabled = index === gallery.length - 1;
                };
                previous.addEventListener('click', () => { index--; display(); }, { signal: ctx.signal });
                next.addEventListener('click', () => { index++; display(); }, { signal: ctx.signal });
                dialog.addEventListener('keydown', event => {
                    if (event.key === 'ArrowLeft' && index > 0) {
                        event.preventDefault();
                        index--;
                        display();
                    }
                    if (event.key === 'ArrowRight' && index < gallery.length - 1) {
                        event.preventDefault();
                        index++;
                        display();
                    }
                }, { signal: ctx.signal });
                display();
                dialog.append(close, previous, count, next, large);
                document.body.append(dialog);
                dialog.showModal();
            }, { signal: ctx.signal });
        return () => { stop(); remove(); dialog?.remove(); undo.reverse().forEach(fn => fn()); };
    },
};
export const readingFeatures: Feature[] = [
    { id: 'infinite-scroll', title: '自动翻页', description: '合并下一页帖子或评论；失败时手动重试。新增评论的互动请通过原始页面链接操作。', group: '阅读', defaults: { enabled: true, posts: true, comments: false }, fields: { posts: { label: '帖子自动翻页', type: 'text' }, comments: { label: '评论自动翻页（仅阅读）', type: 'text' } }, mount: infinite },
    historyFeature, content,
    { id: 'reading-navigation', title: '夜间模式与阅读导航', description: '返回顶部；Alt + ↑ / ↓ 跳转页首或页尾，不占用编辑器按键。', group: '外观', defaults: { enabled: true, dark: false, keyboard: true }, fields: { dark: { label: '启用夜间模式', type: 'text' }, keyboard: { label: '启用阅读快捷键', type: 'text' } }, mount(ctx) {
            const previous = document.body.classList.contains('dark-layout');
            if (ctx.get('dark'))
                document.body.classList.add('dark-layout');
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'nspp-tool-icon'; button.title = '返回顶部'; button.setAttribute('aria-label', button.title); button.append(toolIcon('top'));
            const syncTop = () => { button.hidden = window.scrollY <= 32; };
            syncTop();
            window.addEventListener('scroll', syncTop, { passive: true, signal: ctx.signal });
            document.querySelector('#nspp-tools')?.append(button);
            button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }), { signal: ctx.signal });
            if (ctx.get('keyboard'))
                document.addEventListener('keydown', e => { if (!e.altKey || !['ArrowUp', 'ArrowDown'].includes(e.key) || (e.target as Element).closest('input,textarea,select,[contenteditable="true"]'))
                    return; e.preventDefault(); window.scrollTo(0, e.key === 'ArrowUp' ? 0 : document.documentElement.scrollHeight); }, { signal: ctx.signal });
            return () => { button.remove(); document.body.classList.toggle('dark-layout', previous); };
        } },
];
readingFeatures.push({
    id: 'reading-focus', title: '只看楼主与长文折叠', description: '可选只看楼主回复，长内容提供展开按钮；默认关闭。', group: '阅读',
    defaults: { enabled: false, authorOnly: false, collapse: true, height: 600 },
    fields: { authorOnly: { label: '只看楼主回复', type: 'text' }, collapse: { label: '折叠长内容', type: 'text' }, height: { label: '折叠高度（像素，最小 200）', type: 'number' } },
    mount(ctx) {
        const owner = document.querySelector<HTMLAnchorElement>('.nsk-content-meta-info .author-info > a[href*="/space/"]')?.getAttribute('href')?.match(/\/space\/(\d+)/)?.[1];
        const hidden = new Map<HTMLElement, boolean | 'until-found'>(), folded = new WeakSet<Element>(), cleanups: (() => void)[] = [];
        const stop = ctx.watch(() => {
            if (ctx.get('authorOnly') && owner)
                document.querySelectorAll<HTMLElement>('ul.comments > li').forEach(item => {
                    const uid = item.querySelector<HTMLAnchorElement>('.author-info > a[href*="/space/"]')?.getAttribute('href')?.match(/\/space\/(\d+)/)?.[1];
                    if (uid && uid !== owner && !hidden.has(item)) {
                        hidden.set(item, item.hidden);
                        item.hidden = true;
                    }
                });
            if (ctx.get('collapse'))
                document.querySelectorAll<HTMLElement>(contentSelector).forEach(el => {
                    if (folded.has(el) || el.parentElement?.closest(contentSelector))
                        return;
                    const height = Math.max(200, Number(ctx.get('height')) || 600);
                    if (el.scrollHeight <= height)
                        return;
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
                });
        });
        return () => { stop(); hidden.forEach((value, el) => { el.hidden = value; }); cleanups.forEach(fn => fn()); };
    },
});

readingFeatures.push({
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
});
