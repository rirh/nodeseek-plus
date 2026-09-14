export function confirmDialog(title: string, description: string, confirmLabel: string, signal: AbortSignal, options: { href?: string; cancelLabel?: string } = {}): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);
  return new Promise(resolve => {
    const dialog = document.createElement('dialog'); dialog.className = 'nspp-confirm-dialog';
    dialog.setAttribute('aria-label', title);
    const heading = document.createElement('h2'); heading.textContent = title;
    const body = document.createElement('p'); body.textContent = description;
    const actions = document.createElement('form'); actions.method = 'dialog';
    const cancel = document.createElement('button'); cancel.type = 'submit'; cancel.value = 'cancel'; cancel.textContent = options.cancelLabel || '取消'; cancel.autofocus = true;
    const confirm = document.createElement(options.href ? 'a' : 'button');
    if (confirm instanceof HTMLAnchorElement) {
      confirm.href = options.href!; confirm.target = '_blank'; confirm.rel = 'noopener noreferrer'; confirm.className = 'nspp-confirm-primary';
      confirm.addEventListener('click', () => dialog.close('confirm'));
    } else {
      confirm.type = 'submit'; confirm.value = 'confirm'; confirm.className = 'nspp-confirm-danger';
    }
    confirm.textContent = confirmLabel;
    actions.append(cancel, confirm); dialog.append(heading, body, actions);
    const abort = () => { dialog.close('cancel'); };
    dialog.addEventListener('close', () => { signal.removeEventListener('abort', abort); dialog.remove(); resolve(!signal.aborted && dialog.returnValue === 'confirm'); }, { once: true });
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close('cancel');
    });
    document.body.append(dialog); dialog.showModal(); signal.addEventListener('abort', abort, { once: true });
  });
}
