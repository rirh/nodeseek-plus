import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

const bundle = readFileSync(process.env.NSPP_TEST_BUNDLE || new URL('../dist/nodeseek-plus-plus.user.js', import.meta.url), 'utf8');
const key = 'nspp:settings:www.nodeseek.com';
async function fixture(settings: Record<string, unknown> = {}, html = '', path = '/', shared?: Map<string, unknown>, setup?: (window: Window) => void, testUpdates = false) {
  // Evaluate only our locally built bundle and fixed test fixtures, never downloaded code.
  const window = new Window({ url: `https://www.nodeseek.com${path}`, settings: { enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
  const storage = shared || new Map<string, unknown>([[key, { attendance: { enabled: true, automatic: false }, monitor: { enabled: false }, 'notification-categories': { enabled: false }, 'request-settings': { enabled: true, requestInterval: 0 }, ...settings }]]);
  const requests: string[] = [];
  const menus: (() => void)[] = [];
  Object.assign(window, {
    structuredClone,
    GM_getValue: (key: string, fallback: unknown) => storage.has(key) ? structuredClone(storage.get(key)) : fallback,
    GM_setValue: (key: string, value: unknown) => storage.set(key, structuredClone(value)),
    GM_registerMenuCommand: (_: string, fn: () => void) => menus.push(fn),
    GM_addStyle: (css: string) => { const el = window.document.createElement('style'); el.textContent = css; window.document.head.append(el); },
    unsafeWindow: window,
    __config__: { user: { member_id: 7, member_name: 'tester', rank: 3 } },
    fetch: async (url: unknown) => { requests.push(String(url)); throw new Error('No fixture response'); },
  });
  setup?.(window);
  if (!testUpdates) {
    // Keep unrelated fixtures isolated from the automatic page-entry metadata check.
    type RequestOptions = { url: string; onload(response: { status: number; responseText: string }): void };
    const original = (window as unknown as { GM_xmlhttpRequest?: (options: RequestOptions) => unknown }).GM_xmlhttpRequest;
    Object.assign(window, { GM_xmlhttpRequest: (options: RequestOptions) => {
      if (options.url.split('?')[0] !== 'https://update.greasyfork.org/scripts/595488/NodeSeek%2B%2B.meta.js') {
        if (!original) throw new Error('No fixture GM response');
        return original(options);
      }
      queueMicrotask(() => options.onload({ status: 200, responseText: '// ==UserScript==\n// @version 0.0.0\n// ==/UserScript==' }));
      return { abort() {} };
    } });
  }
  window.document.body.innerHTML = html;
  window.eval(bundle);
  await new Promise(resolve => setTimeout(resolve, 5));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  let stopped = false;
  window.addEventListener('pagehide', event => { if (!event.persisted) stopped = true; });
  return {
    window, storage, requests, menus,
    close: () => {
      if (!stopped) window.dispatchEvent(new window.PageTransitionEvent('pagehide', { persisted: false }));
      window.happyDOM.abort();
    },
  };
}

const realSetTimeout = setTimeout;
async function waitFor(check: () => boolean) {
  const deadline = Date.now() + 300;
  while (!check() && Date.now() < deadline) await new Promise(resolve => realSetTimeout(resolve, 5));
  assert.ok(check(), 'expected DOM state did not become ready within 300ms');
}

function mockWindowTimers(t: TestContext, window: Window) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(window, 'setTimeout', (callback: (...args: unknown[]) => void, delay = 0, ...args: unknown[]) => setTimeout(callback, delay, ...args));
  t.mock.method(window, 'clearTimeout', (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer));
}

test('profile discussion stats load visible rows, reuse cached counts and leave other tabs alone', async () => {
  const calls: string[] = [];
  const observed = new Set<Element>();
  let show: () => void = () => {};
  const html = '<div class="discussion-wrapper"><div class="discussion-item"><a href="/post-42-1"><span>主题帖</span></a><span data-native></span></div></div>';
  const f = await fixture({}, html, '/space/17170#/discussions', undefined, window => {
    window.IntersectionObserver = class {
      constructor(callback: (entries: unknown[]) => void, options?: { rootMargin?: string }) {
        if (options?.rootMargin === '200px') show = () => callback([...observed].map(target => ({ target, isIntersecting: true })));
      }
      observe(target: Element) { observed.add(target); }
      unobserve(target: Element) { observed.delete(target); }
      disconnect() { observed.clear(); }
    } as unknown as typeof window.IntersectionObserver;
    window.fetch = (async (url: unknown) => {
      const path = new URL(String(url)).pathname; calls.push(path);
      const postData = { postId: 42, views: '44724', postPage: path.endsWith('-26') ? 26 : 1, postPageCount: 26, comments: [{ floorIndex: path.endsWith('-26') ? 256 : 10 }] };
      return new window.Response(`<script id="temp-script" type="text/plain">${Buffer.from(JSON.stringify({ postData })).toString('base64')}</script>`);
    }) as typeof window.fetch;
  });
  try {
    const doc = f.window.document;
    assert.equal(calls.length, 0, 'offscreen rows do not fetch');
    assert.equal(doc.querySelector<HTMLElement>('.nspp-discussion-stats')!.hidden, true);
    show(); show(); await new Promise(resolve => setTimeout(resolve, 40));
    assert.deepEqual(calls, ['/post-42-1', '/post-42-26']);
    assert.deepEqual([...doc.querySelectorAll('[data-count]')].map(el => el.textContent), ['44724', '256']);
    assert.equal(doc.querySelector<HTMLElement>('.nspp-discussion-stats')!.hidden, false);
    assert.ok(doc.querySelector('.discussion-item')!.lastElementChild!.classList.contains('nspp-discussion-stats'));
    assert.deepEqual([...doc.querySelectorAll('.nspp-discussion-stats use')].map(el => el.getAttribute('href')), ['#eyes', '#comments']);
    assert.ok(doc.querySelector('.discussion-item > [data-native]'));
    doc.querySelector('.discussion-wrapper')!.outerHTML = html;
    await new Promise(resolve => setTimeout(resolve, 150)); show();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(calls.length, 2, 're-rendered rows use the cached counts');
    assert.equal(doc.querySelectorAll('.nspp-discussion-stats').length, 1);
    f.window.history.replaceState(null, '', '/space/17170#/comments');
    f.window.dispatchEvent(new f.window.Event('popstate'));
    assert.equal(doc.querySelector('.nspp-discussion-stats'), null);
    assert.equal(calls.length, 2);
  } finally { await f.close(); }
});

test('profile discussion stats hide failed requests and cancel on navigation', async () => {
  let show: () => void = () => {};
  let signal: AbortSignal | undefined;
  const f = await fixture({}, '<div class="discussion-wrapper"><div class="discussion-item"><a href="/post-42-1">主题帖</a><span></span></div></div>', '/space/17170#/discussions', undefined, window => {
    window.IntersectionObserver = class {
      callback: (entries: unknown[]) => void;
      constructor(callback: (entries: unknown[]) => void) { this.callback = callback; }
      observe(target: Element) { show = () => this.callback([{ target, isIntersecting: true }]); }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof window.IntersectionObserver;
    window.fetch = (async (_url: unknown, options: RequestInit) => {
      signal = options.signal!;
      return new window.Response('Unavailable', { status: 500 });
    }) as typeof window.fetch;
  });
  try {
    show(); await new Promise(resolve => setTimeout(resolve, 30));
    assert.deepEqual([...f.window.document.querySelectorAll('[data-count]')].map(el => el.textContent), ['', '']);
    assert.equal(f.window.document.querySelector<HTMLElement>('.nspp-discussion-stats')!.hidden, true);
    f.window.history.replaceState(null, '', '/space/17170#/comments');
    f.window.dispatchEvent(new f.window.Event('popstate'));
    assert.equal(signal?.aborted, true);
    assert.equal(f.window.document.querySelector('.nspp-discussion-stats'), null);
  } finally { await f.close(); }
});

test('bundle is self-contained, scoped to forum hosts and has no remote require', () => {
  assert.match(bundle, /@match\s+https:\/\/www\.nodeseek\.com\/\*/);
  assert.doesNotMatch(bundle, /@match\s+\*:\/\/\*\/\*/);
  assert.doesNotMatch(bundle, /@require/);
  assert.match(bundle, /@noframes/);
});

test('manual update checks read metadata and open an update link only for a newer release', async () => {
  const requests: { url: string; anonymous: boolean; nocache: boolean; headers: Record<string, string> }[] = [];
  let version = '1.0.0';
  const f = await fixture({}, '', '/', undefined, window => {
    Object.assign(window, {
      GM_xmlhttpRequest: (options: typeof requests[number] & { onload(response: { status: number; responseText: string }): void }) => {
        requests.push(options);
        setTimeout(() => options.onload({ status: 200, responseText: `// ==UserScript==\n// @version ${version}\n// ==/UserScript==` }), 0);
        return { abort() {} };
      },
    });
  }, true);
  try {
    await new Promise(resolve => setTimeout(resolve, 10));
    requests.length = 0; version = '99.999.9999';
    f.menus[0]();
    const root = f.window.document.querySelector('#nspp-settings')!.shadowRoot!;
    const button = root.querySelector<HTMLButtonElement>('.check-update')!;
    button.click(); button.click();
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url.split('?')[0], 'https://update.greasyfork.org/scripts/595488/NodeSeek%2B%2B.meta.js');
    assert.ok(new URL(requests[0].url).searchParams.get('_'));
    assert.equal(requests[0].nocache, true);
    assert.match(requests[0].headers['Cache-Control'], /no-store/);
    assert.equal(requests[0].headers.Pragma, 'no-cache');
    assert.equal(requests[0].anonymous, true);
    const dialog = f.window.document.querySelector<HTMLDialogElement>('.nspp-confirm-dialog')!;
    assert.equal(dialog.open, true);
    assert.match(dialog.textContent!, /99\.999\.9999/);
    const install = dialog.querySelector<HTMLAnchorElement>('a')!;
    assert.equal(install.href, 'https://update.greasyfork.org/scripts/595488/NodeSeek%2B%2B.user.js');
    assert.equal(install.target, '_blank');
    dialog.close('cancel');
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(button.disabled, false);
    version = '1.0.0'; button.click();
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(requests.length, 2);
    assert.notEqual(requests[0].url, requests[1].url, 'each manual check bypasses URL caches');
    assert.equal(f.window.document.querySelector('.nspp-confirm-dialog'), null);
    assert.match(root.querySelector('.toast-message')!.textContent!, /当前已是最新版本/);
  } finally { await f.close(); }
});

test('page entry always checks updates while system and page reminders are deduplicated', async () => {
  const shared = new Map<string, unknown>([
    [key, { attendance: { enabled: false }, monitor: { enabled: false }, 'notification-categories': { enabled: false } }],
    ['nspp:script-update', { checkedAt: Date.now(), version: '1.0.0' }],
    ['nspp:lock:www.nodeseek.com:script-update', { started: Date.now(), until: Date.now() + 120000, owner: 'another-page' }],
  ]);
  const requests: string[] = [];
  const notifications: { title: string; text: string; url: string }[] = [];
  let version = '99.999.9999';
  const setup = (window: Window) => {
    Object.defineProperty(window.document, 'hidden', { configurable: true, value: true });
    Object.assign(window, {
      GM_notification: (details: typeof notifications[number]) => notifications.push(details),
      GM_xmlhttpRequest: (options: { url: string; onload(response: { status: number; responseText: string }): void }) => {
        requests.push(options.url);
        queueMicrotask(() => options.onload({ status: 200, responseText: `// ==UserScript==\n// @version ${version}\n// ==/UserScript==` }));
        return { abort() {} };
      },
    });
  };
  const f = await fixture({}, '', '/', shared, setup, true);
  let second: Awaited<ReturnType<typeof fixture>> | undefined;
  try {
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(requests.length, 1, 'page entry ignores cached checks and another page checking updates');
    assert.equal(notifications.length, 1, 'a hidden page still sends a system notification');
    assert.match(notifications[0].title, /发现新版本/);
    assert.equal(notifications[0].url, 'https://update.greasyfork.org/scripts/595488/NodeSeek%2B%2B.user.js');
    assert.equal(f.window.document.querySelector('.nspp-confirm-dialog'), null);
    Object.defineProperty(f.window.document, 'hidden', { configurable: true, value: false });
    f.window.document.dispatchEvent(new f.window.Event('visibilitychange'));
    await new Promise(resolve => setTimeout(resolve, 10));
    const dialog = f.window.document.querySelector<HTMLDialogElement>('.nspp-confirm-dialog')!;
    assert.ok(dialog?.open, 'the page reminder waits until visible');
    assert.equal(requests.length, 2, 'returning to the page requests fresh metadata');
    const firstRestore = new f.window.Event('pageshow'); Object.defineProperty(firstRestore, 'persisted', { value: true });
    f.window.dispatchEvent(firstRestore);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(requests.length, 3, 'an open automatic reminder must not block a page-entry check');
    dialog.close('cancel');
    second = await fixture({}, '', '/page-2', shared, setup, true);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(requests.length, 4, 'each new page requests fresh metadata');
    assert.equal(notifications.length, 1, 'the same version does not notify again on another page');
    Object.defineProperty(second.window.document, 'hidden', { configurable: true, value: false });
    second.window.document.dispatchEvent(new second.window.Event('visibilitychange'));
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(second.window.document.querySelector('.nspp-confirm-dialog'), null);
    const restore = new second.window.Event('pageshow'); Object.defineProperty(restore, 'persisted', { value: true });
    second.window.dispatchEvent(restore);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(requests.length, 6, 'visibility and back-forward cache restoration each check again');
    assert.equal(notifications.length, 1);
    version = '99.999.9999.1';
    second.window.dispatchEvent(restore);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(requests.length, 7);
    assert.equal(new Set(requests).size, requests.length, 'every page check uses a unique request URL');
    assert.equal(notifications.length, 2, 'a different new version notifies immediately');
    assert.match(notifications[1].text, /99\.999\.9999\.1/);
    second.window.document.querySelector<HTMLDialogElement>('.nspp-confirm-dialog')!.close('cancel');
  } finally { await f.close(); await second?.close(); }
});

test('boot with monitoring disabled makes no API calls; repeated boot does not duplicate the UI', async () => {
  const f = await fixture({}, '<ul class="post-list"><li class="post-list-item"><div class="post-title"><a href="/post-42-1">Test post</a></div></li></ul>');
  try {
    assert.equal(f.window.document.querySelectorAll('#nspp-settings').length, 1);
    assert.equal(f.menus.length, 1);
    assert.equal(f.requests.length, 0);
    f.window.eval(bundle);
    assert.equal(f.window.document.querySelectorAll('#nspp-settings').length, 1);
    assert.equal(f.window.document.querySelectorAll('#nspp-tools').length, 1);
    f.menus[0]();
    const root = f.window.document.querySelector('#nspp-settings')!.shadowRoot!;
    assert.equal(root.querySelector('dialog')!.open, true);
    assert.ok(root.querySelectorAll('article').length >= 20);
  } finally { await f.close(); }
});

test('dynamic posts are filtered once and collapsing retains an expand control', async () => {
  const f = await fixture({ 'content-filter': { enabled: true, keywords: 'promo', mode: 'collapse' } }, '<ul class="post-list"></ul>');
  try {
    const item = f.window.document.createElement('li'); item.className = 'post-list-item';
    item.innerHTML = '<div class="post-title"><a href="/post-43-1">promo deal</a></div>';
    f.window.document.querySelector('ul')!.append(item);
    await new Promise(resolve => setTimeout(resolve, 240));
    assert.equal(item.hidden, true);
    const button = item.previousElementSibling!.querySelector('button')!;
    button.click(); assert.equal(item.hidden, false);
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(f.window.document.querySelectorAll('.post-list > li').length, 2);
  } finally { await f.close(); }
});

test('pagination deduplicates concurrent loads and strips active fetched content', async () => {
  const f = await fixture({}, '<ul class="post-list"><li id="p1"><div class="post-title"><a href="/post-1-1">First</a></div></li></ul><div class="nsk-pager"><a class="pager-next" href="/page-2">Next</a></div>');
  try {
    let calls = 0;
    f.window.fetch = (async () => {
      calls++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return new f.window.Response('<ul class="post-list"><li id="p1">duplicate</li><li id="p2"><div class="post-title"><a href="/post-2-1">Second</a></div><script>window.injected=true</script><img src="x" onerror="window.injected=true"><a href="java&#10;script:alert(1)">unsafe</a></li></ul>');
    }) as typeof f.window.fetch;
    const button = [...f.window.document.querySelectorAll('button')].find(el => el.textContent === '加载下一页')!;
    button.click(); button.click();
    await new Promise(resolve => setTimeout(resolve, 60));
    assert.equal(calls, 1);
    assert.equal(f.window.document.querySelectorAll('#p1').length, 1);
    assert.ok(f.window.document.querySelector('#p2'));
    assert.equal(f.window.document.querySelector('#p2 script'), null);
    assert.equal(f.window.document.querySelector('#p2 img')?.hasAttribute('onerror'), false);
    assert.equal(f.window.document.querySelector('#p2 a[href^="javascript:"]'), null);
  } finally { await f.close(); }
});

for (const outcome of ['success', 'failure', 'http-error', 'network-error', 'invalid-json']) {
  test(`attendance ${outcome} is cached for the day, survives reopening and retries tomorrow`, async () => {
    let clock = Date.parse('2026-09-14T04:00:00Z'), calls = 0;
    const settings = { attendance: { enabled: true, automatic: true, mode: 'fixed' }, 'official-blocklist': { enabled: false } };
    const setup = (window: Window) => {
      const NativeDate = window.Date;
      window.Date = class extends NativeDate {
        constructor(value?: string | number) { super(value ?? clock); }
        static now() { return clock; }
      } as typeof window.Date;
      window.matchMedia = (() => ({ matches: true })) as typeof window.matchMedia;
      window.fetch = (async () => {
        calls++;
        if (outcome === 'network-error') throw new Error('network unavailable');
        if (outcome === 'http-error') return new window.Response('', { status: 500 });
        if (outcome === 'invalid-json') return new window.Response('<html>error</html>');
        return new window.Response(JSON.stringify({ success: outcome === 'success', message: outcome === 'success' ? '签到成功' : 'retry' }));
      }) as typeof window.fetch;
    };
    const first = await fixture(settings, '', '/', undefined, setup);
    let reopened: Awaited<ReturnType<typeof fixture>> | undefined;
    try {
      await new Promise(resolve => setTimeout(resolve, 30));
      const control = first.window.document.querySelector<HTMLButtonElement>('#nspp-tools button[aria-label="已签到"]')!;
      assert.ok(control);
      assert.equal(control.hidden, true);
      assert.deepEqual(first.storage.get('nspp:state:www.nodeseek.com:attendance'), { 'day:7': '2026-09-14' });
      assert.equal(calls, 1);
      if (outcome !== 'success') assert.doesNotMatch(first.window.document.body.textContent, /签到失败|retry/);
      clock += 11 * 60_000;
      control.click();
      first.window.dispatchEvent(new first.window.Event('focus'));
      first.window.document.dispatchEvent(new first.window.Event('visibilitychange'));
      await new Promise(resolve => setTimeout(resolve, 20));
      assert.equal(calls, 1, 'focus and visibility changes must not retry today');
      reopened = await fixture(settings, '', '/', first.storage, setup);
      await new Promise(resolve => setTimeout(resolve, 30));
      assert.equal(calls, 1, 'reopening uses the persistent daily record');
      assert.equal(reopened.window.document.querySelector<HTMLButtonElement>('#nspp-tools button[aria-label="签到"]')!.hidden, true);
      await first.close();
      clock = Date.parse('2026-09-14T16:01:00Z');
      reopened.window.dispatchEvent(new reopened.window.Event('focus'));
      await new Promise(resolve => setTimeout(resolve, 30));
      assert.equal(calls, 2, 'Shanghai midnight enables a new attempt');
      assert.deepEqual(first.storage.get('nspp:state:www.nodeseek.com:attendance'), { 'day:7': '2026-09-15' });
      assert.equal(reopened.window.document.querySelector<HTMLButtonElement>('#nspp-tools button[aria-label="已签到"]')!.hidden, true);
    } finally { await first.close(); await reopened?.close(); }
  });
}

test('attendance daily cache does not suppress another account', async () => {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
  const storage = new Map<string, unknown>([[key, { attendance: { enabled: true, automatic: true }, monitor: { enabled: false }, 'notification-categories': { enabled: false }, 'official-blocklist': { enabled: false } }], ['nspp:state:www.nodeseek.com:attendance', { 'day:7': day }]]);
  let calls = 0;
  const f = await fixture({}, '', '/', storage, window => {
    Object.assign(window, { __config__: { user: { member_id: 8 } } });
    window.fetch = (async () => { calls++; return new window.Response(JSON.stringify({ success: false })); }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(calls, 1);
    assert.deepEqual(storage.get('nspp:state:www.nodeseek.com:attendance'), { 'day:7': day, 'day:8': day });
  } finally { await f.close(); }
});

test('two tabs share attendance state and do not issue concurrent sign-ins', async () => {
  const first = await fixture({ attendance: { enabled: true, automatic: false } });
  const second = await fixture({}, '', '/', first.storage);
  try {
    let calls = 0;
    const fetch = async () => {
      calls++;
      await new Promise(resolve => setTimeout(resolve, 40));
      return new first.window.Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    };
    first.window.fetch = fetch as typeof first.window.fetch;
    second.window.fetch = fetch as typeof second.window.fetch;
    for (const tab of [first, second]) [...tab.window.document.querySelectorAll('button')].find(el => el.getAttribute('aria-label') === '签到')!.click();
    await new Promise(resolve => setTimeout(resolve, 70));
    assert.equal(calls, 1);
    [...second.window.document.querySelectorAll('button')].find(el => el.getAttribute('aria-label') === '签到')!.click();
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(calls, 1, 'second tab reads newly saved account/day state');
  } finally { await first.close(); await second.close(); }
});


test('missing GM APIs do not abort startup or pretend settings were saved', async () => {
  const f = await fixture({}, '', '/', undefined, window => {
    Object.assign(window, { GM_getValue: undefined, GM_setValue: undefined, GM_registerMenuCommand: undefined, unsafeWindow: undefined });
  });
  try {
    const root = f.window.document.querySelector('#nspp-settings')!.shadowRoot!;
    f.window.document.querySelector<HTMLButtonElement>('[data-nspp-settings-launcher]')!.click();
    assert.equal(root.querySelector('dialog')!.open, true);
    assert.equal((root.querySelector('.primary') as HTMLButtonElement).disabled, true);
    assert.match(root.querySelector('.status')!.textContent!, /油猴存储未就绪/);
    assert.ok(f.window.document.querySelector('#nspp-tools'));
    assert.equal(f.window.localStorage.length, 0);
  } finally { await f.close(); }
});

test('user badges load visible names, share requests and can retry failed profiles', async () => {
  let calls = 0;
  const f = await fixture({ 'official-blocklist': { enabled: false } }, '<div class="author-info"><a href="/space/123">Alice</a><span class="role-tag">管理员</span><span class="role-tag">站点创建者</span><span class="role-tag">拥有者</span><span class="role-tag">服主</span><span class="role-tag">管理</span></div><div class="author-info"><a href="/space/123">Alice</a></div>', '/', undefined, window => {
    window.fetch = (async () => {
      calls++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return new window.Response(JSON.stringify(calls === 1 ? { success: false } : { success: true, detail: { coin: 2500, created_at: new Date(Date.now() - 400 * 86400000).toISOString() } }), { headers: { 'Content-Type': 'application/json' } });
    }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(calls, 1);
    assert.deepEqual(Array.from(f.window.document.querySelectorAll('.author-info [data-nspp-role]'), tag => tag.getAttribute('data-nspp-role')), ['admin', 'founder', 'owner', 'owner', 'admin']);
    assert.equal(f.window.document.querySelectorAll('.nspp-user-badges button').length, 2);
    f.storage.delete('nspp:profile-completed:www.nodeseek.com');
    for (const button of f.window.document.querySelectorAll('.nspp-user-badges button')) (button as HTMLElement).click();
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(calls, 2);
    assert.equal(f.window.document.querySelectorAll('.author-info .nspp-level').length, 2);
    assert.equal(f.window.document.querySelector('.nspp-level')!.textContent, 'Lv5');
    assert.equal(f.window.document.querySelector('.nspp-age')!.getAttribute('data-tone'), 'longtime');
    assert.equal(f.window.document.querySelector('.nspp-age')!.textContent, '400天');
    f.window.document.querySelector<HTMLButtonElement>('.nspp-age')!.click();
    const profileDialog = f.window.document.querySelector<HTMLDialogElement>('.nspp-profile-dialog')!;
    assert.equal(profileDialog.open, true);
    assert.match(profileDialog.textContent!, /长期成员/);
    assert.equal(profileDialog.querySelectorAll('dd').length, 4);
    profileDialog.querySelector<HTMLButtonElement>('button')!.click();
    assert.equal(profileDialog.open, false);
    assert.match(f.window.document.querySelector<HTMLElement>('.nspp-age')!.title, /已加入 400 天\n加入于 .+\n发帖/);
    assert.equal(f.window.document.querySelector('.nspp-trust')!.textContent, '—');
    assert.equal(f.window.document.querySelector('.nspp-user-badges')!.hasAttribute('aria-busy'), false);
    const stats = f.window.document.querySelector('.nspp-user-hover dl')!;
    const links = [...stats.querySelectorAll<HTMLAnchorElement>('dd a')];
    assert.deepEqual(links.map(link => link.getAttribute('href')), ['/space/123#/discussions', '/space/123#/comments', '/stardust/list?member_id=123']);
    assert.deepEqual(links.map(link => link.getAttribute('aria-label')), ['查看主题帖：—', '查看评论数：—', '查看星辰：—']);
    assert.ok(links.every(link => link.target === '_blank' && link.rel === 'noopener noreferrer'));
    assert.equal(stats.querySelectorAll('dd').length, 6, 'the compact statistics layout is retained');
  } finally { await f.close(); }
});


test('user profiles persist across pages for one day and refresh after expiry', async () => {
  const stateKey = 'nspp:state:www.nodeseek.com:user-level';
  const user = { coin: 2500, created_at: new Date(Date.now() - 400 * 86400000).toISOString() };
  const storage = new Map<string, unknown>([[key, { attendance: { enabled: false }, monitor: { enabled: false }, 'notification-categories': { enabled: false }, 'official-blocklist': { enabled: false } }]]);
  let calls = 0;
  for (const age of [null, 12, 25]) {
    storage.delete('nspp:profile-completed:www.nodeseek.com');
    if (age !== null) storage.set(stateKey, { profiles: { '123': { time: Date.now() - age * 3600000, user } } });
    const f = await fixture({}, '<div class="author-info"><a href="/space/123">Alice</a></div>', '/', storage, window => {
      window.fetch = (async () => {
        calls++;
        return new window.Response(JSON.stringify({ success: true, detail: user }), { headers: { 'Content-Type': 'application/json' } });
      }) as typeof window.fetch;
    });
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      assert.equal(calls, age === 25 ? 2 : 1);
      assert.equal(f.window.document.querySelector('.nspp-level')?.textContent, 'Lv5');
      const state = storage.get(stateKey) as { profiles: Record<string, { time: number; user: unknown }> };
      assert.deepEqual(state.profiles['123'].user, user);
      if (age !== 12) assert.ok(Date.now() - state.profiles['123'].time < 5000);
    } finally { await f.close(); }
  }
});

test('profile cache keeps more than 200 fresh users across pages and removes expired entries', async () => {
  const stateKey = 'nspp:state:www.nodeseek.com:user-level';
  const user = { rank: 3 };
  const profiles = Object.fromEntries(Array.from({ length: 201 }, (_, i) => [String(i + 1), { time: Date.now() - 3600000, user }]));
  profiles['999'] = { time: Date.now() - 86400000, user };
  const storage = new Map<string, unknown>([
    [key, { attendance: { enabled: false }, monitor: { enabled: false }, 'notification-categories': { enabled: false }, 'official-blocklist': { enabled: false } }],
    [stateKey, { profiles }],
  ]);
  let calls = 0;
  for (const id of ['202', '1']) {
    const f = await fixture({}, `<div class="author-info"><a href="/space/${id}">Alice</a></div>`, '/', storage, window => {
      window.fetch = (async () => { calls++; return new window.Response(JSON.stringify({ success: true, detail: user })); }) as typeof window.fetch;
    });
    try {
      await new Promise(resolve => setTimeout(resolve, 30));
      assert.equal(calls, 1);
      assert.equal(f.window.document.querySelector('.nspp-level')?.textContent, 'Lv3');
      const state = storage.get(stateKey) as { profiles: typeof profiles };
      assert.equal(Object.keys(state.profiles).length, 202);
      assert.ok(state.profiles['1']); assert.equal(state.profiles['999'], undefined);
    } finally { await f.close(); }
  }
});

test('in-memory profiles expire at 24 hours on a page that stays open', async () => {
  const now = Date.now();
  let calls = 0;
  const f = await fixture({ 'official-blocklist': { enabled: false } }, '<div class="author-info"><a href="/space/123">Alice</a></div>', '/', undefined, window => {
    window.Date.now = () => now;
    window.fetch = (async () => { calls++; return new window.Response(JSON.stringify({ success: true, detail: { rank: calls } })); }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(calls, 1);
    for (const [elapsed, expected] of [[86400000 - 1, 1], [86400000, 2]]) {
      f.window.Date.now = () => now + elapsed;
      const row = f.window.document.createElement('div'); row.className = 'author-info';
      row.innerHTML = '<a href="/space/123">Alice</a>'; f.window.document.body.append(row);
      await new Promise(resolve => setTimeout(resolve, 220));
      assert.equal(calls, expected);
      assert.equal(row.querySelector('.nspp-level')?.textContent, `Lv${expected}`);
    }
  } finally { await f.close(); }
});

test('avatar and last-commenter profiles load only on interaction and share cached data', async () => {
  let calls = 0;
  const f = await fixture({ 'official-blocklist': { enabled: false } }, '<a href="/space/123"><img alt="Alice"></a><span class="info-last-commenter"><a href="/space/123">Alice</a></span>', '/', undefined, window => {
    window.fetch = (async (url: unknown) => {
      const target = new URL(String(url));
      if (target.pathname === '/api/fans/follow') return new window.Response(JSON.stringify({ success: true, memberList: [] }));
      assert.equal(target.pathname, '/api/account/getInfo/123');
      assert.equal(target.search, '', 'profile endpoint rejects the signature query parameter');
      calls++;
      return new window.Response(JSON.stringify({ success: true, detail: { rank: 3 } }));
    }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(calls, 0);
    f.window.document.querySelector('a:has(img)')!.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(calls, 1);
    f.window.document.querySelector('.info-last-commenter a')!.dispatchEvent(new f.window.Event('focus'));
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(calls, 1);
    assert.equal(f.window.document.querySelector('.info-last-commenter .nspp-level')?.textContent, 'Lv3');
  } finally { await f.close(); }
});

test('request concurrency and default interval settings are searchable and saved', async () => {
  let calls = 0;
  const f = await fixture({ 'request-settings': { enabled: true, maxConcurrent: 2 }, 'official-blocklist': { enabled: false } }, '<div class="author-info"><a href="/space/123">Alice</a><a href="/space/124">Bob</a></div>', '/', undefined, window => {
    window.fetch = (async () => {
      calls++;
      return new window.Response(JSON.stringify({ success: true, detail: { created_at: '2020-01-01' } }), { headers: { 'Content-Type': 'application/json' } });
    }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(calls, 1, 'default 200ms interval separates request starts');
    await new Promise(resolve => setTimeout(resolve, 220));
    assert.equal(calls, 2);
    f.menus[0]();
    const root = f.window.document.querySelector('#nspp-settings')!.shadowRoot!;
    const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = '最大并发请求数'; search.dispatchEvent(new f.window.Event('input'));
    assert.equal(root.querySelectorAll('article').length, 1);
    assert.match(root.querySelector('article')!.textContent!, /接口请求并发/);
    assert.ok(root.querySelector('article > .feature-options'));
    assert.equal(root.querySelector('details'), null);
    assert.equal(root.querySelector<HTMLInputElement>('input[type="number"]')!.value, '2');
    const inputs = root.querySelectorAll<HTMLInputElement>('input[type="number"]');
    assert.equal(inputs[0].min, '1'); assert.equal(inputs[0].max, '10');
    assert.equal(inputs[1].value, '200'); assert.equal(inputs[1].min, '0'); assert.equal(inputs[1].max, '5000');
    inputs[1].value = '350'; inputs[1].dispatchEvent(new f.window.Event('input'));
    root.querySelector('form')!.dispatchEvent(new f.window.Event('submit', { cancelable: true }));
    assert.equal((f.storage.get(key) as Record<string, Record<string, unknown>>)['request-settings'].requestInterval, 350);
  } finally { await f.close(); }
});

test('one block button per name reflects queried state and synchronizes after changes', async () => {
  const calls: string[] = [];
  let blocked = true;
  const f = await fixture({ 'user-level': { enabled: false } }, '<div class="author-info"><a href="/space/123">Alice</a></div><div class="author-info"><a href="/space/123">Alice</a></div>', '/', undefined, window => {
    window.fetch = (async (url: unknown) => {
      const path = new URL(String(url)).pathname; calls.push(path);
      if (path.endsWith('/del')) blocked = false;
      if (path.endsWith('/add')) blocked = true;
      return new window.Response(JSON.stringify(path.endsWith('/list') ? { success: true, data: blocked ? [{ block_member_id: 123 }] : [] } : { success: true }));
    }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 50));
    const buttons = [...f.window.document.querySelectorAll<HTMLButtonElement>('.nspp-block-toggle')];
    assert.equal(buttons.length, 2);
    assert.deepEqual(buttons.map(b => b.textContent), ['取消屏蔽', '取消屏蔽']);
    assert.deepEqual(calls, ['/api/block-list/list']);
    buttons[0].click(); buttons[1].click();
    const confirmation = f.window.document.querySelector<HTMLDialogElement>('.nspp-confirm-dialog')!;
    assert.equal(confirmation.open, true);
    assert.equal(f.window.document.querySelectorAll('.nspp-confirm-dialog').length, 1);
    assert.deepEqual(calls, ['/api/block-list/list'], 'no mutation before confirmation');
    confirmation.close('confirm');
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.deepEqual(calls, ['/api/block-list/list', '/api/block-list/del']);
    assert.deepEqual(buttons.map(b => b.textContent), ['屏蔽', '屏蔽']);
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.equal(calls.length, 2);
  } finally { await f.close(); }
});

test('failed blacklist lookup offers retry, never assumes an empty list', async () => {
  const f = await fixture({ 'user-level': { enabled: false } }, '<div class="author-info"><a href="/space/123">Alice</a></div>');
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(f.window.document.querySelector('.nspp-block-toggle')!.textContent, '重试');
    assert.equal(f.requests.length, 1);
  } finally { await f.close(); }
});

test('settings categories are anchors, scroll updates selection and search filters both panes', async () => {
  const f = await fixture();
  try {
    f.menus[0]();
    const root = f.window.document.querySelector('#nspp-settings')!.shadowRoot!;
    const nav = [...root.querySelectorAll<HTMLAnchorElement>('.categories a')];
    assert.deepEqual(nav.map(link => link.textContent), ['网络', '浏览', '界面', '用户', '工具', '关于']);
    assert.equal(nav[0].getAttribute('aria-current'), 'location');
    const content = root.querySelector('.content')!;
    const sections = [...content.querySelectorAll('section')];
    Object.defineProperty(content, 'getBoundingClientRect', { value: () => ({ top: 0 }) });
    sections.forEach((section, i) => Object.defineProperty(section, 'getBoundingClientRect', { value: () => ({ top: (i - 2) * 100 }) }));
    content.dispatchEvent(new f.window.Event('scroll'));
    assert.equal(nav[2].getAttribute('aria-current'), 'location');
    const search = root.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = '黑名单'; search.dispatchEvent(new f.window.Event('input'));
    assert.equal(root.querySelectorAll('.categories a').length, 1);
    assert.equal(root.querySelector('.categories a')!.textContent, '用户');
    search.value = 'github'; search.dispatchEvent(new f.window.Event('input'));
    assert.deepEqual([...root.querySelectorAll('.categories a')].map(link => link.textContent), ['关于']);
    assert.ok(root.querySelector('.about-links a[href="https://github.com/rirh/nodeseek-plus"]'));
  } finally { await f.close(); }
});

test('history dialog searches, deletes and restores entries', async () => {
  const storage = new Map<string, unknown>([[key, {}], ['nspp:state:www.nodeseek.com:reading-history', { entries: [{ path: '/post-12-1', title: 'Alpha', time: Date.now() }, { path: '/post-13-1', title: 'Beta', time: Date.now() }] }]]);
  const f = await fixture({}, '', '/', storage);
  try {
    [...f.window.document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === '阅读历史')!.click();
    const dialog = f.window.document.querySelector<HTMLDialogElement>('dialog[aria-label="阅读历史"]')!;
    assert.ok(dialog.open); assert.equal(dialog.querySelectorAll('ol a').length, 2);
    const search = dialog.querySelector('input')!; search.value = 'Alpha'; search.dispatchEvent(new f.window.Event('input'));
    assert.equal(dialog.querySelectorAll('ol a').length, 1);
    (dialog.querySelector('ol button[aria-label]') as HTMLButtonElement).click();
    assert.equal(dialog.querySelectorAll('ol a').length, 0);
    [...dialog.querySelectorAll('button')].find(b => b.textContent === '撤销删除')!.click();
    assert.equal(dialog.querySelector('ol a')!.textContent, 'Alpha');
    assert.ok(dialog.querySelector('time'));
  } finally { await f.close(); }
});

test('history records actual visits, prunes old entries and tracks recently closed posts', async () => {
  const stateKey = 'nspp:state:www.nodeseek.com:reading-history';
  const storage = new Map<string, unknown>([[key, { 'user-level': { enabled: false }, 'official-blocklist': { enabled: false }, monitor: { enabled: false } }], [stateKey, { entries: [
    { path: '/post-1-1', title: 'Expired', time: Date.now() - 8 * 86400000 },
    { path: '/post-12-2', title: 'Old title', time: Date.now() - 1000 },
  ] }]]);
  const f = await fixture({}, '<div class="post-title"><a href="/post-99-1">Unvisited</a></div>', '/post-12-2', storage, window => {
    Object.assign(window, { __config__: { postData: { postId: 12, title: 'Current title', op: { uid: 7, name: 'Alice' } } } });
  });
  try {
    const state = () => storage.get(stateKey) as { entries: { path: string; title: string }[]; recent: { path: string }[] };
    assert.deepEqual(state().entries.map(item => item.path), ['/post-12-1']);
    assert.equal(state().entries[0].title, 'Current title');
    f.window.document.querySelector('a')!.addEventListener('click', event => event.preventDefault());
    f.window.document.querySelector('a')!.click();
    assert.equal(state().entries.length, 1);
    f.window.dispatchEvent(new f.window.Event('beforeunload'));
    assert.equal(state().recent[0].path, '/post-12-1');
    f.window.document.querySelector<HTMLButtonElement>('[aria-label="阅读历史"]')!.click();
    const dialog = f.window.document.querySelector('dialog[aria-label="阅读历史"]')!;
    dialog.querySelector<HTMLButtonElement>('[data-tab="recent"]')!.click();
    assert.equal(dialog.querySelector('a')!.getAttribute('href'), '/post-12-1');
    assert.ok([...dialog.querySelectorAll('button')].some(button => button.textContent === '恢复'));
    dialog.querySelector<HTMLButtonElement>('.nspp-history-day button')!.click();
    assert.equal(state().recent.length, 0);
    assert.equal(state().entries.length, 1);
  } finally { await f.close(); }
});

test('trust badges display scores and open an explanation without extra requests', async () => {
  const f = await fixture({ 'official-blocklist': { enabled: false } }, '<div class="author-info"><a href="/space/123">Alice</a></div>', '/', undefined, window => {
    window.fetch = (async () => new window.Response(JSON.stringify({ success: true, detail: { created_at: new Date(Date.parse('2026-09-12T00:00:00+08:00') - 1388 * 86400000).toISOString(), nPost: 300, nComment: 2000, coin: 6000, stardust: 500, fans: 50 } }), { headers: { 'Content-Type': 'application/json' } })) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    const score = f.window.document.querySelector('.nspp-trust')!;
    assert.equal(score.textContent, '100');
    (score as HTMLElement).click();
    const dialog = f.window.document.querySelector('dialog.nspp-trust-dialog')!;
    assert.equal(dialog.hasAttribute('open'), true);
    assert.match(dialog.textContent!, /注册时长 35.0\/35/);
    assert.match(dialog.textContent!, /不等于交易信用/);
    (dialog.querySelector('button') as HTMLElement).click();
    assert.equal(dialog.hasAttribute('open'), false);
    assert.ok(Array.from(f.window.document.querySelectorAll('style')).some(style => style.textContent?.includes('nspp-sweep-shine')));
    assert.match(f.window.document.querySelector('#nspp-settings')!.shadowRoot!.querySelector('style')!.textContent!, /nspp-sweep-shine/);
  } finally { await f.close(); }
});

test('hover preview preserves the native list and extracts safe reading content without an iframe', async () => {
  const f = await fixture({}, '<ul class="post-list"><li class="post-list-item"><div class="post-title"><a href="/post-42-1">Preview test</a></div></li></ul>', '/', undefined, window => {
    window.matchMedia = ((query: string) => ({ matches: query === '(hover: hover)' })) as typeof window.matchMedia;
    window.fetch = (async () => new window.Response('<nav>Site navigation</nav><div class="nsk-post"><div class="author-info">Alice</div><div class="post-content"><p onclick="alert(1)">Body text</p><iframe src="/bad"></iframe><script>alert(1)</script><a href="javascript:alert(1)">Bad link</a><img src="/photo.png" onerror="alert(1)"></div></div><div class="comment-content">A reply</div>')) as typeof window.fetch;
  });
  try {
    const doc = f.window.document;
    const view = doc.querySelector<HTMLElement>('.nspp-post-preview')!;
    assert.equal(view.hidden, true);
    assert.equal(doc.querySelector('.nspp-list-actions'), null);
    doc.querySelector('.post-title a')!.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    await new Promise(resolve => setTimeout(resolve, 450));
    assert.equal(view.hidden, false);
    doc.querySelector('.post-title a')!.dispatchEvent(new f.window.MouseEvent('mouseleave'));
    view.dispatchEvent(new f.window.MouseEvent('mouseleave'));
    await new Promise(resolve => setTimeout(resolve, 280));
    assert.equal(view.hidden, true);
    assert.match(view.textContent!, /Body text/);
    assert.match(view.textContent!, /A reply/);
    assert.doesNotMatch(view.textContent!, /Site navigation/);
    assert.equal(view.querySelector('iframe, script, [onclick], [onerror], a[href^="javascript:"]'), null);
    assert.equal(view.querySelector('img')!.src, 'https://www.nodeseek.com/photo.png');
    assert.equal(view.querySelector('header button'), null);
    assert.equal(view.hidden, true);
  } finally { await f.close(); }
});

test('desktop hover preview keeps the title link navigable', async () => {
  const f = await fixture({}, '<ul class="post-list"><li class="post-list-item"><div class="post-title"><a href="/post-42-1">Desktop post</a></div></li></ul>', '/', undefined, window => {
    window.matchMedia = ((query: string) => ({ matches: query === '(hover: hover)' })) as typeof window.matchMedia;
    window.fetch = (async () => new window.Response('<div class="post-content">Desktop body</div>')) as typeof window.fetch;
  });
  try {
    const doc = f.window.document;
    const link = doc.querySelector<HTMLAnchorElement>('.post-title a')!;
    link.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    await new Promise(resolve => setTimeout(resolve, 450));
    assert.equal(doc.querySelector<HTMLElement>('.nspp-post-preview')!.hidden, false);
    const event = new f.window.MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
  } finally { await f.close(); }
});

test('native rows retain layout and metadata while preview actions remain available', async () => {
  const html = '<ul class="post-list"><li class="post-list-item"><div class="post-list-content"><div class="post-title"><a href="/post-42-1">Post</a></div><div class="post-info"><span class="info-author"><a href="/space/8">Alice</a></span><span class="info-views">12</span><span class="info-comments-count">3</span><span class="info-last-commenter">Bob</span><a class="info-last-comment-time" href="/post-42-1#3">now</a></div></div></li></ul>';
  const f = await fixture({ 'user-level': { enabled: false }, 'official-blocklist': { enabled: false } }, html);
  try {
    let reads = 0;
    f.window.fetch = (async () => { reads++; return new f.window.Response('<div class="nsk-post"><div class="comment-menu">' + ['点赞', '加鸡腿', '反对', '收藏'].map((title, i) => `<div class="menu-item" title="${title}"><span>${i + 1}</span></div>`).join('') + '</div></div>'); }) as typeof f.window.fetch;
    const doc = f.window.document;
    const row = doc.querySelector('.post-list-item')!;
    assert.equal(row.classList.contains('nspp-three-line'), false);
    assert.equal(doc.querySelector<HTMLElement>('.nspp-list-actions')!.hidden, true);
    assert.ok(doc.querySelector('.post-info > .info-last-comment-time'));
    assert.equal(row.getAttribute('style'), null);
    assert.equal(doc.querySelectorAll('.nspp-list-actions button').length, 5);
    assert.equal(doc.querySelectorAll('.nspp-meta-label').length, 0);
    assert.equal(reads, 0);
    assert.match(doc.querySelector('.nspp-list-actions')!.textContent!, /点赞/);
    row.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    row.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    await new Promise(resolve => setTimeout(resolve, 550));
    assert.equal(reads, 1);
    assert.match(doc.querySelector('.nspp-list-actions')!.textContent!, /点赞1加鸡腿2反对3收藏4/);
    assert.equal(doc.querySelector('.nspp-list-actions button[title="回复"], .nspp-list-actions button[title="引用"]'), null);
    doc.querySelector<HTMLButtonElement>('.nspp-list-actions button[title="点赞"]')!.click();
    const dialog = doc.querySelector<HTMLElement>('.nspp-interaction')!;
    assert.equal(dialog.hidden, false);
    assert.equal(dialog.querySelector('iframe'), null);
    assert.ok(dialog.querySelector('textarea'));
    assert.equal(doc.querySelector('iframe[aria-hidden="true"]')!.getAttribute('src'), 'https://www.nodeseek.com/post-42-1');
    dialog.querySelector('button')!.click();
    assert.equal(dialog.hidden, true);
    row.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    await new Promise(resolve => setTimeout(resolve, 120));
    assert.equal(reads, 1);
    assert.equal(doc.querySelectorAll('.nspp-list-actions').length, 1);
  } finally { await f.close(); }
});

test('cached attendance is hidden on boot and no automatic request is made', async () => {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
  const storage = new Map<string, unknown>([[key, { monitor: { enabled: false }, 'notification-categories': { enabled: false }, attendance: { enabled: true, automatic: true } }], ['nspp:state:www.nodeseek.com:attendance', { 'day:7': day }]]);
  const f = await fixture({}, '', '/', storage);
  try {
    const button = [...f.window.document.querySelectorAll('button')].find(el => el.getAttribute('aria-label') === '签到')!;
    assert.equal(button.hidden, true);
    assert.equal(f.requests.length, 0);
  } finally { await f.close(); }
});

test('already-signed server response hides attendance and reduced motion skips animation', async () => {
  const f = await fixture({}, '', '/', undefined, window => {
    window.matchMedia = (() => ({ matches: true })) as typeof window.matchMedia;
    window.fetch = (async () => new window.Response(JSON.stringify({ success: false, message: '今天已签到' }), { headers: { 'Content-Type': 'application/json' } })) as typeof window.fetch;
  });
  try {
    const button = [...f.window.document.querySelectorAll('button')].find(el => el.getAttribute('aria-label') === '签到')!;
    button.click(); await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(button.hidden, true);
    assert.ok(f.storage.get('nspp:state:www.nodeseek.com:attendance'));
  } finally { await f.close(); }
});

test('preview footer shares list actions while block control stays immediately after the author', async () => {
  const f = await fixture({ 'user-level': { enabled: false }, 'official-blocklist': { enabled: false } }, '<ul class="post-list"><li class="post-list-item"><div class="post-list-content"><div class="post-title"><a href="/post-42-1">A long title for the preview</a></div><div class="post-info"><span class="info-author"><a href="/space/8">Alice</a><button class="nspp-block-toggle">屏蔽</button></span></div></div></li></ul>', '/', undefined, window => {
    window.matchMedia = (() => ({ matches: true })) as typeof window.matchMedia;
    window.fetch = (async () => new window.Response('<div class="post-content">Preview body</div>')) as typeof window.fetch;
  });
  try {
    const doc = f.window.document;
    assert.ok(doc.querySelector('.info-author a + .nspp-block-toggle'));
    assert.equal(doc.querySelector('.nspp-list-actions .nspp-block-toggle'), null);
    const block = doc.querySelector<HTMLButtonElement>('.post-list-item .info-author .nspp-block-toggle')!;
    assert.ok(block);
    doc.querySelector('.post-title a')!.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    await new Promise(resolve => setTimeout(resolve, 450));
    const preview = doc.querySelector<HTMLElement>('.nspp-post-preview')!;
    assert.equal(preview.querySelectorAll('footer button').length, 5);
    assert.equal(preview.querySelector('footer .nspp-block-toggle'), null);
    assert.equal(doc.querySelector('.info-author a')!.nextElementSibling, block);
  } finally { await f.close(); }
});

test('mobile title tap follows the original post link without opening a preview', async () => {
  const f = await fixture({}, '<ul class="post-list"><li class="post-list-item"><div class="post-title"><a href="/post-42-1">Mobile post</a></div></li></ul>', '/', undefined, window => {
    window.matchMedia = ((query: string) => ({ matches: query.includes('hover: none') })) as typeof window.matchMedia;
  });
  try {
    const link = f.window.document.querySelector('.post-title a')!;
    const event = new f.window.MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    const view = f.window.document.querySelector<HTMLDialogElement>('.nspp-post-preview')!;
    assert.equal(event.defaultPrevented, false);
    assert.equal(view.open, false);
    assert.equal(view.hidden, true);
  } finally { await f.close(); }
});


test('visible rows load counts automatically and queue beyond the concurrency limit', async () => {
  const html = '<ul class="post-list">' + [42, 43, 44].map(id => `<li class="post-list-item"><div class="post-list-content"><div class="post-title"><a href="/post-${id}-1">Post ${id}</a></div></div></li>`).join('') + '</ul>';
  let active = 0, peak = 0, reads = 0;
  const f = await fixture({ 'list-interactions': { enabled: true, automaticCounts: true }, 'user-level': { enabled: false }, 'official-blocklist': { enabled: false } }, html, '/', undefined, window => {
    window.IntersectionObserver = class {
      callback: (entries: unknown[]) => void;
      constructor(callback: (entries: unknown[]) => void) { this.callback = callback; }
      observe(target: Element) { window.setTimeout(() => this.callback([{ target, isIntersecting: true }]), 0); }
      unobserve() {} disconnect() {}
    } as unknown as typeof window.IntersectionObserver;
    window.fetch = (async () => {
      reads++; active++; peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 25)); active--;
      return new window.Response('<div class="nsk-post"><div class="comment-menu">' + ['点赞', '加鸡腿', '反对', '收藏'].map(title => `<div title="${title}"><span>7</span></div>`).join('') + '</div></div>');
    }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 800));
    assert.equal(reads, 3);
    assert.equal(peak, 2);
    for (const bar of f.window.document.querySelectorAll('.post-list-item .nspp-list-actions')) {
      assert.match(bar.textContent!, /点赞7加鸡腿7反对7收藏7/);
      assert.equal(bar.hasAttribute('aria-busy'), false);
    }
    for (const row of f.window.document.querySelectorAll('.post-list-item')) row.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    await new Promise(resolve => setTimeout(resolve, 30)); assert.equal(reads, 3);
  } finally { await f.close(); }
});


test('quick reply dialog supports default pagination, search and persistent template CRUD', async () => {
  const f = await fixture({ 'user-level': { enabled: false }, 'official-blocklist': { enabled: false } }, '<ul class="post-list"><li class="post-list-item"><div class="post-list-content"><div class="post-title"><a href="/post-42-1">Post</a></div></div></li></ul>');
  try {
    const doc = f.window.document;
    doc.querySelector<HTMLButtonElement>('[aria-label="快速回复"]')!.click();
    const dialog = doc.querySelector<HTMLDialogElement>('.nspp-quick-replies')!;
    assert.equal(dialog.open, true);
    assert.equal(dialog.querySelectorAll('.nspp-quick-send').length, 6);
    const button = (name: string) => [...dialog.querySelectorAll('button')].find(el => el.textContent === name)!;
    button('下一页').click(); assert.equal(dialog.querySelectorAll('.nspp-quick-send').length, 2);
    const search = dialog.querySelector<HTMLInputElement>('input')!;
    search.value = '感谢分享'; search.dispatchEvent(new f.window.Event('input'));
    assert.equal(dialog.querySelectorAll('.nspp-quick-send').length, 1);
    button('修改').click();
    const text = dialog.querySelector<HTMLTextAreaElement>('textarea')!;
    text.value = '自定义测试回复'; dialog.querySelector('form')!.dispatchEvent(new f.window.Event('submit', { cancelable: true }));
    search.value = '自定义'; search.dispatchEvent(new f.window.Event('input'));
    assert.equal(dialog.querySelector('.nspp-quick-send')!.textContent, '自定义测试回复');
    button('新增').click(); text.value = '另一条自定义'; dialog.querySelector('form')!.dispatchEvent(new f.window.Event('submit', { cancelable: true }));
    assert.equal(dialog.querySelectorAll('.nspp-quick-send').length, 2);
    button('删除').click(); assert.equal(dialog.querySelectorAll('.nspp-quick-send').length, 1);
    assert.ok((f.storage.get('nspp:state:www.nodeseek.com:list-interactions') as { quickReplies: string[] }).quickReplies.includes('另一条自定义'));
    assert.equal(doc.querySelector('.nspp-interaction:not([hidden])'), null);
    assert.equal(f.requests.length, 0, 'editing templates never sends a reply or loads a post');
  } finally { await f.close(); }
});

test('attendance reads native page status without extra requests and uses icon controls', async () => {
  const f = await fixture({}, '<button id="attendance">今天已完成签到！</button>', '/', undefined, window => {
    window.fetch = (async (_url, options) => {
      assert.notEqual(options?.method, 'POST');
      return new window.Response('<button disabled>今天已完成签到！</button>');
    }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    const control = f.window.document.querySelector<HTMLButtonElement>('[aria-label="签到"]')!;
    assert.equal(control.hidden, true);
    assert.ok(control.querySelector('svg'));
    assert.ok(f.window.document.querySelector('[aria-label="阅读历史"] svg'));
    assert.ok(f.window.document.querySelector('[data-nspp-settings-launcher] svg'));
  } finally { await f.close(); }
});

test('native unsigned attendance label does not cache completion', async () => {
  const f = await fixture({}, '<button id="attendance">今日签到</button>');
  try {
    const control = f.window.document.querySelector<HTMLButtonElement>('[aria-label="签到"]')!;
    assert.equal(control.hidden, false);
  } finally { await f.close(); }
});

test('monitor establishes a baseline and notifies once for a new matching post', async () => {
  let clock = Date.now();
  let hidden = true;
  let poll: (() => void) | undefined;
  let fresh = false;
  let invalid = false;
  const f = await fixture({ monitor: { enabled: true, interval: 60, trades: false, keywords: '抽奖' } }, '', '/', undefined, window => {
    Object.defineProperty(window.document, 'hidden', { get: () => hidden });
    const NativeDate = window.Date;
    window.Date = class extends NativeDate { static now() { return clock; } } as typeof window.Date;
    const originalInterval = window.setInterval.bind(window);
    window.setInterval = ((callback: () => void, delay?: number) => {
      if (delay === 1000) poll = callback;
      return delay === 1000 ? 0 : originalInterval(callback, delay);
    }) as typeof window.setInterval;
    Object.assign(window, { GM_xmlhttpRequest: (options: { url: string; onload: (response: unknown) => void }) => {
      assert.equal(options.url, 'https://rss.nodeseek.com/');
      const item = (id: number) => `<item><title>抽奖 帖子 ${id}</title><link>https://www.nodeseek.com/post-${id}-1</link></item>`;
      queueMicrotask(() => options.onload({ status: 200, responseText: invalid ? '<html>验证页</html>' : `<rss><channel>${item(1)}${item(1)}<item><title>普通帖子</title><link>https://www.nodeseek.com/post-3-1</link></item>${fresh ? item(4) : ''}</channel></rss>` }));
      return { abort() {} };
    } });
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    const launch = f.window.document.querySelector<HTMLButtonElement>('[data-monitor-state]')!;
    assert.equal(launch.dataset.unread, undefined);
    assert.equal(launch.dataset.monitorState, 'running');
    assert.equal(launch.querySelector('.nspp-monitor-badge')?.textContent, '1');
    assert.match(launch.title, /红色徽章表示.*累计匹配/);
    const countdown = f.window.document.querySelector('.nspp-monitor footer > span')!;
    assert.match(countdown.textContent!, /下次检查 60 秒/);
    clock += 1000; poll!();
    assert.match(countdown.textContent!, /下次检查 60 秒/, 'background polling leaves the visual countdown unchanged');
    hidden = false; poll!();
    assert.match(countdown.textContent!, /下次检查 59 秒/);
    hidden = true;
    const pause = Array.from(f.window.document.querySelectorAll<HTMLButtonElement>('.nspp-monitor footer button')).find(button => button.textContent?.includes('停止'))!;
    pause.click();
    assert.match(countdown.textContent!, /已暂停/);
    pause.click();
    assert.match(countdown.textContent!, /下次检查 59 秒/);
    clock += 61000; poll!();
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(launch.dataset.unread, undefined);
    assert.ok(f.storage.has('nspp:state:www.nodeseek.com:monitor'));
    assert.match(f.window.document.querySelector('.nspp-monitor-summary')!.textContent!, /2 轮 · 累计 2 帖 · 符合 1 · 不符合 1/);
    assert.equal((f.storage.get('nspp:state:www.nodeseek.com:monitor') as Record<string, { cursor: string }>)['rss-snapshot:7'].cursor, '3');
    fresh = true; clock += 301000; poll!();
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(launch.dataset.unread, 'true');
    assert.match(launch.title, /1 条未读/);
    assert.equal(launch.querySelector('.nspp-monitor-badge')?.textContent, '2');
    launch.click();
    assert.equal(launch.querySelector('.nspp-monitor-badge')?.textContent, '2');
    assert.match(launch.title, /0 条未读/);
    assert.equal(f.window.document.querySelector('.nspp-monitor-unread'), null);
    assert.equal(f.window.document.querySelectorAll('.nspp-monitor-results li').length, 2);
    assert.match(f.window.document.querySelector('.nspp-monitor')!.textContent!, /3 轮 · 累计 3 帖 · 符合 2 · 不符合 1/);
    assert.equal(launch.dataset.unread, undefined);
    assert.ok(f.window.document.querySelector('.nspp-monitor footer'));
    clock += 301000; poll!();
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(launch.dataset.unread, undefined);
    clock += 6000;
    const updateForm = f.window.document.querySelector<HTMLFormElement>('.nspp-monitor-editor')!;
    assert.equal(f.window.document.querySelector('.nspp-monitor:not(.nspp-monitor-config) .nspp-monitor-editor'), null);
    const frequency = updateForm.querySelector<HTMLInputElement>('input[type="number"]')!;
    frequency.value = '600';
    updateForm.dispatchEvent(new f.window.Event('submit', { cancelable: true }));
    assert.equal(f.window.document.querySelectorAll('.nspp-monitor-results li').length, 0);
    await new Promise(resolve => setTimeout(resolve, 30));
    const monitorState = f.storage.get('nspp:state:www.nodeseek.com:monitor') as Record<string, { at: number }>;
    assert.equal((monitorState['rss-snapshot:7'] as { at: number; cursor: string }).cursor, '4');
    assert.equal(monitorState['rss-snapshot:7'].at, clock, 'update checks immediately in a background tab');
    assert.equal((f.storage.get(key) as { monitor: { interval: number } }).monitor.interval, 600);
    assert.match(f.window.document.querySelector('.nspp-monitor')!.textContent!, /1 轮 · 累计 3 帖 · 符合 2 · 不符合 1/);
    const before = f.window.document.querySelector('.nspp-monitor-results')!.textContent;
    invalid = true; clock += 601000; poll!();
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(f.window.document.querySelector('.nspp-monitor-results')!.textContent, before);
    assert.match(f.window.document.querySelector('.nspp-monitor > p')!.textContent!, /检查未完成/);
    assert.equal(launch.dataset.monitorState, 'cooldown');
    assert.match(countdown.textContent!, /冷却中 · 600 秒后检查/);
    assert.match(f.window.document.querySelector('.nspp-monitor')!.textContent!, /1 轮 · 累计 3 帖 · 符合 2 · 不符合 1/);
    const editor = f.window.document.querySelector<HTMLFormElement>('.nspp-monitor-editor')!;
    const input = editor.querySelector<HTMLTextAreaElement>('textarea')!;
    assert.equal(input.value, '抽奖', 'legacy keywords migrate into the panel');
    assert.equal(f.window.document.querySelector('.nspp-monitor')!.hasAttribute('data-checking'), false);
    input.value = '不会匹配的关键词';
    editor.dispatchEvent(new f.window.Event('submit', { cancelable: true }));
    assert.equal(f.window.document.querySelectorAll('.nspp-monitor-results li').length, 0);
    assert.equal((f.storage.get('nspp:state:www.nodeseek.com:monitor') as Record<string, unknown>)['match-keywords'], input.value);
    input.value = '/[/'; editor.dispatchEvent(new f.window.Event('submit', { cancelable: true }));
    assert.match(editor.textContent!, /无效规则/);

  } finally { await f.close(); }
});

test('monitor resumes its saved cursor across reloads and never rewinds on stale or empty feeds', async () => {
  const stateKey = 'nspp:state:www.nodeseek.com:monitor';
  const post = (id: string, title: string) => ({ id, title, url: `https://www.nodeseek.com/post-${id}-1` });
  const saved = post('10', '抽奖 已收录');
  const storage = new Map<string, unknown>([
    [key, { monitor: { enabled: true, interval: 60 } }],
    [stateKey, { 'match-keywords': '抽奖', 'rss-snapshot:7': { home: [saved], trades: [], at: Date.now(), rounds: 1, cursor: '10', checked: 1, matched: 1, results: [saved] } }],
  ]);
  let clock = Date.now();
  const batches = [[post('12', '抽奖 新帖子'), post('11', '普通帖子'), saved], [post('9', '抽奖 旧数据')], []];
  for (const batch of batches) {
    clock += 301000;
    const f = await fixture({}, '', '/', storage, window => {
      const NativeDate = window.Date;
      window.Date = class extends NativeDate { static now() { return clock; } } as typeof window.Date;
      Object.assign(window, { GM_xmlhttpRequest: (options: { onload: (response: unknown) => void }) => {
        queueMicrotask(() => options.onload({ status: 200, responseText: `<rss><channel>${batch.map(post => `<item><title>${post.title}</title><link>${post.url}</link></item>`).join('')}</channel></rss>` }));
        return { abort() {} };
      } });
    });
    try {
      await new Promise(resolve => setTimeout(resolve, 30));
      const snapshot = (storage.get(stateKey) as Record<string, { cursor: string; checked: number; matched: number }>)['rss-snapshot:7'];
      assert.equal(snapshot.cursor, '12');
      assert.equal(snapshot.checked, 3);
      assert.equal(snapshot.matched, 2);
      assert.equal(f.window.document.querySelectorAll('.nspp-monitor-results li').length, 2);
    } finally { await f.close(); }
  }
});

test('post status styling keeps titles intact and marks readonly and pin icons', async () => {
  const f = await fixture({}, '<div class="post-title"><a href="/post-1-1">只读是标题的一部分</a><span>只读</span><span><svg><use href="#pin"></use></svg></span></div>');
  try {
    assert.equal(f.window.document.querySelectorAll('.nspp-readonly').length, 1);
    assert.equal(f.window.document.querySelectorAll('.nspp-pinned').length, 1);
    assert.equal(f.window.document.querySelector('.post-title a')!.textContent, '只读是标题的一部分');
  } finally { await f.close(); }
});

test('RSS titles highlight list rows without fetching individual posts', async () => {
  let calls = 0;
  const f = await fixture({ monitor: { enabled: true, keywords: '/香港.*年付/i' }, 'user-level': { enabled: false }, 'official-blocklist': { enabled: false }, 'list-interactions': { enabled: false } }, '<li class="post-list-item"><div class="post-title"><a href="/post-72-1">出售机器</a></div></li>', '/', undefined, window => {
    Object.assign(window, { GM_xmlhttpRequest: (options: { onload: (response: unknown) => void }) => {
      calls++;
      queueMicrotask(() => options.onload({ status: 200, responseText: '<rss><channel><item><title>香港机器年付</title><link>https://www.nodeseek.com/post-72-1</link></item></channel></rss>' }));
      return { abort() {} };
    } });
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(f.window.document.querySelector('.post-list-item')!.getAttribute('data-nspp-monitor-match'), '0');
    assert.equal(calls, 1);
    assert.equal(f.requests.length, 0);
  } finally { await f.close(); }
});

test('NodeImage upload uses the official privileged endpoint and inserts the returned image', async () => {
  let uploadUrl = '';
  const f = await fixture({}, '<div class="md-editor"><textarea></textarea></div>', '/', undefined, window => {
    Object.assign(window, { GM_xmlhttpRequest: (options: { url: string; onload: (response: unknown) => void }) => {
      if (options.url.endsWith('/api/user/api-key')) { queueMicrotask(() => options.onload({ status: 200, response: { api_key: 'fixture-key' } })); return { abort() {} }; }
      uploadUrl = options.url;
      queueMicrotask(() => options.onload({ status: 200, response: { links: { direct: 'https://example.com/test.png' } } }));
      return { abort() {} };
    } });
  });
  try {
    const doc = f.window.document;
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(doc.querySelector('.nspp-compose [role="status"]')!.textContent, '');
    assert.equal(doc.querySelector<HTMLAnchorElement>('.nspp-compose a[href="https://www.nodeimage.com/"]')!.hidden, true);
    const input = doc.querySelector<HTMLInputElement>('.nspp-compose input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [new f.window.File(['image'], 'test.png', { type: 'image/png' })] });
    input.dispatchEvent(new f.window.Event('change'));
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(uploadUrl, 'https://api.nodeimage.com/api/upload');
    assert.match(doc.querySelector<HTMLTextAreaElement>('.md-editor textarea')!.value, /https:\/\/example.com\/test.png/);
  } finally { await f.close(); }
});

test('image picker reuses the native toolbar control and keeps the fallback beside emoji actions', async () => {
  const native = await fixture({}, '<div class="md-editor"><div class="mde-toolbar"><span class="toolbar-item" title="表情"></span><span class="toolbar-item i-icon i-icon-pic" title="图片"></span><span class="toolbar-item right" title="发表评论"></span></div><textarea></textarea></div>');
  try {
    const toolbar = native.window.document.querySelector('.mde-toolbar')!;
    assert.equal(toolbar.querySelector('.nspp-upload-choose'), null, 'do not duplicate the native image control');
  } finally { await native.close(); }
  const fallback = await fixture({}, '<div class="md-editor"><div class="mde-toolbar"><span class="toolbar-item" title="表情"></span><span class="toolbar-item right" title="发表评论"></span></div><textarea></textarea></div>');
  try {
    const toolbar = fallback.window.document.querySelector('.mde-toolbar')!;
    const emoji = toolbar.querySelector<HTMLElement>('[title="表情"]')!;
    const choose = toolbar.querySelector<HTMLElement>('.nspp-upload-choose')!;
    const right = toolbar.querySelector<HTMLElement>('.toolbar-item.right')!;
    assert.equal(choose.previousElementSibling, emoji);
    assert.equal(choose.nextElementSibling?.classList.contains('nspp-upload-status'), true);
    assert.equal(choose.nextElementSibling?.nextElementSibling, right);
  } finally { await fallback.close(); }
});

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

test('busy controls use opaque motion feedback, including the attendance icon', () => {
  const css = readFileSync(new URL('../src/loading.css', import.meta.url), 'utf8');
  const badgeSelector = '.nspp-user-badges[aria-busy="true"]';
  // Inspect declaration blocks, including blocks nested in reduced-motion media rules.
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  for (const [, selector, declarations] of blocks) {
    if (/text-fill-color:\s*transparent|background-clip:\s*text/.test(declarations)) {
      assert.equal(selector.trim(), badgeSelector, 'text clipping is restricted to the loading badge');
    }
  }
  const base = blocks.find(([, selector]) => selector.trim() === '[aria-busy="true"], .nspp-sweep-shine');
  assert.ok(base);
  assert.match(base[2], /-webkit-text-fill-color:\s*currentColor/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.nspp-user-badges\[aria-busy="true"\]\s*\{[^}]*background-image:\s*none;[^}]*-webkit-text-fill-color:\s*currentColor/);
  assert.match(css, /opacity: 1 !important/);
  assert.match(css, /\.nspp-action\[aria-busy="true"\] > svg[^}]+animation: nspp-attendance-working/);
  assert.match(css, /prefers-reduced-motion: reduce/);
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

test('all usernames show rich hover cards while latest replier has no visible badges', async t => {
  const calls: string[] = [];
  const f = await fixture({}, '<div class="post-info"><span class="info-author"><a href="/space/123">Alice</a><span class="role-tag">管理员</span></span><span class="info-last-commenter"><a href="/space/456">Bob</a></span></div>', '/', undefined, window => {
    Object.defineProperty(window.document, 'hidden', { value: false });
    Object.defineProperty(window, 'innerWidth', { value: 1280 });
    const matchMedia = window.matchMedia.bind(window);
    window.matchMedia = ((query: string) => {
      const media = matchMedia(query);
      if (query === '(hover: hover) and (pointer: fine)') Object.defineProperty(media, 'matches', { value: true });
      return media;
    }) as typeof window.matchMedia;
    window.fetch = (async (url: unknown) => {
      const path = new URL(String(url)).pathname; calls.push(path);
      return new window.Response(JSON.stringify(path === '/api/fans/follow' ? { success: true, memberList: [] } : path.endsWith('/list') ? { success: true, data: [] } : { success: true, detail: { rank: 4, created_at: '2024-01-01', nPost: 10, nComment: 20, coin: 2500, stardust: 10, fans: 5, signature: '测试签名 <b>保持纯文本</b>' } }));
    }) as typeof window.fetch;
  });
  try {
    await waitFor(() => !!f.window.document.querySelector('.nspp-user-hover-rich') && !!f.window.document.querySelector('.nspp-user-hover .nspp-block-toggle'));
    mockWindowTimers(t, f.window);
    const doc = f.window.document;
    const card = doc.querySelector<HTMLElement>('.nspp-user-hover')!;
    assert.equal(card.hidden, true);
    assert.equal(doc.querySelector('.info-author .nspp-block-toggle'), null);
    assert.equal(doc.querySelector<HTMLElement>('.info-last-commenter .nspp-user-badges')!.hidden, true);
    assert.equal(calls.includes('/api/account/getInfo/456'), false);
    doc.querySelector('.info-author a')!.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    assert.equal(card.hidden, true, 'brief hover does not immediately open a card');
    t.mock.timers.tick(299);
    assert.equal(card.hidden, true, 'the card stays hidden until the 300ms hover delay');
    t.mock.timers.tick(1);
    assert.equal(card.hidden, false);
    assert.match(card.textContent!, /注册 2024-01-01/);
    assert.match(card.textContent!, /信任分/);
    assert.equal(card.querySelector('.nspp-user-hover-signature')?.textContent, '测试签名 <b>保持纯文本</b>');
    assert.equal(card.querySelector('.nspp-user-hover-signature b'), null);
    assert.equal(card.querySelector('img')?.getAttribute('src'), '/avatar/123.png');
    assert.ok(card.dataset.trust);
    assert.equal(card.querySelectorAll('dl > div').length, 6);
    assert.match(card.querySelector('.nspp-user-hover-rich')!.textContent!, /加入 \d+ 天/);
    assert.ok(card.querySelector('.nspp-user-hover-header .nspp-user-hover-score strong'));
    assert.equal(card.querySelector('.nspp-user-hover-tags [data-nspp-role]')?.textContent, '管理员');
    assert.ok(card.querySelector('.nspp-block-toggle'));
    doc.querySelector('.info-author a')!.dispatchEvent(new f.window.MouseEvent('mouseleave'));
    card.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    t.mock.timers.tick(220);
    assert.equal(card.hidden, false);
    doc.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(card.hidden, true);
    doc.querySelector('.info-last-commenter a')!.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    t.mock.timers.tick(300);
    await waitFor(() => [...doc.querySelectorAll<HTMLElement>('.nspp-user-hover')].some(el => !el.hidden && el.querySelectorAll('dl > div').length === 6 && !!el.querySelector('.nspp-block-toggle')));
    const visibleCards = Array.from(doc.querySelectorAll<HTMLElement>('.nspp-user-hover')).filter(el => !el.hidden);
    assert.equal(visibleCards.length, 1);
    assert.equal(visibleCards[0]!.querySelector('.nspp-user-hover-name')?.textContent, 'Bob');
    assert.ok(visibleCards[0]!.querySelector('.nspp-block-toggle'));
    assert.equal(calls.filter(path => path === '/api/account/getInfo/456').length, 1);
  } finally { t.mock.restoreAll(); t.mock.timers.reset(); await f.close(); }
});

test('quick reply shares a layout group with the native category', async () => {
  const f = await fixture({}, '<div class="post-list-item"><div class="post-list-content"><div class="post-title"><a href="/post-42-1">Post</a></div><div class="post-info"><a class="post-category" style="position:absolute;left:240px;right:20px" href="/categories/daily">日常</a></div></div></div>');
  try {
    const doc = f.window.document;
    const category = doc.querySelector('.nspp-category-actions > .post-category')!;
    assert.ok(category.parentElement?.classList.contains('nspp-category-actions'));
    assert.equal(category.parentElement?.parentElement?.className, 'post-info');
    assert.equal(category.textContent, '日常');
    assert.equal((category.parentElement as HTMLElement).style.left, 'auto');
    assert.equal((category.parentElement as HTMLElement).style.right, '20px');
    assert.equal(doc.querySelectorAll('.post-category').length, 1);
    assert.equal((category as HTMLElement).style.position, 'static');
    assert.equal(category.nextElementSibling?.textContent, '快速回复');
    assert.ok(category.nextElementSibling?.classList.contains('nspp-category-reply'));
    (category.nextElementSibling as HTMLButtonElement).click();
    assert.equal(doc.querySelector<HTMLDialogElement>('.nspp-quick-replies')?.open, true);
  } finally { await f.close(); }
});

test('username uses shared copy control and the card avoids native header styling', async () => {
  let copied = '';
  const f = await fixture({ 'official-blocklist': { enabled: false } }, '<span class="info-author"><a href="/space/123">Alice</a></span>', '/', undefined, window => {
    Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: async (value: string) => { copied = value; } }, configurable: true });
  });
  try {
    const doc = f.window.document;
    const card = doc.querySelector('.nspp-user-hover')!;
    assert.equal(card.querySelector('header'), null);
    const button = card.querySelector<HTMLButtonElement>('.nspp-user-hover-header .nspp-copy-button')!;
    button.click(); await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(copied, 'Alice');
    assert.equal(button.dataset.copied, 'true');
    assert.equal(button.textContent, '');
    assert.equal(button.querySelector('path')?.getAttribute('d'), 'M5 12l4 4L19 6');
    assert.equal(card.querySelector('.nspp-user-hover-signature'), null);
    assert.equal(button.disabled, false);
  } finally { await f.close(); }
});

test('AI launcher requires complete enabled configuration and keeps configuration in settings', async () => {
  const configured = { enabled: true, url: 'https://example.com/v1/chat/completions', model: 'test-model', apiKey: 'test-key' };
  for (const options of [{}, { ...configured, enabled: false }, { ...configured, apiKey: '' }, { ...configured, model: '' }, { ...configured, url: 'http://example.com' }]) {
    const f = await fixture({ 'ai-polish': options });
    try {
      assert.equal(f.window.document.querySelector('[data-nspp-ai-launcher]'), null);
      f.menus[0]();
      assert.match(f.window.document.querySelector('#nspp-settings')!.shadowRoot!.textContent!, /AI 写作助手/);
    } finally { await f.close(); }
  }
  const f = await fixture({ 'ai-polish': configured });
  try {
    f.window.document.querySelector<HTMLButtonElement>('[data-nspp-ai-launcher]')!.click();
    const panel = f.window.document.querySelector('.nspp-ai-dialog')!;
    assert.equal(panel.querySelector('h2')!.textContent, 'AI 写作助手');
    assert.ok(panel.querySelector('[data-nspp-ai]'));
    assert.ok(panel.querySelector('[aria-label="AI 写作正文"]'));
    assert.equal(panel.querySelector('input[type="password"]'), null);
    assert.equal([...panel.querySelectorAll('button')].some(button => button.textContent === '配置'), false);
    assert.equal(f.requests.length, 0);
  } finally { await f.close(); }
});


test('avatar cards receive synchronized block controls after delayed login initialization', async () => {
  const f = await fixture({ 'user-level': { enabled: false } }, '<a href="/space/123"><img alt="" /></a><div class="info-author"><a href="/space/123">Alice</a></div>', '/', undefined, window => {
    Object.assign(window, { __config__: {} });
    window.fetch = (async () => new window.Response(JSON.stringify({ success: true, data: [{ block_member_id: 123 }] }))) as typeof window.fetch;
  });
  try {
    assert.equal(f.window.document.querySelectorAll('.nspp-block-toggle').length, 0);
    Object.assign(f.window, { __config__: { user: { member_id: 7 } } });
    f.window.document.body.append(f.window.document.createElement('div'));
    await new Promise(resolve => setTimeout(resolve, 250));
    const buttons = [...f.window.document.querySelectorAll<HTMLButtonElement>('.nspp-block-toggle')];
    assert.equal(buttons.length, 2);
    assert.deepEqual(buttons.map(button => button.textContent), ['取消屏蔽', '取消屏蔽']);
    f.window.document.querySelector<HTMLAnchorElement>('a')!.dispatchEvent(new f.window.Event('mouseenter'));
    assert.equal(buttons[0].parentElement!.hidden, false);
    buttons[0].click();
    const confirmation = f.window.document.querySelector<HTMLDialogElement>('.nspp-confirm-dialog')!;
    assert.equal(confirmation.open, true);
    confirmation.close('confirm');
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.deepEqual(buttons.map(button => button.textContent), ['屏蔽', '屏蔽']);
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

test('profile cards exclude activity links, remove titles and reuse persistent cache', async () => {
  const html = '<div class="author-info"><a title="Alice details" href="/space/123">Alice</a><a href="/space/123/comments">评论</a><a href="/space/123#favorites">收藏</a></div>';
  const settings = { 'official-blocklist': { enabled: false }, 'user-level': { enabled: true, colors: 'custom', levelColor: '#8899aa', trustColor: '#aabbcc', roleColor: '#667788' } };
  let calls = 0;
  const first = await fixture(settings, html, '/', undefined, window => {
    window.fetch = (async () => { calls++; return new window.Response(JSON.stringify({ success: true, detail: { rank: 3, created_at: '2024-01-01', nPost: 10, nComment: 20 } })); }) as typeof window.fetch;
  });
  let second: Awaited<ReturnType<typeof fixture>> | undefined;
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(calls, 1);
    assert.equal(first.window.document.querySelectorAll('.nspp-user-hover').length, 1);
    assert.equal(first.window.document.querySelector('.author-info a')!.hasAttribute('title'), false);
    assert.equal(!!first.window.document.querySelector('.nspp-user-hover-score[title], .nspp-user-hover-rich [title], .nspp-user-hover-note[title]'), false);
    const css = [...first.window.document.querySelectorAll('style')].map(el => el.textContent).join('');
    assert.match(css, /color:#8899aa!important/);
    second = await fixture(settings, html, '/page-2', first.storage);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(second.requests.length, 0);
    assert.equal(second.window.document.querySelector('.nspp-level')!.textContent, 'Lv3');
  } finally { await first.close(); await second?.close(); }
});

test('automatic attendance starts when delayed login config becomes available', async () => {
  let calls = 0;
  const f = await fixture({ attendance: { enabled: true, automatic: true }, 'official-blocklist': { enabled: false } }, '', '/', undefined, window => {
    Object.assign(window, { __config__: {} });
    window.fetch = (async (url, options) => {
      assert.match(String(url), /\/api\/attendance\?random=false/);
      assert.equal(options?.method, 'POST'); calls++;
      return new window.Response(JSON.stringify({ success: true, gain: 5 }));
    }) as typeof window.fetch;
  });
  try {
    assert.equal(calls, 0);
    Object.assign(f.window, { __config__: { user: { member_id: 7 } } });
    f.window.document.body.append(f.window.document.createElement('div'));
    await new Promise(resolve => setTimeout(resolve, 160));
    assert.equal(calls, 1);
    f.window.dispatchEvent(new f.window.Event('focus'));
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(calls, 1);
  } finally { await f.close(); }
});

test('pause control blocks automatic comment loading and resume reconnects observer', async () => {
  let intersect!: () => void;
  let observing = false;
  const f = await fixture({ 'infinite-scroll': { enabled: true, comments: true }, 'user-level': { enabled: false }, 'official-blocklist': { enabled: false } }, '<ul class="comments"><li>first</li></ul><div class="nsk-pager"><a class="pager-next" href="/post-1-2">next</a></div>', '/post-1-1', undefined, window => {
    window.IntersectionObserver = class { observe() { observing = true; } disconnect() { observing = false; } unobserve() {} constructor(callback: (entries: unknown[]) => void, options?: { rootMargin?: string }) { if (options?.rootMargin === '150px') intersect = () => callback([{ isIntersecting: true }]); } } as unknown as typeof window.IntersectionObserver;
  });
  try {
    const pause = f.window.document.querySelector<HTMLButtonElement>('[aria-label="暂停自动翻页"]')!;
    assert.ok(pause);
    pause.click(); intersect();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(observing, false);
    assert.equal(f.requests.length, 0);
    pause.click();
    assert.equal(observing, true);
  } finally { await f.close(); }
});

test('rate-limited profile requests stop queued traffic and retain Retry-After', async () => {
  let calls = 0;
  const f = await fixture({ 'request-settings': { enabled: true, maxConcurrent: 2, requestInterval: 0 }, 'official-blocklist': { enabled: false } }, '<div class="author-info"><a href="/space/123">Alice</a><a href="/space/456">Bob</a><a href="/space/789">Carol</a></div>', '/', undefined, window => {
    window.fetch = (async () => { calls++; return new window.Response('', { status: 429, headers: { 'Retry-After': '120' } }); }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(calls, 2);
    assert.ok(Number(f.storage.get('nspp:request-cooldown:www.nodeseek.com')) > Date.now() + 110000);
  } finally { await f.close(); }
});

test('forum profile requests overlap up to the configured concurrency limit', async () => {
  let active = 0; let peak = 0; let calls = 0;
  const f = await fixture({ 'request-settings': { enabled: true, maxConcurrent: 2, requestInterval: 0 }, 'official-blocklist': { enabled: false } }, '<div class="author-info"><a href="/space/123">Alice</a><a href="/space/456">Bob</a><a href="/space/789">Carol</a></div>', '/', undefined, window => {
    window.fetch = (async () => {
      calls++; active++; peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 30));
      active--;
      return new window.Response(JSON.stringify({ success: true, detail: { rank: 2 } }));
    }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(calls, 3);
    assert.equal(peak, 2);
  } finally { await f.close(); }
});

test('list counts are on demand and missing counts never create a hidden page', async () => {
  let calls = 0;
  const f = await fixture({ 'user-level': { enabled: false }, 'official-blocklist': { enabled: false } }, '<ul class="post-list"><li class="post-list-item"><div class="post-list-content"><div class="post-title"><a href="/post-42-1">Post</a></div></div></li></ul>', '/', undefined, window => {
    window.fetch = (async () => { calls++; return new window.Response('<div class="nsk-post">No hydrated counts</div>'); }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(calls, 0);
    f.window.document.querySelector('.post-list-item')!.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    await new Promise(resolve => setTimeout(resolve, 550));
    assert.equal(calls, 1);
    assert.equal(f.window.document.querySelectorAll('iframe[src]').length, 0);
  } finally { await f.close(); }
});

test('badge colors retain the original style by default', async () => {
  const f = await fixture({ 'official-blocklist': { enabled: false } });
  try {
    const settings = f.window.document.querySelector('#nspp-settings')!.shadowRoot!;
    f.window.document.querySelector<HTMLButtonElement>('[data-nspp-settings-launcher]')!.click();
    const select = [...settings.querySelectorAll('select')].find(control => [...control.options].some(option => option.value === 'original'))!;
    assert.equal(select.value, 'original');
    assert.equal([...f.window.document.querySelectorAll('style')].some(style => style.textContent?.includes('color:var(--nspp-muted, #9198a1)!important')), false);
  } finally { await f.close(); }
});

test('post preview follows the forum theme while open', async () => {
  const f = await fixture({ 'reading-navigation': { enabled: false } });
  try {
    const doc = f.window.document;
    const preview = doc.querySelector<HTMLDialogElement>('.nspp-post-preview')!;
    preview.hidden = false;
    preview.show();
    const color = () => f.window.getComputedStyle(preview).color;
    const light = color();
    doc.body.classList.add('dark-layout');
    assert.equal(f.window.getComputedStyle(preview).backgroundColor, '#262626');
    assert.equal(color(), '#dedede');
    assert.equal(f.window.getComputedStyle(preview).colorScheme, 'dark');
    doc.body.classList.remove('dark-layout');
    assert.equal(color(), light);
    assert.equal(f.window.getComputedStyle(preview).colorScheme, 'light');
  } finally { await f.close(); }
});

test('reading image preview claims clicks before native viewers and closes in one click', async () => {
  let nativeOpens = 0;
  const f = await fixture({}, '<div class="post-content"><img src="https://example.com/photo.png"></div>', '/post-42-1', undefined, window => {
    window.document.addEventListener('click', event => {
      if (event.target instanceof window.HTMLImageElement) nativeOpens++;
    }, true);
  });
  try {
    const doc = f.window.document;
    const image = doc.querySelector<HTMLImageElement>('.post-content img')!;
    image.addEventListener('click', () => { nativeOpens++; });
    image.click();
    const gallery = doc.querySelector<HTMLDialogElement>('.nspp-image-viewer')!;
    assert.equal(nativeOpens, 0, 'neither native capture nor image handlers should open a second layer');
    assert.equal(gallery.open, true);
    gallery.querySelector<HTMLButtonElement>('button')!.click();
    assert.equal(doc.querySelectorAll('dialog[open]').length, 0);
    image.dispatchEvent(new f.window.MouseEvent('click', { bubbles: true, ctrlKey: true }));
    assert.equal(nativeOpens, 2, 'modified clicks retain native behavior');
    assert.equal(gallery.open, false);
  } finally { await f.close(); }
});

for (const mobile of [false, true]) {
  test(`post preview images open a gallery and preserve the ${mobile ? 'mobile' : 'desktop'} card until closed`, async () => {
    let nativeOpens = 0;
    const f = await fixture({ 'official-blocklist': { enabled: false }, 'user-level': { enabled: false } }, '<ul class="post-list"><li class="post-list-item"><div class="post-title"><a href="/post-42-1">Images</a></div></li></ul>', '/', undefined, window => {
      window.document.addEventListener('click', event => {
        if (event.target instanceof window.HTMLImageElement) nativeOpens++;
      }, true);
      window.matchMedia = ((query: string) => ({ matches: query.includes('prefers-reduced-motion') || (query.includes('hover: hover') ? !mobile : mobile) })) as typeof window.matchMedia;
      window.fetch = (async () => new window.Response('<div class="post-content"><a href="https://example.com/photo.png"><img src="https://example.com/photo.png" alt="First image"></a><img src="https://example.com/second.png" alt="Second image"></div>')) as typeof window.fetch;
    });
    try {
      const doc = f.window.document;
      const link = doc.querySelector<HTMLAnchorElement>('.post-title a')!;
      if (mobile) link.click(); else link.dispatchEvent(new f.window.MouseEvent('mouseenter'));
      await new Promise(resolve => setTimeout(resolve, mobile ? 40 : 450));
      const preview = doc.querySelector<HTMLDialogElement>('.nspp-post-preview')!;
      if (mobile) {
        assert.equal(preview.open, false);
        assert.equal(preview.hidden, true);
        return;
      }
      const images = preview.querySelectorAll<HTMLImageElement>('article img');
      assert.equal(images.length, 2);
      const click = new f.window.MouseEvent('click', { bubbles: true, cancelable: true });
      images[1].dispatchEvent(click);
      assert.equal(click.defaultPrevented, true, 'image clicks must not navigate');
      assert.equal(nativeOpens, 0, 'native capture handlers must not open a duplicate viewer');
      const gallery = doc.querySelector<HTMLDialogElement>('.nspp-image-preview')!;
      assert.equal(gallery.open, true);
      assert.equal(gallery.querySelector('.viewer-canvas img')?.getAttribute('src'), 'https://example.com/second.png');
      assert.ok(gallery.querySelector('[aria-label="放大"]'));
      assert.ok(gallery.querySelector('[aria-label="关闭预览"]'));
      preview.dispatchEvent(new f.window.MouseEvent('mouseleave'));
      await new Promise(resolve => setTimeout(resolve, 260));
      assert.equal(preview.hidden, false, 'the hover timer must not close an active gallery');
      gallery.dispatchEvent(new f.window.Event('cancel', { cancelable: true }));
      assert.equal(doc.querySelector('.nspp-image-preview'), null);
      assert.equal(preview.open, true, 'Escape closes only the gallery');
      assert.equal(doc.activeElement, images[1]);
      images[0].dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      assert.equal(doc.querySelector('.viewer-canvas img')?.getAttribute('src'), 'https://example.com/photo.png');
      assert.equal(nativeOpens, 0, 'keyboard activation must also open only one viewer');
      doc.querySelector<HTMLButtonElement>('[aria-label="关闭预览"]')!.click();
      assert.equal(doc.querySelector('.nspp-image-preview'), null, 'one close click removes the gallery');
      images[0].click();
      f.window.dispatchEvent(new f.window.PageTransitionEvent('pagehide', { persisted: false }));
      assert.equal(doc.querySelector('.nspp-image-preview'), null);
      assert.equal(doc.body.classList.contains('viewer-open'), false);
    } finally { await f.close(); }
  });
}

test('mobile reply keeps the native editor and draft, cancels comment loading and resumes at the same position', async () => {
  let intersect!: () => void, complete!: () => void, requestSignal: AbortSignal | undefined;
  let observing = false, calls = 0, nativeReplies = 0;
  const html = '<ul class="comments"><li><div class="comment-menu"><button class="menu-item" title="回复"><span>回复</span></button></div></li></ul><div class="nsk-pager"><a class="pager-next" href="/post-1-2">next</a></div><div class="md-editor" style="color:red"><textarea>草稿</textarea><button type="submit">发送</button></div>';
  const f = await fixture({ 'infinite-scroll': { enabled: true, comments: true }, 'user-level': { enabled: false }, 'official-blocklist': { enabled: false } }, html, '/post-1-1', undefined, window => {
    window.happyDOM.setWindowSize({ width: 390, height: 844 });
    // Happy DOM misreads this comma-separated query; retain its real mobile MediaQueryList.
    const matchMedia = window.matchMedia.bind(window);
    window.matchMedia = ((query: string) => matchMedia(query === '(max-width: 700px), (hover: none)' ? '(max-width: 700px)' : query)) as typeof window.matchMedia;
    window.IntersectionObserver = class {
      constructor(callback: (entries: unknown[]) => void, options?: { rootMargin?: string }) { if (options?.rootMargin === '150px') intersect = () => callback([{ isIntersecting: true }]); }
      observe() { observing = true; } disconnect() { observing = false; } unobserve() {}
    } as unknown as typeof window.IntersectionObserver;
    window.fetch = (async (_: unknown, options?: RequestInit) => {
      calls++; requestSignal = options?.signal as AbortSignal;
      await new Promise<void>(resolve => { complete = resolve; });
      return new window.Response('<ul class="comments"><li id="next-comment">next comment</li></ul>');
    }) as typeof window.fetch;
  });
  try {
    const doc = f.window.document;
    const editor = doc.querySelector('.md-editor')!;
    doc.querySelector('.menu-item')!.addEventListener('click', () => { nativeReplies++; });
    f.window.scrollTo(0, 430);
    intersect(); await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(calls, 1);
    doc.querySelector<HTMLButtonElement>('.menu-item span')!.click();
    assert.equal(nativeReplies, 1, 'native reply handler still receives the click');
    assert.ok(doc.querySelector('.nspp-floating-reply') === editor, 'the native editor should become floating');
    assert.equal(doc.documentElement.hasAttribute('data-nspp-reply-open'), true);
    assert.equal(observing, false);
    assert.equal(requestSignal?.aborted, true);
    complete(); await new Promise(resolve => setTimeout(resolve, 15));
    intersect(); await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(calls, 1);
    assert.equal(doc.querySelector('#next-comment'), null);
    doc.querySelector<HTMLButtonElement>('[aria-label="收起回复框"]')!.click();
    assert.equal(doc.documentElement.hasAttribute('data-nspp-reply-open'), false);
    assert.equal(observing, true);
    assert.equal(f.window.scrollY, 430);
    assert.equal(editor.querySelector('textarea')!.value, '草稿');
    assert.equal(editor.getAttribute('style'), 'color: red;');
    const pause = doc.querySelector<HTMLButtonElement>('[aria-label="暂停自动翻页"]')!;
    pause.click();
    doc.querySelector<HTMLButtonElement>('.menu-item')!.click();
    doc.querySelector<HTMLButtonElement>('[aria-label="收起回复框"]')!.click();
    assert.equal(observing, false, 'closing reply does not override a manual pause');
  } finally { complete?.(); await f.close(); }
});

test('floating reply leaves desktop and disabled mobile native replies alone', async () => {
  for (const mobile of [false, true]) {
    const f = await fixture({ 'floating-reply': { enabled: !mobile } }, '<div class="comment-menu"><button class="menu-item">引用</button></div><div class="md-editor"><textarea>原文</textarea></div>', '/post-1-1', undefined, window => {
      window.happyDOM.setWindowSize({ width: mobile ? 390 : 1280, height: 844 });
    });
    try {
      f.window.document.querySelector<HTMLButtonElement>('.menu-item')!.click();
      assert.equal(f.window.document.querySelector('.nspp-floating-reply'), null);
      assert.equal(f.window.document.documentElement.hasAttribute('data-nspp-reply-open'), false);
    } finally { await f.close(); }
  }
});

test('hot rankings load lazily, keep tabs independent, cache results and retain data after failure', async () => {
  type Options = { url: string; anonymous: boolean; onload(response: { status: number; responseText: string }): void; onerror(): void };
  const calls: Options[] = [];
  const f = await fixture({}, '', '/', undefined, window => {
    Object.assign(window, { GM_xmlhttpRequest: (options: Options) => { calls.push(options); return { abort() {} }; } });
  });
  const payload = (id: number, title: string) => ({ updated_at: 1789375421, posts: [{ post: { id, title, author: 'Alice', views: 123, comments: 4 }, score: 55.6 }, { post: { id, title: 'duplicate' } }, { post: { id: 'javascript:bad', title: 'bad' } }] });
  const wait = () => new Promise(resolve => setTimeout(resolve, 5));
  try {
    const doc = f.window.document;
    assert.equal(calls.length, 0);
    doc.querySelector<HTMLButtonElement>('[data-nspp-hot-launcher]')!.click();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].anonymous, true);
    assert.match(calls[0].url, /^https:\/\/api\.bimg\.eu\.org\/hot\.json\?t=\d+$/);
    doc.querySelector<HTMLButtonElement>('[data-ranking="weekly"]')!.click();
    calls[1].onload({ status: 200, responseText: JSON.stringify(payload(2, '周榜')) }); await wait();
    calls[0].onload({ status: 200, responseText: JSON.stringify(payload(1, '<img src=x onerror=bad>')) }); await wait();
    const panel = doc.querySelector('.nspp-hot-rankings')!;
    assert.equal(panel.querySelector('li a')!.textContent, '周榜', 'late hot response must not replace weekly');
    doc.querySelector<HTMLButtonElement>('[data-ranking="hot"]')!.click();
    assert.equal(calls.length, 2, 'cached hot tab does not fetch again');
    assert.equal(panel.querySelectorAll('li').length, 1);
    assert.equal(panel.querySelector('li img'), null);
    assert.equal(panel.querySelector('li a')!.getAttribute('href'), 'https://www.nodeseek.com/post-1-1');
    panel.querySelector<HTMLButtonElement>('nav > :last-child')!.click();
    calls[2].onerror(); await wait();
    assert.match(panel.querySelector('[role="status"]')!.textContent!, /保留上次结果/);
    assert.equal(panel.querySelectorAll('li').length, 1);
    doc.querySelector<HTMLButtonElement>('[data-ranking="daily"]')!.click();
    assert.match(calls[3].url, /\/daily\.json/);
    calls[3].onload({ status: 200, responseText: '{"posts":[]}' }); await wait();
    assert.match(panel.querySelector('[role="status"]')!.textContent!, /0 条/);
    panel.querySelector<HTMLButtonElement>('nav > :last-child')!.click();
    calls[4].onload({ status: 200, responseText: '{"posts":[{}]}' }); await wait();
    assert.match(panel.querySelector('[role="status"]')!.textContent!, /加载失败/);
  } finally { await f.close(); }
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
    assert.equal(requests.some(path => path.includes('markViewed')), false);
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
