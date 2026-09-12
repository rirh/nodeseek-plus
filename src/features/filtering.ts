import { userBadges } from './user-badges';
import type { Feature } from '../core/types';
import { filterLines as lines, shouldFilter } from './reading-logic';
const authorSelector = '.author-info > a[href*="/space/"], .info-author, .post-author';
export const filteringFeatures: Feature[] = [
    {
        id: 'hide-sidebar-ads', title: '屏蔽侧栏广告', description: '隐藏侧栏广告卡片，保留版块简介与其他正常内容。', group: '外观',
        defaults: { enabled: true },
        mount() {
            const style = document.createElement('style');
            style.textContent = '.promotation-item { display: none !important; }';
            document.head.append(style);
            return () => style.remove();
        },
    },
    {
        id: 'content-filter', title: '帖子与用户过滤', description: '关键词按标题包含匹配，用户按名称精确匹配；等级过滤仅隐藏超过当前等级的锁定帖子。', group: '过滤',
        defaults: { enabled: true, keywords: '', users: '', level: -1, mode: 'hide', highlight: false },
        fields: { mode: { label: '过滤方式', type: 'select', options: [{ label: '隐藏', value: 'hide' }, { label: '折叠，可展开', value: 'collapse' }, { label: '保留，只高亮', value: 'highlight' }] }, highlight: { label: '高亮匹配的标题关键词', type: 'text' }, keywords: { label: '屏蔽标题关键词（每行一个）', type: 'textarea' }, users: { label: '屏蔽用户名（每行一个）', type: 'textarea' }, level: { label: '当前等级（-1 不过滤锁定帖子）', type: 'number' } },
        mount(ctx) {
            const keywords = lines(ctx.get('keywords')).map(s => s.toLowerCase()), users = lines(ctx.get('users'));
            const hidden = new Map<HTMLElement, boolean | "until-found">();
            const seen = new WeakSet<Element>();
            const restore: (() => void)[] = [];
            const stop = ctx.watch(() => {
                document.querySelectorAll<HTMLElement>('.post-list-item, .comments .content-item').forEach(item => {
                    if (seen.has(item))
                        return;
                    seen.add(item);
                    const title = item.querySelector('.post-title a')?.textContent?.toLowerCase() || '';
                    const author = item.querySelector(authorSelector)?.textContent?.trim() || '';
                    const lock = item.querySelector('use[href="#lock"]');
                    const required = Number(lock?.closest('span')?.textContent?.match(/\d+/)?.[0] ?? NaN);
                    const level = Number(ctx.get('level'));
                    if (shouldFilter(title, author, keywords, users, level, required)) {
                        const mode = ctx.get<string>('mode');
                        if (mode !== 'highlight') {
                            hidden.set(item, item.hidden);
                            item.hidden = true;
                            if (mode === 'collapse') {
                                const placeholder = document.createElement(item.tagName === 'LI' ? 'li' : 'div');
                                const button = document.createElement('button');
                                button.type = 'button';
                                button.textContent = '已过滤内容，点击展开';
                                button.setAttribute('aria-expanded', 'false');
                                button.addEventListener('click', () => {
                                    item.hidden = !item.hidden;
                                    button.setAttribute('aria-expanded', String(!item.hidden));
                                    button.textContent = item.hidden ? '已过滤内容，点击展开' : '收起过滤内容';
                                }, { signal: ctx.signal });
                                placeholder.append(button);
                                item.before(placeholder);
                                restore.push(() => placeholder.remove());
                            }
                        }
                        if (ctx.get('highlight') || mode === 'highlight') {
                            const anchor = item.querySelector('.post-title a');
                            if (anchor) {
                                const walker = document.createTreeWalker(anchor, NodeFilter.SHOW_TEXT);
                                const nodes: Text[] = [];
                                while (walker.nextNode())
                                    nodes.push(walker.currentNode as Text);
                                for (const node of nodes) {
                                    const text = node.data;
                                    const ranges: [
                                        number,
                                        number
                                    ][] = [];
                                    for (const keyword of keywords) {
                                        let at = text.toLowerCase().indexOf(keyword);
                                        while (at >= 0) {
                                            ranges.push([at, at + keyword.length]);
                                            at = text.toLowerCase().indexOf(keyword, at + keyword.length);
                                        }
                                    }
                                    if (!ranges.length)
                                        continue;
                                    ranges.sort((a, b) => a[0] - b[0]);
                                    const fragment = document.createDocumentFragment();
                                    let offset = 0;
                                    for (const [start, end] of ranges) {
                                        if (start < offset)
                                            continue;
                                        fragment.append(text.slice(offset, start));
                                        const mark = document.createElement('mark');
                                        mark.textContent = text.slice(start, end);
                                        fragment.append(mark);
                                        offset = end;
                                    }
                                    fragment.append(text.slice(offset));
                                    const inserted = Array.from(fragment.childNodes);
                                    node.replaceWith(fragment);
                                    restore.push(() => {
                                        inserted[0]?.before(node);
                                        inserted.forEach(child => child.remove());
                                    });
                                }
                            }
                        }
                    }
                });
            });
            return () => { stop(); hidden.forEach((value, item) => { item.hidden = value; }); restore.reverse().forEach(fn => fn()); };
        },
    },
    {
        id: 'user-notes', title: '用户备注', description: '仅保存在本机，用户名后显示备注；可在设置中编辑。', group: '用户', defaults: { enabled: true, notes: '' },
        fields: { notes: { label: '备注（每行 用户名=备注）', type: 'textarea' } },
        mount(ctx) {
            const notes = new Map(String(ctx.get('notes') || '').split('\n').flatMap(line => { const index = line.indexOf('='); return index > 0 ? [[line.slice(0, index).trim(), line.slice(index + 1).trim()] as [
                    string,
                    string
                ]] : []; }));
            const seen = new WeakSet<Element>(), added: Element[] = [];
            const stop = ctx.watch(() => document.querySelectorAll(authorSelector).forEach(author => {
                if (seen.has(author))
                    return;
                seen.add(author);
                const note = notes.get(author.textContent?.trim() || '');
                if (!note)
                    return;
                const badge = document.createElement('span');
                badge.textContent = ` [${note}]`;
                badge.className = 'nspp-user-note';
                author.after(badge);
                added.push(badge);
            }));
            return () => { stop(); added.forEach(el => el.remove()); };
        },
    },
    userBadges,
];
