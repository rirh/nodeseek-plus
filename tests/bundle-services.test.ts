import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Window } from 'happy-dom';
import { key, fixture } from './helpers/bundle-fixture.ts';

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

test('image picker sits in the editor header row and follows it when the site renders it late', async () => {
  const header = '<div class="editor-head"><div class="tabs"><div class="tab-option">内容</div></div><div>支持MD语法</div><a class="editor-top-button" title="行号"></a><a class="editor-top-button" title="工具栏"></a><a class="editor-top-button" title="全屏"></a></div>';
  const native = await fixture({}, `<div class="md-editor"><div id="editor-body">${header}<div class="mde-toolbar"><span class="toolbar-item i-icon i-icon-pic" title="图片"></span></div><textarea></textarea></div></div>`);
  try {
    const doc = native.window.document;
    const head = doc.querySelector('.editor-head')!;
    const choose = head.querySelector<HTMLElement>('.nspp-upload-choose')!;
    assert.equal(choose.nextElementSibling, head.querySelector('[title="行号"]'), 'upload icon goes before the native header buttons');
    assert.equal(head.nextElementSibling?.classList.contains('nspp-upload-status'), true, 'status row sits right under the header');
    assert.equal(doc.querySelector('.mde-toolbar .nspp-upload-choose'), null);
  } finally { await native.close(); }
  const late = await fixture({}, '<div class="md-editor"><div id="editor-body"><textarea></textarea></div></div>');
  try {
    const doc = late.window.document;
    assert.ok(doc.querySelector('.nspp-upload-status .nspp-upload-choose'), 'fallback keeps the picker reachable before the header exists');
    doc.querySelector('#editor-body')!.insertAdjacentHTML('afterbegin', header);
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(doc.querySelector('.editor-head .nspp-upload-choose')?.nextElementSibling, doc.querySelector('[title="行号"]'));
    assert.equal(doc.querySelectorAll('.nspp-upload-choose').length, 1);
  } finally { await late.close(); }
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

test('share launcher sits above settings and opens QR, X, Telegram and more actions', async () => {
  const opened: string[] = [];
  const f = await fixture({}, '', '/', undefined, window => { window.open = ((url: string) => { opened.push(url); return null; }) as typeof window.open; });
  try {
    const doc = f.window.document;
    const launcher = doc.querySelector<HTMLButtonElement>('[data-nspp-share-launcher]')!;
    assert.ok(launcher);
    assert.equal(launcher.nextElementSibling, doc.querySelector('[data-nspp-settings-launcher]'));
    launcher.click();
    const sheet = doc.querySelector<HTMLDialogElement>('dialog.nspp-share')!;
    assert.equal(sheet.open, true);
    const actions = [...sheet.querySelectorAll<HTMLButtonElement>('.nspp-share-actions button')];
    assert.deepEqual(actions.map(button => button.textContent), ['保存二维码', 'X', 'Telegram', '更多']);
    actions[1].click(); actions[2].click();
    assert.match(opened[0], /^https:\/\/x\.com\/intent\/post\?text=.+&url=https%3A%2F%2Fgithub\.com%2Frirh%2Fnodeseek-plus$/);
    assert.match(opened[1], /^https:\/\/t\.me\/share\/url\?url=https%3A%2F%2Fgithub\.com%2Frirh%2Fnodeseek-plus&text=/);
  } finally { await f.close(); }
});

test('share launcher can be turned off in settings', async () => {
  const f = await fixture({ share: { enabled: false } });
  try { assert.equal(f.window.document.querySelector('[data-nspp-share-launcher]'), null); }
  finally { await f.close(); }
});

test('toolbar collapse toggle remembers its state and restores on the next page', async () => {
  const f = await fixture();
  try {
    const tools = f.window.document.getElementById('nspp-tools')!;
    const toggle = tools.querySelector<HTMLButtonElement>('.nspp-tools-toggle')!;
    assert.ok(toggle);
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    toggle.click();
    assert.equal(tools.hasAttribute('data-collapsed'), true);
    assert.equal(toggle.getAttribute('aria-label'), '展开工具栏');
    assert.equal(f.storage.get('nspp:tools-collapsed'), true);
    const next = await fixture({}, '', '/', f.storage);
    try { assert.equal(next.window.document.getElementById('nspp-tools')!.hasAttribute('data-collapsed'), true); }
    finally { await next.close(); }
    toggle.click();
    assert.equal(tools.hasAttribute('data-collapsed'), false);
    assert.equal(f.storage.get('nspp:tools-collapsed'), false);
  } finally { await f.close(); }
});
