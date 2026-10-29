import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, waitFor } from './helpers/bundle-fixture.ts';

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64');
const floor = (n: number, name: string, extra = '') => `<li id="${n}" class="content-item"><div class="nsk-content-meta-info"><div class="author-info"><a href="/space/${n}" class="author-name">${name}</a></div>`
  + `<div class="floor-link-wrapper"><a href="#${n}" class="floor-link">#${n}</a></div></div><article class="post-content"><p>第 ${n} 楼</p></article>${extra}</li>`;
// Page 1 as the forum leaves it after loading: its own floor already has the menu Vue rendered, with the scoped attribute.
const first = '<ul class="comments">' + floor(10, 'ten', '<div data-v-abc="" class="comment-menu"><div data-v-abc="" title="点赞" class="menu-item"><span data-v-abc="">0</span></div></div>') + '</ul>'
  + '<div class="nsk-pager"><a class="pager-next" href="/post-1-2">next</a></div>';
// Page 2 as the server sends it: empty menu mounts, and the floors' records in the page config.
const second = `<script id="temp-script" type="text/plain">${encode({ postData: { postId: 1, comments: [
  { commentId: 1011, floorIndex: 11, poster: { name: 'eleven', isMe: false }, markdown: '十一', upvoted: false, upvoteCount: 2, liked: false, likeCount: 0, disliked: false, dislikeCount: 0 },
  { commentId: 1012, floorIndex: 12, poster: { name: 'me', isMe: true }, markdown: '十二', upvoted: false, upvoteCount: 0, liked: true, likeCount: 3, disliked: false, dislikeCount: 0 },
] } })}</script>`
  + `<ul class="comments">${floor(11, 'eleven', '<div class="comment-menu-mount"></div>')}${floor(12, 'me', '<div class="comment-menu-mount"></div>')}</ul>`;

test('floors that comment auto-paging brings in get the forum floor menu, acting through its endpoints and editor', async () => {
  const requests: string[] = [], asked: string[] = [], alerts: string[] = [], edits: [string, number][] = [];
  const f = await fixture({ 'infinite-scroll': { enabled: true, comments: true }, 'user-level': { enabled: false }, 'official-blocklist': { enabled: false } }, first, '/post-1-1', undefined, window => {
    Object.assign(window, {
      __config__: { user: { member_id: 7 }, postData: { postId: 1, comments: [{ commentId: 1010, floorIndex: 10 }] } },
      editor: { reply: (index: number) => edits.push(['reply', index]), quote: (index: number) => edits.push(['quote', index]) },
      mscConfirm: (message: string, ok: () => void) => { asked.push(message); ok(); },
      mscAlert: (message: string) => alerts.push(message),
    });
    window.fetch = (async (url: unknown, init?: RequestInit) => {
      const path = new URL(String(url)).pathname;
      requests.push(`${path} ${init?.body ?? ''}`.trim());
      if (path === '/post-1-2') return new window.Response(second);
      if (path === '/api/progress/today') return new window.Response(JSON.stringify({ maxFreeLike: 1, freeLikeUsed: 0 }));
      if (path === '/api/statistics/upvote') return new window.Response(JSON.stringify({ success: true, current: 3 }));
      if (path === '/api/statistics/like') return new window.Response(JSON.stringify({ success: true, current: 1 }));
      return new window.Response('{}', { status: 404 });
    }) as typeof window.fetch;
  });
  try {
    const doc = f.window.document;
    [...doc.querySelectorAll('button')].find(button => button.textContent === '加载下一页')!.click();
    await waitFor(() => !!doc.querySelector('li[id="12"] .comment-menu'));
    const menu = (n: number) => doc.querySelector(`li[id="${n}"] .comment-menu`)!;
    const items = (n: number) => [...menu(n).querySelectorAll<HTMLElement>('.menu-item')];
    const pick = (n: number, title: string) => items(n).find(item => item.title === title)!;
    // The forum's markup and scoped style attribute, so it looks like the floors above.
    assert.equal(doc.querySelectorAll('.comment-menu-mount').length, 0);
    assert.ok(menu(11).hasAttribute('data-v-abc'));
    assert.ok(pick(11, '点赞').querySelector('svg use[href="#good-one"]')!.hasAttribute('data-v-abc'));
    assert.deepEqual(items(11).map(item => item.title), ['点赞', '加鸡腿', '反对', '引用', '回复']);
    assert.deepEqual(items(11).slice(0, 3).map(item => item.textContent), ['2', '0', '0']);
    // One's own floor has no 回复, and a 鸡腿 already given shows as given.
    assert.deepEqual(items(12).map(item => item.title), ['点赞', '加鸡腿', '反对', '引用']);
    assert.ok(pick(12, '加鸡腿').classList.contains('clicked'));

    pick(11, '点赞').click();
    await waitFor(() => pick(11, '点赞').classList.contains('clicked'));
    assert.equal(pick(11, '点赞').textContent, '3');
    assert.ok(requests.includes('/api/statistics/upvote {"commentId":1011,"action":"add"}'));
    // 加鸡腿 asks first with the forum's wording, using today's free quota.
    pick(11, '加鸡腿').click();
    await waitFor(() => pick(11, '加鸡腿').classList.contains('clicked'));
    assert.deepEqual(asked, ['是否投喂鸡腿，本次投喂免费']);
    assert.ok(requests.includes('/api/statistics/like {"commentId":1011,"action":"add"}'));
    pick(12, '加鸡腿').click();
    await waitFor(() => alerts.length > 0);
    assert.deepEqual(alerts, ['已经进行过加鸡腿操作']);

    // 回复 and 引用 hand the floor to the forum's editor, registered once in the page config.
    pick(11, '回复').click();
    pick(11, '引用').click();
    assert.deepEqual(edits, [['reply', 1], ['quote', 1]]);
    const comments = (f.window as unknown as { __config__: { postData: { comments: { commentId: number }[] } } }).__config__.postData.comments;
    assert.deepEqual(comments.map(comment => comment.commentId), [1010, 1011]);
  } finally { f.close(); }
});

test('signed out, copied-in floors show the counts but no 引用 or 回复, and voting asks to sign in', async () => {
  const alerts: string[] = [];
  const f = await fixture({ 'infinite-scroll': { enabled: true, comments: true }, 'user-level': { enabled: false }, 'official-blocklist': { enabled: false } }, first, '/post-1-1', undefined, window => {
    Object.assign(window, { __config__: { user: null, postData: { postId: 1, comments: [] } }, mscAlert: (message: string) => alerts.push(message) });
    window.fetch = (async (url: unknown) => new window.Response(new URL(String(url)).pathname === '/post-1-2' ? second : '{}')) as typeof window.fetch;
  });
  try {
    const doc = f.window.document;
    [...doc.querySelectorAll('button')].find(button => button.textContent === '加载下一页')!.click();
    await waitFor(() => !!doc.querySelector('li[id="11"] .comment-menu'));
    const items = [...doc.querySelectorAll<HTMLElement>('li[id="11"] .comment-menu .menu-item')];
    assert.deepEqual(items.map(item => item.title), ['点赞', '加鸡腿', '反对']);
    items[0].click();
    await waitFor(() => alerts.length > 0);
    assert.deepEqual(alerts, ['您未登录，请登录后继续操作']);
  } finally { f.close(); }
});
