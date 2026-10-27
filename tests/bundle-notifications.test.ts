import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Window } from 'happy-dom';
import { key, fixture, waitFor, mockWindowTimers } from './helpers/bundle-fixture.ts';

test('notification categories replace the sidebar notification entry and preserve unrelated links', async () => {
  const f = await fixture({ 'notification-categories': { enabled: true } }, '<div class="user-card"><div class="user-stat"><div class="stat-block"><a href="/notification">通知</a><a href="/board">签到</a></div><div class="stat-block">收藏 2</div></div></div>', '/', undefined, window => {
    Object.assign(window, { fetch: async () => new Response(JSON.stringify({ success: true, unreadCount: { reply: 2, atMe: 0, message: 3 } }), { headers: { 'Content-Type': 'application/json' } }) });
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    const doc = f.window.document;
    assert.equal(doc.querySelector<HTMLAnchorElement>('a[href="/notification"]')!.hidden, true);
    assert.equal(doc.querySelector<HTMLAnchorElement>('a[href="/board"]')!.hidden, false);
    assert.deepEqual(Array.from(doc.querySelectorAll('.user-stat .nspp-notification-link')).map(a => [a.getAttribute('href'), a.textContent]), [['/notification#/reply', '回复2'], ['/notification#/message?mode=list', '私信3'], ['/notification#/atMe', '我0']]);
    assert.equal(doc.querySelectorAll('.nspp-unread-count').length, 2);
    assert.equal(doc.querySelectorAll('.nspp-notification-icon path').length, 3);
    assert.equal(doc.querySelectorAll('.nspp-notification-icon use').length, 0);
    assert.equal(doc.querySelector('.nspp-notification-row button'), null);
    assert.equal(doc.querySelector('.user-stat')!.children.length, 2);
    assert.equal(doc.querySelectorAll('.user-stat > .stat-block').length, 2);
    assert.equal(doc.querySelector('.user-stat > .nspp-notifications'), null);
  } finally { await f.close(); }
});

test('notification categories stay out of floating tools when the sidebar is absent', async () => {
  const f = await fixture({ 'notification-categories': { enabled: true } }, '', '/', undefined, window => {
    Object.assign(window, { fetch: async () => new Response(JSON.stringify({ success: true, unreadCount: { reply: 1, atMe: 2, message: 0 } })) });
  });
  try {
    const doc = f.window.document;
    assert.ok(doc.querySelector('#nspp-tools button'));
    assert.equal(doc.querySelector('.nspp-notifications, .nspp-notification-row'), null);
    doc.body.insertAdjacentHTML('beforeend', '<div class="user-card"><div class="user-stat"><div class="stat-block"><a href="/notification">通知</a></div><div class="stat-block">收藏 2</div></div></div>');
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.equal(doc.querySelectorAll('.user-stat .nspp-notification-link').length, 3);
    doc.querySelector('.user-card')!.remove();
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.equal(doc.querySelector('.nspp-notifications, .nspp-notification-row'), null);
  } finally { await f.close(); }
});

test('notification categories start by default after delayed login and sidebar insertion', async () => {
  const f = await fixture({ 'notification-categories': undefined, unread: { enabled: false } }, '', '/', undefined, window => {
    Object.assign(window, { __config__: {}, fetch: async () => new Response(JSON.stringify({ success: true, unreadCount: { reply: 1, atMe: 2, message: 0 } })) });
  });
  try {
    assert.equal(f.window.document.querySelector('.nspp-notifications'), null);
    Object.assign(f.window, { __config__: { user: { member_id: 7 } } });
    f.window.document.body.insertAdjacentHTML('beforeend', '<div class="user-card"><div class="user-stat"><div class="stat-block"><a href="/notification">通知</a></div><div class="stat-block">收藏 2</div></div></div>');
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.equal(f.window.document.querySelectorAll('.user-stat .nspp-notification-link').length, 3);
    assert.equal(f.window.document.querySelectorAll('.nspp-notification-row').length, 3);
    assert.equal(f.window.document.querySelector('.nspp-original-notification')?.textContent, '通知');
  } finally { await f.close(); }
});

test('notification categories reuse native typography, badge and bell markup', async () => {
  const html = '<div class="user-card"><div class="user-stat"><div class="stat-block"><p class="native-row" style="margin-block: 4px"><a class="native-link" href="/notification"><svg class="native-icon" viewBox="0 0 48 48"><use href="#native-bell"/></svg><span>通知 </span><span class="notify-count">474</span></a></p></div><div class="stat-block">收藏 2</div></div></div>';
  const f = await fixture({ 'notification-categories': { enabled: true } }, html);
  try {
    const link = f.window.document.querySelector('.nspp-notification-link')!;
    assert.ok(link.classList.contains('native-link'));
    assert.equal(link.querySelector('svg use')?.getAttribute('href'), '#native-bell');
    assert.equal(link.querySelector('svg')?.getAttribute('viewBox'), '0 0 48 48');
    assert.equal(link.parentElement?.classList.contains('native-row'), true);
    assert.equal(link.parentElement?.tagName, 'P');
    assert.equal(link.parentElement?.style.marginBlock, '4px');
    const mention = f.window.document.querySelector('.nspp-notification-link[href$="atMe"]')!;
    assert.equal(mention.children[1]?.textContent, '我 ');
  } finally { await f.close(); }
});

test('system notifications detect category increases in background and do not replay across tabs', async () => {
  const shared = new Map<string, unknown>([
    [key, { monitor: { enabled: false }, 'notification-categories': { enabled: true } }],
    ['nspp:state:www.nodeseek.com:notification-categories', { 'counts:7': { reply: 4, atMe: 0, message: 0 } }],
  ]);
  const notifications: { text: string; url: string; tag: string }[] = [];
  const setup = (window: Window) => {
    Object.defineProperty(window.document, 'hidden', { configurable: true, value: true });
    Object.assign(window, {
      GM_notification: (details: typeof notifications[number]) => notifications.push(details),
      fetch: async () => new Response(JSON.stringify({ success: true, unreadCount: { reply: 2, atMe: 1, message: 1 } })),
    });
  };
  const f = await fixture({}, '', '/', shared, setup);
  const second = await fixture({}, '', '/', shared, setup);
  try {
    assert.equal(notifications.length, 2);
    assert.equal(notifications[0]!.text, '收到 1 条新@提醒，当前有 1 条@提醒未读');
    assert.equal(notifications[1]!.url, 'https://www.nodeseek.com/notification#/message?mode=list');
    assert.notEqual(notifications[0]!.tag, notifications[1]!.tag);
    shared.delete('nspp:lock:www.nodeseek.com:unread:7');
    const third = await fixture({}, '', '/', shared, setup);
    try { assert.equal(notifications.length, 2); } finally { await third.close(); }
  } finally { await f.close(); await second.close(); }
});

test('first unread snapshot does not notify historical messages', async () => {
  const notifications: unknown[] = [];
  const f = await fixture({ 'notification-categories': { enabled: true } }, '', '/', undefined, window => {
    Object.assign(window, {
      GM_notification: (details: unknown) => notifications.push(details),
      fetch: async () => new Response(JSON.stringify({ success: true, unreadCount: { reply: 2, atMe: 1, message: 3 } })),
    });
  });
  try { assert.equal(notifications.length, 0); } finally { await f.close(); }
});

const notificationPanel = '<section><nav><a href="/notification#/atMe">@我</a><a href="/notification#/reply">回复主题</a><a href="/notification#/message">私信</a></nav><div class="native-notifications"></div></section>';

test('chat profile preserves the original card and links discussions comments and stardust', async () => {
  const f = await fixture({ 'user-level': { enabled: false } }, notificationPanel, '/notification#/message?mode=talk&to=123', undefined, window => {
    window.fetch = (async (url: unknown) => {
      const path = new URL(String(url)).pathname;
      if (path === '/api/account/getInfo/123') return new window.Response(JSON.stringify({ success: true, detail: { member_name: 'Alice', rank: 4, isAdmin: true, roles: ['agency'], created_at: '2024-01-01', nPost: 10, nComment: 20, coin: 2500, stardust: 10, fans: 5 } }));
      return new window.Response(JSON.stringify({ success: true, msgArray: [], talkTo: { member_id: 123, member_name: 'Alice' }, unreadCount: {} }));
    }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 150));
    const doc = f.window.document;
    const card = doc.querySelector('.nspp-chat-profile')!;
    assert.match(card.querySelector('.nspp-chat-profile-heading')!.textContent!, /Alice管理代理商Lv 4/);
    assert.equal(card.querySelectorAll('.nspp-chat-profile-stat').length, 5);
    assert.match(card.querySelector('.nspp-chat-profile-meta')!.textContent!, /UID 123 · 加入 \d+ 天/);
    assert.equal(card.querySelector('.nspp-chat-profile-trust')!.tagName, 'DIV');
    assert.equal(card.querySelector<HTMLElement>('.nspp-chat-profile-notice')!.hidden, false);
    const links = [...card.querySelectorAll<HTMLAnchorElement>('.nspp-chat-profile-data a')];
    assert.deepEqual(links.map(link => link.getAttribute('href')), ['/space/123#/discussions', '/space/123#/comments', '/stardust/list?member_id=123']);
    assert.deepEqual(links.map(link => link.textContent), ['主题帖10', '评论20', '星辰10']);
    assert.ok(links.every(link => link.target === '_blank' && link.rel === 'noopener noreferrer'));
    assert.equal(card.querySelectorAll('.nspp-chat-profile-data > span').length, 2);
  } finally { await f.close(); }
});

test('chat composer restores focus after sending a message', async () => {
  let sent = 0;
  const f = await fixture({ 'user-level': { enabled: false } }, notificationPanel, '/notification#/message?mode=talk&to=123', undefined, window => {
    Object.defineProperty(window.document, 'hidden', { configurable: true, value: false });
    window.fetch = (async (url: unknown, options?: RequestInit) => {
      const path = new URL(String(url)).pathname;
      if (path === '/api/notification/message/send') {
        sent++;
        assert.equal(options?.method, 'POST');
        return new window.Response(JSON.stringify({ success: true, data: { id: 99, created_at: '2026-09-17T10:00:00Z' } }));
      }
      if (path === '/api/notification/message/with/123') return new window.Response(JSON.stringify({ success: true, talkTo: { member_id: 123, member_name: 'Alice' }, msgArray: [] }));
      if (path === '/api/notification/message/list') return new window.Response(JSON.stringify({ success: true, msgArray: [] }));
      if (path === '/api/notification/unread-count') return new window.Response(JSON.stringify({ success: true, unreadCount: {} }));
      if (path === '/api/account/getInfo/123') return new window.Response(JSON.stringify({ success: true, detail: { rank: 4, created_at: '2024-01-01', nPost: 1, nComment: 1, coin: 1, stardust: 1, fans: 1 } }));
      return new window.Response(JSON.stringify({ success: true, msgArray: [] }));
    }) as typeof window.fetch;
  });
  try {
    await waitFor(() => !!f.window.document.querySelector('.nspp-messages-composer textarea'));
    const input = f.window.document.querySelector<HTMLTextAreaElement>('.nspp-messages-composer textarea')!;
    input.value = '发送测试'; input.dispatchEvent(new f.window.Event('input', { bubbles: true })); input.blur();
    f.window.document.querySelector<HTMLButtonElement>('.nspp-messages-send')!.click();
    await waitFor(() => sent === 1 && input.value === '' && f.window.document.activeElement === input);
  } finally { await f.close(); }
});

test('system messages use compact rows and lazily open rich cards for inline usernames after rendering', async t => {
  const calls: string[] = [];
  const f = await fixture({}, notificationPanel, '/notification#/message?mode=talk&to=1', undefined, window => {
    Object.defineProperty(window.document, 'hidden', { value: false });
    window.happyDOM.setWindowSize({ width: 1280, height: 900 });
    const matchMedia = window.matchMedia.bind(window);
    window.matchMedia = ((query: string) => {
      const media = matchMedia(query);
      if (query === '(hover: hover) and (pointer: fine)') Object.defineProperty(media, 'matches', { value: true });
      return media;
    }) as typeof window.matchMedia;
    window.fetch = (async (url: unknown) => {
      const path = new URL(String(url)).pathname; calls.push(path);
      if (path === '/api/notification/message/with/1') return new window.Response(JSON.stringify({ success: true, talkTo: { member_id: 1, member_name: '系统通知' }, msgArray: [
        { id: 11, sender_id: 1, receiver_id: 7, created_at: '2026-09-14T10:00:00Z', viewed: true, content: '您的帖子『[长标题](/post-42-1)』被用户 [Alice](/space/123) 投喂鸡腿' },
        { id: 12, sender_id: 1, receiver_id: 7, created_at: '2026-09-14T10:01:00Z', viewed: true, content: '标题被改为 **已出**\n\n[详细信息](/post-42-1) [外部链接](https://example.com/space/456)' },
      ] }));
      if (path === '/api/account/getInfo/123') return new window.Response(JSON.stringify({ success: true, detail: { rank: 4, created_at: '2024-01-01', nPost: 10, nComment: 20, coin: 2500, stardust: 10, fans: 5 } }));
      return new window.Response(JSON.stringify({ success: true, msgArray: [], memberList: [], data: [], unreadCount: {} }));
    }) as typeof window.fetch;
  });
  try {
    await waitFor(() => !!f.window.document.querySelector('.nspp-messages-bubble a[href$="/space/123"] + .nspp-user-badges'));
    mockWindowTimers(t, f.window);
    const doc = f.window.document;
    const rows = [...doc.querySelectorAll('.nspp-messages-message')];
    assert.equal(rows.length, 2);
    assert.ok(rows.every(row => row.classList.contains('is-system')));
    assert.equal(doc.querySelector('.nspp-messages-stamp'), null);
    assert.equal(doc.querySelectorAll('.nspp-messages-system-time').length, 2);
    assert.equal(rows[0].querySelector('time')!.getAttribute('datetime'), '2026-09-14T10:00:00Z');
    assert.match(rows[1].textContent!, /标题被改为 已出/);
    const actor = rows[0].querySelector<HTMLAnchorElement>('a[href$="/space/123"]')!;
    assert.equal(actor.target, '_blank');
    assert.equal((actor.nextElementSibling as HTMLElement).hidden, true, 'inline names do not gain visible badges');
    assert.equal(calls.includes('/api/account/getInfo/123'), false, 'rendering does not request every actor profile');
    actor.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    t.mock.timers.tick(300);
    await waitFor(() => [...doc.querySelectorAll<HTMLElement>('.nspp-user-hover')].some(el => !el.hidden && el.querySelectorAll('dl > div').length === 6));
    const card = [...doc.querySelectorAll<HTMLElement>('.nspp-user-hover')].find(card => !card.hidden)!;
    assert.equal(card.querySelector('.nspp-user-hover-name')!.textContent, 'Alice');
    assert.equal(card.querySelectorAll('dl > div').length, 6);
    assert.equal(calls.filter(path => path === '/api/account/getInfo/123').length, 1);
    assert.equal(calls.includes('/api/account/getInfo/456'), false);
    actor.dispatchEvent(new f.window.MouseEvent('mouseleave'));
    card.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    t.mock.timers.tick(220);
    assert.equal(card.hidden, false, 'moving from the name into the card keeps it open');
    doc.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(card.hidden, true);
  } finally { t.mock.restoreAll(); t.mock.timers.reset(); await f.close(); }
});

test('notification inbox loads visible exact replies once per page, links posts and formats dates without marking previews read', async () => {
  const requests: { path: string; method?: string }[] = [];
  const visible = new Set<Element>();
  let reveal = () => {};
  const f = await fixture({ 'user-level': { enabled: false } }, notificationPanel, '/notification#/reply', undefined, window => {
    window.IntersectionObserver = class {
      preview: boolean;
      constructor(callback: (entries: unknown[]) => void, options?: { root?: Element; rootMargin?: string }) {
        this.preview = !!options?.root?.classList.contains('nspp-notice-list-scroll') && options.rootMargin === '100px';
        if (this.preview) reveal = () => callback([...visible].map(target => ({ target, isIntersecting: true })));
      }
      observe(target: Element) { if (this.preview) visible.add(target); }
      unobserve(target: Element) { if (this.preview) visible.delete(target); }
      disconnect() { if (this.preview) visible.clear(); }
    } as unknown as typeof window.IntersectionObserver;
    window.fetch = (async (url: unknown, options?: RequestInit) => {
      const parsed = new URL(String(url)); const path = parsed.pathname + parsed.search;
      requests.push({ path, method: options?.method });
      if (path === '/api/notification/reply-to-me/list?page=1') return new window.Response(JSON.stringify({ success: true, replyList: [
        { id: 2, post_id: 42, floor_id: 11, commenter_name: 'Alice', commenter_id: 8, viewed: 0, created_at: '2020-01-02T03:04:05', title: '旧标题' },
        { id: 1, post_id: 42, floor_id: 12, commenter_name: 'Bob', viewed: 0, created_at: 'invalid' },
      ] }));
      if (path === '/post-42-2') return new window.Response('<h1 class="post-title">完整的具体帖子标题</h1><div class="post-content">主题正文不能当作回复</div><ul><li><a class="floor-link" href="/post-42-2#11">#11</a><div class="comment-content"><p>这是第一条真实回复 <strong>重点</strong></p><script>window.untrusted = true</script></div></li><li><a class="floor-link" href="#12">#12</a><div class="comment-content"><p>第二条回复内容</p></div></li></ul>');
      if (path === '/api/notification/unread-count') return new window.Response(JSON.stringify({ success: true, unreadCount: {} }));
      if (path.includes('markViewed')) return new window.Response(JSON.stringify({ success: true }));
      return new window.Response(JSON.stringify({ success: true, msgArray: [] }));
    }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 40));
    const doc = f.window.document;
    assert.equal(doc.querySelectorAll('.nspp-notice-workspace .nspp-messages-peer').length, 2);
    assert.equal(requests.filter(r => r.path.startsWith('/post-')).length, 0, 'offscreen replies do not fetch');
    reveal(); await new Promise(resolve => setTimeout(resolve, 40));
    const rows = [...doc.querySelectorAll<HTMLElement>('.nspp-notice-workspace .nspp-messages-peer')];
    assert.equal(requests.filter(r => r.path === '/post-42-2').length, 1, 'two floors share one page request');
    assert.equal(requests.filter(r => r.method === 'POST').length, 0, 'preview loading must not mark notifications read');
    assert.deepEqual(rows.map(row => row.querySelector('.nspp-notice-excerpt')!.textContent), ['这是第一条真实回复 重点', '第二条回复内容']);
    assert.equal(rows[0].querySelector('.nspp-notice-subject')!.textContent, '完整的具体帖子标题');
    const link = rows[0].querySelector<HTMLAnchorElement>('.nspp-notice-subject')!;
    assert.equal(link.getAttribute('href'), '/post-42-2#11'); assert.equal(link.target, '_blank');
    assert.equal(rows[0].querySelector('time')!.textContent, '2020-01-02 03:04:05');
    assert.equal(rows[0].querySelector('time')!.getAttribute('title'), '2020-01-02 03:04:05');
    assert.equal(rows[1].querySelector('time'), null, 'invalid dates remain absent');
    link.click(); assert.equal(doc.querySelector('.nspp-notice-workspace.has-detail'), null, 'post links do not also select a notice');
    rows[0].click(); await new Promise(resolve => setTimeout(resolve, 30));
    assert.match(doc.querySelector('.nspp-notice-body')!.textContent!, /第一条真实回复/);
    assert.doesNotMatch(doc.querySelector('.nspp-notice-body')!.textContent!, /主题正文|untrusted/);
    assert.equal(doc.querySelector('.nspp-notice-body script'), null);
    assert.equal(requests.filter(r => r.path === '/post-42-2').length, 1);
    assert.equal(requests.filter(r => r.path.includes('markViewed')).length, 1, 'only opening the reply marks it read');
    assert.match(doc.querySelector('.nspp-notice-summary')!.textContent!, /2020-01-02 03:04:05/);
  } finally { await f.close(); }
});

test('notification inbox shows API reply content and never substitutes the topic for a missing floor', async () => {
  const requests: string[] = [];
  const f = await fixture({ 'user-level': { enabled: false } }, notificationPanel, '/notification#/atMe', undefined, window => {
    window.fetch = (async (url: unknown) => {
      const path = new URL(String(url)).pathname; requests.push(path);
      if (path === '/api/notification/at-me/list') return new window.Response(JSON.stringify({ success: true, atList: [
        { id: 3, post_id: 7, floor_id: 4, title: '带内容的通知', content: '<p>接口返回的回复</p>', viewed: 0 },
        { id: 2, post_id: 8, floor_id: 20, title: '回复被删除的帖子', viewed: 0 },
        { id: 1, post_id: 8, title: '没有楼层的通知', viewed: 0 },
      ] }));
      if (path.startsWith('/post-')) return new window.Response('<div class="post-content">不能冒充回复的主题正文</div>');
      return new window.Response(JSON.stringify({ success: true, msgArray: [], unreadCount: {} }));
    }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 50));
    const doc = f.window.document;
    const rows = [...doc.querySelectorAll<HTMLElement>('.nspp-notice-workspace .nspp-messages-peer')];
    assert.equal(rows[0].querySelector('.nspp-notice-excerpt')!.textContent, '接口返回的回复');
    assert.equal(requests.includes('/post-7-1'), false, 'API-supplied reply content needs no extra page request');
    rows[1].click(); await new Promise(resolve => setTimeout(resolve, 20));
    assert.match(doc.querySelector('.nspp-notice-body')!.textContent!, /未找到对应回复/);
    assert.doesNotMatch(doc.querySelector('.nspp-notice-body')!.textContent!, /不能冒充/);
    assert.equal(requests.filter(path => path.includes('markViewed')).length, 1, 'opening a notice marks it read even when the reply is gone');
    assert.equal(doc.querySelector('[data-notice-id="2"] .nspp-messages-unread'), null);
    doc.querySelector<HTMLButtonElement>('.nspp-notice-back')!.click();
    doc.querySelector<HTMLElement>('[data-notice-id="1"]')!.click(); await new Promise(resolve => setTimeout(resolve, 20));
    assert.match(doc.querySelector('.nspp-notice-body')!.textContent!, /未找到对应回复/);
    assert.doesNotMatch(doc.querySelector('.nspp-notice-body')!.textContent!, /不能冒充/);
  } finally { await f.close(); }
});

test('notification reply requests are cancelled on category changes and failed previews can retry', async () => {
  let finishPage: (() => void) | undefined;
  let pageSignal: AbortSignal | undefined;
  let fail = false, pageCalls = 0;
  const f = await fixture({ 'user-level': { enabled: false } }, notificationPanel, '/notification#/reply', undefined, window => {
    window.fetch = (async (url: unknown, options?: RequestInit) => {
      const path = new URL(String(url)).pathname;
      if (path === '/api/notification/reply-to-me/list') return new window.Response(JSON.stringify({ success: true, replyList: [{ id: 1, post_id: 42, floor_id: 11, title: '旧分类帖子', viewed: 0 }] }));
      if (path === '/api/notification/at-me/list') return new window.Response(JSON.stringify({ success: true, atList: [{ id: 2, post_id: 43, floor_id: 1, title: '新分类帖子', viewed: 0 }] }));
      if (path.startsWith('/post-')) {
        pageCalls++; pageSignal = options?.signal || undefined;
        if (path === '/post-42-2') await new Promise<void>(resolve => { finishPage = resolve; });
        if (fail) return new window.Response('Failed', { status: 503 });
        return new window.Response('<li><a class="floor-link" href="#1">#1</a><div class="comment-content">新分类回复</div></li>');
      }
      return new window.Response(JSON.stringify({ success: true, msgArray: [], unreadCount: {} }));
    }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    const doc = f.window.document;
    doc.querySelector<HTMLElement>('[data-notice-id="1"]')!.click();
    await new Promise(resolve => setTimeout(resolve, 10));
    f.window.location.hash = '#/atMe';
    f.window.dispatchEvent(new f.window.Event('hashchange'));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(pageSignal?.aborted, true);
    finishPage?.(); await new Promise(resolve => setTimeout(resolve, 15));
    assert.equal(doc.querySelector('[data-notice-id="1"]'), null);
    assert.equal(doc.querySelector('.nspp-notice-workspace.has-detail'), null);
    fail = true; doc.querySelector<HTMLElement>('[data-notice-id="2"]')!.click();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.match(doc.querySelector('.nspp-notice-body')!.textContent!, /503/);
    fail = false;
    f.storage.delete('nspp:request-cooldown:www.nodeseek.com');
    doc.querySelector<HTMLButtonElement>('.nspp-notice-back')!.click();
    doc.querySelector<HTMLElement>('[data-notice-id="2"]')!.click();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(doc.querySelector('.nspp-notice-body')!.textContent, '新分类回复');
    assert.equal(pageCalls, 3);
  } finally { finishPage?.(); await f.close(); }
});

test('notification loading shines, empty and failure states stay distinct, and missing excerpts disappear', async () => {
  let finishList: ((mode: 'empty' | 'error' | 'rows') => void) | undefined;
  let finishReply: (() => void) | undefined;
  const f = await fixture({ 'user-level': { enabled: false } }, notificationPanel, '/notification#/reply', undefined, window => {
    window.IntersectionObserver = undefined as unknown as typeof window.IntersectionObserver;
    window.fetch = (async (url: unknown) => {
      const path = new URL(String(url)).pathname;
      if (path === '/api/notification/reply-to-me/list') {
        const mode = await new Promise<'empty' | 'error' | 'rows'>(resolve => { finishList = resolve; });
        return new window.Response(JSON.stringify(mode === 'error' ? { success: false, message: '通知加载失败，请刷新重试' } : { success: true, replyList: mode === 'empty' ? [] : [{ id: 1, post_id: 42, floor_id: 11, title: '保留的帖子标题', viewed: 0 }] }));
      }
      if (path === '/post-42-2') { await new Promise<void>(resolve => { finishReply = resolve; }); return new window.Response('<div class="post-content">主题正文</div>'); }
      return new window.Response(JSON.stringify({ success: true, msgArray: [], unreadCount: {} }));
    }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 25));
    const doc = f.window.document;
    const inbox = doc.querySelector<HTMLElement>('.nspp-notice-workspace')!;
    const list = inbox.querySelector('.nspp-messages-conversations')!;
    const status = inbox.querySelector<HTMLElement>('.nspp-notice-list-scroll > [role="status"]')!;
    const refresh = inbox.querySelector<HTMLButtonElement>('.nspp-messages-search button:last-child')!;
    assert.equal(status.textContent, '正在加载主题回复…');
    assert.equal(status.getAttribute('aria-busy'), 'true');
    assert.equal(status.classList.contains('nspp-sweep-shine'), true);
    assert.equal(list.textContent, '', 'empty text must not appear before a successful response');
    finishList!('empty'); await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(list.textContent, '还没有收到主题回复');
    assert.equal(status.hasAttribute('aria-busy'), false);
    assert.equal(status.classList.contains('nspp-sweep-shine'), false);
    refresh.click(); await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(list.textContent, '', 'refresh removes the previous empty placeholder while loading');
    finishList!('error'); await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(list.textContent, ''); assert.match(status.textContent!, /加载失败/);
    assert.equal(status.classList.contains('nspp-sweep-shine'), false);
    refresh.click(); await new Promise(resolve => setTimeout(resolve, 5));
    finishList!('rows'); await new Promise(resolve => setTimeout(resolve, 20));
    const excerpt = list.querySelector<HTMLElement>('.nspp-notice-excerpt')!;
    assert.equal(excerpt.textContent, '正在加载回复…');
    assert.equal(excerpt.getAttribute('aria-busy'), 'true'); assert.equal(excerpt.classList.contains('nspp-sweep-shine'), true);
    list.querySelector<HTMLElement>('[data-notice-id="1"]')!.click();
    const body = inbox.querySelector<HTMLElement>('.nspp-notice-body')!;
    assert.equal(body.textContent, '正在加载回复内容…'); assert.equal(body.classList.contains('nspp-sweep-shine'), true);
    finishReply!(); await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(body.classList.contains('nspp-sweep-shine'), false); assert.equal(body.hasAttribute('aria-busy'), false);
    doc.querySelector<HTMLButtonElement>('.nspp-notice-back')!.click();
    const missing = list.querySelector<HTMLElement>('.nspp-notice-excerpt')!;
    assert.equal(missing.hidden, true); assert.equal(missing.textContent, '');
    assert.equal(missing.hasAttribute('aria-busy'), false);
    assert.match(list.textContent!, /保留的帖子标题/); assert.doesNotMatch(list.textContent!, /未找到|暂无|回复无文字/);
  } finally { finishList?.('empty'); finishReply?.(); await f.close(); }
});

for (const kind of ['reply', 'message'] as const) {
  test(`${kind} list loads the next page at its scroll boundary, pauses after failure and stops when exhausted`, async () => {
    const pages: number[] = [];
    const observers: { root: Element; targets: Set<Element>; callback(entries: unknown[]): void }[] = [];
    let finishPage: (() => void) | undefined;
    let fail = true;
    const endpoint = `/api/notification/${kind === 'reply' ? 'reply-to-me' : 'message'}/list`;
    const f = await fixture({ 'user-level': { enabled: false } }, notificationPanel, `/notification#/${kind}`, undefined, window => {
      window.IntersectionObserver = class {
        state: typeof observers[number];
        constructor(callback: (entries: unknown[]) => void, options?: { root?: Element; rootMargin?: string }) {
          this.state = { root: options?.root!, targets: new Set(), callback };
          if (options?.rootMargin === '150px') observers.push(this.state);
        }
        observe(target: Element) { this.state.targets.add(target); }
        unobserve(target: Element) { this.state.targets.delete(target); }
        disconnect() { this.state.targets.clear(); }
      } as unknown as typeof window.IntersectionObserver;
      window.fetch = (async (url: unknown) => {
        const parsed = new URL(String(url));
        if (parsed.pathname === endpoint) {
          const page = Number(parsed.searchParams.get('page')); pages.push(page);
          if (page === 2) await new Promise<void>(resolve => { finishPage = resolve; });
          if (page === 2 && fail) return new window.Response(JSON.stringify({ success: false, message: '分页加载失败' }));
          const rows = page === 3 ? [] : kind === 'reply' ? [{ id: page, post_id: 42, floor_id: page, title: `通知 ${page}`, content: '回复摘要', viewed: 1 }]
            : [{ id: page, sender_id: 10 + page, receiver_id: 7, sender_name: `用户 ${page}`, content: '私信内容', created_at: '2026-09-15T01:00:00', viewed: 1 }];
          return new window.Response(JSON.stringify({ success: true, [kind === 'reply' ? 'replyList' : 'msgArray']: rows }));
        }
        return new window.Response(JSON.stringify({ success: true, msgArray: [], unreadCount: {} }));
      }) as typeof window.fetch;
    });
    try {
      await new Promise(resolve => setTimeout(resolve, 35));
      const observer = observers.find(item => item.root.classList.contains('nspp-notice-list-scroll') === (kind === 'reply'))!;
      const more = observer.root.querySelector<HTMLButtonElement>('.nspp-messages-more')!;
      assert.ok(more && observer.targets.has(more), 'pagination belongs inside its scroll viewport');
      assert.deepEqual(pages, [1], 'initial loading does not eagerly fetch the next page');
      const enter = () => observer.callback([{ target: more, isIntersecting: true }]);
      enter(); enter(); await new Promise(resolve => setTimeout(resolve, 10));
      assert.deepEqual(pages, [1, 2], 'duplicate intersections cannot overlap requests');
      finishPage!(); await new Promise(resolve => setTimeout(resolve, 20));
      enter(); await new Promise(resolve => setTimeout(resolve, 10));
      assert.deepEqual(pages, [1, 2], 'failure pauses automatic loading');
      assert.equal(observer.targets.size, 0);
      fail = false; more.click(); await new Promise(resolve => setTimeout(resolve, 10));
      finishPage!(); await new Promise(resolve => setTimeout(resolve, 20));
      assert.deepEqual(pages, [1, 2, 2], 'manual retry requests the failed page');
      assert.ok(observer.targets.has(more));
      enter(); await new Promise(resolve => setTimeout(resolve, 20));
      assert.deepEqual(pages, [1, 2, 2, 3]); assert.equal(more.hidden, true);
      enter(); await new Promise(resolve => setTimeout(resolve, 10));
      assert.deepEqual(pages, [1, 2, 2, 3], 'empty pages end automatic pagination');
      f.window.dispatchEvent(new f.window.PageTransitionEvent('pagehide', { persisted: false }));
      assert.equal(observer.targets.size, 0);
    } finally { finishPage?.(); await f.close(); }
  });
}

test('notification categories stay in the own sidebar card on the fans page', async () => {
  const own = '<div class="user-card"><div class="user-stat"><div class="stat-block"><div><a href="/notification">通知</a></div></div><div class="stat-block">收藏 2</div></div></div>';
  const fan = '<div class="user-card"><div class="user-head"><a href="/space/123"><img alt="Alice"></a></div><div class="user-stat"><div class="stat-block">鸡腿 1</div><div class="stat-block">粉丝 0</div></div></div>';
  const f = await fixture({ 'notification-categories': { enabled: true } }, `<main>${fan}</main><aside>${own}</aside>`, '/fans?type=fans', undefined, window => {
    Object.assign(window, { fetch: async () => new Response(JSON.stringify({ success: true, unreadCount: { reply: 1, atMe: 0, message: 0 } })) });
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 60));
    const doc = f.window.document;
    assert.equal(doc.querySelectorAll('main .nspp-notification-row').length, 0);
    assert.equal(doc.querySelectorAll('aside .nspp-notification-link').length, 3);
  } finally { await f.close(); }
});
