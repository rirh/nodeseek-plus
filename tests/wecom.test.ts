import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { parsePostPage, postTarget } from '../src/features/wecom/parse.ts';
import { chatTime, listTime } from '../src/features/wecom/time.ts';
import { fixture, key, waitFor } from './helpers/bundle-fixture.ts';

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64');

function item(floor: number, name: string, uid: number, body: string, extra: { tag?: 'li' | 'div'; hot?: boolean; poster?: boolean; likes?: number } = {}) {
  const tag = extra.tag || 'li';
  return `<${tag} id="${floor}" class="content-item"><div class="nsk-content-meta-info">`
    + `<div class="avatar-wrapper"><a href="/space/${uid}"><img src="/avatar/${uid}.png" alt="${name}" class="avatar-normal"></a></div>`
    + `<div><div class="author-info"><a href="/space/${uid}" class="author-name">${name}</a>${extra.poster ? '<span class="is-poster role-tag nsk-badge">楼主</span><span class="nsk-badge role-tag role-admin"><span>管理</span></span>' : ''}</div>`
    + `<div class="content-info"><span class="date-created"><time title="2026-07-21 21:0${floor % 10}:00" datetime="2026-07-21T13:0${floor % 10}:00.000Z">x</time></span></div></div>`
    + `<div class="floor-link-wrapper">${extra.hot ? '<div class="hot-badge"></div>' : ''}<a href="#${floor}" class="floor-link">#${floor}</a></div></div>`
    + `<article class="post-content"><p>${body}</p></article>`
    + `<div class="comment-menu"><div title="点赞" class="menu-item"><span>${extra.likes ?? 0}</span></div><div title="加鸡腿" class="menu-item"><span>2</span></div></div></${tag}>`;
}

// Mirrors the server markup: hot replies are repeated above the regular list, and floor 9 is only rendered there.
function postPage(page: number) {
  const floors = page === 1 ? [1, 2, 3, 4, 5, 6, 7, 8, 10] : [11, 12];
  // The forum's per-floor records, which its comment menu (点赞/加鸡腿/反对/引用/回复) acts on.
  const comments = [...(page === 1 ? [0, 9, 44] : []), ...floors].map(floor => ({
    commentId: 1000 + floor, floorIndex: floor, markdown: floor === 0 ? '正文 :ac01\n第二行' : `回复 ${floor}`, poster: { isMe: false, name: floor === 0 ? '酒神' : `u${floor}` },
    time: { createdDate: '2026-07-21T13:00:00.000Z', editedDate: null }, upvoted: false, upvoteCount: floor === 0 ? 23 : 0, liked: false, likeCount: 2, disliked: false, dislikeCount: 0,
  }));
  const config = { commmentPerPage: 10, postData: { title: '会话标题', postPageCount: 3, views: '120', categoryWord: 'Dev', categoryLink: '/categories/dev', collected: false, collectionCount: 5, comments } };
  const op = page === 1 ? `<div class="nsk-post">${item(0, '酒神', 9, '正文 <img src="/static/image/sticker/ac/1.png">', { tag: 'div', poster: true, likes: 23 })}</div>` : '';
  const hot = page === 1 ? item(44, 'hot', 44, '热评楼', { hot: true }) + item(9, 'nine', 99, '第九楼', { hot: true }) : '';
  return `<script id="temp-script" type="text/plain">${encode(config)}</script>`
    + `<div class="post-title"><h1><a class="post-title-link" href="/post-42-1">DOM 标题</a></h1></div>`
    + `<div class="nsk-post-wrapper">${op}<div class="comment-container"><div class="nsk-pager"><a href="/post-42-2" class="pager-pos">2</a><a href="/post-42-3" class="pager-pos">3</a></div>`
    + `<ul class="comments">${hot}${floors.map(n => item(n, `u${n}`, n === 10 ? 17170 : 100 + n, `回复 ${n}`, { tag: 'li' })).join('')}</ul></div></div>`;
}

function parse(html: string, url: string) {
  const window = new Window({ url });
  const doc = new window.DOMParser().parseFromString(html, 'text/html');
  return parsePostPage(doc as unknown as ParentNode, url);
}

test('post targets keep page and floor, and reject other origins and paths', () => {
  const base = 'https://www.nodeseek.com/';
  assert.deepEqual(postTarget('/post-12-3#25', base), { id: 12, page: 3, floor: 25 });
  assert.deepEqual(postTarget('/post-12', base), { id: 12, page: 1, floor: null });
  assert.equal(postTarget('https://example.com/post-12-1', base), null);
  assert.equal(postTarget('/space/12', base), null);
});

