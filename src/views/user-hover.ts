import { copyButton } from './copy-button';
import { authorId } from '../features/user-profile';
import type { Context } from '../core/types';

export const userHoverSelector = 'a[href*="/space/"], a[href*="uid="], a[data-uid]';

const cards = new WeakMap<HTMLAnchorElement, { element: HTMLElement; users: number; dispose(): void }>();

export function userHover(anchor: HTMLAnchorElement, ctx: Context) {
  let entry = cards.get(anchor);
  if (!entry) {
    const element = document.createElement('section'); element.className = 'nspp-user-hover'; element.hidden = true;
    element.setAttribute('aria-label', `${anchor.textContent?.trim()} 的用户详情`);
    const heading = document.createElement('a'); heading.href = anchor.href; heading.textContent = anchor.textContent?.trim() || anchor.querySelector('img')?.alt || '用户资料'; heading.className = 'nspp-user-hover-name';
    const header = document.createElement('div'); header.className = 'nspp-user-hover-header';
    const mark = document.createElement('span'); mark.className = 'nspp-user-hover-monogram'; mark.textContent = (anchor.textContent?.trim() || '?').slice(0, 1);
    const identity = document.createElement('div'); identity.append(heading);
    const controller = new AbortController(); const options = { signal: controller.signal };
    const copy = copyButton({ notify: ctx.notify, signal: controller.signal }, () => heading.textContent || '', '复制用户名', true);
    identity.append(copy);
    const tags = document.createElement('div'); tags.className = 'nspp-user-hover-tags'; identity.append(tags);
    const syncTags = () => {
      tags.replaceChildren();
      const source = anchor.closest('.author-info, .info-author, .post-author, .info-last-commenter, .nsk-content-meta-info') || anchor.parentElement;
      source?.querySelectorAll('.role-tag').forEach(tag => {
        if (tag.closest('.nspp-user-hover')) return;
        const copy = tag.cloneNode(true) as HTMLElement; copy.removeAttribute('id'); tags.append(copy);
      });
      tags.hidden = !tags.children.length;
    };
    syncTags();
    const avatar = document.createElement('img'); avatar.className = 'nspp-user-hover-avatar'; avatar.alt = ''; avatar.hidden = true;
    const id = authorId(anchor, location.origin);
    avatar.addEventListener('load', () => { avatar.hidden = false; mark.hidden = true; });
    avatar.addEventListener('error', () => { avatar.hidden = true; mark.hidden = false; });
    header.append(avatar, mark, identity); element.append(header); document.body.append(element);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const close = () => { clearTimeout(timer); element.hidden = true; };
    const open = () => {
      clearTimeout(timer); if (!anchor.isConnected) return;
      syncTags(); element.hidden = false;
      if (id && !avatar.getAttribute('src')) avatar.src = `/avatar/${id}.png`;
      const rect = anchor.getBoundingClientRect();
      element.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - element.offsetWidth - 8))}px`;
      element.style.top = `${Math.max(8, Math.min(rect.bottom + 6, innerHeight - element.offsetHeight - 8))}px`;
    };
    const leave = () => { clearTimeout(timer); timer = setTimeout(close, 180); };
    anchor.addEventListener('mouseenter', open, options);
    anchor.addEventListener('mouseleave', leave, options);
    anchor.addEventListener('focus', open, options);
    anchor.addEventListener('blur', leave, options);
    anchor.addEventListener('click', event => { if (matchMedia('(hover: none)').matches && element.hidden) { event.preventDefault(); open(); } }, options);
    element.addEventListener('mouseenter', () => clearTimeout(timer), options);
    element.addEventListener('mouseleave', leave, options);
    element.addEventListener('focusin', () => clearTimeout(timer), options);
    element.addEventListener('focusout', leave, options);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !element.hidden) { anchor.focus(); close(); } }, options);
    document.addEventListener('pointerdown', event => { if (!element.contains(event.target as Node) && !anchor.contains(event.target as Node)) close(); }, options);
    window.addEventListener('resize', close, options);
    window.addEventListener('scroll', close, { ...options, capture: true });
    entry = { element, users: 0, dispose: () => { close(); controller.abort(); element.remove(); cards.delete(anchor); } };
    cards.set(anchor, entry);
  }
  entry.users++;
  const shared = entry; let released = false;
  const release = () => { if (released) return; released = true; if (--shared.users === 0) shared.dispose(); };
  ctx.signal.addEventListener('abort', release, { once: true });
  return { element: shared.element, release };
}
