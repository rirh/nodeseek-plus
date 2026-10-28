export const imageProviders = ['NodeImage', 'Custom', 'Telegraph', 'Telegraph2', 'LskyPro', 'Chevereto', 'EasyImages'] as const;
/** User-defined endpoint: form field name, `Name: Value` header lines (`{key}` → page-only key) and the JSON path of the image URL. */
export type CustomUpload = { field?: string; headers?: string; result?: string };

export function uploadRequest(provider: string, configuredBase: string, key: string, file: Blob, custom: CustomUpload = {}) {
  const base = new URL(provider === 'NodeImage' ? 'https://api.nodeimage.com' : configuredBase.trim());
  if (base.protocol !== 'https:' || base.username || base.password || base.hash || (provider !== 'Custom' && base.search)) throw new Error('Invalid service URL');
  const root = base.href.replace(/\/$/, '');
  const body = new FormData(); const headers: Record<string, string> = { Accept: 'application/json' };
  let path = '/upload'; let field = 'file';
  if (provider === 'Custom') {
    field = custom.field?.trim() || 'file';
    for (const line of (custom.headers || '').split('\n')) {
      if (!line.trim()) continue;
      const split = line.indexOf(':'); const name = line.slice(0, split).trim();
      if (split < 1 || !/^[A-Za-z0-9-]+$/.test(name)) throw new Error('Invalid header line');
      const template = line.slice(split + 1).trim();
      if (template.includes('{key}') && !key) throw new Error('API Key required');
      headers[name] = template.replaceAll('{key}', key);
    }
    body.append(field, file);
    return { url: base.href, base: base.origin, body, headers };
  }
  if (provider === 'NodeImage') { path = '/api/upload'; field = 'image'; headers['X-API-Key'] = key; }
  else if (provider === 'LskyPro') { path = '/api/v1/upload'; headers.Authorization = `Bearer ${key}`; }
  else if (provider === 'Chevereto') { path = '/api/1/upload'; field = 'source'; headers['X-API-Key'] = key; }
  else if (provider === 'EasyImages') {
    path = key ? '/api/index.php' : '/app/upload.php'; field = key ? 'image' : 'file';
    body.append(key ? 'token' : 'sign', key || String(Math.floor(Date.now() / 1000)));
  } else if (!['Telegraph', 'Telegraph2'].includes(provider)) throw new Error('Unknown provider');
  if (['NodeImage', 'LskyPro', 'Chevereto'].includes(provider) && !key) throw new Error('API Key required');
  body.append(field, file);
  return { url: root + path, base: root, body, headers };
}

/** Reads `data.url`, `data[0].src` or `[0].src` style paths. */
function pick(value: unknown, path: string): unknown {
  return path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
    .reduce<unknown>((node, part) => node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined, value);
}

export function uploadResult(provider: string, base: string, raw: unknown, resultPath = ''): URL {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid upload response');
  type Result = { success?: boolean; data?: string | { links?: { url?: string } }; links?: { direct?: string }; image?: { url?: string }; url?: string };
  const result = raw as Result | { src?: string }[];
  let direct: unknown;
  if (provider === 'Telegraph' && Array.isArray(result)) direct = result[0]?.src;
  else if (provider === 'Custom') { if (!Array.isArray(result) && result.success === false) throw new Error('Upload failed'); direct = pick(raw, resultPath.trim() || 'url'); }
  else if (!Array.isArray(result)) {
    if (result.success === false) throw new Error('Upload failed');
    if (provider === 'NodeImage') direct = result.links?.direct;
    else if (provider === 'Telegraph2' && typeof result.data === 'string') direct = result.data;
    else if (provider === 'LskyPro' && typeof result.data === 'object') direct = result.data?.links?.url;
    else if (provider === 'Chevereto') direct = result.image?.url;
    else if (provider === 'EasyImages') direct = result.url;
  }
  if (typeof direct !== 'string' || !direct) throw new Error('Missing image URL');
  const url = new URL(direct, base + '/');
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid image URL');
  return url;
}

const errorText: Record<string, string> = {
  'Invalid URL': '请先在设置中填写 HTTPS 图床地址', 'Invalid service URL': '图床地址须为 HTTPS 且不含账号信息',
  'API Key required': '请先填写图床 API Key / Token', 'Invalid header line': '自定义请求头格式应为每行「名称: 值」',
  'Upload failed': '图床返回上传失败', 'Invalid upload response': '图床返回格式无效',
  'Missing image URL': '未在返回结果中找到图片地址，请检查协议或返回路径', 'Invalid image URL': '图床返回的图片地址无效',
};
export function uploadErrorText(error: unknown): string {
  if (!(error instanceof Error)) return '图片上传失败，请重试';
  return errorText[error.message] || (/[一-鿿]/.test(error.message) ? error.message : '上传失败：请检查图床地址、API Key、协议或网络');
}
/** Only ask for a key when the chosen protocol can use one. */
export function uploadNeedsKey(provider: string, customHeaders = ''): boolean {
  return provider === 'Custom' ? customHeaders.includes('{key}') : !!provider && !['NodeImage', 'Telegraph', 'Telegraph2'].includes(provider);
}
