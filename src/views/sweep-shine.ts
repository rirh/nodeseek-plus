/** SweepShine loading text: a highlight sweeps across the glyphs (styles in loading.css). */
const SHINE = 'nspp-sweep-shine';

/** A shining label for a busy button; restoring `textContent` later removes it. */
export function sweepShine(text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = SHINE;
  span.textContent = text;
  return span;
}

/** Toggle SweepShine and `aria-busy` together on a plain-text status element. */
export function setShine(el: HTMLElement, active: boolean) {
  el.classList.toggle(SHINE, active);
  if (active) el.setAttribute('aria-busy', 'true'); else el.removeAttribute('aria-busy');
}
