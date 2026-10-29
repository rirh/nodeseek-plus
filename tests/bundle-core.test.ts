import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Window } from 'happy-dom';
import { bundle, key, fixture, waitFor } from './helpers/bundle-fixture.ts';

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
        setTimeout(() => options.onload({ status: 200, responseText: `// ==UserScript==\n// @namespace nodeseek-plus-plus\n// @version ${version}\n// ==/UserScript==` }), 0);
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
    assert.equal(requests[0].url.split('?')[0], 'https://raw.githubusercontent.com/rirh/nodeseek-plus/main/dist/nodeseek-plus-plus.meta.js');
    assert.ok(new URL(requests[0].url).searchParams.get('_'));
    assert.equal(requests[0].nocache, true);
    assert.match(requests[0].headers['Cache-Control'], /no-store/);
    assert.equal(requests[0].headers.Pragma, 'no-cache');
    assert.equal(requests[0].anonymous, true);
    const dialog = f.window.document.querySelector<HTMLDialogElement>('.nspp-update-notice')!;
    assert.equal(dialog.open, true);
    assert.match(dialog.textContent!, /99\.999\.9999/);
    assert.equal(dialog.querySelector<HTMLAnchorElement>('.nspp-update-github')!.href, 'https://github.com/rirh/nodeseek-plus');
    const install = dialog.querySelector<HTMLAnchorElement>('.nspp-update-install')!;
    assert.equal(install.href, 'https://raw.githubusercontent.com/rirh/nodeseek-plus/main/dist/nodeseek-plus-plus.user.js');
    assert.equal(install.target, '_blank');
    dialog.close('cancel');
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(button.disabled, false);
    version = '1.0.0'; button.click();
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(requests.length, 2);
    assert.notEqual(requests[0].url, requests[1].url, 'each manual check bypasses URL caches');
    assert.equal(f.window.document.querySelector('.nspp-update-notice'), null);
    assert.match(root.querySelector('.toast-message')!.textContent!, /当前已是最新版本/);
  } finally { await f.close(); }
});

test('coming back from the installer reloads the page, unless a reply is still unsent', async () => {
  let version = '1.0.0';
  const f = await fixture({}, '<textarea id="draft"></textarea><div class="CodeMirror"></div>', '/', undefined, window => {
    Object.assign(window, {
      GM_xmlhttpRequest: (options: { onload(response: { status: number; responseText: string }): void }) => {
        setTimeout(() => options.onload({ status: 200, responseText: `// ==UserScript==\n// @namespace nodeseek-plus-plus\n// @version ${version}\n// ==/UserScript==` }), 0);
        return { abort() {} };
      },
    });
  }, true);
  try {
    const doc = f.window.document;
    let reloads = 0;
    Object.defineProperty(f.window.location, 'reload', { configurable: true, value: () => { reloads++; } });
    // A saved draft the editor loaded is clean, so it does not hold the reload back.
    Object.assign(doc.querySelector('.CodeMirror')!, { CodeMirror: { getValue: () => '已保存的草稿', isClean: () => true } });
    const leaveAndReturn = async () => {
      for (const hidden of [true, false]) {
        Object.defineProperty(doc, 'hidden', { configurable: true, value: hidden });
        doc.dispatchEvent(new f.window.Event('visibilitychange'));
      }
      await new Promise(resolve => setTimeout(resolve, 30));
    };
    await new Promise(resolve => setTimeout(resolve, 10));
    version = '99.999.9999';
    f.menus[0]();
    const check = doc.querySelector('#nspp-settings')!.shadowRoot!.querySelector<HTMLButtonElement>('.check-update')!;
    check.click();
    await new Promise(resolve => setTimeout(resolve, 30));
    let dialog = doc.querySelector<HTMLDialogElement>('.nspp-update-notice')!;
    assert.match(dialog.textContent!, /自动刷新/);
    await leaveAndReturn();
    assert.equal(reloads, 0, 'switching tabs without opening the installer keeps the page');

    doc.querySelector<HTMLTextAreaElement>('#draft')!.value = '还没发出去的回复';
    dialog.querySelector<HTMLAnchorElement>('.nspp-update-install')!.click();
    await leaveAndReturn();
    assert.equal(reloads, 0, 'unsent text is never thrown away');
    assert.match(dialog.textContent!, /未发送/);
    const reload = dialog.querySelector<HTMLButtonElement>('.nspp-update-reload')!;
    reload.click();
    assert.equal(reloads, 1);
    dialog.close('cancel');
    await new Promise(resolve => setTimeout(resolve, 10));

    doc.querySelector<HTMLTextAreaElement>('#draft')!.value = '';
    check.click();
    await new Promise(resolve => setTimeout(resolve, 30));
    dialog = doc.querySelector<HTMLDialogElement>('.nspp-update-notice')!;
    dialog.querySelector<HTMLAnchorElement>('.nspp-update-install')!.click();
    await leaveAndReturn();
    assert.equal(reloads, 2, 'returning from the installer loads the new version');
    dialog.close('cancel');
    await new Promise(resolve => setTimeout(resolve, 10));
    await leaveAndReturn();
    assert.equal(reloads, 2, 'a closed notice stops watching for the return');
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
        queueMicrotask(() => options.onload({ status: 200, responseText: `// ==UserScript==\n// @namespace nodeseek-plus-plus\n// @version ${version}\n// ==/UserScript==` }));
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
    assert.equal(notifications[0].url, 'https://raw.githubusercontent.com/rirh/nodeseek-plus/main/dist/nodeseek-plus-plus.user.js');
    assert.equal(f.window.document.querySelector('.nspp-update-notice'), null);
    Object.defineProperty(f.window.document, 'hidden', { configurable: true, value: false });
    f.window.document.dispatchEvent(new f.window.Event('visibilitychange'));
    await new Promise(resolve => setTimeout(resolve, 10));
    const dialog = f.window.document.querySelector<HTMLDialogElement>('.nspp-update-notice')!;
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
    assert.equal(second.window.document.querySelector('.nspp-update-notice'), null);
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
    second.window.document.querySelector<HTMLDialogElement>('.nspp-update-notice')!.close('cancel');
  } finally { await f.close(); await second?.close(); }
});

