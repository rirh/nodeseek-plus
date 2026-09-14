import { copyButton } from './copy-button';
import { userCardActions } from './user-card-actions';
import { authorId } from '../features/user-profile';
import type { Context } from '../core/types';
import { profileTagKey } from './profile-tags';

export const userHoverSelector = 'a:is(.info-author,.post-author), :is(.author-info,.info-author,.post-author,.info-last-commenter) > a[href*="/space/"], a[href*="/space/"]:has(img), a[data-uid]';

const cards = new WeakMap<HTMLAnchorElement, { element: HTMLElement; users: number; dispose(): void }>();

export function isUserHoverAnchor(anchor: HTMLAnchorElement) {
  if (anchor.closest('.hover-user-card')) return false;
  const url = new URL(anchor.href, location.href);
  return url.origin === location.origin && /^\/space\/\d+\/?$/.test(url.pathname) && !url.search && !url.hash;
}

export function userHover(anchor: HTMLAnchorElement, ctx: Context) {
  let entry = cards.get(anchor);
  if (!entry) {
    const title = anchor.getAttribute('title'); anchor.removeAttribute('title');
    const element = document.createElement('section'); element.className = 'nspp-user-hover'; element.hidden = true;
    const heading = document.createElement('a'); heading.href = anchor.href; heading.textContent = anchor.textContent?.trim() || anchor.querySelector('img')?.alt || '用户资料'; heading.className = 'nspp-user-hover-name';
    element.setAttribute('aria-label', `${heading.textContent} 的用户详情`);
    const header = document.createElement('div'); header.className = 'nspp-user-hover-header';
    const mark = document.createElement('span'); mark.className = 'nspp-user-hover-monogram'; mark.textContent = heading.textContent.slice(0, 1);
    const identity = document.createElement('div'); identity.append(heading);
    const controller = new AbortController(); const options = { signal: controller.signal };
    const copy = copyButton({ notify: ctx.notify, signal: controller.signal }, () => heading.textContent || '', '复制用户名', true);
    identity.append(copy);
    const tags = document.createElement('div'); tags.className = 'nspp-user-hover-tags'; identity.append(tags);
    const nativeTags = document.createElement('span'); nativeTags.className = 'nspp-user-native-tags';
    const profileTags = document.createElement('span'); profileTags.className = 'nspp-user-profile-tags';
    tags.append(nativeTags, profileTags);
    const syncTags = () => {
      nativeTags.replaceChildren();
      const source = anchor.closest('.author-info, .info-author, .post-author, .info-last-commenter, .nsk-content-meta-info') || anchor.parentElement;
      source?.querySelectorAll('.role-tag').forEach(tag => {
        if (tag.closest('.nspp-user-hover')) return;
        if (Array.from(profileTags.children).some(profile => profileTagKey(profile.textContent?.trim() || '') === profileTagKey(tag.textContent?.trim() || ''))) return;
        const copy = tag.cloneNode(true) as HTMLElement; copy.removeAttribute('id'); nativeTags.append(copy);
      });
      tags.hidden = !nativeTags.children.length && !profileTags.children.length;
    };
    syncTags();
    const avatar = document.createElement('img'); avatar.className = 'nspp-user-hover-avatar'; avatar.alt = ''; avatar.hidden = true;
    const id = authorId(anchor, location.origin);
    const actions = id ? userCardActions(id, () => heading.textContent || '', ctx.notify, controller.signal) : undefined;
    avatar.addEventListener('load', () => { avatar.hidden = false; mark.hidden = true; });
    avatar.addEventListener('error', () => { avatar.hidden = true; mark.hidden = false; });
    header.append(avatar, mark, identity); element.append(header); if (actions) element.append(actions.element); document.body.append(element);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const close = () => { clearTimeout(timer); element.hidden = true; };
    const open = () => {
      clearTimeout(timer); if (!anchor.isConnected) return;
      syncTags(); element.hidden = false;
      actions?.refresh();
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
    entry = { element, users: 0, dispose: () => { close(); controller.abort(); element.remove(); if (title !== null) anchor.setAttribute('title', title); cards.delete(anchor); } };
    cards.set(anchor, entry);
  }
  entry.users++;
  const shared = entry; let released = false;
  const release = () => { if (released) return; released = true; if (--shared.users === 0) shared.dispose(); };
  ctx.signal.addEventListener('abort', release, { once: true });
  return { element: shared.element, release };
}
