import { copyButton } from '../views/copy-button';
import { forumTime } from '../lib/forum-time';
import { toolIcon } from '../lib/tool-icon';
import type { Context, Feature } from '../core/types';
import { format } from 'date-fns';
import { unsafeWindow } from '../lib/userscript';
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
    let busy = false, failed = false, paused = false;
    let loading: AbortController | undefined;
    const visited = new Set([location.href]);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nspp-action';
    button.textContent = '加载下一页';
    list.after(button);
    const pause = document.createElement('button'); pause.type = 'button'; pause.className = 'nspp-tool-icon';
    const renderPause = () => {
        pause.replaceChildren(toolIcon(paused ? 'play' : 'stop'));
        pause.title = paused ? '继续自动翻页' : '暂停自动翻页';
        pause.setAttribute('aria-label', pause.title); pause.setAttribute('aria-pressed', String(paused));
    };
    renderPause();
    if (next) (document.querySelector('#nspp-tools') || document.body).append(pause);
    pause.addEventListener('click', () => {
        paused = !paused; renderPause();
        if (paused) { observer.disconnect(); loading?.abort(); }
        else if (next) observer.observe(button);
    }, { signal: ctx.signal });
    const load = async (manual = false) => {
        if (busy || !next || visited.has(next) || ctx.signal.aborted)
            return;
        const url = new URL(next, location.href);
        if (url.origin !== location.origin)
            return;
        busy = true;
        loading = new AbortController();
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.textContent = '正在加载…';
        try {
            const html = await ctx.request<string>(url.href, { responseType: 'text', signal: AbortSignal.any([ctx.signal, loading.signal]) });
            if (ctx.signal.aborted || (paused && !manual))
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
            pause.hidden = !next;
        }
        catch {
            if (loading.signal.aborted) return;
            failed = true;
            button.textContent = '加载失败，点击重试';
        }
        finally {
            busy = false;
            button.disabled = !next;
            button.removeAttribute('aria-busy');
            if (paused && next) button.textContent = '已暂停，点击加载下一页';
            if (loading.signal.aborted && !ctx.signal.aborted && !paused && next) { observer.unobserve(button); observer.observe(button); }
        }
    };
    button.addEventListener('click', () => { void load(true); }, { signal: ctx.signal });
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting) && !failed && !paused && !document.hidden)
        void load(); }, { rootMargin: '150px' });
    if (next)
        observer.observe(button);
    else
        button.hidden = true;
    return () => { observer.disconnect(); loading?.abort(); button.remove(); pause.remove(); };
}
const historyFeature: Feature = {
    id: 'reading-history', title: '阅读历史与已读标记', description: '本地保存实际浏览与最近关闭的帖子，默认 100 条、7 天，按天分组；不上传记录。', group: '阅读', defaults: { enabled: true, limit: 100, days: 7 },
    fields: { limit: { label: '保存上限', type: 'number' }, days: { label: '保存天数', type: 'number' } },
    mount(ctx) {
        type Entry = {
            path: string;
            title: string;
            time: number;
            uid?: string | number;
            author?: string;
        };
        const limit = Math.max(1, Math.floor(Number(ctx.get('limit')) || 100));
        const maxAge = Math.max(1, Number(ctx.get('days')) || 7) * 86400000;
        const key = (href: string) => postPath(href, location.href);
        const load = (name: string): Entry[] => {
            const stored = ctx.get<Entry[]>(name);
            const clean = (Array.isArray(stored) ? stored : []).flatMap(entry => {
                const path = entry && typeof entry.path === 'string' ? key(entry.path) : undefined;
                return path && typeof entry.title === 'string' && Number.isFinite(entry.time) && Date.now() - entry.time < maxAge ? [{ ...entry, path }] : [];
            }).sort((a, b) => b.time - a.time);
            const seen = new Set<string>();
            const entries = clean.filter(entry => { if (seen.has(entry.path)) return false; seen.add(entry.path); return true; }).slice(0, limit);
            ctx.set(name, entries);
            return entries;
        };
        const record = (name: string) => {
            const pd = (unsafeWindow as Window & { __config__?: { postData?: { postId?: string | number; title?: string; op?: { uid?: string | number; name?: string } } } }).__config__?.postData;
            const path = pd?.postId ? key(`/post-${pd.postId}-1`) : key(location.href);
            if (!path) return;
            ctx.set(name, [{ path, title: pd?.title || document.title, time: Date.now(), uid: pd?.op?.uid, author: pd?.op?.name }, ...load(name).filter(entry => entry.path !== path)].slice(0, limit));
        };
        record('entries');
        load('recent');
        const markRead = () => {
            const entries = load('entries');
            document.querySelectorAll<HTMLAnchorElement>('.post-title a').forEach(a => a.classList.toggle('nspp-read', entries.some(entry => entry.path === key(a.href))));
        };
        const stop = ctx.watch(markRead);
        window.addEventListener('beforeunload', () => record('recent'), { capture: true, signal: ctx.signal });
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
            let tab = 'entries';
            let entries = load(tab);
            const tabs = document.createElement('div'); tabs.className = 'nspp-history-toolbar';
            for (const [name, label] of [['entries', '全部'], ['recent', '最近关闭']]) {
                const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
                button.dataset.tab = name;
                button.addEventListener('click', () => { tab = name; previous = undefined; undoButton.hidden = true; render(); });
                tabs.append(button);
            }
            const list = document.createElement('ol');
            const save = () => {
                ctx.set(tab, entries);
                markRead();
            };
            const render = () => {
                list.replaceChildren();
                entries = load(tab);
                tabs.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tab === tab)));
                let lastDay = '';
                const query = search.value.trim().toLowerCase();
                const matches = entries.filter(entry => entry.title.toLowerCase().includes(query));
                for (const entry of matches) {
                    if (!/^\/post-\d+-1$/.test(entry.path))
                        continue;
                    const day = format(new Date(entry.time), 'yyyy-MM-dd');
                    if (day !== lastDay) {
                        lastDay = day;
                        const group = document.createElement('li'); group.className = 'nspp-history-day';
                        const label = document.createElement('span');
                        label.textContent = `${day === format(new Date(), 'yyyy-MM-dd') ? '今天 - ' : ''}${format(new Date(entry.time), 'yyyy年M月d日 EEEE', { locale: zhCN })}`;
                        const clearDay = document.createElement('button'); clearDay.type = 'button'; clearDay.textContent = '清除当天';
                        clearDay.addEventListener('click', () => { previous = load(tab); entries = previous.filter(item => format(new Date(item.time), 'yyyy-MM-dd') !== day); undoButton.hidden = false; save(); render(); });
                        group.append(label, clearDay); list.append(group);
                    }
                    const li = document.createElement('li');
                    const link = document.createElement('a');
                    link.href = entry.path;
                    link.textContent = entry.title;
                    if (entry.uid && /^\d+$/.test(String(entry.uid))) {
                        const avatar = document.createElement('img'); avatar.className = 'nspp-history-avatar'; avatar.src = `/avatar/${entry.uid}.png`; avatar.alt = ''; avatar.title = entry.author ? `@${entry.author}` : '';
                        avatar.addEventListener('error', () => avatar.remove(), { once: true });
                        link.prepend(avatar);
                    }
                    const remove = document.createElement('button');
                    remove.type = 'button';
                    remove.textContent = '删除';
                    remove.setAttribute('aria-label', `删除历史：${entry.title}`);
                    remove.addEventListener('click', () => {
                        previous = load(tab);
                        entries = previous.filter(item => item.path !== entry.path);
                        undoButton.hidden = false;
                        save();
                        render();
                    }, { signal: ctx.signal });
                    const date = document.createElement('time');
                    const visitedAt = new Date(entry.time);
                    date.textContent = format(visitedAt, 'HH:mm');
                    date.title = format(visitedAt, 'yyyy-MM-dd HH:mm:ss');
                    link.title = entry.title;
                    li.append(link, date);
                    if (tab === 'recent') {
                        const restore = document.createElement('button'); restore.type = 'button'; restore.textContent = '恢复';
                        restore.addEventListener('click', () => window.open(entry.path, '_blank', 'noopener'));
                        li.append(restore);
                    }
                    li.append(remove);
                    list.append(li);
                }
                if (!matches.length) {
                    const empty = document.createElement('li');
                    empty.textContent = query ? '没有匹配的记录' : '尚无阅读记录';
                    list.append(empty);
                }
            };
            clear.addEventListener('click', () => {
                previous = load(tab);
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
            historyDialog.append(header, toolbar, tabs, list);
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
        if (ctx.get('cleanLinks') && location.pathname === '/jump') {
            const target = directLink(location.href, location.href);
            if (target && target !== location.href && new URL(target).pathname !== '/jump') location.replace(target);
        }
        const processed = new WeakSet<Element>();
        const undo: (() => void)[] = [];
        const stop = ctx.watch(() => {
            document.querySelectorAll<HTMLAnchorElement>(`${contentSelector} a, .post-title a, a[href*="/jump?to="]`).forEach(a => {
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
                    const button = copyButton(ctx, () => pre.querySelector('code')?.textContent || pre.textContent || '', '复制代码');
                    button.dataset.nsppCopy = 'true';
                    pre.before(button);
                    undo.push(() => button.remove());
                });
            if (ctx.get('chineseTime'))
                document.querySelectorAll<HTMLElement>('time, .date-created, .date-updated').forEach(el => {
                    if (processed.has(el) || el.children.length)
                        return;
                    processed.add(el);
                    const old = el.textContent;
                    const units: Record<string, string> = { y: '年', mo: '月', d: '天', h: '小时', min: '分钟', s: '秒' };
                    const translated = (old || '').replace(/just now/gi, '刚刚').replace(/^edited\s*/i, '编辑于 ').replace(/(\d+)\s*(mo(?:nths?)?|min(?:utes?)?|y(?:ears?)?|d(?:ays?)?|h(?:ours?)?|s(?:econds?)?)\b/gi, (_, n: string, unit: string) => `${n}${units[unit.toLowerCase().startsWith('mo') ? 'mo' : unit.toLowerCase().startsWith('min') ? 'min' : unit[0]!.toLowerCase()]}`).replace(/\s*ago/gi, '前');
                    const value = forumTime(el.getAttribute('datetime') || old || '')?.text || translated;
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
