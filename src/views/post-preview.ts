import type { Context } from '../core/types';

export type PreviewAction = 'preview' | 'interact' | 'quote' | 'reply';
// Copy only reading content; remote markup never supplies executable attributes or UI.
function readingContent(source: Element, base: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const allowed = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'S', 'DEL', 'BLOCKQUOTE', 'PRE', 'CODE', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'HR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'A', 'IMG']);
  const copy = (node: Node, parent: Node) => {
    if (node.nodeType === Node.TEXT_NODE) { parent.appendChild(document.createTextNode(node.textContent || '')); return; }
    if (!(node instanceof Element) || node.matches('script, style, iframe, object, embed, form, input, button, textarea, select, svg, math, link, meta, base')) return;
    if (!allowed.has(node.tagName)) { node.childNodes.forEach(child => copy(child, parent)); return; }
    const el = document.createElement(node.tagName.toLowerCase());
    if (node.tagName === 'A' || node.tagName === 'IMG') {
      const attribute = node.tagName === 'A' ? 'href' : 'src';
      const raw = node.getAttribute(attribute);
      if (!raw) return;
      let url: URL;
      try { url = new URL(raw, base); } catch { return; }
      if (!['http:', 'https:'].includes(url.protocol)) return;
      el.setAttribute(attribute, url.href);
      if (el instanceof HTMLAnchorElement) { el.target = '_blank'; el.rel = 'noopener noreferrer'; }
      if (el instanceof HTMLImageElement) { el.alt = node.getAttribute('alt') || ''; el.loading = 'lazy'; }
    }
    node.childNodes.forEach(child => copy(child, el));
    parent.appendChild(el);
  };
  source.childNodes.forEach(node => copy(node, fragment));
  return fragment;
}

