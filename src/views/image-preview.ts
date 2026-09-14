import Viewer from 'viewerjs';
import 'viewerjs/dist/viewer.css';
import './image-preview.css';

export function openImagePreview(content: HTMLElement, image: HTMLImageElement, onClose: () => void) {
  const dialog = document.createElement('dialog');
  dialog.className = 'nspp-image-preview';
  dialog.setAttribute('aria-label', '图片预览');
  document.body.append(dialog);
  dialog.showModal();
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
  const images = Array.from(content.querySelectorAll('img'));
  const multiple = images.length > 1;
  viewer = new Viewer(content, {
    container: dialog,
    initialViewIndex: images.indexOf(image),
    title: false,
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
