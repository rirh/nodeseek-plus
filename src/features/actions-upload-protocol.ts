export function uploadRequest(provider: string, configuredBase: string, key: string, file: Blob) {
  const base = new URL(provider === 'NodeImage' ? 'https://api.nodeimage.com' : configuredBase);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('Invalid service URL');
  const root = base.href.replace(/\/$/, '');
  const body = new FormData(); const headers: Record<string, string> = { Accept: 'application/json' };
  let path = '/upload'; let field = 'file';
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
export function uploadResult(provider: string, base: string, raw: unknown): URL {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid upload response');
  type Result = { success?: boolean; data?: string | { links?: { url?: string } }; links?: { direct?: string }; image?: { url?: string }; url?: string };
  const result = raw as Result | { src?: string }[];
  let direct: string | undefined;
  if (provider === 'Telegraph' && Array.isArray(result)) direct = result[0]?.src;
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
