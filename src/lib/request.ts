export async function request<T>(url: string, options: RequestInit & { responseType?: "json" | "text" } = {}): Promise<T> {
  const target = new URL(url, location.origin);
  if (!/^https?:$/.test(target.protocol)) throw new Error("不支持的请求地址");
  const { responseType = "json", ...init } = options;
  const timeout = AbortSignal.timeout(20_000);
  const response = await fetch(target, {
    ...init,
    credentials: target.origin === location.origin ? "same-origin" : "omit",
    signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
  });
  if (!response.ok) throw new Error(`请求失败（HTTP ${response.status}）`);
  if (responseType === "text") return await response.text() as T;
  if (response.status === 204) return null as T;
  try { return await response.json() as T; }
  catch { throw new Error("服务器未返回有效数据，请检查登录状态或站点验证页面"); }
}
