export async function resolveLink(href: string, signal: AbortSignal): Promise<string> {
  const url = new URL(href);
  if (!/^https?:$/.test(url.protocol)) throw new Error('不支持的链接');
  const response = await fetch(url, { method: 'HEAD', credentials: 'omit', redirect: 'follow', signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]) });
  if (!response.ok || !response.url) throw new Error('解析失败');
  const target = new URL(response.url);
  if (!/^https?:$/.test(target.protocol)) throw new Error('不支持的目标');
  return target.href;
}
