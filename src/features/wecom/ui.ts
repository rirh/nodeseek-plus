// Pieces both layouts share: rail buttons, the ≡ tools menu, the list resizer and conversation rows.
import type { Context } from '../../core/types';
import { el, icon, type IconName } from './icons';
import type { Row } from './source';
import { listTime } from './time';

export const RAIL_WIDTH = 60;
export const LIST_WIDTH = 300;

// WeChat's rail is icons only; the label shows as a tooltip beside the icon and is the accessible name.
export function railItem(label: string, name: IconName, href?: string) {
  const node = href ? el('a') : el('button');
  if (node instanceof HTMLAnchorElement) node.href = href!; else (node as HTMLButtonElement).type = 'button';
  node.className = 'nspp-wecom-rail-item'; node.dataset.tip = label; node.setAttribute('aria-label', label);
  node.append(icon(name));
  return node;
}

/**
 * The fish on the 摸鱼 toggle, in the toolbar's stroke weight. It is drawn in parts so it can swim:
 * the tail sways, the body bobs and two bubbles rise while the button has data-swimming (see tools-monitor.css).
 */
export function fishIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', width: '18', height: '18', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', class: 'nspp-fish' })) svg.setAttribute(key, value);
  const part = (tag: 'path' | 'circle', className: string, attributes: Record<string, string>) => {
    const node = document.createElementNS(svg.namespaceURI, tag); node.setAttribute('class', className);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  };
  const body = document.createElementNS(svg.namespaceURI, 'g'); body.setAttribute('class', 'nspp-fish-body');
  body.append(
    part('path', 'nspp-fish-tail', { d: 'M7 12 2.5 8.5v7L7 12Z' }),
    part('path', '', { d: 'M7 12c2-3.5 5-5.5 8.5-5.5 2.8 0 5 2 6.5 5.5-1.5 3.5-3.7 5.5-6.5 5.5C12 17.5 9 15.5 7 12Z' }),
    part('path', '', { d: 'M17.5 11h.01' }),
  );
  svg.append(body, part('circle', 'nspp-fish-bubble', { cx: '21', cy: '7', r: '.9' }), part('circle', 'nspp-fish-bubble', { cx: '22.4', cy: '4.4', r: '.6' }));
  return svg;
}

/** ≡ menu: NodeSeek++'s own tools, mirrored from its (hidden) toolbar so each keeps its own behaviour. */
export function createToolMenu(ctx: Context, tools: HTMLElement | null, more: HTMLElement) {
  const menu = el('div', 'nspp-wecom-railmenu'); menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'NodeSeek++ 工具'); menu.hidden = true;
  const toolButtons = () => Array.from(tools?.querySelectorAll<HTMLButtonElement>(':scope > button, :scope > :not(.nspp-fast-nav) button') || [])
    .filter(button => !button.hidden && !button.matches('.nspp-tools-toggle, [data-nspp-hot-launcher]') && !button.closest('.nspp-fast-nav'));
  const flagged = (button: HTMLElement) => !!button.querySelector('[class*="badge"]:not([hidden]):not(:empty), [class*="badge"][data-count]:not([hidden])');
  const build = () => {
    // Keep share, settings and the 摸鱼 switch last, as WeChat keeps 设置 at the bottom of its menu.
    const rank = (button: HTMLElement) => button.hasAttribute('data-nspp-wecom-launcher') ? 3 : button.hasAttribute('data-nspp-settings-launcher') ? 2 : button.hasAttribute('data-nspp-share-launcher') ? 1 : 0;
    const items = toolButtons().sort((a, b) => rank(a) - rank(b)).map(button => {
      // Launchers may carry a long status description; the menu shows only its name, the part before "·".
      const label = (button.getAttribute('aria-label') || button.title || button.textContent || '工具').split(/[·\n]/)[0].trim() || '工具';
      const item = el('button', '', label);
      item.type = 'button'; item.setAttribute('role', 'menuitem'); item.disabled = button.disabled;
      if (flagged(button)) item.append(el('b', 'nspp-wecom-dot'));
      if (rank(button)) item.dataset.separate = '';
      item.addEventListener('click', () => { set(false); button.click(); }, { signal: ctx.signal });
      return item;
    });
    menu.replaceChildren(...items);
    if (!items.length) menu.append(el('p', '', '没有可用的工具'));
  };
  const set = (open: boolean) => {
    if (open) build();
    menu.hidden = !open; more.setAttribute('aria-expanded', String(open));
    if (open) menu.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  };
  return { menu, set, flagged: () => toolButtons().some(flagged) };
}

