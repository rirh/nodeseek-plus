import { GM_xmlhttpRequest } from '$';
export function requestMonitorRSS(signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('已取消')); return; }
    const cleanup = () => signal.removeEventListener('abort', cancel);
    const request = GM_xmlhttpRequest({
      method: 'GET', url: 'https://rss.nodeseek.com/', anonymous: true, timeout: 20000,
      headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
      onload: response => { cleanup(); if (response.status === 200) resolve(response.responseText); else reject(new Error(`RSS HTTP ${response.status}`)); },
      onerror: () => { cleanup(); reject(new Error('RSS 连接失败')); },
      ontimeout: () => { cleanup(); reject(new Error('RSS 请求超时')); },
      onabort: () => { cleanup(); reject(new Error('已取消')); },
    });
    function cancel() { request.abort(); }
    signal.addEventListener('abort', cancel, { once: true });
  });
}
