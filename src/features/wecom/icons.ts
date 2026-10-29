// 摸鱼模式's line icons: rounded 24px glyphs in one stroke weight. The rail ones copy the WeChat desktop sidebar so the
// layout passes for WeChat at a glance. Each icon is an outline that fills in solid when its rail item is active, plus
// optional detail strokes inside it that are cut out of the fill.

const ICONS = {
  // WeChat 聊天: a round speech bubble with its tail at the lower left.
  messages: ['M12 3.8c4.8 0 8.7 3.25 8.7 7.25s-3.9 7.25-8.7 7.25c-.95 0-1.86-.13-2.72-.36L5 19.9l.97-3.45C4.3 15.12 3.3 13.17 3.3 11.05 3.3 7.05 7.2 3.8 12 3.8Z'],
  // WeChat 通讯录: a person with three list lines beside the head.
  posts: ['M9 4.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8ZM3.4 19.6c.3-3.4 2.6-5.7 5.6-5.7s5.3 2.3 5.6 5.7M16.3 7.6h4.3M16.3 11h3.2M17.6 14.4h1.9'],
  // WeChat 收藏: an isometric box.
  sections: ['M12 3.2 19.8 7.6v8.8L12 20.8l-7.8-4.4V7.6L12 3.2Z', 'M5 8l7 4 7-4M12 12v8'],
  // WeChat 发现: a compass with a diagonal needle.
  hot: ['M12 3.3a8.7 8.7 0 1 1 0 17.4 8.7 8.7 0 0 1 0-17.4Z', 'M15.6 8.4l-1.9 5.3-5.3 1.9 1.9-5.3 5.3-1.9Z'],
  moon: ['M19.8 14.6A7.6 7.6 0 1 1 9.4 4.2a6 6 0 0 0 10.4 10.4Z'],
  sun: ['M12 8.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2Z', 'M12 3.5v1.6M12 18.9v1.6M5.99 5.99l1.13 1.13M16.88 16.88l1.13 1.13M3.5 12h1.6M18.9 12h1.6M5.99 18.01l1.13-1.13M16.88 7.12l1.13-1.13'],
  // WeChat's ≡ at the bottom of the sidebar: three equal lines.
  menu: ['', 'M4.5 6.8h15M4.5 12h15M4.5 17.2h15'],
  compose: ['', 'M11.5 4.5H7a2.5 2.5 0 0 0-2.5 2.5v10A2.5 2.5 0 0 0 7 19.5h10a2.5 2.5 0 0 0 2.5-2.5v-4.5M16 4l4 4-7.5 7.5H8.5v-4L16 4Z'],
  sort: ['', 'M8 5v14m0 0-3-3m3 3 3-3M16 19V5m0 0-3 3m3-3 3 3'],
  refresh: ['', 'M19.5 12a7.5 7.5 0 1 1-2.5-5.6M19.5 4.5V9H15'],
  dots: ['', 'M6 12h.01M12 12h.01M18 12h.01'],
  user: ['M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM4.5 20a7.5 7.5 0 0 1 15 0'],
  // The 摸鱼 fish: body, tail and an eye.
  fish: ['M7 12c2-3.5 5-5.5 8.5-5.5 2.8 0 5 2 6.5 5.5-1.5 3.5-3.7 5.5-6.5 5.5C12 17.5 9 15.5 7 12ZM7 12 2.5 8.5v7L7 12Z', 'M17.5 11h.01'],
  like: ['M7.5 10.5v9h-3v-9h3Zm0 0 3.8-6.2c1.4 0 2.3 1 2 2.4l-.6 3.3h4.9a2 2 0 0 1 2 2.3l-1 6.1a2 2 0 0 1-2 1.6H7.5'],
  heart: ['M12 19.5s-7.5-4.3-7.5-9.7A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6c0 5.4-7.5 9.7-7.5 9.7Z'],
  star: ['M12 4.2l2.3 4.8 5.2.7-3.8 3.6.9 5.2L12 16l-4.6 2.5.9-5.2-3.8-3.6 5.2-.7L12 4.2Z'],
  bookmark: ['M7 4.5h10a1 1 0 0 1 1 1v14l-6-3.8-6 3.8v-14a1 1 0 0 1 1-1Z'],
} as const;
export type IconName = keyof typeof ICONS;

export function icon(name: IconName, size = 24, stroke = 1.7) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', width: String(size), height: String(size), fill: 'none', stroke: 'currentColor', 'stroke-width': String(stroke), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(key, value);
  const [outline, detail] = ICONS[name] as readonly string[];
  for (const [d, line] of [[outline, false], [detail, true]] as const) {
    if (!d) continue;
    const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', d);
    if (line) path.setAttribute('data-detail', '');
    svg.append(path);
  }
  return svg;
}

export const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', textContent = '') => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent) node.textContent = textContent;
  return node;
};
