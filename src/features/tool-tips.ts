// Hover labels for the floating toolbar, as the 摸鱼模式 rail has. The toolbar scrolls, so the label lives on <body>;
// while it shows, the button's own title is set aside so the browser does not show a second, slower tooltip.
// On the home page the 摸鱼模式 fish also introduces itself: once in view it swims twice, then its label shows a while.
const LAUNCHER = '[data-nspp-wecom-launcher]';
const SWIM_MS = 2200; // Two 1.1s swims, matching nspp-fish-swim in tools-monitor.css.
const INTRO_TIP_MS = 4000;

export function mountToolTips(tools: HTMLElement): () => void {
  const tip = document.createElement('div'); tip.className = 'nspp-tool-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  document.body.append(tip);
  const controller = new AbortController(); const { signal } = controller;
  let current: HTMLElement | null = null;
  let pointed: HTMLElement | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let keyboard = false;
  const label = (button: HTMLElement) => (button.getAttribute('aria-label') || button.title || button.dataset.nsppTitle || '').trim();
  const show = (button: HTMLElement, text = label(button)) => {
    if (!text || !button.isConnected) return;
    if (button.hasAttribute('title')) { button.dataset.nsppTitle = button.title; button.removeAttribute('title'); }
    tip.textContent = text; tip.hidden = false;
    // Beside the button, on whichever side of the screen has room; the toolbar normally sits on the right.
    const rect = button.getBoundingClientRect(), box = tip.getBoundingClientRect();
    const left = rect.left > window.innerWidth / 2 ? rect.left - box.width - 10 : rect.right + 10;
    tip.style.left = `${Math.max(8, Math.round(left))}px`;
    tip.style.top = `${Math.round(Math.min(window.innerHeight - box.height - 8, Math.max(8, rect.top + rect.height / 2 - box.height / 2)))}px`;
  };
  const hide = () => {
    clearTimeout(timer);
    // A feature may have retitled the button meanwhile; its new title wins.
    if (current && current.dataset.nsppTitle !== undefined) {
      if (!current.hasAttribute('title')) current.title = current.dataset.nsppTitle;
      delete current.dataset.nsppTitle;
    }
    current = null; tip.hidden = true;
  };
  const buttonOf = (event: Event) => (event.target as Element | null)?.closest?.<HTMLElement>('button, a[href]') ?? null;
  tools.addEventListener('pointerover', event => {
    if ((event as PointerEvent).pointerType !== 'mouse') return;
    const button = buttonOf(event);
    pointed = button;
    if (!button || button === current) return;
    hide(); current = button;
    timer = setTimeout(() => { if (current === button) show(button); }, 250);
  }, { signal });
  tools.addEventListener('pointerout', event => {
    const next = (event as PointerEvent).relatedTarget as Node | null;
    if (pointed && !(next && pointed.contains(next))) pointed = null;
    if (current && !(next && current.contains(next))) hide();
  }, { signal });
  // Keyboard focus shows the label at once; focus that follows a click does not.
  document.addEventListener('keydown', event => { keyboard = true; if (event.key === 'Escape') hide(); }, { capture: true, signal });
  document.addEventListener('pointerdown', () => { keyboard = false; }, { capture: true, signal });
  tools.addEventListener('focusin', event => {
    const button = buttonOf(event);
    if (!keyboard || !button) return;
    hide(); current = button; show(button);
  }, { signal });
  tools.addEventListener('focusout', hide, { signal });
  tools.addEventListener('pointerdown', hide, { signal });
  tools.addEventListener('scroll', hide, { passive: true, signal });

  let introTimer: ReturnType<typeof setTimeout> | undefined;
  let swimming: HTMLElement | null = null;
  let visible: IntersectionObserver | undefined;
  const intro = (launcher: HTMLElement) => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    if (!reduced) { swimming = launcher; launcher.setAttribute('data-swimming', ''); }
    introTimer = setTimeout(() => {
      launcher.removeAttribute('data-swimming'); swimming = null;
      // Someone already pointing at another button keeps that button's label.
      if (!launcher.isConnected || launcher.hidden || (pointed && pointed !== launcher)) return;
      hide(); current = launcher; show(launcher, `${label(launcher)}：点一下，切换成微信式三栏`);
      introTimer = setTimeout(() => { if (current === launcher && pointed !== launcher) hide(); }, INTRO_TIP_MS);
    }, reduced ? 0 : SWIM_MS);
  };
  // The launcher is added by 摸鱼模式 after this mounts, and is hidden on narrow screens; wait until it can be seen.
  const watch = new MutationObserver(() => arm());
  const arm = () => {
    const launcher = tools.querySelector<HTMLElement>(LAUNCHER);
    if (!launcher || launcher.hidden || document.documentElement.hasAttribute('data-nspp-wecom')) return;
    watch.disconnect();
    if (typeof IntersectionObserver !== 'function') { intro(launcher); return; }
    visible = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      visible?.disconnect();
      // A home page opened in a background tab waits until the tab is looked at.
      if (!document.hidden) { intro(launcher); return; }
      document.addEventListener('visibilitychange', function shown() {
        if (document.hidden) return;
        document.removeEventListener('visibilitychange', shown); intro(launcher);
      }, { signal });
    }, { threshold: 0.6 });
    visible.observe(launcher);
  };
  if (location.pathname === '/') {
    watch.observe(tools, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    arm();
  }

  return () => {
    clearTimeout(introTimer); watch.disconnect(); visible?.disconnect(); swimming?.removeAttribute('data-swimming');
    hide(); controller.abort(); tip.remove();
  };
}
