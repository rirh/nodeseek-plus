export const reactions = [
  { title: '点赞', icon: 'good-one' },
  { title: '加鸡腿', icon: 'chicken-leg' },
  { title: '反对', icon: 'bad-one' },
  { title: '收藏', icon: 'star-6negdgdk' },
] as const;
export type PostAction = typeof reactions[number]['title'] | '引用' | '回复';
export function postURL(href: string, base: string) {
  try {
    const url = new URL(href, base);
    const match = url.pathname.match(/^\/post-(\d+)(?:-\d+)?(?:\.html)?\/?$/);
    if (url.origin !== new URL(base).origin || !match) return null;
    return new URL(`/post-${match[1]}-1`, base);
  } catch { return null; }
}
export function reactionCounts(root: ParentNode) {
  const menu = root.querySelector('.nsk-post .comment-menu, .comment-menu');
  return reactions.map(({ title }) => {
    const text = menu?.querySelector(`[title="${title}"] span`)?.textContent?.trim();
    return text && /^\d+$/.test(text) ? Number(text) : null;
  });
}
export function siteIcon(name: string) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'iconpark-icon'); svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(svg.namespaceURI, 'use'); use.setAttribute('href', `#${name}`);
  svg.append(use); return svg;
}
