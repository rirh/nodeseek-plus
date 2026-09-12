import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

const bundle = readFileSync(new URL('../dist/nodeseek-plus-plus.user.js', import.meta.url), 'utf8');
const key = 'nspp:settings:www.nodeseek.com';
async function fixture(settings: Record<string, unknown> = {}, html = '', path = '/', shared?: Map<string, unknown>, setup?: (window: Window) => void) {
  // Evaluate only our locally built bundle and fixed test fixtures, never downloaded code.
  const window = new Window({ url: `https://www.nodeseek.com${path}`, settings: { enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
  const storage = shared || new Map<string, unknown>([[key, { monitor: { enabled: false }, ...settings }]]);
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

test('attendance failure does not cache success; retry succeeds once per account per day', async () => {
  const f = await fixture({ attendance: { enabled: true, automatic: false, mode: 'fixed' } });
  try {
    let calls = 0;
    f.window.fetch = (async () => {
      calls++;
      return new f.window.Response(JSON.stringify(calls === 1 ? { success: false, message: 'retry' } : { success: true, message: 'ok' }), { headers: { 'Content-Type': 'application/json' } });
    }) as typeof f.window.fetch;
    const button = [...f.window.document.querySelectorAll('button')].find(el => el.getAttribute('aria-label') === '签到')!;
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
    assert.deepEqual(Array.from(f.window.document.querySelectorAll('[data-nspp-role]'), tag => tag.getAttribute('data-nspp-role')), ['admin', 'founder', 'owner', 'owner', 'admin']);
    assert.equal(f.window.document.querySelectorAll('.nspp-user-badges button').length, 2);
    for (const button of f.window.document.querySelectorAll('.nspp-user-badges button')) (button as HTMLElement).click();
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(calls, 2);
    assert.equal(f.window.document.querySelectorAll('.nspp-level').length, 2);
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
    assert.deepEqual(nav.map(link => link.textContent), ['浏览', '界面', '用户', '工具']);
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
    [...f.window.document.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === '阅读历史')!.click();
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
    window.fetch = (async () => new window.Response(JSON.stringify({ success: true, detail: { created_at: new Date(Date.parse('2026-09-12T00:00:00+08:00') - 1388 * 86400000).toISOString(), nPost: 100, nComment: 500 } }), { headers: { 'Content-Type': 'application/json' } })) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    const score = f.window.document.querySelector('.nspp-trust')!;
    assert.equal(score.textContent, '100');
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

test('three-line rows label metadata, read real counts on demand and open native actions', async () => {
  const html = '<ul class="post-list"><li class="post-list-item"><div class="post-list-content"><div class="post-title"><a href="/post-42-1">Post</a></div><div class="post-info"><span class="info-author"><a href="/space/8">Alice</a></span><span class="info-views">12</span><span class="info-comments-count">3</span><span class="info-last-commenter">Bob</span><a class="info-last-comment-time" href="/post-42-1#3">now</a></div></div></li></ul>';
  const f = await fixture({ 'user-level': { enabled: false }, 'official-blocklist': { enabled: false } }, html);
  try {
    let reads = 0;
    f.window.fetch = (async () => { reads++; return new f.window.Response('<div class="nsk-post"><div class="comment-menu">' + ['点赞', '加鸡腿', '反对', '收藏'].map((title, i) => `<div class="menu-item" title="${title}"><span>${i + 1}</span></div>`).join('') + '</div></div>'); }) as typeof f.window.fetch;
    const doc = f.window.document;
    const row = doc.querySelector('.nspp-three-line')!;
    assert.equal(doc.querySelectorAll('.nspp-list-actions button').length, 5);
    assert.deepEqual(Array.from(doc.querySelectorAll('.nspp-meta-label'), el => el.textContent), ['作者', '浏览', '回复', '最后回复']);
    assert.equal(reads, 0);
    assert.match(doc.querySelector('.nspp-list-actions')!.textContent!, /点赞/);
    row.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    row.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    await new Promise(resolve => setTimeout(resolve, 20));
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
  const storage = new Map<string, unknown>([[key, { monitor: { enabled: false }, attendance: { enabled: true, automatic: true } }], ['nspp:state:www.nodeseek.com:attendance', { 'day:7': day }]]);
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

test('preview footer shares list actions and block control moves out of author metadata', async () => {
  const f = await fixture({ 'user-level': { enabled: false }, 'official-blocklist': { enabled: false } }, '<ul class="post-list"><li class="post-list-item"><div class="post-list-content"><div class="post-title"><a href="/post-42-1">A long title for the preview</a></div><div class="post-info"><span class="info-author"><a href="/space/8">Alice</a><button class="nspp-block-toggle">屏蔽</button></span></div></div></li></ul>', '/', undefined, window => {
    window.matchMedia = (() => ({ matches: true })) as typeof window.matchMedia;
    window.fetch = (async () => new window.Response('<div class="post-content">Preview body</div>')) as typeof window.fetch;
  });
  try {
    const doc = f.window.document;
    assert.equal(doc.querySelector('.info-author .nspp-block-toggle'), null);
    const block = doc.querySelector<HTMLButtonElement>('.post-list-item .nspp-list-actions .nspp-block-toggle')!;
    assert.ok(block);
    let clicks = 0; block.addEventListener('click', () => clicks++);
    doc.querySelector('.post-title a')!.dispatchEvent(new f.window.MouseEvent('mouseenter'));
    await new Promise(resolve => setTimeout(resolve, 450));
    const preview = doc.querySelector<HTMLElement>('.nspp-post-preview')!;
    assert.equal(preview.querySelectorAll('footer button').length, 6);
    preview.querySelector<HTMLButtonElement>('footer .nspp-block-toggle')!.click();
    assert.equal(clicks, 1);
    assert.equal(preview.hidden, true);
  } finally { await f.close(); }
});

test('mobile title tap opens a dialog and retains the original post link', async () => {
  const f = await fixture({}, '<ul class="post-list"><li class="post-list-item"><div class="post-title"><a href="/post-42-1">Mobile post</a></div></li></ul>', '/', undefined, window => {
    window.matchMedia = ((query: string) => ({ matches: query.includes('hover: none') })) as typeof window.matchMedia;
    window.fetch = (async () => new window.Response('<div class="post-content">Mobile body</div>')) as typeof window.fetch;
  });
  try {
    const link = f.window.document.querySelector('.post-title a')!;
    const event = new f.window.MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    const view = f.window.document.querySelector<HTMLDialogElement>('.nspp-post-preview')!;
    assert.equal(event.defaultPrevented, true);
    assert.equal(view.open, true);
    assert.equal(view.hidden, false);
    assert.equal(view.querySelector<HTMLAnchorElement>('footer a')!.href, 'https://www.nodeseek.com/post-42-1');
    assert.equal(view.querySelector('header button'), null);
    view.dispatchEvent(new f.window.MouseEvent('click', { clientX: -1, clientY: -1, bubbles: true }));
    assert.equal(view.open, false);
    assert.equal(view.hidden, true);
  } finally { await f.close(); }
});


test('visible rows load counts automatically and queue beyond the concurrency limit', async () => {
  const html = '<ul class="post-list">' + [42, 43, 44].map(id => `<li class="post-list-item"><div class="post-list-content"><div class="post-title"><a href="/post-${id}-1">Post ${id}</a></div></div></li>`).join('') + '</ul>';
  let active = 0, peak = 0, reads = 0;
  const f = await fixture({ 'user-level': { enabled: false }, 'official-blocklist': { enabled: false } }, html, '/', undefined, window => {
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
    await new Promise(resolve => setTimeout(resolve, 120));
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

test('attendance reads native board status without submitting and uses icon controls', async () => {
  const f = await fixture({}, '<a href="/board">签到</a>', '/', undefined, window => {
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
    assert.ok(f.window.document.querySelector('#nspp-settings')!.shadowRoot!.querySelector('.launcher svg'));
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
  let poll: (() => void) | undefined;
  let fresh = false;
  let invalid = false;
  const f = await fixture({ monitor: { enabled: true, interval: 60, trades: false, keywords: '抽奖' } }, '', '/', undefined, window => {
    Object.defineProperty(window.document, 'hidden', { get: () => true });
    const NativeDate = window.Date;
    window.Date = class extends NativeDate { static now() { return clock; } } as typeof window.Date;
    const originalInterval = window.setInterval.bind(window);
    window.setInterval = ((callback: () => void, delay?: number) => {
      if (delay === 60000) poll = callback;
      return originalInterval(callback, delay);
    }) as typeof window.setInterval;
    window.fetch = (async () => new window.Response(invalid ? '<title>Just a moment...</title>' : `<div class="post-title"><a href="/post-1-1">抽奖 基线帖子</a></div>${fresh ? '<div class="post-title"><a href="/post-2-1">抽奖 新的帖子</a></div>' : ''}`)) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    const launch = f.window.document.querySelector<HTMLButtonElement>('[data-monitor-state]')!;
    assert.equal(launch.dataset.unread, undefined);
    assert.equal(launch.dataset.monitorState, 'running');
    clock += 61000; poll!();
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(launch.dataset.unread, undefined);
    assert.ok(f.storage.has('nspp:state:www.nodeseek.com:monitor'));
    fresh = true; clock += 301000; poll!();
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(launch.dataset.unread, 'true');
    assert.match(launch.title, /1 条未读/);
    launch.click();
    assert.equal(launch.dataset.unread, 'true', 'opening does not discard unread posts');
    assert.equal(f.window.document.querySelectorAll('.nspp-monitor-unread li').length, 1);
    f.window.document.querySelector<HTMLButtonElement>('.nspp-monitor-unread button')!.click();
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
    assert.equal(monitorState['snapshot:7'].at, clock, 'update checks immediately in a background tab');
    assert.equal((f.storage.get(key) as { monitor: { interval: number } }).monitor.interval, 600);
    const before = f.window.document.querySelector('.nspp-monitor-results')!.textContent;
    invalid = true; clock += 601000; poll!();
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(f.window.document.querySelector('.nspp-monitor-results')!.textContent, before);
    assert.match(f.window.document.querySelector('.nspp-monitor > p')!.textContent!, /检查未完成/);
    assert.equal(launch.dataset.monitorState, 'cooldown');
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

test('post status styling keeps titles intact and marks readonly and pin icons', async () => {
  const f = await fixture({}, '<div class="post-title"><a href="/post-1-1">只读是标题的一部分</a><span>只读</span><span><svg><use href="#pin"></use></svg></span></div>');
  try {
    assert.equal(f.window.document.querySelectorAll('.nspp-readonly').length, 1);
    assert.equal(f.window.document.querySelectorAll('.nspp-pinned').length, 1);
    assert.equal(f.window.document.querySelector('.post-title a')!.textContent, '只读是标题的一部分');
  } finally { await f.close(); }
});

test('monitor matches main body and highlights dynamic list rows without matching comments', async () => {
  const requestTimes: number[] = [];
  const f = await fixture({ monitor: { enabled: true, trades: false, lotteries: false, keywords: 'VPS\n/香港.*年付/i' }, 'user-level': { enabled: false }, 'official-blocklist': { enabled: false }, 'list-interactions': { enabled: false } }, '<li class="post-list-item"><div class="post-title"><a href="/post-72-1">出售机器</a></div></li>', '/', undefined, window => {
    window.fetch = (async url => { requestTimes.push(Date.now()); return new window.Response(String(url).includes('/post-72-1') ? '<div class="post-content">香港机器年付</div>' : String(url).includes('/post-73-1') ? '<div class="post-content">普通正文</div><div class="comment-content">VPS</div>' : '<div class="post-title"><a href="/post-72-1">出售机器</a></div>'); }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 5200));
    assert.equal(f.window.document.querySelector('.post-list-item')!.getAttribute('data-nspp-monitor-match'), '1');
    f.window.document.body.insertAdjacentHTML('beforeend', '<li class="post-list-item"><div class="post-title"><a href="/post-73-1">普通帖子</a></div></li>');
    await new Promise(resolve => setTimeout(resolve, 5200));
    assert.equal(f.window.document.querySelectorAll('.post-list-item')[1].hasAttribute('data-nspp-monitor-match'), false);
    assert.ok(requestTimes.length >= 3);
    for (let i = 1; i < requestTimes.length; i++) assert.ok(requestTimes[i] - requestTimes[i - 1] >= 4900, 'monitor requests must be spaced at least five seconds apart');
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
    assert.match(doc.querySelector('.nspp-compose [role="status"]')!.textContent!, /已连接/);
    const input = doc.querySelector<HTMLInputElement>('.nspp-compose input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [new f.window.File(['image'], 'test.png', { type: 'image/png' })] });
    input.dispatchEvent(new f.window.Event('change'));
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(uploadUrl, 'https://api.nodeimage.com/api/upload');
    assert.match(doc.querySelector<HTMLTextAreaElement>('.md-editor textarea')!.value, /https:\/\/example.com\/test.png/);
  } finally { await f.close(); }
});