test('site fast-nav buttons move into the toolbar and forward clicks to the native controls', async () => {
  const html = '<div id="fast-nav-button-group"><div id="back-to-top" class="nav-item-btn" style="display: flex;"></div><div id="back-to-parent" class="nav-item-btn" style="display: none;"></div><div id="back-to-bottom" class="nav-item-btn" style="display: flex;"></div></div>';
  const f = await fixture({}, html);
  try {
    const doc = f.window.document;
    await waitFor(() => doc.documentElement.hasAttribute('data-nspp-fast-nav'));
    const proxy = (id: string) => doc.querySelector<HTMLButtonElement>(`#nspp-tools [data-nspp-fast-nav="${id}"]`)!;
    assert.equal(proxy('back-to-top').hidden, false);
    assert.equal(proxy('back-to-parent').hidden, true);
    assert.equal(proxy('back-to-bottom').hidden, false);
    let clicked = '';
    doc.getElementById('back-to-bottom')!.addEventListener('click', () => { clicked = 'bottom'; });
    proxy('back-to-bottom').click();
    assert.equal(clicked, 'bottom');
    doc.getElementById('back-to-parent')!.setAttribute('style', 'display: flex;');
    await waitFor(() => !proxy('back-to-parent').hidden);
    doc.getElementById('fast-nav-button-group')!.remove();
    await waitFor(() => !doc.documentElement.hasAttribute('data-nspp-fast-nav'));
    await waitFor(() => proxy('back-to-top').hidden && proxy('back-to-bottom').hidden);
  } finally { await f.close(); }
});

