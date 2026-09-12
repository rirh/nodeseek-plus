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

export function startFeatures(features: Feature[], settings: Settings, notify: (text: string) => void): () => void {
  const callbacks = new Set<() => void>();
  const cleanups: (() => void)[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = (callback: () => void) => { try { callback(); } catch { notify("部分页面增强未能应用，可关闭对应模块后刷新重试"); } };
  const observer = new MutationObserver(records => {
    if (!records.some(record => record.addedNodes.length || record.removedNodes.length)) return;
    if (timer) return;
    timer = setTimeout(() => { timer = undefined; callbacks.forEach(run); }, 100);
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
    clearTimeout(timer);
    cleanups.reverse().forEach(cleanup => { try { cleanup(); } catch { /* Continue cleanup. */ } });
    callbacks.clear();
  };
}
