/**
 * Shared modal panel. Desktop keeps each panel's own centered layout; narrow or touch screens
 * render every sheet as one bottom sheet (see `.nspp-sheet` in sheet.css). Mark the scrolling
 * region with `nspp-sheet-body` so headers and footers stay visible while it scrolls.
 */
export function createSheet(className: string, label: string, options: { tall?: boolean; dismissible?: boolean } = {}): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  dialog.className = `nspp-sheet ${className}`;
  if (options.tall) dialog.classList.add('nspp-sheet-tall');
  dialog.setAttribute('aria-label', label);
  if (options.dismissible !== false) dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  return dialog;
}
