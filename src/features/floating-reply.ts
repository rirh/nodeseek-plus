import type { Feature } from '../core/types';
import { toolIcon } from '../lib/tool-icon';

export const floatingReply: Feature = {
  id: 'floating-reply', title: '手机悬浮回复', description: '手机上回复、引用和编辑时悬浮显示原生编辑器，保留草稿，暂停评论自动翻页。', group: '操作辅助',
  defaults: { enabled: true },
  mount(ctx) {
    if (!/^\/post-\d+/.test(location.pathname)) return;
    const mobile = window.matchMedia('(max-width: 700px), (hover: none)');
    let editor: HTMLElement | undefined;
    let placeholder: HTMLElement | undefined;
    let header: HTMLElement | undefined;
    let previousFocus: HTMLElement | null = null;
    let scrollX = 0, scrollY = 0;
    const root = document.documentElement;
    const signalState = () => document.dispatchEvent(new Event('nspp:reply-state'));
    // Pin the sheet's bottom edge to the visual viewport's bottom (the top of the keyboard). Measuring from the
    // visual viewport alone avoids innerHeight, which lags or jumps when the browser's toolbar hides or reappears.
    let frame = 0, settleUntil = 0;
    const resizer = new ResizeObserver(() => viewport());
    const viewport = () => {
      if (!editor) return;
      const view = window.visualViewport;
      const height = view?.height ?? window.innerHeight;
      editor.style.setProperty('--nspp-reply-height', `${height}px`);
      editor.style.setProperty('--nspp-reply-top', `${Math.max(0, (view?.offsetTop ?? 0) + height - editor.offsetHeight)}px`);
    };
    // Keyboards and toolbars animate without reliable events; follow them for a moment after each change.
    const settle = () => {
      settleUntil = performance.now() + 700;
      const step = () => { viewport(); frame = editor && performance.now() < settleUntil ? requestAnimationFrame(step) : 0; };
      if (!frame) step();
    };
    const close = () => {
      if (!editor) return;
      (document.activeElement as HTMLElement | null)?.blur();
      editor.classList.remove('nspp-floating-reply');
      editor.style.removeProperty('--nspp-reply-height'); editor.style.removeProperty('--nspp-reply-top');
      resizer.disconnect(); cancelAnimationFrame(frame); frame = 0;
      header?.remove(); placeholder?.remove(); editor = undefined;
      root.removeAttribute('data-nspp-reply-open');
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
      previousFocus?.focus({ preventScroll: true });
      signalState();
    };
    const open = () => {
      if (!mobile.matches || editor) return;
      const host = document.querySelector<HTMLElement>('.md-editor');
      if (!host) return;
      editor = host; previousFocus = document.activeElement as HTMLElement | null;
      scrollX = window.scrollX; scrollY = window.scrollY;
      placeholder = document.createElement('div'); placeholder.style.height = `${host.getBoundingClientRect().height}px`; placeholder.setAttribute('aria-hidden', 'true'); host.before(placeholder);
      root.setAttribute('data-nspp-reply-open', '');
      host.classList.add('nspp-floating-reply');
      header = document.createElement('div'); header.className = 'nspp-floating-reply-header';
      const label = document.createElement('span'); label.textContent = '回复 · 收起后保留草稿';
      const hide = document.createElement('button'); hide.type = 'button'; hide.textContent = '收起'; hide.setAttribute('aria-label', '收起回复框');
      hide.addEventListener('click', close, { signal: ctx.signal }); header.append(label, hide); host.prepend(header);
      resizer.observe(host); settle(); signalState();
      (host.querySelector('.CodeMirror') as (HTMLElement & { CodeMirror?: { refresh(): void } }) | null)?.CodeMirror?.refresh();
    };
    document.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target : null;
      const action = target?.closest<HTMLElement>('.comment-menu .menu-item');
      if (!action || !['回复', '引用', '编辑'].includes(action.title || action.textContent?.trim() || '') || !mobile.matches) return;
      open();
      // Leave native reply/quote/edit handlers intact; only suppress anchor navigation.
      if (editor) event.preventDefault();
    }, { capture: true, signal: ctx.signal });
    document.addEventListener('keydown', event => { if (editor && event.key === 'Escape' && !document.querySelector('dialog[open]')) close(); }, { signal: ctx.signal });
    mobile.addEventListener('change', () => { if (!mobile.matches) close(); }, { signal: ctx.signal });
    window.visualViewport?.addEventListener('resize', settle, { signal: ctx.signal });
    window.visualViewport?.addEventListener('scroll', viewport, { signal: ctx.signal });
    window.addEventListener('resize', settle, { signal: ctx.signal });
    document.addEventListener('focusin', event => { if (editor && event.target instanceof Node && editor.contains(event.target)) settle(); }, { signal: ctx.signal });
    const launch = document.createElement('button'); launch.type = 'button'; launch.className = 'nspp-tool-icon'; launch.title = '回复帖子'; launch.setAttribute('aria-label', launch.title); launch.dataset.nsppReplyLauncher = ''; launch.append(toolIcon('footprints'));
    launch.addEventListener('click', () => { open(); editor?.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true }); }, { signal: ctx.signal });
    const stop = ctx.watch(() => { launch.hidden = !document.querySelector('.md-editor'); });
    (document.getElementById('nspp-tools') || document.body).append(launch);
    return () => { stop(); close(); launch.remove(); };
  },
};
