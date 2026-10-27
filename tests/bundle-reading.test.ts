import { test } from 'node:test';
import assert from 'node:assert/strict';
import { key, fixture } from './helpers/bundle-fixture.ts';

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

test('post status styling keeps titles intact and marks readonly and pin icons', async () => {
  const f = await fixture({}, '<div class="post-title"><a href="/post-1-1">只读是标题的一部分</a><span>只读</span><span><svg><use href="#pin"></use></svg></span></div>');
  try {
    assert.equal(f.window.document.querySelectorAll('.nspp-readonly').length, 1);
    assert.equal(f.window.document.querySelectorAll('.nspp-pinned').length, 1);
    assert.equal(f.window.document.querySelector('.post-title a')!.textContent, '只读是标题的一部分');
  } finally { await f.close(); }
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

test('linked banner images follow their link instead of opening any viewer', async () => {
  let nativeOpens = 0;
  const f = await fixture({}, '<div class="post-content"><a href="https://example.com/site"><img id="banner" src="https://img.example.com/badge.svg"></a><a href="https://example.com/full.png"><img id="photo" src="https://example.com/thumb.png"></a></div>', '/post-42-1');
  try {
    const doc = f.window.document;
    const banner = doc.querySelector<HTMLImageElement>('#banner')!;
    banner.addEventListener('click', () => { nativeOpens++; });
    const click = new f.window.MouseEvent('click', { bubbles: true, cancelable: true });
    banner.dispatchEvent(click);
    assert.equal(click.defaultPrevented, false, 'the link still navigates');
    assert.equal(nativeOpens, 0, 'site viewers do not enlarge linked banners');
    assert.equal(doc.querySelector('.nspp-image-viewer'), null);
    doc.querySelector<HTMLImageElement>('#photo')!.click();
    assert.equal(doc.querySelector<HTMLDialogElement>('.nspp-image-viewer')!.open, true, 'links to image files still preview');
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
    assert.equal(doc.documentElement.hasAttribute('data-nspp-reply-open'), true, 'the sheet slides away before the page is restored');
    await new Promise(resolve => setTimeout(resolve, 320));
    assert.equal(doc.documentElement.hasAttribute('data-nspp-reply-open'), false);
    assert.equal(observing, true);
    assert.equal(f.window.scrollY, 430);
    assert.equal(editor.querySelector('textarea')!.value, '草稿');
    assert.equal(editor.getAttribute('style'), 'color: red;');
    const pause = doc.querySelector<HTMLButtonElement>('[aria-label="暂停自动翻页"]')!;
    pause.click();
    doc.querySelector<HTMLButtonElement>('.menu-item')!.click();
    doc.querySelector<HTMLButtonElement>('[aria-label="收起回复框"]')!.click();
    await new Promise(resolve => setTimeout(resolve, 320));
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