/** Drag the list's right edge to resize it, like WeChat; double-click restores the default. */
export function createResizer(ctx: Context) {
  const resizer = el('div', 'nspp-wecom-resizer'); resizer.tabIndex = 0;
  resizer.setAttribute('role', 'separator'); resizer.setAttribute('aria-orientation', 'vertical'); resizer.setAttribute('aria-label', '拖拽调整列表宽度，双击恢复默认');
  resizer.title = resizer.getAttribute('aria-label')!;
  const clamp = (value: number) => Math.round(Math.max(220, Math.min(value, 560, window.innerWidth - RAIL_WIDTH - 420)));
  let width = clamp(Number(ctx.get('listWidth')) || LIST_WIDTH);
  const set = (value: number, save = false) => {
    width = clamp(value);
    document.body.style.setProperty('--wc-list-w', `${width}px`);
    resizer.setAttribute('aria-valuenow', String(width));
    if (save) ctx.set('listWidth', width);
  };
  resizer.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); resizer.setPointerCapture?.(event.pointerId);
    document.documentElement.setAttribute('data-nspp-wecom-resizing', '');
    const move = (next: PointerEvent) => set(next.clientX - RAIL_WIDTH);
    const end = () => {
      resizer.removeEventListener('pointermove', move); document.documentElement.removeAttribute('data-nspp-wecom-resizing');
      set(width, true);
    };
    resizer.addEventListener('pointermove', move, { signal: ctx.signal });
    resizer.addEventListener('pointerup', end, { once: true, signal: ctx.signal });
    resizer.addEventListener('pointercancel', end, { once: true, signal: ctx.signal });
  }, { signal: ctx.signal });
  resizer.addEventListener('dblclick', () => set(LIST_WIDTH, true), { signal: ctx.signal });
  resizer.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault(); set(width + (event.key === 'ArrowRight' ? 16 : -16), true);
  }, { signal: ctx.signal });
  return { resizer, apply: () => set(width), clear: () => { document.body.style.removeProperty('--wc-list-w'); document.documentElement.removeAttribute('data-nspp-wecom-resizing'); } };
}

/**
 * A conversation row: avatar, then title and time over the second line and a count. Ranked rows get a coloured
 * badge before the title; unread replies show as a badge on the avatar and unread notifications as a dot.
 */
export function conversationRow(ctx: Context, row: Row, open: (row: Row, event: MouseEvent) => void, rank?: number) {
  const item = el('li'); item.dataset.id = String(row.id);
  if (row.pinned) item.dataset.pinned = '';
  const button = el('button', 'nspp-wecom-hot-row'); button.type = 'button';
  const letter = (row.author || row.title || '?').slice(0, 1);
  const avatar = el('span', 'nspp-wecom-hot-avatar', row.avatar ? '' : letter);
  if (row.avatar) {
    const img = el('img'); img.alt = ''; img.loading = 'lazy'; img.src = row.avatar;
    img.addEventListener('error', () => { img.remove(); avatar.textContent = letter; }, { once: true, signal: ctx.signal });
    avatar.append(img);
  }
  if (row.unread) avatar.append(el('b', 'nspp-wecom-row-badge', row.unread > 99 ? '99+' : String(row.unread)));
  else if (row.read === false) avatar.append(el('b', 'nspp-wecom-row-dot'));
  const text = el('span', 'nspp-wecom-hot-text');
  const title = el('strong');
  if (rank != null) {
    const badge = el('b', 'nspp-wecom-hot-rank', String(rank));
    if (rank <= 3) badge.dataset.top = String(rank);
    title.append(badge);
  }
  title.append(row.title);
  const time = el('span', 'nspp-wecom-hot-time', row.time && !Number.isNaN(row.time.getTime()) ? listTime(row.time) : '');
  const count = el('span', 'nspp-wecom-hot-count', row.count == null ? '' : String(row.count));
  count.hidden = row.count == null;
  text.append(title, time, el('small', '', row.meta), count);
  button.append(avatar, text);
  button.title = row.title;
  button.addEventListener('click', event => open(row, event), { signal: ctx.signal });
  item.append(button);
  return item;
}
