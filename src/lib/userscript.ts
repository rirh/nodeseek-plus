import { GM_notification as importedNotification, GM_getValue as importedGet, GM_setValue as importedSet, GM_registerMenuCommand as importedMenu, unsafeWindow as importedWindow, monkeyWindow } from '$';

// The dev bridge can be absent or not populated when a Vite module first runs.
const memory = new Map<string, unknown>();
const getter = () => typeof importedGet === 'function' ? importedGet : monkeyWindow.GM_getValue;
const setter = () => typeof importedSet === 'function' ? importedSet : monkeyWindow.GM_setValue;
export const unsafeWindow = importedWindow || monkeyWindow.unsafeWindow || window;
export function hasStorage(): boolean { return typeof getter() === 'function' && typeof setter() === 'function'; }
export function GM_getValue<T>(key: string, fallback: T): T {
  const get = getter();
  return typeof get === 'function' ? get(key, fallback) : memory.has(key) ? structuredClone(memory.get(key)) as T : fallback;
}
export function GM_setValue(key: string, value: unknown): void {
  const set = setter();
  if (typeof set === 'function') set(key, value);
  else memory.set(key, structuredClone(value));
}
export function GM_registerMenuCommand(label: string, callback: () => void): void {
  const register = typeof importedMenu === 'function' ? importedMenu : monkeyWindow.GM_registerMenuCommand;
  if (typeof register === 'function') register(label, callback);
}

export function systemNotify(text: string, url: string, tag: string, title = '新消息'): boolean {
  const notify = typeof importedNotification === 'function' ? importedNotification : monkeyWindow.GM_notification;
  if (typeof notify !== 'function') return false;
  try {
    notify({ title: `NodeSeek++ · ${title}`, text, url, tag, timeout: 10000 });
    return true;
  } catch { return false; }
}