test('first page keeps the opening post, drops repeated hot replies and keeps hot-only floors in order', () => {
  const data = parse(postPage(1), 'https://www.nodeseek.com/post-42-1');
  assert.equal(data.title, '会话标题');
  assert.equal(data.pages, 3);
  assert.deepEqual(data.category, { name: 'Dev', href: '/categories/dev' });
  assert.deepEqual(data.floors.map(f => f.floor), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [op] = data.floors;
  assert.equal(op.author, '酒神');
  assert.equal(op.uid, 9);
  assert.equal(op.poster, true);
  assert.deepEqual(op.roles, ['管理']);
  assert.equal(op.avatar, 'https://www.nodeseek.com/avatar/9.png');
  assert.equal(op.time, '2026-07-21T13:00:00.000Z');
  assert.deepEqual(op.reactions, [{ title: '点赞', count: 23 }, { title: '加鸡腿', count: 2 }]);
  assert.equal(op.stats!.commentId, 1000);
  assert.equal(op.stats!.markdown, '正文 :ac01\n第二行');
  assert.deepEqual([op.stats!.upvotes, op.stats!.likes, op.stats!.liked], [23, 2, false]);
  assert.equal(data.floors.find(f => f.floor === 9)!.stats!.commentId, 1009);
  assert.deepEqual([data.collected, data.collections], [false, 5]);
  assert.match(op.content!.textContent!, /正文/);
  assert.equal(data.floors.find(f => f.floor === 9)!.hot, true);
  assert.equal(data.floors.find(f => f.floor === 8)!.hot, false);
});

test('time labels follow WeChat: clock today, then 昨天, weekday, date', () => {
  const now = new Date(2026, 9, 29, 10, 30); // Thursday
  assert.equal(chatTime(new Date(2026, 9, 29, 9, 5), now), '09:05');
  assert.equal(chatTime(new Date(2026, 9, 28, 23, 59), now), '昨天 23:59');
  assert.equal(chatTime(new Date(2026, 9, 26, 8, 0), now), '星期一 08:00');
  assert.equal(chatTime(new Date(2026, 8, 16, 13, 36), now), '9月16日 13:36');
  assert.equal(chatTime(new Date(2025, 8, 16, 13, 36), now), '2025年9月16日 13:36');
  assert.equal(listTime(new Date(2026, 9, 29, 9, 5), now), '09:05');
  assert.equal(listTime(new Date(2026, 9, 28, 9, 5), now), '昨天');
  assert.equal(listTime(new Date(2026, 9, 26, 9, 5), now), '星期一');
  assert.equal(listTime(new Date(2026, 8, 16, 9, 5), now), '26/9/16');
});

test('later pages only keep floors inside their own range', () => {
  const data = parse(postPage(2), 'https://www.nodeseek.com/post-42-2');
  assert.equal(data.page, 2);
  assert.deepEqual(data.floors.map(f => f.floor), [11, 12]);
});

const home = '<header id="native-head"></header>'
  + '<div class="user-card"><div class="user-head"><a title="tester" href="/space/7"><img src="/avatar/7.png"></a></div><span class="notify-count">5</span></div>'
  + '<div class="category-list"><ul><li><a href="/categories/daily"><span>日常</span></a></li><li><a href="/categories/dev"><span>Dev</span></a></li></ul></div>'
  + '<div class="color-theme-switcher"></div>'
  + '<div id="nsk-body-left"><div class="post-list-controler"><div class="sorter"><a data-sort="replyTime" class="selected">新评论</a><a data-sort="postTime">新帖子</a></div></div><ul class="post-list">'
  + '<li class="post-list-item"><a href="/space/9"><img class="avatar-normal" src="/avatar/9.png"></a><div class="post-list-content"><div class="post-title"><a href="/post-42-1">会话标题</a></div>'
  + '<div class="post-info"><span class="info-author"><a href="/space/9">酒神</a></span><a href="/post-42-2#12" class="info-last-comment-time"><time datetime="2026-10-29T02:28:08.000Z">now</time></a><a href="/categories/dev" class="post-category">Dev</a></div></div></li>'
  + '<li class="post-list-item"><a href="/space/8"><img class="avatar-normal" src="/avatar/8.png"></a><div class="post-list-content"><div class="post-title"><a href="/post-43-1">另一个帖子</a></div><div class="post-info"></div></div></li>'
  + '</ul></div>';

// A list page as the forum serves it for ?sortBy=…, used when 摸鱼模式 swaps the list in place.
const sortedList = (sort: string) => `<div id="nsk-body-left"><div class="post-list-controler"><div class="sorter"><a data-sort="replyTime"${sort === 'replyTime' ? ' class="selected"' : ''}>新评论</a><a data-sort="postTime"${sort === 'postTime' ? ' class="selected"' : ''}>新帖子</a></div></div>`
  + `<ul class="post-list"><li class="post-list-item"><a href="/space/5"><img class="avatar-normal" src="/avatar/5.png"></a><div class="post-list-content"><div class="post-title"><a href="/post-50-1">${sort} 第一帖</a></div><div class="post-info"></div></div></li></ul>`
  + '<div><div class="nsk-pager pager-bottom"><a href="/page-2?sortBy=postTime" class="pager-next">2</a></div></div></div>';

function desktop(window: Window, requests: string[]) {
  window.matchMedia = ((query: string) => ({ matches: ['(min-width: 1000px)', '(hover: hover)'].includes(query), addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  window.fetch = (async (url: unknown, init?: RequestInit) => {
    const target = new URL(String(url)), path = target.pathname;
    if (path === '/' || /^\/(page-\d+|categories\/)/.test(path)) { requests.push(path + target.search); return new window.Response(sortedList(target.searchParams.get('sortBy') || 'replyTime')); }
    // The floor menu's endpoints: every vote succeeds with a count of 1, and today's free 鸡腿 is still unused.
    if (path.startsWith('/api/statistics/')) { requests.push(`${path} ${init?.body}`); return new window.Response(JSON.stringify({ success: true, current: 1 })); }
    if (path === '/api/progress/today') { requests.push(path); return new window.Response(JSON.stringify({ maxFreeLike: 1, freeLikeUsed: 0 })); }
    // The comment endpoint the forum's editor posts to; it needs the editor's csrf-token header.
    if (path === '/api/content/new-comment') {
      const token = new window.Headers(init?.headers).get('csrf-token') || '';
      requests.push(`${path} ${/^[A-Za-z0-9]{16}$/.test(token) ? 'token' : 'no-token'} ${init?.body}`);
      if (String(init?.body).includes('刷屏')) return new window.Response(JSON.stringify({ success: false, message: '评论过于频繁' }), { status: 400 });
      return new window.Response(JSON.stringify({ success: true, redirect: '/post-42-3', redirectHash: '#13' }));
    }
    // Other modules (profiles, block list) make their own requests; only post and list pages matter here.
    if (!path.startsWith('/post-')) return new window.Response('{}', { status: 404 });
    requests.push(path);
    return new window.Response(postPage(Number(path.match(/-(\d+)$/)?.[1]) || 1));
  }) as typeof window.fetch;
  // The hot-ranking endpoint, answered locally.
  Object.assign(window, { GM_xmlhttpRequest: (options: { url: string; onload(response: { status: number; responseText: string }): void }) => {
    if (!options.url.startsWith('https://api.bimg.eu.org/')) throw new Error('No fixture GM response');
    queueMicrotask(() => options.onload({ status: 200, responseText: JSON.stringify({ updated_at: 1793240000, posts: [{ score: 9, post: { id: 42, title: '热榜第一', author: '酒神', author_id: 9, post_timestamp: 1793240000, views: 120, comments: 10 } }, { score: 5, post: { id: 43, title: '热榜第二', author: 'tester', views: 30, comments: 2 } }] }) }));
    return { abort() {} };
  } });
}

const STATE = 'nspp:state:www.nodeseek.com:moyu-mode';
const toggle = (doc: { querySelector(selector: string): Element | null }) => doc.querySelector('[data-nspp-wecom-launcher]') as HTMLButtonElement;

test('the native style stays by default and the fish button offers 摸鱼模式', async () => {
  const requests: string[] = [];
  const f = await fixture({}, home, '/', undefined, window => desktop(window, requests));
  try {
    const doc = f.window.document;
    assert.equal(doc.documentElement.hasAttribute('data-nspp-wecom'), false);
    assert.equal(toggle(doc).title, '摸鱼模式');
    assert.equal(toggle(doc).getAttribute('aria-pressed'), 'false');
    assert.equal(toggle(doc).hidden, false);
  } finally { f.close(); }
});

test('a remembered 摸鱼模式 applies on the next list page', async () => {
  const requests: string[] = [];
  const storage = new Map<string, unknown>([
    [key, { attendance: { enabled: true, automatic: false }, monitor: { enabled: false }, 'notification-categories': { enabled: false }, 'request-settings': { enabled: true, requestInterval: 0 } }],
    [STATE, { moyu: true }],
  ]);
  const f = await fixture({}, home, '/page-2', storage, window => desktop(window, requests));
  try {
    assert.equal(f.window.document.documentElement.hasAttribute('data-nspp-wecom'), true);
    assert.equal(toggle(f.window.document).title, '退出摸鱼模式');
  } finally { f.close(); }
});

test('in 摸鱼模式 list rows open as a read-only conversation and the button restores the native style', async () => {
  const requests: string[] = [];
  const f = await fixture({ 'post-preview': { enabled: true } }, home, '/', undefined, window => desktop(window, requests));
  try {
    const doc = f.window.document;
    toggle(doc).click();
    assert.equal(doc.documentElement.hasAttribute('data-nspp-wecom'), true);
    assert.equal((f.storage.get(STATE) as Record<string, unknown>).moyu, true);
    // Rail order follows WeChat: 消息 first, then 帖子; the avatar comes from the page config.
    assert.deepEqual([...doc.querySelectorAll('.nspp-wecom-rail-top .nspp-wecom-rail-item')].map(item => item.getAttribute('aria-label')).slice(0, 3), ['消息', '帖子', '版块']);
    // NodeSeek++'s tools are mirrored into the ≡ menu at the bottom; the toolbar itself stays in the page.
    assert.equal(doc.getElementById('nspp-tools')!.parentElement, doc.body);
    doc.querySelector<HTMLButtonElement>('.nspp-wecom-rail-bottom .nspp-wecom-rail-item[aria-label="更多"]')!.click();
    const railMenu = doc.querySelector<HTMLElement>('.nspp-wecom-railmenu')!;
    assert.equal(railMenu.hidden, false);
    const labels = [...railMenu.querySelectorAll('button')].map(item => item.textContent);
    assert.equal(labels.at(-1), '退出摸鱼模式');
    assert.ok(labels.every(label => !label!.includes('·')));
    doc.body.dispatchEvent(new f.window.MouseEvent('click', { bubbles: true }));
    assert.equal(railMenu.hidden, true);
    // The list column can be resized; the width is remembered.
    const resizer = doc.querySelector<HTMLElement>('.nspp-wecom-resizer')!;
    resizer.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    assert.equal(doc.body.style.getPropertyValue('--wc-list-w'), '316px');
    assert.equal((f.storage.get(STATE) as Record<string, unknown>).listWidth, 316);
    assert.equal(doc.querySelector('.nspp-wecom-me img')!.getAttribute('src'), '/avatar/7.png');
    assert.ok(doc.querySelector('.info-last-comment-time[data-nspp-wecom-time]'));
    // The native sort tabs collapse into one switch in the list header that clicks the other native tab.
    const sort = doc.querySelector<HTMLButtonElement>('.nspp-wecom-sort')!;
    assert.equal(sort.hidden, false);
    assert.equal(sort.textContent, '新评论');
    assert.equal(doc.querySelector('.nspp-wecom-rail .nspp-wecom-badge')!.textContent, '5');
    assert.equal(doc.querySelectorAll('.nspp-wecom-categories a').length, 2);
    // 版块 opens on hover after a short pause and closes once the mouse has left both the button and the flyout.
    const sectionsButton = doc.querySelector<HTMLElement>('.nspp-wecom-rail-item[aria-label="版块"]')!;
    const flyout = doc.querySelector<HTMLElement>('.nspp-wecom-categories')!;
    const hover = (node: Element, type: string) => node.dispatchEvent(new f.window.PointerEvent(type, { pointerType: 'mouse' }));
    const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    hover(sectionsButton, 'pointerenter');
    assert.equal(flyout.hidden, true);
    await waitFor(() => !flyout.hidden);
    assert.equal(sectionsButton.getAttribute('aria-expanded'), 'true');
    // A click with the mouse on the button keeps it open, and crossing over to the flyout does too.
    sectionsButton.click();
    assert.equal(flyout.hidden, false);
    hover(sectionsButton, 'pointerleave'); hover(flyout, 'pointerenter');
    await pause(300);
    assert.equal(flyout.hidden, false);
    hover(flyout, 'pointerleave');
    await waitFor(() => flyout.hidden);
    // Passing over the button on the way elsewhere does not open it.
    hover(sectionsButton, 'pointerenter'); hover(sectionsButton, 'pointerleave');
    await pause(300);
    assert.equal(flyout.hidden, true);
    // Touch and keyboard still toggle it with a click.
    sectionsButton.click();
    assert.equal(flyout.hidden, false);
    sectionsButton.click();
    assert.equal(flyout.hidden, true);
    assert.equal(doc.querySelector('.nspp-wecom-me')!.getAttribute('href'), '/space/7');

    // Hover cards would cover the conversation pane, so they stay off in this layout.
    doc.querySelector('.post-title a')!.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    await new Promise(resolve => setTimeout(resolve, 450));
    assert.equal(doc.querySelector<HTMLElement>('.nspp-post-preview')!.hidden, true);
    assert.deepEqual(requests, []);

    const click = new f.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    doc.querySelector('.post-list-item .post-list-content')!.dispatchEvent(click);
    assert.equal(click.defaultPrevented, true);
    await waitFor(() => doc.querySelectorAll('.nspp-wecom-msg').length === 11);
    assert.deepEqual(requests, ['/post-42-1']);
    assert.ok(doc.querySelector('.post-list-item')!.hasAttribute('data-nspp-wecom-active'));
    assert.equal(doc.querySelector('.nspp-wecom-chat-title a')!.textContent, '会话标题');
    // WeChat-style header: the reply count follows the title; section, pages and views move into its tooltip.
    assert.equal(doc.querySelector('.nspp-wecom-chat-count')!.textContent, '(10)');
    assert.match(doc.querySelector<HTMLElement>('.nspp-wecom-chat-title')!.title, /Dev · 3 页 · 120 浏览/);
    const more = doc.querySelector<HTMLButtonElement>('.nspp-wecom-more-button')!;
    more.click();
    assert.equal(doc.querySelector<HTMLElement>('.nspp-wecom-menu')!.hidden, false);
    assert.deepEqual([...doc.querySelectorAll('.nspp-wecom-menu button')].map(item => item.textContent), ['跳到最新回复', '刷新', '在新标签页打开原帖']);
    more.click();
    assert.equal(doc.querySelector<HTMLElement>('.nspp-wecom-menu')!.hidden, true);

    const op = doc.querySelector('.nspp-wecom-msg[data-op]')!;
    // Reactions sit under the bubble rather than in the nickname line.
    assert.match(op.querySelector('.nspp-wecom-msg-foot')!.textContent!, /23/);
    assert.match(op.querySelector('.nspp-wecom-msg-meta')!.textContent!, /酒神楼主管理#0/);
    assert.equal(op.querySelector('.nspp-wecom-bubble img')!.getAttribute('src'), 'https://www.nodeseek.com/static/image/sticker/ac/1.png');
    // The composer reuses the private-message editor: Markdown toolbar with image upload, preview and the original editor.
    const toolbar = doc.querySelector('.nspp-wecom-composer-tools .nspp-message-editor-toolbar')!;
    assert.ok(toolbar.querySelector('button[aria-label^="上传图片"]'));
    assert.ok([...toolbar.querySelectorAll('button')].some(button => button.textContent === '原版编辑器'));
    assert.match(doc.querySelector('.nspp-wecom-send-status')!.textContent!, /Enter 发送/);

    // The input box posts to the endpoint the forum's own editor uses, then follows the thread to its new last page.
    const send = doc.querySelector<HTMLButtonElement>('.nspp-wecom-send')!;
    const input = doc.querySelector<HTMLTextAreaElement>('.nspp-wecom-composer textarea')!;
    assert.equal(send.disabled, true);
    // A refusal shows the forum's own reason and keeps the draft.
    input.value = '刷屏';
    input.dispatchEvent(new f.window.Event('input'));
    send.click();
    await waitFor(() => doc.querySelector('.nspp-wecom-send-status')!.textContent === '评论过于频繁');
    assert.equal(input.value, '刷屏');
    assert.equal(send.disabled, false);
    input.value = '支持一下';
    input.dispatchEvent(new f.window.Event('input'));
    assert.equal(send.disabled, false);
    requests.length = 0;
    send.click();
    assert.equal(send.disabled, true);
    assert.match(doc.querySelector('.nspp-wecom-send-status')!.textContent!, /正在发送/);
    await waitFor(() => doc.querySelector('.nspp-wecom-send-status')!.textContent === '已发送');
    assert.equal(requests[0], '/api/content/new-comment token {"content":"支持一下","mode":"new-comment","postId":42}');
    assert.equal(input.value, '');
    // No hidden copy of the post page is loaded to send through.
    assert.ok(![...doc.querySelectorAll('iframe')].some(frame => frame.getAttribute('src')?.includes('/post-42')));
    await waitFor(() => requests.includes('/post-42-3'));
    assert.equal(doc.querySelectorAll('.nspp-wecom-chat script, .nspp-wecom-chat [onclick]').length, 0);

    // The last-reply time opens the page that holds that floor.
    const time = new f.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    doc.querySelector('.info-last-comment-time')!.dispatchEvent(time);
    await waitFor(() => requests.includes('/post-42-2') && !!doc.querySelector('.nspp-wecom-msg[data-floor="12"]'));
    assert.equal(doc.querySelector('.nspp-wecom-msg[data-floor="0"]'), null);

    // Author links keep navigating natively.
    const author = new f.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    doc.querySelector('.info-author a')!.dispatchEvent(author);
    assert.equal(author.defaultPrevented, false);

    assert.equal(toggle(doc).getAttribute('aria-pressed'), 'true');
    toggle(doc).click();
    assert.equal(doc.documentElement.hasAttribute('data-nspp-wecom'), false);
    assert.equal((f.storage.get(STATE) as Record<string, unknown>).moyu, false);
    assert.equal(doc.body.style.getPropertyValue('--wc-list-w'), '');
    const native = new f.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    doc.querySelector('.post-list-item:nth-child(2) .post-title a')!.dispatchEvent(native);
    assert.equal(native.defaultPrevented, false);
  } finally { f.close(); }
});

test('right-clicking a message offers the forum floor menu: 点赞 posts, 加鸡腿 asks first, 引用 and 回复 fill the input box', async () => {
  const requests: string[] = [];
  const f = await fixture({}, home, '/', undefined, window => desktop(window, requests));
  try {
    const doc = f.window.document;
    toggle(doc).click();
    doc.querySelector('.post-list-item .post-list-content')!.dispatchEvent(new f.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    await waitFor(() => doc.querySelectorAll('.nspp-wecom-msg').length === 11);
    const input = doc.querySelector<HTMLTextAreaElement>('.nspp-wecom-composer textarea')!;
    assert.equal(input.placeholder, '发送给 会话标题');
    const menu = doc.querySelector<HTMLElement>('.nspp-wecom-context')!;
    const rightClick = (target: Element) => {
      const event = new f.window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 200, clientY: 200 });
      target.dispatchEvent(event); return event.defaultPrevented;
    };
    const items = () => [...menu.querySelectorAll<HTMLButtonElement>(':scope > button')];
    const pick = (label: string) => items().find(button => button.firstChild?.textContent === label)!;
    const floor3 = doc.querySelector('.nspp-wecom-msg[data-floor="3"]')!;

    assert.equal(rightClick(floor3.querySelector('.nspp-wecom-bubble p')!), true);
    assert.equal(menu.hidden, false);
    assert.deepEqual(items().map(button => button.firstChild?.textContent), ['点赞', '加鸡腿', '反对', '引用', '回复', '复制', '在原帖中查看']);
    assert.equal(pick('加鸡腿').querySelector('small')!.textContent, '2');
    pick('点赞').click();
    assert.equal(menu.hidden, true);
    await waitFor(() => !!floor3.querySelector('.nspp-wecom-reaction[data-on]'));
    assert.ok(requests.includes('/api/statistics/upvote {"commentId":1003,"action":"add"}'));
    assert.equal(floor3.querySelector('.nspp-wecom-reaction[data-on]')!.getAttribute('title'), '已点赞');
    rightClick(floor3);
    assert.equal(pick('已点赞').disabled, true);

    // 加鸡腿 spends a chicken leg, so the menu asks with the forum's wording before anything is sent.
    pick('加鸡腿').click();
    await waitFor(() => menu.querySelector('p')?.textContent === '是否投喂鸡腿，本次投喂免费');
    assert.equal(requests.some(entry => entry.startsWith('/api/statistics/like')), false);
    [...menu.querySelectorAll('button')].find(button => button.textContent === '取消')!.click();
    assert.equal(menu.hidden, true);
    assert.equal(requests.some(entry => entry.startsWith('/api/statistics/like')), false);

    rightClick(floor3);
    pick('回复').click();
    assert.equal(input.value, '@u3 [#3](https://www.nodeseek.com/post-42-1#3) ');
    // The opening post adds 收藏, and 引用 quotes its Markdown source under the same header the forum writes.
    const op = doc.querySelector('.nspp-wecom-msg[data-floor="0"]')!;
    rightClick(op.querySelector('.nspp-wecom-bubble p')!);
    assert.ok(items().some(button => button.firstChild?.textContent === '收藏'));
    pick('引用').click();
    assert.match(input.value, /^@u3 \[#3\]\(https:\/\/www\.nodeseek\.com\/post-42-1#3\) \n\n> @酒神 \[#0\]\(https:\/\/www\.nodeseek\.com\/post-42-1#0\) 发布于.+\n> 正文 :ac01\n> 第二行\n\n$/);
    assert.equal(doc.querySelector<HTMLButtonElement>('.nspp-wecom-send')!.disabled, false);
    // Links and images keep the browser's own menu.
    assert.equal(rightClick(op.querySelector('.nspp-wecom-bubble img')!), false);
    assert.equal(menu.hidden, true);
  } finally { f.close(); }
});

test('the column chosen in settings opens when 摸鱼模式 starts on the home page, and only there', async () => {
  const start = async (defaultView: string, path: string) => {
    const requests: string[] = [];
    const storage = new Map<string, unknown>([
      [key, { attendance: { enabled: true, automatic: false }, monitor: { enabled: false }, 'notification-categories': { enabled: false }, 'request-settings': { enabled: true, requestInterval: 0 }, 'moyu-mode': { enabled: true, defaultView } }],
      [STATE, { moyu: true }],
    ]);
    return { requests, f: await fixture({}, home, path, storage, window => desktop(window, requests)) };
  };
  {
    const { f } = await start('hot', '/');
    try {
      const doc = f.window.document;
      assert.equal(doc.documentElement.dataset.nsppWecomView, 'hot');
      assert.equal(doc.querySelector<HTMLElement>('.nspp-wecom-hot')!.hidden, false);
      assert.equal(doc.querySelector('.nspp-wecom-rail-item[aria-label="热榜"]')!.getAttribute('aria-current'), 'page');
      // 分享 joins settings and the 摸鱼 switch at the bottom of the ≡ menu.
      doc.querySelector<HTMLButtonElement>('.nspp-wecom-rail-item[aria-label="更多"]')!.click();
      const labels = [...doc.querySelectorAll('.nspp-wecom-railmenu button')].map(item => item.textContent);
      assert.equal(labels.at(-1), '退出摸鱼模式');
      assert.ok(labels.indexOf('分享 NodeSeek++') > labels.length - 4, labels.join(' / '));
      assert.equal(doc.querySelector('.nspp-wecom-railmenu button[data-separate]')!.textContent, '分享 NodeSeek++');
    } finally { f.close(); }
  }
  {
    const { f, requests } = await start('categories/dev', '/');
    try {
      await waitFor(() => requests.includes('/categories/dev') && f.window.location.pathname === '/categories/dev');
      assert.equal(f.window.document.documentElement.dataset.nsppWecomView, 'posts');
    } finally { f.close(); }
  }
  {
    // A page the user opened themselves is kept.
    const { f, requests } = await start('hot', '/page-2');
    try {
      assert.equal(f.window.document.documentElement.dataset.nsppWecomView, 'posts');
      assert.deepEqual(requests, []);
    } finally { f.close(); }
  }
});

test('the plugin author (uid 17170) is tagged, and the tag sends one school of fish across the pane', async () => {
  const requests: string[] = [];
  const f = await fixture({}, home, '/', undefined, window => desktop(window, requests));
  try {
    const doc = f.window.document;
    toggle(doc).click();
    doc.querySelector('.post-list-item .post-list-content')!.dispatchEvent(new f.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    await waitFor(() => doc.querySelectorAll('.nspp-wecom-msg').length === 11);
    assert.deepEqual([...doc.querySelectorAll('.nspp-wecom-msg[data-author]')].map(item => item.getAttribute('data-floor')), ['10']);
    const tag = doc.querySelector<HTMLButtonElement>('.nspp-wecom-msg[data-floor="10"] .nspp-wecom-tag-author')!;
    assert.equal(tag.textContent, '插件作者');
    assert.equal(doc.querySelector('.nspp-wecom-school'), null);
    tag.click(); tag.click();
    assert.equal(doc.querySelectorAll('.nspp-wecom-school').length, 1);
    assert.equal(doc.querySelectorAll('.nspp-wecom-school span').length, 7);
    assert.equal(doc.querySelector('.nspp-wecom-school')!.getAttribute('aria-hidden'), 'true');
  } finally { f.close(); }
});

test('通知 swaps the middle and right columns for the message center without leaving the page', async () => {
  const requests: string[] = [];
  const f = await fixture({}, home, '/', undefined, window => desktop(window, requests));
  try {
    const doc = f.window.document;
    toggle(doc).click();
    const notify = doc.querySelector<HTMLAnchorElement>('.nspp-wecom-rail-item[href="/notification"]')!;
    const open = new f.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    notify.dispatchEvent(open);
    assert.equal(open.defaultPrevented, true);
    assert.equal(f.window.location.pathname, '/');
    assert.equal(doc.documentElement.dataset.nsppWecomView, 'messages');
    assert.equal(notify.getAttribute('aria-current'), 'page');
    const center = doc.querySelector<HTMLElement>('.nspp-wecom-messages > .nspp-messages')!;
    assert.equal(center.hidden, false);
    assert.equal(doc.querySelector<HTMLElement>('.nspp-wecom-chat')!.hidden, true);
    assert.ok(center.querySelector('.nspp-messages-fixed-contacts a[data-category="atMe"]'));

    // Contacts inside the center keep routing in memory, so the URL never leaves the list page.
    const reply = new f.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    center.querySelector('.nspp-messages-fixed-contacts a[data-category="reply"]')!.dispatchEvent(reply);
    assert.equal(reply.defaultPrevented, true);
    assert.equal(f.window.location.pathname, '/');
    assert.equal(center.querySelector('.nspp-messages-fixed-contacts a[data-category="reply"]')!.getAttribute('aria-current'), 'page');

    const back = new f.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    doc.querySelector('.nspp-wecom-rail-item[href="/"]')!.dispatchEvent(back);
    assert.equal(back.defaultPrevented, true);
    assert.equal(doc.documentElement.dataset.nsppWecomView, 'posts');
    assert.equal(center.hidden, true);
    assert.equal(doc.querySelector<HTMLElement>('.nspp-wecom-chat')!.hidden, false);

    // With 摸鱼模式 off, 通知 is an ordinary link again.
    toggle(doc).click();
    const native = new f.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    notify.dispatchEvent(native);
    assert.equal(native.defaultPrevented, false);
  } finally { f.close(); }
});

test('switching sort or section swaps the list in place without reloading the page', async () => {
  const requests: string[] = [];
  const paged = home.replace(/<\/ul><\/div>$/, '</ul><div><div class="nsk-pager pager-bottom"><a href="/page-2" class="pager-next">2</a></div></div></div>');
  const f = await fixture({}, paged, '/', undefined, window => desktop(window, requests));
  try {
    const doc = f.window.document;
    toggle(doc).click();
    const sort = doc.querySelector<HTMLButtonElement>('.nspp-wecom-sort')!;
    const list = doc.querySelector('#nsk-body-left ul.post-list')!;
    let replaced = 0;
    doc.addEventListener('nspp:list-replaced', () => { replaced++; });
    sort.click();
    await waitFor(() => doc.querySelector('.post-list-item .post-title a')?.textContent === 'postTime 第一帖');
    assert.equal(f.window.location.pathname, '/');
    assert.equal(f.window.location.search, '?sortBy=postTime');
    assert.equal(sort.textContent, '新帖子');
    assert.equal(replaced, 1);
    assert.equal(doc.querySelector('#nsk-body-left ul.post-list'), list);
    assert.equal(doc.querySelector<HTMLAnchorElement>('.nsk-pager a.pager-next')!.href, 'https://www.nodeseek.com/page-2?sortBy=postTime');
    assert.deepEqual(requests, ['/?sortBy=postTime']);

    // Sections from the flyout load in place too, and the rail follows.
    const section = new f.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    doc.querySelector('.nspp-wecom-categories a[href="/categories/dev"]')!.dispatchEvent(section);
    assert.equal(section.defaultPrevented, true);
    await waitFor(() => replaced === 2);
    assert.equal(f.window.location.pathname, '/categories/dev');
    assert.equal(doc.querySelector('.nspp-wecom-rail-item[aria-label="版块"]')!.getAttribute('aria-current'), 'page');
    assert.equal(doc.querySelector('.nspp-wecom-categories a[href="/categories/dev"]')!.getAttribute('aria-current'), 'page');
  } finally { f.close(); }
});

test('热榜 fills the middle column with tabs on top, and a row opens the post', async () => {
  const requests: string[] = [];
  const f = await fixture({}, home, '/', undefined, window => desktop(window, requests));
  try {
    const doc = f.window.document;
    toggle(doc).click();
    doc.querySelector<HTMLButtonElement>('.nspp-wecom-rail-item[aria-label="热榜"]')!.click();
    assert.equal(doc.documentElement.dataset.nsppWecomView, 'hot');
    assert.equal(doc.querySelector<HTMLElement>('.nspp-wecom-hot')!.hidden, false);
    assert.equal(doc.querySelector<HTMLElement>('.nspp-wecom-listhead')!.hidden, true);
    assert.deepEqual([...doc.querySelectorAll('.nspp-wecom-tabs [role="tab"]')].map(tab => tab.textContent), ['实时', '日榜', '周榜']);
    await waitFor(() => doc.querySelectorAll('.nspp-wecom-hot-row').length === 2);
    // Rows mirror the post list: the author's avatar, a coloured rank badge before the title, the post time and reply count.
    const first = doc.querySelector('.nspp-wecom-hot-row')!;
    assert.equal(first.querySelector('.nspp-wecom-hot-avatar img')!.getAttribute('src'), '/avatar/9.png');
    assert.equal(first.querySelector('strong > .nspp-wecom-hot-rank[data-top="1"]')!.textContent, '1');
    assert.equal(first.querySelector('strong')!.textContent, '1热榜第一');
    assert.notEqual(first.querySelector('.nspp-wecom-hot-time')!.textContent, '');
    assert.match(first.querySelector('small')!.textContent!, /酒神 · 120 浏览/);
    assert.equal(first.querySelector('.nspp-wecom-hot-count')!.textContent, '10');
    // Without an author id the avatar falls back to the name's first character.
    assert.equal(doc.querySelectorAll('.nspp-wecom-hot-row')[1].querySelector('.nspp-wecom-hot-avatar')!.textContent, 't');
    doc.querySelector<HTMLButtonElement>('.nspp-wecom-hot-row')!.click();
    await waitFor(() => doc.querySelectorAll('.nspp-wecom-msg').length === 11);
    assert.deepEqual(requests, ['/post-42-1']);
    assert.ok(doc.querySelector('.nspp-wecom-hot-list > li[data-nspp-wecom-active]'));
    assert.equal(doc.querySelector('.nspp-wecom-chat-count')!.textContent, '(10)');
  } finally { f.close(); }
});

test('the search box filters loaded rows and the layout cleans up on page hide', async () => {
  const requests: string[] = [];
  const f = await fixture({}, home, '/', undefined, window => desktop(window, requests));
  const doc = f.window.document;
  toggle(doc).click();
  const search = doc.querySelector<HTMLInputElement>('.nspp-wecom-listhead input')!;
  search.value = '另一个';
  search.dispatchEvent(new f.window.Event('input'));
  const rows = doc.querySelectorAll('.post-list-item');
  assert.equal(rows[0].hasAttribute('data-nspp-wecom-filtered'), true);
  assert.equal(rows[1].hasAttribute('data-nspp-wecom-filtered'), false);
  f.close();
  assert.equal(doc.documentElement.hasAttribute('data-nspp-wecom'), false);
  assert.equal(doc.querySelector('.nspp-wecom-rail, .nspp-wecom-chat, [data-nspp-wecom-filtered]'), null);
});

test('post pages keep the native layout', async () => {
  const requests: string[] = [];
  const f = await fixture({}, home, '/post-42-1', undefined, window => desktop(window, requests));
  try {
    assert.equal(f.window.document.documentElement.hasAttribute('data-nspp-wecom'), false);
    assert.equal(f.window.document.querySelector('[data-nspp-wecom-launcher]'), null);
  } finally { f.close(); }
});

