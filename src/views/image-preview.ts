import Viewer from 'viewerjs';
import 'viewerjs/dist/viewer.css';
import './image-preview.css';

/** Pass a container to browse its images, or an explicit gallery (e.g. images spread over several floors). */
export function openImagePreview(content: HTMLElement | HTMLImageElement[], image: HTMLImageElement, onClose: () => void) {
  const dialog = document.createElement('dialog');
  dialog.className = 'nspp-image-preview';
  dialog.setAttribute('aria-label', '图片预览');
  document.body.append(dialog);
  dialog.showModal();
  let source: HTMLElement;
  let images: HTMLImageElement[];
  if (Array.isArray(content)) {
    // Viewer needs one root element; mirror the gallery into a hidden list so other page images stay out.
    source = document.createElement('div'); source.hidden = true;
    images = content.map(item => {
      const copy = document.createElement('img');
      copy.src = item.currentSrc || item.src; copy.alt = item.alt; copy.referrerPolicy = item.referrerPolicy;
      source.append(copy); return copy;
    });
    dialog.append(source);
  } else { source = content; images = Array.from(content.querySelectorAll('img')); }
  const start = Array.isArray(content) ? content.indexOf(image) : images.indexOf(image);
  let viewer: Viewer | undefined;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    viewer?.destroy(); dialog.close(); dialog.remove();
    if (image.isConnected) image.focus({ preventScroll: true });
    onClose();
  };
  dialog.addEventListener('cancel', event => { event.preventDefault(); event.stopPropagation(); close(); });
  const multiple = images.length > 1;
  viewer = new Viewer(source, {
    container: dialog,
    initialViewIndex: Math.max(0, start),
    // Galleries show their position; a single image needs no caption.
    title: multiple ? [1, function (this: Viewer) { return `${(this as unknown as { index: number }).index + 1} / ${images.length}`; }] : false,
    navbar: multiple,
    toolbar: { zoomOut: true, zoomIn: true, oneToOne: true, reset: true, prev: multiple, next: multiple },
    fullscreen: false,
    rotatable: false,
    scalable: false,
    inheritedAttributes: ['referrerPolicy'],
    transition: !matchMedia('(prefers-reduced-motion: reduce)').matches,
    ready() {
      const labels: Record<string, string> = { 'zoom-in': '放大', 'zoom-out': '缩小', 'one-to-one': '原始大小', reset: '适应窗口', prev: '上一张', next: '下一张', mix: '关闭预览' };
      dialog.querySelectorAll<HTMLElement>('[data-viewer-action]').forEach(control => {
        const label = labels[control.dataset.viewerAction || ''];
        if (label) { control.title = label; control.setAttribute('aria-label', label); }
      });
      const container = dialog.querySelector('.viewer-container');
      container?.removeAttribute('aria-labelledby');
      container?.setAttribute('aria-label', '图片预览');
    },
    hidden: close,
  });
  viewer.show();
  return close;
}

/** Images wrapped in a link to a page (banners, "点击进入" buttons) navigate instead of opening the preview. */
export function linksElsewhere(image: HTMLImageElement): boolean {
  const href = image.closest<HTMLAnchorElement>('a[href]')?.href;
  if (!href || /^javascript:/i.test(href)) return false;
  try {
    const target = new URL(href, location.href);
    if (target.href === new URL(image.currentSrc || image.src, location.href).href) return false;
    return !/\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(target.pathname);
  } catch { return false; }
}
