import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

const bundle = readFileSync(new URL('../dist/nodeseek-plus-plus.user.js', import.meta.url), 'utf8');
const key = 'nspp:settings:www.nodeseek.com';
async function fixture(settings: Record<string, unknown> = {}, html = '', path = '/', shared?: Map<string, unknown>, setup?: (window: Window) => void) {
  // Evaluate only our locally built bundle and fixed test fixtures, never downloaded code.
  const window = new Window({ url: `https://www.nodeseek.com${path}`, settings: { enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
  const storage = shared || new Map<string, unknown>([[key, settings]]);
  const requests: string[] = [];
  const menus: (() => void)[] = [];
  Object.assign(window, {
    GM_getValue: (key: string, fallback: unknown) => storage.has(key) ? structuredClone(storage.get(key)) : fallback,
    GM_setValue: (key: string, value: unknown) => storage.set(key, structuredClone(value)),
    GM_registerMenuCommand: (_: string, fn: () => void) => menus.push(fn),
    GM_addStyle: (css: string) => { const el = window.document.createElement('style'); el.textContent = css; window.document.head.append(el); },
    unsafeWindow: window,
    __config__: { user: { member_id: 7, member_name: 'tester', rank: 3 } },
    fetch: async (url: unknown) => { requests.push(String(url)); throw new Error('No fixture response'); },
  });
  setup?.(window);
  window.document.body.innerHTML = html;
  window.eval(bundle);
  await new Promise(resolve => setTimeout(resolve, 5));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return { window, storage, requests, menus, close: () => window.happyDOM.abort() };
}

test('bundle is self-contained, scoped to forum hosts and has no remote require', () => {
  assert.match(bundle, /@match\s+https:\/\/www\.nodeseek\.com\/\*/);
  assert.doesNotMatch(bundle, /@match\s+\*:\/\/\*\/\*/);
  assert.doesNotMatch(bundle, /@require/);
  assert.match(bundle, /@noframes/);
});

test('default boot makes no API calls; repeated boot does not duplicate the UI', async () => {
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

test('attendance failure does not cache success; retry succeeds once per account per day', async () => {
  const f = await fixture({ attendance: { enabled: true, automatic: false, mode: 'fixed' } });
  try {
    let calls = 0;
    f.window.fetch = (async () => {
      calls++;
      return new f.window.Response(JSON.stringify(calls === 1 ? { success: false, message: 'retry' } : { success: true, message: 'ok' }), { headers: { 'Content-Type': 'application/json' } });
    }) as typeof f.window.fetch;
    const button = [...f.window.document.querySelectorAll('button')].find(el => el.textContent === '签到')!;
    button.click(); await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(f.storage.get('nspp:state:www.nodeseek.com:attendance'), undefined);
    button.click(); await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(calls, 1, 'failed attempts are briefly throttled across tabs');
    f.storage.delete('nspp:lock:www.nodeseek.com:attendance:7');
    button.click(); await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(f.storage.get('nspp:state:www.nodeseek.com:attendance'));
    button.click(); await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(calls, 2);
  } finally { await f.close(); }
});

test('two tabs share attendance state and do not issue concurrent sign-ins', async () => {
  const first = await fixture({ attendance: { enabled: true } });
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
    for (const tab of [first, second]) [...tab.window.document.querySelectorAll('button')].find(el => el.textContent === '签到')!.click();
    await new Promise(resolve => setTimeout(resolve, 70));
    assert.equal(calls, 1);
    [...second.window.document.querySelectorAll('button')].find(el => el.textContent === '签到')!.click();
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
    (root.querySelector('.launcher') as HTMLElement).click();
    assert.equal(root.querySelector('dialog')!.open, true);
    assert.equal((root.querySelector('.primary') as HTMLButtonElement).disabled, true);
    assert.match(root.querySelector('.status')!.textContent!, /油猴存储未就绪/);
    assert.ok(f.window.document.querySelector('#nspp-tools'));
    assert.equal(f.window.localStorage.length, 0);
  } finally { await f.close(); }
});

test('user badges load visible names, share requests and can retry failed profiles', async () => {
  let calls = 0;
  const f = await fixture({ 'official-blocklist': { enabled: false } }, '<div class="author-info"><a href="/space/123">Alice</a><span class="role-tag">管理员</span><span class="role-tag">站点创建者</span><span class="role-tag">拥有者</span></div><div class="author-info"><a href="/space/123">Alice</a></div>', '/', undefined, window => {
    window.fetch = (async () => {
      calls++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return new window.Response(JSON.stringify(calls === 1 ? { success: false } : { success: true, detail: { coin: 2500, created_at: new Date(Date.now() - 400 * 86400000).toISOString() } }), { headers: { 'Content-Type': 'application/json' } });
    }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(calls, 1);
    assert.deepEqual(Array.from(f.window.document.querySelectorAll('[data-nspp-role]'), tag => tag.getAttribute('data-nspp-role')), ['admin', 'founder', 'owner']);
    assert.equal(f.window.document.querySelectorAll('.nspp-user-badges button').length, 2);
    for (const button of f.window.document.querySelectorAll('.nspp-user-badges button')) (button as HTMLElement).click();
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(calls, 2);
    assert.equal(f.window.document.querySelectorAll('.nspp-level').length, 2);
    assert.equal(f.window.document.querySelector('.nspp-level')!.textContent, 'Lv5');
    assert.equal(f.window.document.querySelector('.nspp-age')!.getAttribute('data-tone'), null);
    assert.equal(f.window.document.querySelector('.nspp-age')!.textContent, '加入 400天');
    assert.match(f.window.document.querySelector<HTMLElement>('.nspp-age')!.title, /已加入 400 天\n加入于 .+\n发帖/);
    assert.equal(f.window.document.querySelector('.nspp-trust')!.textContent, '信任 —');
    assert.equal(f.window.document.querySelector('.nspp-user-badges')!.hasAttribute('aria-busy'), false);
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
    assert.deepEqual(buttons.map(b => b.textContent), ['解除', '解除']);
    assert.deepEqual(calls, ['/api/block-list/list']);
    buttons[0].click(); buttons[1].click();
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
    assert.ok(nav.length > 4);
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
  } finally { await f.close(); }
});

test('history dialog searches, deletes and restores entries', async () => {
  const storage = new Map<string, unknown>([[key, {}], ['nspp:state:www.nodeseek.com:reading-history', { entries: [{ path: '/post-12-1', title: 'Alpha', time: Date.now() }, { path: '/post-13-1', title: 'Beta', time: Date.now() }] }]]);
  const f = await fixture({}, '', '/', storage);
  try {
    [...f.window.document.querySelectorAll('button')].find(b => b.textContent === '阅读历史')!.click();
    const dialog = f.window.document.querySelector<HTMLDialogElement>('.nspp-history')!;
    assert.ok(dialog.open); assert.equal(dialog.querySelectorAll('ol li').length, 2);
    const search = dialog.querySelector('input')!; search.value = 'Alpha'; search.dispatchEvent(new f.window.Event('input'));
    assert.equal(dialog.querySelectorAll('ol a').length, 1);
    (dialog.querySelector('ol button') as HTMLButtonElement).click();
    assert.equal(dialog.querySelectorAll('ol a').length, 0);
    [...dialog.querySelectorAll('button')].find(b => b.textContent === '撤销删除')!.click();
    assert.equal(dialog.querySelector('ol a')!.textContent, 'Alpha');
    assert.ok(dialog.querySelector('time'));
  } finally { await f.close(); }
});

test('trust badges display scores and open an explanation without extra requests', async () => {
  const f = await fixture({ 'official-blocklist': { enabled: false } }, '<div class="author-info"><a href="/space/123">Alice</a></div>', '/', undefined, window => {
    window.fetch = (async () => new window.Response(JSON.stringify({ success: true, detail: { created_at: new Date(Date.now() - 800 * 86400000).toISOString(), nPost: 100, nComment: 500 } }), { headers: { 'Content-Type': 'application/json' } })) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    const score = f.window.document.querySelector('.nspp-trust')!;
    assert.equal(score.textContent, '信任 100');
    (score as HTMLElement).click();
    const dialog = f.window.document.querySelector('dialog.nspp-trust-dialog')!;
    assert.equal(dialog.hasAttribute('open'), true);
    assert.match(dialog.textContent!, /注册时长 60.0\/60/);
    assert.match(dialog.textContent!, /不代表交易信用/);
    (dialog.querySelector('button') as HTMLElement).click();
    assert.equal(dialog.hasAttribute('open'), false);
    assert.ok(Array.from(f.window.document.querySelectorAll('style')).some(style => style.textContent?.includes('nspp-sweep-shine')));
    assert.match(f.window.document.querySelector('#nspp-settings')!.shadowRoot!.querySelector('style')!.textContent!, /nspp-sweep-shine/);
  } finally { await f.close(); }
});

test('hover preview preserves the native list and extracts safe reading content without an iframe', async () => {
  const f = await fixture({}, '<ul class="post-list"><li class="post-list-item"><div class="post-title"><a href="/post-42-1">Preview test</a></div></li></ul>', '/', undefined, window => {
    window.matchMedia = (() => ({ matches: true })) as typeof window.matchMedia;
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
    assert.match(view.textContent!, /Body text/);
    assert.match(view.textContent!, /A reply/);
    assert.doesNotMatch(view.textContent!, /Site navigation/);
    assert.equal(view.querySelector('iframe, script, [onclick], [onerror], a[href^="javascript:"]'), null);
    assert.equal(view.querySelector('img')!.src, 'https://www.nodeseek.com/photo.png');
    view.querySelector('button')!.click();
    assert.equal(view.hidden, true);
  } finally { await f.close(); }
});

test('three-line rows label metadata, read real counts on demand and open native actions', async () => {
  const html = '<ul class="post-list"><li class="post-list-item"><div class="post-list-content"><div class="post-title"><a href="/post-42-1">Post</a></div><div class="post-info"><span class="info-author"><a href="/space/8">Alice</a></span><span class="info-views">12</span><span class="info-comments-count">3</span><span class="info-last-commenter">Bob</span><a class="info-last-comment-time" href="/post-42-1#3">now</a></div></div></li></ul>';
  const f = await fixture({ 'user-level': { enabled: false }, 'official-blocklist': { enabled: false } }, html);
  try {
    let reads = 0;
    f.window.fetch = (async () => { reads++; return new f.window.Response('<div class="nsk-post"><div class="comment-menu">' + ['点赞', '加鸡腿', '反对', '收藏'].map((title, i) => `<div class="menu-item" title="${title}"><span>${i + 1}</span></div>`).join('') + '</div></div>'); }) as typeof f.window.fetch;
    const doc = f.window.document;
    const row = doc.querySelector('.nspp-three-line')!;
    assert.equal(doc.querySelectorAll('.nspp-list-actions button').length, 6);
    assert.deepEqual(Array.from(doc.querySelectorAll('.nspp-meta-label'), el => el.textContent), ['作者', '浏览', '回复', '最后回复']);
    assert.equal(reads, 0);
    assert.match(doc.querySelector('.nspp-list-actions')!.textContent!, /点赞—/);
    row.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    row.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(reads, 1);
    assert.match(doc.querySelector('.nspp-list-actions')!.textContent!, /点赞1加鸡腿2反对3收藏4引用回复/);
    doc.querySelector<HTMLButtonElement>('.nspp-list-actions button[title="回复"]')!.click();
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
  const storage = new Map<string, unknown>([[key, { attendance: { enabled: true, automatic: true } }], ['nspp:state:www.nodeseek.com:attendance', { 'day:7': day }]]);
  const f = await fixture({}, '', '/', storage);
  try {
    const button = [...f.window.document.querySelectorAll('button')].find(el => el.textContent === '签到')!;
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
    const button = [...f.window.document.querySelectorAll('button')].find(el => el.textContent === '签到')!;
    button.click(); await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(button.hidden, true);
    assert.ok(f.storage.get('nspp:state:www.nodeseek.com:attendance'));
  } finally { await f.close(); }
});

### 快速回复与文字加载提示

第三行闪电图标打开响应式快捷回复弹窗。默认内置 8 条常用回复，每页 6 条，支持查找、新增、修改、删除，模板保存在当前站点脚本设置中。点击模板内容即直接发送；发送期间禁用重复点击，完成后关闭弹窗并用 toast 显示结果。全程不跳转、不展示帖子详情。连接依然遵循站点登录与验证条件；结果未确认时不会自动重发。

计数使用 IntersectionObserver 在进入视口时排队加载，新插入的帖子也会被观察。加载时显示“加载中”，文字采用 One Node SweepShine 相同的 4 秒线性文字扫光；减少动态效果时保留静态文字。
