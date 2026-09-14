import { GM_getValue, GM_setValue, hasStorage } from "../lib/userscript";
import { request } from "../lib/request";
import { normalizeSettings } from "./config";
import type { Context, Feature, Settings } from "./types";

export const SETTINGS_KEY = `nspp:settings:${location.hostname}`;
export function loadSettings(features: Feature[]): Settings {
  return normalizeSettings(features, GM_getValue(SETTINGS_KEY, {}));
}
export function saveSettings(features: Feature[], settings: Settings): void {
  if (!hasStorage()) throw new Error("油猴存储未就绪，请重新安装脚本后刷新");
  GM_setValue(SETTINGS_KEY, normalizeSettings(features, settings));
}

export function clearCaches(): void {
  if (!hasStorage()) throw new Error("油猴存储未就绪，请重新安装脚本后刷新");
  for (const [id, matches] of [
    ["user-level", (key: string) => key === "profiles"],
    ["notification-categories", (key: string) => key.startsWith("counts:")],
    ["footprints", (key: string) => key.startsWith("records:")],
  ] as const) {
    const key = `nspp:state:${location.hostname}:${id}`;
    const state = GM_getValue<Record<string, unknown>>(key, {});
    if (state && typeof state === "object" && !Array.isArray(state)) {
      GM_setValue(key, Object.fromEntries(Object.entries(state).filter(([name]) => !matches(name))));
    }
  }
}

export function startFeatures(features: Feature[], settings: Settings, notify: (text: string) => void): () => void {
  const callbacks = new Set<() => void>();
  const cleanups: (() => void)[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  const run = (callback: () => void) => { try { callback(); } catch { notify("部分页面增强未能应用，可关闭对应模块后刷新重试"); } };
  const flush = () => {
    timer = undefined;
    if (document.hidden) return;
    dirty = false; callbacks.forEach(run);
  };
  const visibility = () => {
    document.documentElement.toggleAttribute('data-nspp-background', document.hidden);
    if (!document.hidden && dirty && !timer) timer = setTimeout(flush, 100);
  };
  document.addEventListener('visibilitychange', visibility); visibility();
  const observer = new MutationObserver(records => {
    if (!records.some(record => {
      if (!record.addedNodes.length && !record.removedNodes.length) return false;
      const target = record.target instanceof Element ? record.target : record.target.parentElement;
      return !target?.closest('#nspp-tools, .nspp-monitor, .nspp-user-hover, .nspp-user-badges, .nspp-message-editor, .nspp-compose');
    })) return;
    dirty = true;
    if (timer || document.hidden) return;
    timer = setTimeout(flush, 100);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  for (const feature of features) {
    if (!settings[feature.id]?.enabled) continue;
    const controller = new AbortController();
    cleanups.push(() => controller.abort());
    const cacheKey = `nspp:state:${location.hostname}:${feature.id}`;
    const readState = () => {
      const cache = GM_getValue<Record<string, unknown>>(cacheKey, {});
      return cache && typeof cache === "object" && !Array.isArray(cache) ? cache : {};
    };
    const ctx: Context = {
      root: document,
      get: <T>(key: string) => (Object.hasOwn(settings[feature.id], key) ? settings[feature.id][key] : readState()[key]) as T,
      set: (key, value) => {
        if (["__proto__", "constructor", "prototype"].includes(key)) return;
        if (Object.hasOwn(feature.defaults, key)) {
          settings[feature.id][key] = value as never;
          saveSettings(features, settings);
        } else {
          const state = readState();
          state[key] = value;
          GM_setValue(cacheKey, state);
        }
      },
      watch: callback => {
        callbacks.add(callback);
        run(callback);
        const stop = () => { callbacks.delete(callback); };
        cleanups.push(stop);
        return stop;
      },
      request: (url, options = {}) => request(url, { ...options, signal: options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal }),
      notify,
      signal: controller.signal,
    };
    try {
      const cleanup = feature.mount(ctx);
      if (cleanup) cleanups.push(cleanup);
    } catch { notify(`${feature.title}启动失败，其他模块可继续使用`); }
  }
  return () => {
    observer.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    document.documentElement.removeAttribute('data-nspp-background');
    clearTimeout(timer);
    cleanups.reverse().forEach(cleanup => { try { cleanup(); } catch { /* Continue cleanup. */ } });
    callbacks.clear();
  };
}
