import { toolIcon } from '../../lib/tool-icon';
import type { Context, Feature } from '../../core/types';
import { postPath } from '../reading-logic';
import { sweepShine } from '../../views/sweep-shine';
import { fillFloorMenus, pageFloors } from './floor-menu';
function mount(ctx: Context) {
    const comments = /^\/post-/.test(location.pathname);
    if (!ctx.get<boolean>(comments ? 'comments' : 'posts'))
        return;
    const selector = comments ? 'ul.comments' : 'ul.post-list:not(.topic-carousel-panel)';
    const list = document.querySelector(selector);
    if (!list)
        return;
    let next = document.querySelector<HTMLAnchorElement>('.nsk-pager a.pager-next')?.href;
    let busy = false, failed = false, paused = false;
    const replying = () => comments && document.documentElement.hasAttribute('data-nspp-reply-open');
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
        if (busy || !next || visited.has(next) || ctx.signal.aborted || replying())
            return;
        const url = new URL(next, location.href);
        if (url.origin !== location.origin)
            return;
        busy = true;
        loading = new AbortController();
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.replaceChildren(sweepShine('正在加载…'));
        try {
            const html = await ctx.request<string>(url.href, { responseType: 'text', signal: AbortSignal.any([ctx.signal, loading.signal]) });
            if (ctx.signal.aborted || loading.signal.aborted || replying() || (paused && !manual))
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
            // Collect listed post paths once per page instead of rescanning the whole list for every fetched row.
            const listed = comments ? undefined : new Set(Array.from(list.querySelectorAll<HTMLAnchorElement>('.post-title a'), a => postPath(a.href, location.href)));
            const appended: Element[] = [];
            for (const child of Array.from(source.children)) {
                const id = child.id;
                if (id && document.getElementById(id))
                    continue;
                if (listed) {
                    const href = child.querySelector<HTMLAnchorElement>('.post-title a')?.getAttribute('href');
                    if (href) {
                        const path = postPath(href, url.href);
                        if (listed.has(path))
                            continue;
                        listed.add(path);
                    }
                }
                appended.push(list.appendChild(document.importNode(child, true)));
            }
            // The forum only mounts floor menus for its own page; give copied-in floors theirs from the fetched page.
            if (comments) fillFloorMenus(ctx, appended, pageFloors(page), url.href);
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
            if (loading.signal.aborted && next) button.textContent = paused ? '已暂停，点击加载下一页' : '加载下一页';
            if (loading.signal.aborted && !ctx.signal.aborted && !paused && !replying() && next) { observer.unobserve(button); observer.observe(button); }
        }
    };
    button.addEventListener('click', () => { void load(true); }, { signal: ctx.signal });
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting) && !failed && !paused && !replying() && !document.hidden)
        void load(); }, { rootMargin: '150px' });
    document.addEventListener('nspp:reply-state', () => {
        if (replying()) { observer.disconnect(); loading?.abort(); }
        else if (next && !paused) observer.observe(button);
    }, { signal: ctx.signal });
    // 摸鱼模式 swaps the list for another sort or section in place; start paging again from the new list's pager.
    document.addEventListener('nspp:list-replaced', () => {
        loading?.abort(); busy = false; failed = false;
        visited.clear(); visited.add(location.href);
        next = document.querySelector<HTMLAnchorElement>('.nsk-pager a.pager-next')?.href;
        button.hidden = !next; button.disabled = !next; button.textContent = next ? '加载下一页' : '已加载全部内容'; pause.hidden = !next;
        observer.disconnect();
        if (next && !paused) observer.observe(button);
    }, { signal: ctx.signal });
    if (next)
        observer.observe(button);
    else
        button.hidden = true;
    return () => { observer.disconnect(); loading?.abort(); button.remove(); pause.remove(); };
}
export const infiniteScroll: Feature = { id: 'infinite-scroll', title: '自动翻页', description: '合并下一页帖子或评论；失败时手动重试。接上来的评论楼层同样可以点赞、加鸡腿、反对、引用和回复。', group: '阅读', defaults: { enabled: true, posts: true, comments: false }, fields: { posts: { label: '帖子自动翻页', type: 'text' }, comments: { label: '评论自动翻页', type: 'text' } }, mount };
