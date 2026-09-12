export type FeedPost = { id: string; title: string; url: string; category: string };
export function parseMonitorRSS(xml: string): FeedPost[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror') || !doc.querySelector('rss > channel')) throw new Error('RSS 内容无效');
  const posts = new Map<string, FeedPost>();
  for (const item of doc.querySelectorAll('channel > item')) {
    const text = (name: string) => item.getElementsByTagName(name)[0]?.textContent?.trim() || '';
    const title = text('title');
    let url: URL;
    try { url = new URL(text('link')); } catch { continue; }
    const id = url.pathname.match(/^\/post-(\d+)(?:-\d+)?$/)?.[1];
    if (!id || !title || url.origin !== 'https://www.nodeseek.com') continue;
    posts.set(id, { id, title, url: url.href, category: text('category') });
  }
  return [...posts.values()];
}