test('boot with monitoring disabled makes no API calls; repeated boot does not duplicate the UI', async () => {
  const f = await fixture({}, '<ul class="post-list"><li class="post-list-item"><div class="post-title"><a href="/post-42-1">Test post</a></div></li></ul>');
  try {
    assert.equal(f.window.document.querySelectorAll('#nspp-settings').length, 1);
    assert.deepEqual(f.menuLabels, ['NodeSeek++ 设置', '签到', 'NodeSeek 热榜', '阅读历史', '回帖足迹']);
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

test('async-only GM.* managers (iOS Userscripts) load, save settings and make requests', async () => {
  const saved: string[] = [], requested: string[] = [];
  let store: Map<string, unknown> | undefined;
  const f = await fixture({}, '', '/', undefined, window => {
    store = new Map([[key, { attendance: { enabled: true, automatic: false }, monitor: { enabled: false }, 'notification-categories': { enabled: false }, 'request-settings': { enabled: true, requestInterval: 0 } }]]);
    Object.assign(window, {
      GM_getValue: undefined, GM_setValue: undefined, GM_xmlhttpRequest: undefined,
      GM: {
        getValue: async (name: string) => structuredClone(store!.get(name)),
        setValue: async (name: string, value: unknown) => { saved.push(name); store!.set(name, structuredClone(value)); },
        listValues: async () => [...store!.keys()],
        xmlHttpRequest: (options: { url: string; onerror(): void }) => { requested.push(options.url); queueMicrotask(() => options.onerror()); return { abort() {} }; },
      },
    });
  }, true);
  try {
    const doc = f.window.document;
    assert.ok(doc.querySelector('#nspp-tools'));
    assert.equal(doc.querySelector('[data-nspp-monitor-launcher]'), null, 'stored settings (monitor off) were read through GM.getValue');
    const root = doc.querySelector('#nspp-settings')!.shadowRoot!;
    doc.querySelector<HTMLButtonElement>('[data-nspp-settings-launcher]')!.click();
    assert.doesNotMatch(root.querySelector('.status')!.textContent!, /油猴存储未就绪/);
    const save = root.querySelector<HTMLButtonElement>('.primary')!;
    assert.equal(save.disabled, false);
    save.click();
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.ok(saved.includes(key), 'settings persisted through GM.setValue');
    root.querySelector<HTMLButtonElement>('.check-update')!.click();
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.ok(requested.some(url => url.includes('nodeseek-plus-plus.meta.js')), 'cross-origin requests fall back to GM.xmlHttpRequest');
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

test('settings categories are anchors, scroll updates selection and search filters both panes', async () => {
  const f = await fixture();
  try {
    f.menus[0]();
    const root = f.window.document.querySelector('#nspp-settings')!.shadowRoot!;
    const nav = [...root.querySelectorAll<HTMLAnchorElement>('.categories a')];
    assert.deepEqual(nav.map(link => link.textContent), ['浏览', '用户', '工具', '其他']);
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
    assert.deepEqual([...root.querySelectorAll('.categories a')].map(link => link.textContent), ['其他']);
    assert.ok(root.querySelector('.about-links a[href="https://github.com/rirh/nodeseek-plus"]'));
  } finally { await f.close(); }
});

test('busy controls use opaque motion feedback and loading text uses SweepShine', () => {
  const css = readFileSync(new URL('../src/loading.css', import.meta.url), 'utf8');
  const textShine = ['.nspp-sweep-shine, [aria-busy="true"].nspp-sweep-shine', '.nspp-user-badges[aria-busy="true"]'];
  // Inspect declaration blocks, including blocks nested in reduced-motion media rules.
  const blocks = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  for (const [, selector, declarations] of blocks) {
    if (/text-fill-color:\s*transparent|background-clip:\s*text/.test(declarations)) {
      assert.ok(textShine.includes(selector.trim()), `text clipping is restricted to loading text: ${selector.trim()}`);
    }
  }
  const base = blocks.find(([, selector]) => selector.trim() === '[aria-busy="true"], .nspp-skeleton-shine');
  assert.ok(base);
  assert.match(base[2], /-webkit-text-fill-color:\s*currentColor/);
  const shine = blocks.find(([, selector]) => selector.trim() === textShine[0]);
  assert.ok(shine);
  assert.match(shine[2], /background-clip:\s*text[^}]*-webkit-text-fill-color:\s*transparent[^}]*animation: nspp-sweep-shine/);
  assert.match(css, /\.nspp-sweep-shine \* \{\s*-webkit-text-fill-color:\s*currentColor/, 'nested elements inside shining text stay visible');
  assert.match(css, /\[aria-busy="true"\]:has\(> \.nspp-sweep-shine\) \{[^}]*background-image:\s*none/, 'a shining label replaces the control sweep');
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.nspp-sweep-shine, \[aria-busy="true"\]\.nspp-sweep-shine\s*\{[^}]*animation:\s*none;[^}]*-webkit-text-fill-color:\s*currentColor/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.nspp-user-badges\[aria-busy="true"\]\s*\{[^}]*background-image:\s*none;[^}]*-webkit-text-fill-color:\s*currentColor/);
  assert.match(css, /opacity: 1 !important/);
  assert.match(css, /\.nspp-action\[aria-busy="true"\] > svg[^}]+animation: nspp-attendance-working/);
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
