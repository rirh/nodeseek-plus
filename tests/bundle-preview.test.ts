import { test } from 'node:test';
import assert from 'node:assert/strict';
import { key, fixture } from './helpers/bundle-fixture.ts';

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

test('mobile title tap opens the preview sheet instead of following the link', async () => {
  const f = await fixture({}, '<ul class="post-list"><li class="post-list-item"><div class="post-title"><a href="/post-42-1">Mobile post</a></div></li></ul>', '/', undefined, window => {
    window.matchMedia = ((query: string) => ({ matches: query.includes('hover: none') })) as typeof window.matchMedia;
  });
  try {
    const link = f.window.document.querySelector('.post-title a')!;
    const event = new f.window.MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);
    const view = f.window.document.querySelector<HTMLDialogElement>('.nspp-post-preview')!;
    assert.equal(event.defaultPrevented, true);
    assert.equal(view.open, true);
    assert.equal(view.hidden, false);
    const modified = new f.window.MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    link.dispatchEvent(modified);
    assert.equal(modified.defaultPrevented, false, 'modified taps keep native navigation');
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
      assert.equal(preview.open, true);
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
