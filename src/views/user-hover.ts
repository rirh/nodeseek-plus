import { copyButton } from './copy-button';
import { userCardActions } from './user-card-actions';
import { authorId } from '../features/user-profile';
import type { Context } from '../core/types';
import { profileTagKey } from './profile-tags';
import { GM_getValue } from '../lib/userscript';

export function userHoverEnabled(): boolean {
  return GM_getValue<Record<string, { hoverPreview?: boolean }>>(`nspp:settings:${location.hostname}`, {})['user-level']?.hoverPreview !== false;
}

export const userHoverSelector = 'a:is(.info-author,.post-author), :is(.author-info,.info-author,.post-author,.info-last-commenter) > a[href*="/space/"], .nspp-messages-bubble a[href*="/space/"], a[href*="/space/"]:has(img), a[data-uid]';

// Only one popup card is open at a time, so page-wide close triggers are registered once and act on that card
// instead of each of the hundreds of cards on a list page listening to every scroll.
let openCard: { element: HTMLElement; anchor: HTMLAnchorElement; close(): void } | undefined;
let globalListeners = false;
function listenGlobally() {
  if (globalListeners) return; globalListeners = true;
  const closeOpen = () => openCard?.close();
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && openCard && !openCard.element.hidden) { const card = openCard; card.anchor.focus(); card.close(); } });
  document.addEventListener('pointerdown', event => { if (openCard && !openCard.element.contains(event.target as Node) && !openCard.anchor.contains(event.target as Node)) openCard.close(); });
  window.addEventListener('resize', closeOpen);
  window.addEventListener('scroll', closeOpen, { capture: true, passive: true });
}

const cards = new WeakMap<HTMLAnchorElement, { href: string; element: HTMLElement; users: number; dispose(): void }>();

export function isUserHoverAnchor(anchor: HTMLAnchorElement) {
  if (anchor.closest('.hover-user-card')) return false;
  const url = new URL(anchor.href, location.href);
  return url.origin === location.origin && /^\/space\/\d+\/?$/.test(url.pathname) && !url.search && !url.hash;
}

// /fans lists other users as native public .user-card; their avatar anchor gets our card rendered in place instead of a popup.
function listCard(anchor: HTMLAnchorElement) {
  if (location.pathname !== '/fans' || !anchor.parentElement?.matches('.user-head')) return undefined;
  const card = anchor.closest<HTMLElement>('.user-card:not(.hover-user-card)');
  return card && !card.querySelector('a[href^="/notification"]') ? card : undefined;
}

export function userHover(anchor: HTMLAnchorElement, ctx: Context) {
  let entry = cards.get(anchor);
  // Vue may reuse the anchor for another user; holders of the old card release it on their own.
  if (entry && entry.href !== anchor.href) { cards.delete(anchor); entry = undefined; }
  if (!entry) {
    const href = anchor.href;
    const replace = listCard(anchor);
    const title = anchor.getAttribute('title'); if (userHoverEnabled()) anchor.removeAttribute('title');
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
    header.append(avatar, mark, identity); element.append(header); if (actions) element.append(actions.element);
    if (replace) {
      element.classList.add('nspp-user-hover-inline'); element.hidden = false;
      // Keep the list layout: take over the native card's box size before hiding it.
      const box = getComputedStyle(replace); if (replace.getClientRects().length) element.style.width = box.width; element.style.margin = box.margin;
      replace.dataset.nsppReplaced = ''; replace.after(element);
      if (id) avatar.src = `/avatar/${id}.png`; actions?.refresh();
      entry = { href, element, users: 0, dispose: () => { controller.abort(); element.remove(); if (cards.get(anchor) === entry) cards.delete(anchor); if (!cards.get(anchor)?.element.classList.contains('nspp-user-hover-inline')) delete replace.dataset.nsppReplaced; if (title !== null) anchor.setAttribute('title', title); } };
      cards.set(anchor, entry);
    } else {
      // Stay detached until first opened: hundreds of hidden cards in the page doubled the DOM every scan walks.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const close = () => { clearTimeout(timer); if (!element.hidden) element.hidden = true; if (openCard?.element === element) openCard = undefined; };
      const open = () => {
        clearTimeout(timer); if (!anchor.isConnected) return;
        if (!userHoverEnabled() || document.hidden || innerWidth <= 700 || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        if (Array.from(document.querySelectorAll<HTMLElement>('.hover-user-card')).some(card => !card.hidden && card.getClientRects().length > 0)) return;
        if (openCard && openCard.element !== element) openCard.close();
        if (!element.isConnected) document.body.append(element);
        syncTags(); element.hidden = false; openCard = { element, anchor, close }; listenGlobally();
        actions?.refresh();
        if (id && !avatar.getAttribute('src')) avatar.src = `/avatar/${id}.png`;
        const rect = anchor.getBoundingClientRect();
        element.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - element.offsetWidth - 8))}px`;
        element.style.top = `${Math.max(8, Math.min(rect.bottom + 6, innerHeight - element.offsetHeight - 8))}px`;
      };
      const leave = () => { clearTimeout(timer); timer = setTimeout(close, 180); };
      anchor.addEventListener('mouseenter', () => { clearTimeout(timer); timer = setTimeout(open, 300); }, options);
      anchor.addEventListener('mouseleave', leave, options);
      anchor.addEventListener('focus', open, options);
      anchor.addEventListener('blur', leave, options);
      element.addEventListener('mouseenter', () => clearTimeout(timer), options);
      element.addEventListener('mouseleave', leave, options);
      element.addEventListener('focusin', () => clearTimeout(timer), options);
      element.addEventListener('focusout', leave, options);
      entry = { href, element, users: 0, dispose: () => { close(); controller.abort(); element.remove(); if (title !== null) anchor.setAttribute('title', title); if (cards.get(anchor) === entry) cards.delete(anchor); } };
      cards.set(anchor, entry);
    }
  }
  entry = entry!;
  entry.users++;
  const shared = entry; let released = false;
  const release = () => { if (released) return; released = true; if (--shared.users === 0) shared.dispose(); };
  ctx.signal.addEventListener('abort', release, { once: true });
  return { element: shared.element, inline: shared.element.classList.contains('nspp-user-hover-inline'), release };
}
