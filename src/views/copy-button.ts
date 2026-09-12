import type { Context } from '../core/types';

export function copyButton(ctx: Pick<Context, 'notify' | 'signal'>, value: () => string, label = '复制', iconOnly = false) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'nspp-copy-button';
  let timer: ReturnType<typeof setTimeout> | undefined;
  const show = (copied: boolean) => {
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('width', '14'); icon.setAttribute('height', '14'); icon.setAttribute('fill', 'none'); icon.setAttribute('stroke', 'currentColor'); icon.setAttribute('stroke-width', '1.8'); icon.setAttribute('stroke-linecap', 'round'); icon.setAttribute('stroke-linejoin', 'round'); icon.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(icon.namespaceURI, 'path'); path.setAttribute('d', copied ? 'M5 12l4 4L19 6' : 'M9 9h12v12H9zM15 9V3H3v12h6'); icon.append(path);
    button.replaceChildren(icon); if (!iconOnly) button.append(document.createTextNode(copied ? '已复制' : label));
    button.dataset.copied = String(copied); button.setAttribute('aria-label', copied ? '已复制' : label);
  };
  show(false);
  ctx.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  button.title = label; button.setAttribute('aria-label', label);
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true; button.setAttribute('aria-busy', 'true');
    try { await navigator.clipboard.writeText(value()); if (!ctx.signal.aborted) { clearTimeout(timer); show(true); ctx.notify('复制成功'); timer = setTimeout(() => show(false), 1600); } }
    catch { if (!ctx.signal.aborted) ctx.notify('复制失败，请手动选择文本复制'); }
    finally { button.disabled = false; button.removeAttribute('aria-busy'); }
  }, { signal: ctx.signal });
  return button;
}