export function createPostPreview(ctx: Context) {
  const view = document.createElement('dialog');
  view.className = 'nspp-post-preview'; view.hidden = true;
  view.setAttribute('role', 'dialog'); view.setAttribute('aria-label', '帖子预览');
  const header = document.createElement('header');
  const title = document.createElement('a'); title.target = '_blank'; title.rel = 'noopener noreferrer';
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  const content = document.createElement('div'); content.className = 'nspp-preview-content';
  const footer = document.createElement('footer');
  const original = document.createElement('a'); original.textContent = '查看原帖与回复 ↗'; original.target = '_blank'; original.rel = 'noopener noreferrer';
  footer.append(original); header.append(title); view.append(header, status, content, footer); document.body.append(view);
  let source: HTMLAnchorElement | undefined;
  let current = '';
  let actionsObserver: MutationObserver | undefined;
  const renderActions = () => {
    const bar = source?.closest('.post-list-item')?.querySelector('.nspp-list-actions');
    footer.replaceChildren();
    if (bar) {
      const actions = document.createElement('div'); actions.className = 'nspp-list-actions';
      bar.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
        const copy = button.cloneNode(true) as HTMLButtonElement;
        copy.removeAttribute('id');
        copy.addEventListener('click', () => { if (!button.isConnected || button.disabled) return; hide(); button.click(); }, { signal: ctx.signal });
        actions.append(copy);
      });
      footer.append(actions);
    }
    footer.append(original);
  };
  let request: AbortController | undefined;
  const mobile = () => matchMedia('(max-width: 600px), (hover: none)').matches;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  const keepOpen = () => clearTimeout(closeTimer);
  const hide = () => { request?.abort(); keepOpen(); view.close(); view.hidden = true; };
  const scheduleClose = () => {
    if (mobile()) return;
    keepOpen(); closeTimer = setTimeout(hide, 220);
  };
  view.addEventListener('mouseenter', keepOpen, { signal: ctx.signal });
  view.addEventListener('mouseleave', scheduleClose, { signal: ctx.signal });
  const position = () => {
    if (view.hidden || !source) return;
    if (mobile()) { view.style.removeProperty('left'); view.style.removeProperty('top'); return; }
    const anchor = source.getBoundingClientRect();
    const margin = 12, gap = 8;
    const width = view.getBoundingClientRect().width;
    const height = view.getBoundingClientRect().height;
    const below = innerHeight - anchor.bottom - gap - margin;
    const above = anchor.top - gap - margin;
    const top = below >= height || below >= above ? anchor.bottom + gap : anchor.top - height - gap;
    view.style.left = `${Math.max(margin, Math.min(anchor.left, innerWidth - width - margin))}px`;
    view.style.top = `${Math.max(margin, Math.min(top, innerHeight - height - margin))}px`;
  };
  view.addEventListener('cancel', event => { event.preventDefault(); hide(); }, { signal: ctx.signal });
  view.addEventListener('click', event => {
    if (!mobile() || event.target !== view) return;
    const box = view.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) hide();
  }, { signal: ctx.signal });
  window.addEventListener('resize', position, { signal: ctx.signal });
  window.addEventListener('scroll', position, { capture: true, signal: ctx.signal });
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(position) : undefined;
  resize?.observe(view);
  async function load(url: URL) {
    request?.abort();
    const controller = new AbortController(); request = controller;
    status.textContent = '正在加载帖子…'; status.setAttribute('aria-busy', 'true'); content.replaceChildren();
    try {
      const html = await ctx.request<string>(url.href, { responseType: 'text', signal: AbortSignal.any([ctx.signal, controller.signal]) });
      if (controller.signal.aborted || ctx.signal.aborted) return;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const body = doc.querySelector('.nsk-post .post-content, .nsk-post .nsk-content, .post-content, .nsk-post .markdown-body, .nsk-content');
      if (!body) throw new Error('未找到正文');
      const author = doc.querySelector('.nsk-post .author-info, .author-info');
      const meta = document.createElement('div'); meta.className = 'nspp-preview-meta';
      meta.textContent = author?.textContent?.trim() || '';
      const article = document.createElement('article'); article.append(readingContent(body, url.href));
      content.append(meta, article);
      const comments = Array.from(doc.querySelectorAll('.comment-content')).filter(node => !body.contains(node));
      if (comments.length) {
        const heading = document.createElement('h3'); heading.textContent = '回复摘选（当前页前 5 条）'; content.append(heading);
        for (const comment of comments.slice(0, 5)) {
          const item = document.createElement('section'); item.className = 'nspp-preview-comment';
          const name = document.createElement('strong'); name.textContent = comment.closest('li, .comment-container')?.querySelector('.author-info, .info-author')?.textContent?.trim() || '回复';
          item.append(name, readingContent(comment, url.href)); content.append(item);
        }
      }
      status.textContent = '';
    } catch {
      if (controller.signal.aborted || ctx.signal.aborted) return;
      current = ''; status.textContent = '暂时无法读取正文，请打开原帖查看或完成登录验证。';
    } finally { if (!controller.signal.aborted) { status.removeAttribute('aria-busy'); position(); } }
  }
  return {
    open(link: HTMLAnchorElement, action: PreviewAction) {
      const url = new URL(link.href, location.origin);
      if (url.origin !== location.origin || !/^\/post-\d+(?:-\d+)?(?:\.html)?\/?$/.test(url.pathname)) return;
      if (action !== 'preview') { window.open(url.href, '_blank', 'noopener,noreferrer'); return; }
      keepOpen();
      if (!view.hidden && source === link) return;
      source = link; title.textContent = link.textContent?.trim() || '打开原帖'; title.href = original.href = url.href;
      actionsObserver?.disconnect();
      renderActions();
      const row = source.closest('.post-list-item');
      if (row) { actionsObserver = new MutationObserver(renderActions); actionsObserver.observe(row, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'aria-busy', 'data-blocked'] }); }
      view.hidden = false;
      if (!view.open) { if (mobile()) view.showModal(); else view.show(); }
      if (current !== url.href) { current = url.href; void load(url); }
      position();
    },
    keepOpen,
    scheduleClose,
    destroy() { keepOpen(); view.close(); actionsObserver?.disconnect(); resize?.disconnect(); request?.abort(); view.remove(); },
  };
}
