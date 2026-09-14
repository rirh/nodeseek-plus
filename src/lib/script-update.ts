import { GM_xmlhttpRequest } from '$';
import { GM_getValue, GM_setValue, hasStorage } from './userscript';
import { withTabLock } from './tab-lock';
import { isNewerVersion, readUpdateVersion, UPDATE_META_URL, UPDATE_URL } from './update-version';
import { confirmDialog } from '../views/confirm-dialog';

const CHECK_INTERVAL = 6 * 60 * 60 * 1000;
const REMINDER_INTERVAL = 24 * 60 * 60 * 1000;
const STATE_KEY = 'nspp:script-update';
type UpdateState = { checkedAt?: number; version?: string; promptedVersion?: string; promptedAt?: number };

function requestVersion(signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('已取消')); return; }
    if (typeof GM_xmlhttpRequest !== 'function') { reject(new Error('更新检查不可用，请确认油猴脚本已正常安装')); return; }
    const cleanup = () => signal.removeEventListener('abort', cancel);
    const request = GM_xmlhttpRequest({
      method: 'GET', url: UPDATE_META_URL, anonymous: true, timeout: 20000,
      headers: { 'Cache-Control': 'no-cache' },
      onload: response => {
        cleanup();
        if (response.status !== 200) { reject(new Error(`检查更新失败（HTTP ${response.status}）`)); return; }
        try { resolve(readUpdateVersion(response.responseText)); } catch (error) { reject(error); }
      },
      onerror: () => { cleanup(); reject(new Error('无法连接更新源，请稍后重试')); },
      ontimeout: () => { cleanup(); reject(new Error('检查更新超时，请稍后重试')); },
      onabort: () => { cleanup(); reject(new Error('已取消')); },
    });
    function cancel() { request.abort(); }
    signal.addEventListener('abort', cancel, { once: true });
  });
}

export function createUpdateChecker(notify: (message: string) => void, canPrompt: () => boolean) {
  const controller = new AbortController();
  const { signal } = controller;
  const state = () => GM_getValue<UpdateState>(STATE_KEY, {});
  let pending: Promise<void> | undefined;
  let prompting = false;

  async function prompt(manual: boolean) {
    const latest = state();
    if (signal.aborted || prompting || !latest.version || !isNewerVersion(latest.version, __APP_VERSION__)) return;
    if (!manual && (!canPrompt() || (latest.promptedVersion === latest.version && Date.now() - (latest.promptedAt || 0) < REMINDER_INTERVAL))) return;
    prompting = true;
    GM_setValue(STATE_KEY, { ...latest, promptedVersion: latest.version, promptedAt: Date.now() });
    try {
      await confirmDialog('发现 NodeSeek++ 新版本', `当前版本 v${__APP_VERSION__}，最新版本 v${latest.version}。更新后刷新论坛页面即可使用。`, '前往更新', signal, { href: UPDATE_URL, cancelLabel: '稍后提醒' });
    } finally { prompting = false; }
  }

  async function run(manual: boolean) {
    try {
      let fetched = false;
      const ran = await withTabLock('script-update', 0, async () => {
        if (signal.aborted) return;
        const previous = state();
        const elapsed = Date.now() - (previous.checkedAt || 0);
        if (!manual && elapsed >= 0 && elapsed < CHECK_INTERVAL) return;
        GM_setValue(STATE_KEY, { ...previous, checkedAt: Date.now() });
        const version = await requestVersion(signal);
        if (signal.aborted) return;
        GM_setValue(STATE_KEY, { ...state(), version }); fetched = true;
      });
      if (signal.aborted) return;
      if (manual && (!ran || !fetched)) { notify('其他页面正在检查更新，请稍后重试'); return; }
      const version = state().version;
      if (version && isNewerVersion(version, __APP_VERSION__)) await prompt(manual);
      else if (manual) notify(`当前已是最新版本（v${__APP_VERSION__}）`);
    } catch (error) {
      if (manual && !signal.aborted) notify(error instanceof Error ? error.message : '检查更新失败，请稍后重试');
    }
  }

  const check = (manual = true): Promise<void> => {
    if (signal.aborted) return Promise.resolve();
    if (pending) return manual ? pending.then(() => check(true)) : pending;
    pending = run(manual).finally(() => { pending = undefined; });
    return pending;
  };
  const background = () => {
    if (__APP_ENV__ === 'prod' && hasStorage() && !document.hidden) void check(false);
  };
  const startup = setTimeout(background, 30000);
  const timer = setInterval(background, 60000);
  document.addEventListener('visibilitychange', background, { signal });
  return { check, stop: () => { clearTimeout(startup); clearInterval(timer); controller.abort(); } };
}
