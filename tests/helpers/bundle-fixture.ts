import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

export const bundle = readFileSync(process.env.NSPP_TEST_BUNDLE || new URL('../../dist/nodeseek-plus-plus.user.js', import.meta.url), 'utf8');
export const key = 'nspp:settings:www.nodeseek.com';
export async function fixture(settings: Record<string, unknown> = {}, html = '', path = '/', shared?: Map<string, unknown>, setup?: (window: Window) => void, testUpdates = false) {
  // Evaluate only our locally built bundle and fixed test fixtures, never downloaded code.
  // Tests must stay offline: link clicks only update the URL, and any other internal happy-dom fetch gets a local 503
  // instead of reaching the real forum (a reset connection there would crash the whole test process).
  const window = new Window({ url: `https://www.nodeseek.com${path}`, settings: {
    enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true,
    navigation: { disableMainFrameNavigation: true, disableChildFrameNavigation: true, disableChildPageNavigation: true },
    fetch: { interceptor: {
      beforeAsyncRequest: async ({ window }) => new window.Response('', { status: 503 }),
      beforeSyncRequest: ({ window }) => ({ status: 503, statusText: 'Offline test', ok: false, url: '', redirected: false, headers: new window.Headers(), body: null }),
    } },
  } });
  const storage = shared || new Map<string, unknown>([[key, { attendance: { enabled: true, automatic: false }, monitor: { enabled: false }, 'notification-categories': { enabled: false }, 'request-settings': { enabled: true, requestInterval: 0 }, ...settings }]]);
  const requests: string[] = [];
  const menus: (() => void)[] = []; const menuLabels: string[] = [];
  Object.assign(window, {
    structuredClone,
    GM_getValue: (key: string, fallback: unknown) => storage.has(key) ? structuredClone(storage.get(key)) : fallback,
    GM_setValue: (key: string, value: unknown) => storage.set(key, structuredClone(value)),
    GM_registerMenuCommand: (label: string, fn: () => void) => { menuLabels.push(label); return menus.push(fn); },
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
      if (options.url.split('?')[0] !== 'https://raw.githubusercontent.com/rirh/nodeseek-plus/main/dist/nodeseek-plus-plus.meta.js') {
        if (!original) throw new Error('No fixture GM response');
        return original(options);
      }
      queueMicrotask(() => options.onload({ status: 200, responseText: '// ==UserScript==\n// @namespace nodeseek-plus-plus\n// @version 0.0.0\n// ==/UserScript==' }));
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
    window, storage, requests, menus, menuLabels,
    close: () => {
      if (!stopped) window.dispatchEvent(new window.PageTransitionEvent('pagehide', { persisted: false }));
      window.happyDOM.abort();
    },
  };
}

export const realSetTimeout = setTimeout;
export async function waitFor(check: () => boolean) {
  const deadline = Date.now() + 300;
  while (!check() && Date.now() < deadline) await new Promise(resolve => realSetTimeout(resolve, 5));
  assert.ok(check(), 'expected DOM state did not become ready within 300ms');
}

export function mockWindowTimers(t: TestContext, window: Window) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.mock.method(window, 'setTimeout', (callback: (...args: unknown[]) => void, delay = 0, ...args: unknown[]) => setTimeout(callback, delay, ...args));
  t.mock.method(window, 'clearTimeout', (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer));
}