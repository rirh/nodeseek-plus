import { officialBlocklist } from './blocklist';
import type { Feature } from '../core/types';
import { filterLines } from './reading-logic';
const authors = '.author-info > a[href*="/space/"], .info-author, .post-author';
export const relationshipFeatures: Feature[] = [
    {
        id: 'local-friends',
        title: '本地好友高亮',
        description: '按用户名精确匹配，仅保存在本机，不发送关注请求。',
        group: '用户',
        defaults: { enabled: true, users: '' },
        fields: { users: { label: '好友用户名（每行一个）', type: 'textarea' } },
        mount(ctx) {
            const friends = new Set(filterLines(ctx.get('users')));
            const seen = new WeakSet<Element>();
            const badges: Element[] = [];
            const stop = ctx.watch(() => {
                document.querySelectorAll(authors).forEach(author => {
                    if (seen.has(author))
                        return;
                    seen.add(author);
                    if (!friends.has(author.textContent?.trim() || ''))
                        return;
                    const badge = document.createElement('strong');
                    badge.textContent = ' ★ 好友';
                    badge.title = '本地好友';
                    author.after(badge);
                    badges.push(badge);
                });
            });
            return () => {
                stop();
                badges.forEach(badge => badge.remove());
            };
        },
    },
    officialBlocklist,
];
