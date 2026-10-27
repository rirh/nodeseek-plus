import { test } from 'node:test';
import assert from 'node:assert/strict';
import { key, fixture, waitFor, mockWindowTimers } from './helpers/bundle-fixture.ts';

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

test('fans page replaces native user cards with the profile card and drops them with the native card', async () => {
  const fan = '<div class="list"><div class="user-card" style="width: 200px"><div class="user-head"><a href="/space/123" title="Alice"><img alt="Alice"></a><div class="menu"><a class="Username" href="/space/123">Alice</a></div></div></div></div>';
  const own = '<div class="user-card"><div class="user-head"><a href="/space/7"><img alt="tester"></a></div><div class="user-stat"><div class="stat-block"><div><a href="/notification">通知</a></div></div></div></div>';
  const f = await fixture({ 'user-level': { enabled: true } }, fan + own, '/fans?type=fans', undefined, window => {
    window.fetch = (async (url: unknown) => {
      const path = new URL(String(url)).pathname;
      if (path === '/api/account/getInfo/123') return new window.Response(JSON.stringify({ success: true, detail: { member_name: 'Alice', rank: 4, created_at: '2024-01-01', nPost: 10, nComment: 20, coin: 2500, stardust: 10, fans: 5, roles: [{ name: 'fraud', display_text: '骗子' }, { name: 'banned' }] } }));
      return new window.Response(JSON.stringify({ success: true, memberList: [] }));
    }) as typeof window.fetch;
  });
  try {
    const doc = f.window.document;
    await waitFor(() => !!doc.querySelector('.list > .nspp-user-hover-inline .nspp-user-hover-score'));
    const native = doc.querySelector<HTMLElement>('.list > .user-card')!;
    const card = doc.querySelector<HTMLElement>('.list > .nspp-user-hover-inline')!;
    assert.ok(card, 'inline card rendered next to the native card');
    assert.equal(native.dataset.nsppReplaced, '');
    assert.equal(card.hidden, false);
    assert.equal(card.querySelector('.nspp-user-hover-name')!.textContent, 'Alice');
    assert.equal(card.querySelectorAll('dl > div').length, 6);
    assert.ok(card.querySelector('.nspp-user-hover-score'));
    assert.deepEqual([...card.querySelectorAll('.nspp-user-profile-tags .role-tag')].map(tag => tag.textContent), ['骗子', '封禁']);
    assert.ok(card.querySelector('.nspp-user-hover-actions [data-action="follow"]'));
    assert.equal(doc.querySelectorAll('.nspp-user-hover-inline').length, 1, 'own sidebar card is left alone');
    f.window.document.querySelector<HTMLElement>('.list a[href="/space/123"]')!.dispatchEvent(new f.window.MouseEvent('mouseleave'));
    assert.equal(card.hidden, false);
    native.remove();
    await waitFor(() => !doc.querySelector('.nspp-user-hover-inline'));
  } finally { await f.close(); }
});

test('a page of authors reads the profile cache once and saves it once, keeping only used fields', async () => {
  const stateKey = 'nspp:state:www.nodeseek.com:user-level';
  const ids = Array.from({ length: 12 }, (_, i) => String(100 + i));
  const html = ids.map(id => `<div class="author-info"><a href="/space/${id}">u${id}</a></div>`).join('');
  let reads = 0, writes = 0;
  const f = await fixture({ 'official-blocklist': { enabled: false } }, html, '/', undefined, window => {
    const get = window.GM_getValue as (key: string, fallback: unknown) => unknown;
    const set = window.GM_setValue as (key: string, value: unknown) => void;
    Object.assign(window, {
      GM_getValue: (name: string, fallback: unknown) => { if (name === stateKey) reads++; return get(name, fallback); },
      GM_setValue: (name: string, value: unknown) => { if (name === stateKey) writes++; set(name, value); },
    });
    window.fetch = (async () => new window.Response(JSON.stringify({ success: true, detail: { rank: 2, coin: 400, created_at: '2024-01-01', email: 'hidden@example.com', avatar_frames: Array(50).fill('x') } }))) as typeof window.fetch;
  });
  try {
    await waitFor(() => f.window.document.querySelectorAll('.author-info .nspp-level').length === ids.length);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(writes, 1, 'profiles are saved in one batch');
    assert.ok(reads <= 4, `cache is not re-read per author (${reads} reads)`);
    const saved = (f.storage.get(stateKey) as { profiles: Record<string, { user: Record<string, unknown> }> }).profiles;
    assert.equal(Object.keys(saved).length, ids.length);
    assert.deepEqual(saved['100'].user, { rank: 2, coin: 400, created_at: '2024-01-01' });
  } finally { await f.close(); }
});

test('list badges can be turned off so the post list sends no profile requests', async () => {
  const html = '<ul class="post-list"><li class="post-list-item"><div class="post-info"><span class="info-author"><a href="/space/123">Alice</a></span></div></li></ul><div class="author-info"><a href="/space/456">Bob</a></div>';
  const fetched: string[] = [];
  const f = await fixture({ 'official-blocklist': { enabled: false }, 'user-level': { enabled: true, listBadges: false } }, html, '/', undefined, window => {
    window.fetch = (async (url: unknown) => { fetched.push(String(url)); return new window.Response(JSON.stringify({ success: true, detail: { rank: 2 } })); }) as typeof window.fetch;
  });
  try {
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.deepEqual(fetched.map(url => new URL(url).pathname), ['/api/account/getInfo/456'], 'only the post author outside the list is loaded');
    const listBadge = f.window.document.querySelector('.post-list-item .nspp-user-badges') as HTMLElement;
    assert.equal(listBadge.hidden, true);
  } finally { await f.close(); }
});
