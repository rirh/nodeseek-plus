import { GM_getValue, GM_setValue } from './userscript';
import { createRequestQueue, retryDelay, requestConcurrency, requestInterval } from './request-scheduler';

const requestSettings = () => {
  const settings = GM_getValue<Record<string, Record<string, unknown>>>(`nspp:settings:${location.hostname}`, {})?.['request-settings'];
  return settings?.enabled === false ? undefined : settings;
};
const enqueue = createRequestQueue(
  () => requestConcurrency(requestSettings()?.maxConcurrent),
  () => requestInterval(requestSettings()?.requestInterval),
);

export async function request<T>(url: string, options: RequestInit & { responseType?: "json" | "text" } = {}): Promise<T> {
  const target = new URL(url, location.origin);
  if (!/^https?:$/.test(target.protocol)) throw new Error("不支持的请求地址");
  const profile = target.pathname.startsWith('/api/account/getInfo/');
  const { responseType = "json", ...init } = options;
  const execute = async () => {
    init.signal?.throwIfAborted();
    const timeout = AbortSignal.timeout(20_000);
    const response = await fetch(target, {
      ...init,
      credentials: target.origin === location.origin ? "same-origin" : "omit",
      signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
    });
    if (target.origin === location.origin && [403, 429, 503].includes(response.status)) {
      GM_setValue(`nspp:request-cooldown:${location.host}`, Date.now() + retryDelay(response.headers.get('Retry-After')));
    }
    if (!response.ok) throw new Error(`请求失败（HTTP ${response.status}）`);
    if (responseType === "text") return await response.text() as T;
    if (response.status === 204) return null as T;
    try { return await response.json() as T; }
    catch { throw new Error("服务器未返回有效数据，请检查登录状态或站点验证页面"); }
  };
  if (target.origin !== location.origin) return execute();
  return enqueue(async () => {
    init.signal?.throwIfAborted();
    if (GM_getValue(`nspp:request-cooldown:${location.host}`, 0) > Date.now()) throw new Error('站点请求冷却中，请稍后手动重试');
    return execute();
  }, profile ? 1 : 0);
}
