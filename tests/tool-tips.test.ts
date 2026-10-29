import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Window } from 'happy-dom';
import { fixture, realSetTimeout } from './helpers/bundle-fixture.ts';

const wait = (ms: number) => new Promise(resolve => realSetTimeout(resolve, ms));
const list = '<div id="nsk-body-left"><ul class="post-list"><li class="post-list-item"><a href="/space/1"><img class="avatar-normal" src="/avatar/1.png"></a>'
  + '<div class="post-list-content"><div class="post-title"><a href="/post-1-1">帖子</a></div><div class="post-info"></div></div></li></ul></div>';
// A desktop window where everything observed is on screen, so 摸鱼模式 shows its fish and the intro can start.
function desktop(window: Window, reducedMotion = false) {
  window.matchMedia = ((query: string) => ({ matches: query === '(min-width: 1000px)' || query === '(hover: hover)' || (reducedMotion && query.includes('reduce')), addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  Object.assign(window, { IntersectionObserver: class {
    callback: (entries: { isIntersecting: boolean; target: Element }[]) => void;
    constructor(callback: (entries: { isIntersecting: boolean; target: Element }[]) => void) { this.callback = callback; }
    observe(target: Element) { queueMicrotask(() => this.callback([{ isIntersecting: true, target }])); }
    unobserve() {} disconnect() {}
  } });
}

test('on the home page the 摸鱼 fish swims twice once in view, then shows its label', async () => {
  const f = await fixture({}, list, '/', undefined, window => desktop(window));
  try {
    const doc = f.window.document;
    const fish = doc.querySelector<HTMLElement>('#nspp-tools [data-nspp-wecom-launcher]')!;
    const tip = doc.querySelector<HTMLElement>('.nspp-tool-tip')!;
    assert.ok(fish.querySelector('.nspp-fish .nspp-fish-tail'));
    await wait(20);
    assert.ok(fish.hasAttribute('data-swimming'));
    assert.equal(tip.hidden, true);
    await wait(2300);
    assert.equal(fish.hasAttribute('data-swimming'), false);
    assert.equal(tip.hidden, false);
    assert.equal(tip.textContent, '摸鱼模式：点一下，切换成微信式三栏');
  } finally { f.close(); }
});

test('with reduced motion the fish stays still and its label shows at once; other pages skip the intro', async () => {
  const still = await fixture({}, list, '/', undefined, window => desktop(window, true));
  try {
    await wait(20);
    assert.equal(still.window.document.querySelector('[data-nspp-wecom-launcher]')!.hasAttribute('data-swimming'), false);
    assert.equal(still.window.document.querySelector<HTMLElement>('.nspp-tool-tip')!.hidden, false);
  } finally { still.close(); }
  const other = await fixture({}, list, '/page-2', undefined, window => desktop(window));
  try {
    await wait(20);
    assert.equal(other.window.document.querySelector('[data-nspp-wecom-launcher]')!.hasAttribute('data-swimming'), false);
    assert.equal(other.window.document.querySelector<HTMLElement>('.nspp-tool-tip')!.hidden, true);
  } finally { other.close(); }
});

test('toolbar buttons show their label on mouse hover, and keep their own title afterwards', async () => {
  const f = await fixture();
  try {
    const doc = f.window.document;
    const button = doc.querySelector<HTMLButtonElement>('#nspp-tools [data-nspp-settings-launcher]')!;
    const tip = doc.querySelector<HTMLElement>('.nspp-tool-tip')!;
    const hover = (type: string, pointerType: string) => button.dispatchEvent(new f.window.PointerEvent(type, { bubbles: true, pointerType }));
    assert.equal(tip.hidden, true);
    hover('pointerover', 'mouse');
    await wait(320);
    assert.equal(tip.hidden, false);
    assert.equal(tip.textContent, '打开 NodeSeek++ 设置');
    // The browser's own tooltip would show on top of ours, so the title is set aside while ours shows.
    assert.equal(button.hasAttribute('title'), false);
    hover('pointerout', 'mouse');
    assert.equal(tip.hidden, true);
    assert.equal(button.title, '打开 NodeSeek++ 设置');
    // Touch has no hover, so no label.
    hover('pointerover', 'touch');
    await wait(320);
    assert.equal(tip.hidden, true);
  } finally { f.close(); }
});
