import { GM, GM_notification as importedNotification, GM_getValue as importedGet, GM_setValue as importedSet, GM_registerMenuCommand as importedMenu, GM_xmlhttpRequest as importedRequest, unsafeWindow as importedWindow, monkeyWindow } from '$';

type AsyncStorage = { getValue(key: string): Promise<unknown>; setValue(key: string, value: unknown): Promise<void>; listValues(): Promise<string[]> };
type RequestDetails = Parameters<typeof importedRequest>[0];

// The dev bridge can be absent or not populated when a Vite module first runs.
const memory = new Map<string, unknown>();
const getter = () => typeof importedGet === 'function' ? importedGet : monkeyWindow.GM_getValue;
const setter = () => typeof importedSet === 'function' ? importedSet : monkeyWindow.GM_setValue;
const syncStorage = () => typeof getter() === 'function' && typeof setter() === 'function';
const gm = (): Partial<typeof GM> | undefined => GM || (monkeyWindow as unknown as { GM?: typeof GM }).GM;
const asyncStorage = (): AsyncStorage | undefined => {
  const api = gm();
  return typeof api?.getValue === 'function' && typeof api.setValue === 'function' && typeof api.listValues === 'function' ? api as AsyncStorage : undefined;
};
let backend: 'sync' | 'async' | 'memory' = 'memory';

/**
 * iOS managers such as Userscripts only expose the promise-based GM.* API.
 * Load everything into memory once before features start so the rest of the script keeps synchronous reads.
 */
export async function prepareStorage(): Promise<void> {
  if (syncStorage()) { backend = 'sync'; return; }
  const api = asyncStorage();
  if (api) {
    try {
      const keys = await api.listValues();
      const values = await Promise.all(keys.map(key => api.getValue(key)));
      keys.forEach((key, index) => { if (values[index] !== undefined) memory.set(key, values[index]); });
      backend = 'async';
    } catch { /* Settings report storage as unavailable. */ }
  }
}
export function needsStoragePreparation(): boolean { return !syncStorage(); }

export const unsafeWindow = importedWindow || monkeyWindow.unsafeWindow || window;
export function hasStorage(): boolean { return syncStorage() || backend === 'async'; }
export function GM_getValue<T>(key: string, fallback: T): T {
  const get = getter();
  if (typeof get === 'function') return get(key, fallback);
  return memory.has(key) ? structuredClone(memory.get(key)) as T : fallback;
}
export function GM_setValue(key: string, value: unknown): void {
  const set = setter();
  if (typeof set === 'function') { set(key, value); return; }
  const copy = structuredClone(value);
  memory.set(key, copy);
  if (backend === 'async') void asyncStorage()?.setValue(key, copy).catch(() => { /* Kept in memory for this page. */ });
}
export function GM_registerMenuCommand(label: string, callback: () => void): void {
  const register = typeof importedMenu === 'function' ? importedMenu : monkeyWindow.GM_registerMenuCommand;
  if (typeof register === 'function') register(label, callback);
}

/** Cross-origin request through GM_xmlhttpRequest, or GM.xmlHttpRequest on managers that only ship the async API. */
export function hasRequest(): boolean { return typeof importedRequest === 'function' || typeof gm()?.xmlHttpRequest === 'function'; }
export function gmRequest(details: RequestDetails): { abort(): void } {
  if (typeof importedRequest === 'function') return importedRequest(details);
  const request = gm()?.xmlHttpRequest;
  if (typeof request !== 'function') throw new Error('GM.xmlHttpRequest unavailable');
  const handle = request(details as Parameters<typeof request>[0]) as unknown as { abort?(): void; catch?(handler: () => void): unknown };
  handle?.catch?.(() => { /* Failures are reported through onerror. */ });
  return { abort: () => handle?.abort?.() };
}

export function hasSystemNotifications(): boolean {
  return typeof importedNotification === 'function' || typeof monkeyWindow.GM_notification === 'function';
}

export function systemNotify(text: string, url: string, tag: string, title = '新消息'): boolean {
  const notify = typeof importedNotification === 'function' ? importedNotification : monkeyWindow.GM_notification;
  if (typeof notify !== 'function') return false;
  try {
    notify({ title: `NodeSeek++ · ${title}`, text, url, tag, timeout: 10000 });
    return true;
  } catch { return false; }
}

/** The forum's per-account comments-per-page setting; the site spells the field `commmentPerPage`. */
export function commentsPerPage(): number | undefined {
  const config = (unsafeWindow as Window & { __config__?: { commmentPerPage?: unknown; commentPerPage?: unknown } }).__config__;
  const value = Number(config?.commmentPerPage ?? config?.commentPerPage);
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}
