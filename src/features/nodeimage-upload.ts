import { GM_xmlhttpRequest } from '$';

// Keep privileged requests scoped to the official NodeImage upload endpoint.
export function uploadNodeImage(body: FormData, headers: Record<string, string>, signal: AbortSignal): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('上传已取消')); return; }
    if (typeof GM_xmlhttpRequest !== 'function') { reject(new Error('请重新安装最新版脚本，授予 NodeImage 连接权限')); return; }
    const cleanup = () => signal.removeEventListener('abort', cancel);
    const request = GM_xmlhttpRequest({
      method: 'POST', url: 'https://api.nodeimage.com/api/upload', data: body, headers,
      anonymous: true, responseType: 'json', timeout: 120000,
      onload: response => {
        cleanup();
        if (response.status === 401 || response.status === 403) { reject(new Error('NodeImage 密钥无效或无权限，请到官网 API 页面检查')); return; }
        if (response.status < 200 || response.status >= 300) { reject(new Error(`NodeImage 上传失败（HTTP ${response.status}）`)); return; }
        resolve(response.response);
      },
      onerror: () => { cleanup(); reject(new Error('无法连接 NodeImage，请检查网络和脚本连接权限')); },
      ontimeout: () => { cleanup(); reject(new Error('上传超时，请检查图床是否已收到图片后再重试')); },
      onabort: () => { cleanup(); reject(new Error('上传已取消')); },
    });
    function cancel() { request.abort(); }
    signal.addEventListener('abort', cancel, { once: true });
  });
}

export function getNodeImageKey(signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('已取消')); return; }
    if (typeof GM_xmlhttpRequest !== 'function') { reject(new Error('请更新脚本并允许连接 NodeImage')); return; }
    const cleanup = () => signal.removeEventListener('abort', cancel);
    const request = GM_xmlhttpRequest({
      method: 'GET', url: 'https://api.nodeimage.com/api/user/api-key',
      anonymous: false, headers: { Accept: 'application/json' }, responseType: 'json', timeout: 20000,
      onload: response => {
        cleanup();
        const key = response.response?.api_key;
        if (response.status === 200 && typeof key === 'string' && key.trim()) resolve(key.trim());
        else reject(new Error('请先登录 NodeImage，返回论坛后重试'));
      },
      onerror: () => { cleanup(); reject(new Error('无法读取 NodeImage 登录状态，可手动填写 API Key')); },
      ontimeout: () => { cleanup(); reject(new Error('获取 NodeImage 登录状态超时')); },
      onabort: () => { cleanup(); reject(new Error('已取消')); },
    });
    function cancel() { request.abort(); }
    signal.addEventListener('abort', cancel, { once: true });
  });
}
