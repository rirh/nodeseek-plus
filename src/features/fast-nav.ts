import { gsap } from 'gsap';
import { toolIcon } from '../lib/tool-icon';

// Proxies NodeSeek's native #fast-nav-button-group into the toolbar: clicks go to the native buttons so the site
// keeps its own scrolling behaviour, and each proxy mirrors its native button's visibility with a GSAP transition.
const BUTTONS = [
  { id: 'back-to-top', icon: 'up', title: '回到顶部' },
  { id: 'back-to-parent', icon: 'back', title: '返回上级' },
  { id: 'back-to-bottom', icon: 'down', title: '到达底部' },
] as const;

export function mountFastNav(tools: HTMLElement): () => void {
  const group = document.createElement('div'); group.className = 'nspp-fast-nav';
  const controls = new AbortController(); const { signal } = controls;
  const proxies = BUTTONS.map(({ id, icon, title }) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'nspp-tool-icon'; button.title = title;
    button.setAttribute('aria-label', title); button.dataset.nsppFastNav = id; button.hidden = true; button.append(toolIcon(icon));
    button.addEventListener('click', () => document.getElementById(id)?.click(), { signal });
    group.append(button); return button;
  });
  tools.prepend(group);
  let observed: Element | null = null, frame = 0;
  const groupObserver = new MutationObserver(() => schedule());
  const sync = () => {
    frame = 0;
    const native = document.getElementById('fast-nav-button-group');
    if (native !== observed) {
      groupObserver.disconnect(); observed = native;
      if (native) groupObserver.observe(native, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    }
    // Hide the native group only while it exists, so the page never loses these controls.
    document.documentElement.toggleAttribute('data-nspp-fast-nav', !!native);
    proxies.forEach((proxy, index) => {
      const target = document.getElementById(BUTTONS[index].id);
      toggle(proxy, !!target && !target.hidden && getComputedStyle(target).display !== 'none');
    });
  };
  // Expand/fade buttons in and out; hidden is only set once collapsed so the divider never jumps early.
  const shown = new WeakMap<HTMLButtonElement, boolean>();
  function toggle(proxy: HTMLButtonElement, visible: boolean) {
    if (shown.get(proxy) === visible) return;
    const first = !shown.has(proxy); shown.set(proxy, visible);
    gsap.killTweensOf(proxy);
    if (first || matchMedia('(prefers-reduced-motion: reduce)').matches) { proxy.hidden = !visible; gsap.set(proxy, { clearProps: 'all' }); return; }
    if (visible) {
      proxy.hidden = false;
      gsap.fromTo(proxy, { height: 0, minHeight: 0, opacity: 0, scale: .6 }, { height: 30, minHeight: 30, opacity: 1, scale: 1, duration: .24, ease: 'back.out(1.6)', clearProps: 'all' });
    } else {
      gsap.to(proxy, { height: 0, minHeight: 0, opacity: 0, scale: .6, duration: .18, ease: 'power2.in', onComplete: () => { proxy.hidden = true; gsap.set(proxy, { clearProps: 'all' }); } });
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
  // The site renders the group late and swaps it on SPA navigation; watch for it at the body level (child list only).
  const bodyObserver = new MutationObserver(() => { if (document.getElementById('fast-nav-button-group') !== observed) schedule(); });
  bodyObserver.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('scroll', schedule, { passive: true, signal });
  window.addEventListener('resize', schedule, { passive: true, signal });
  sync();
  return () => {
    controls.abort(); proxies.forEach(proxy => gsap.killTweensOf(proxy)); groupObserver.disconnect(); bodyObserver.disconnect(); cancelAnimationFrame(frame);
    document.documentElement.removeAttribute('data-nspp-fast-nav'); group.remove();
  };
}
