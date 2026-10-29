import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { iconButton, toolIcon } from '../../lib/tool-icon';
import { unsafeWindow } from '../../lib/userscript';
import type { Feature } from '../../core/types';
import { createSheet } from '../../views/sheet';
import { postPath } from '../reading-logic';
export const historyFeature: Feature = {
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
            if (JSON.stringify(stored) !== JSON.stringify(entries)) ctx.set(name, entries);
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
            const read = new Set(load('entries').map(entry => entry.path));
            document.querySelectorAll<HTMLAnchorElement>('.post-title a').forEach(a => { const path = key(a.href); a.classList.toggle('nspp-read', !!path && read.has(path)); });
        };
        const stop = ctx.watch(markRead);
        window.addEventListener('beforeunload', () => record('recent'), { capture: true, signal: ctx.signal });
        const historyButton = document.createElement('button');
        historyButton.type = 'button';
        historyButton.className = 'nspp-tool-icon'; historyButton.dataset.nsppHistoryLauncher = ''; historyButton.title = '阅读历史'; historyButton.setAttribute('aria-label', '阅读历史'); historyButton.append(toolIcon('history'));
        document.querySelector('#nspp-tools')?.append(historyButton);
        let historyDialog: HTMLDialogElement | undefined;
        historyButton.addEventListener('click', () => {
            historyDialog?.remove();
            historyDialog = createSheet('nspp-history', '阅读历史', { tall: true });
            const close = document.createElement('button');
            iconButton(close, 'close', '关闭');
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
            iconButton(clear, 'trash', '清空历史').dataset.danger = '';
            const undoButton = document.createElement('button');
            undoButton.type = 'button';
            undoButton.append(toolIcon('undo'), '撤销');
            undoButton.className = 'nspp-history-undo'; undoButton.title = '撤销删除';
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
            const list = document.createElement('ol'); list.className = 'nspp-sheet-body';
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
                        const clearDay = document.createElement('button'); clearDay.type = 'button'; iconButton(clearDay, 'clear-day', '清除当天').dataset.danger = '';
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
                    iconButton(remove, 'close', `删除历史：${entry.title}`).dataset.danger = '';
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
                        const restore = document.createElement('button'); restore.type = 'button'; iconButton(restore, 'undo', `重新打开：${entry.title}`);
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
        return () => { stop(); historyButton.remove(); historyDialog?.remove(); document.querySelectorAll('.nspp-read').forEach(a => a.classList.remove('nspp-read')); };
    },
};
