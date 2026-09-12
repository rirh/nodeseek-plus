import type { Context } from '../core/types';
import { postURL, reactionCounts, type PostAction } from '../features/post-interaction-data';

type NativeEditor = { getValue(): string; setValue(value: string): void };
export function createPostInteraction(ctx: Context, update: (url: string, counts: (number | null)[]) => void) {
  const view = document.createElement('li'); view.className = 'nspp-interaction'; view.hidden = true;
  view.setAttribute('aria-label', '帖子互动'); view.setAttribute('role', 'region');
  const head = document.createElement('header');
  const title = document.createElement('a'); title.target = '_blank'; title.rel = 'noopener noreferrer';
  const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', '关闭互动');
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  const form = document.createElement('form');
  const input = document.createElement('textarea'); input.rows = 4; input.placeholder = '写下回复，支持 Markdown…'; input.setAttribute('aria-label', '回复内容');
  const footer = document.createElement('div'); footer.className = 'nspp-reply-actions';
  const hint = document.createElement('span'); hint.textContent = 'Markdown · 草稿暂存在本页';
  const send = document.createElement('button'); send.type = 'submit'; send.textContent = '发送回复'; send.disabled = true;
  footer.append(hint, send); form.append(input, footer); head.append(title, close); view.append(head, status, form);
  // The bridge preserves the site's submission/authentication contract, without rendering its page in our view.
  const frame = document.createElement('iframe'); frame.hidden = true; frame.tabIndex = -1; frame.setAttribute('aria-hidden', 'true'); frame.title = '互动连接';
  document.body.append(frame);
  let url = '', action: PostAction = '回复', pending = false, sending = false;
  const drafts = new Map<string, string>();
  let observer: MutationObserver | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let scheduled: ReturnType<typeof setTimeout> | undefined;
  let previousCounts: (number | null)[] = [];
  let didSubmit = false;
  let quickText: string | undefined;
  let quickCompletion: ((result: string) => void) | undefined;
  const finishQuick = (message: string) => { const done = quickCompletion; quickCompletion = undefined; quickText = undefined; done?.(message); };
  const busy = (value: boolean) => { if (value) status.setAttribute('aria-busy', 'true'); else status.removeAttribute('aria-busy'); };
  const save = () => { if (url) drafts.set(url, input.value); };
  input.addEventListener('input', save, { signal: ctx.signal });
  close.addEventListener('click', () => { save(); pending = false; view.hidden = true; }, { signal: ctx.signal });
  view.addEventListener('keydown', event => { if (event.key === 'Escape') { save(); pending = false; view.hidden = true; } }, { signal: ctx.signal });
  function native() {
    const doc = frame.contentDocument;
    if (!doc || doc.location.origin !== location.origin || postURL(doc.location.href, location.origin)?.href !== url) return;
    const host = doc.querySelector<HTMLElement>('.md-editor');
    const cm = (host?.querySelector('.CodeMirror') as (HTMLElement & { CodeMirror?: NativeEditor }) | null)?.CodeMirror;
    const ta = host?.querySelector<HTMLTextAreaElement>('textarea');
    const submit = host?.querySelector<HTMLButtonElement>('button.submit.btn.focus-visible, button[type="submit"]');
    return { doc, cm, ta, submit, read: () => cm ? cm.getValue() : ta?.value ?? '' };
  }
  function sync() {
    try {
      const state = native(); if (!state) return;
      const { doc, cm, ta, submit, read } = state;
      const counts = reactionCounts(doc); update(url, counts);
      send.disabled = sending || !(cm || ta) || !submit || submit.disabled;
      const alert = Array.from(doc.querySelectorAll('[role="alert"], .el-message--error, .el-notification--error')).map(el => el.textContent?.trim()).filter(Boolean).join(' ');
      if (alert) { status.textContent = alert; busy(false); if (sending) { sending = false; send.disabled = true; status.textContent += '；草稿已保留，请打开原帖核实后再试。'; finishQuick(status.textContent); } }
      if (sending && didSubmit && !submit?.disabled && read() === '') {
        sending = false; didSubmit = false; input.value = ''; save(); busy(false); clearTimeout(timeout);
        send.disabled = false; status.textContent = '回复已提交。'; finishQuick('回复已提交。');
      }
      if (quickCompletion && quickText !== undefined && !sending && (cm || ta) && submit && !submit.disabled && !alert) {
        input.value = quickText; quickText = undefined; pending = false; form.requestSubmit(); return;
      }
      if (alert && quickCompletion && !sending) finishQuick(alert);
      if (!pending && action === '引用' && !input.value && read()) { input.value = read(); save(); busy(false); clearTimeout(timeout); status.textContent = ''; }
      if (!pending || view.hidden || alert) return;
      const menu = doc.querySelector('.nsk-post .comment-menu, .comment-menu');
      if (action === '回复' && (cm || ta) && submit) {
        pending = false; busy(false); clearTimeout(timeout); status.textContent = ''; send.disabled = !!submit.disabled; return;
      }
      const target = menu && Array.from(menu.querySelectorAll<HTMLElement>('.menu-item')).find(el => el.title === action || el.textContent?.trim() === action);
      if (!target) return;
      pending = false;
      if (action === '引用' && input.value.trim()) { busy(false); status.textContent = '已保留当前草稿；清空后再引用。'; return; }
      previousCounts = counts;
      target.click();
      if (action === '引用') {
        // Vue may update the editor on the next microtask.
        scheduled = setTimeout(() => { const next = native(); if (next?.read()) { input.value = next.read(); save(); busy(false); clearTimeout(timeout); status.textContent = ''; } }, 100);
      } else {
        busy(false); status.textContent = `${action}请求已交给论坛，正在确认结果…`;
      }
    } catch { busy(false); status.textContent = '连接暂不可用，草稿已保留。'; finishQuick(status.textContent); }
  }
  frame.addEventListener('load', () => {
    observer?.disconnect();
    try {
      const state = native(); if (!state) throw new Error('连接不可用');
      observer = new MutationObserver(() => {
        clearTimeout(scheduled);
        scheduled = setTimeout(() => {
          sync();
          if (!pending && !sending && action !== '回复' && action !== '引用') {
            const counts = reactionCounts(state.doc);
            if (counts.some((n, i) => n !== null && n !== previousCounts[i])) { clearTimeout(timeout); busy(false); status.textContent = `${action}状态已更新`; previousCounts = counts; }
          }
        }, 60);
      });
      observer.observe(state.doc.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'disabled'] });
      sync();
      if (pending) { busy(false); status.textContent = '正在等待互动连接；若需要登录或验证，请点击标题打开原帖。'; }
    } catch { busy(false); status.textContent = '无法连接帖子，请检查登录状态后重试。'; finishQuick(status.textContent); }
  }, { signal: ctx.signal });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (sending || send.disabled || !input.value.trim()) return;
    try {
      const state = native(); if (!state?.submit || state.submit.disabled) return;
      if (state.cm) state.cm.setValue(input.value);
      else if (state.ta) { state.ta.value = input.value; state.ta.dispatchEvent(new Event('input', { bubbles: true })); }
      save(); sending = true; didSubmit = false; send.disabled = true; busy(true); status.textContent = '正在发送回复…';
      state.submit.click(); didSubmit = true;
      clearTimeout(timeout);
      timeout = setTimeout(() => { if (sending) { busy(false); status.textContent = '尚未确认发送结果，草稿已保留，请勿重复发送。'; finishQuick(status.textContent); } }, 20000);
    } catch { busy(false); status.textContent = '发送结果未确认，草稿已保留，请勿重复发送。'; finishQuick(status.textContent); }
  }, { signal: ctx.signal });
  return {
    quickReply(link: HTMLAnchorElement, text: string): Promise<string> {
      const target = postURL(link.href, location.origin);
      if (!target || !text.trim()) return Promise.resolve('回复内容或帖子地址无效。');
      if (sending || quickCompletion) return Promise.resolve('上一条回复正在发送或结果尚未确认，请勿重复发送。');
      save(); link.closest('.post-list-item')?.after(view); view.hidden = true; form.hidden = false; action = '回复'; pending = false;
      return new Promise(resolve => {
        quickCompletion = resolve; quickText = text;
        clearTimeout(timeout);
        timeout = setTimeout(() => finishQuick('连接超时，未发送回复；请检查登录状态或站点验证。'), 20000);
        if (url !== target.href) { url = target.href; observer?.disconnect(); clearTimeout(scheduled); frame.src = url; } else sync();
      });
    },
    open(link: HTMLAnchorElement, next: PostAction) {
      const target = postURL(link.href, location.origin); if (!target) return;
      if (sending || quickCompletion) { view.hidden = false; ctx.notify('上一条回复的发送结果尚未确认，请先查看原帖。'); return; }
      save();
      title.textContent = link.textContent?.trim() || '打开原帖'; title.href = target.href;
      action = next; pending = true; form.hidden = next !== '回复' && next !== '引用';
      link.closest('.post-list-item')?.after(view); view.hidden = false;
      clearTimeout(timeout); busy(true); status.textContent = '正在连接帖子…';
      timeout = setTimeout(() => { pending = false; busy(false); status.textContent = '站点尚未确认操作，可能需要登录或额外验证。可点击标题打开原帖；草稿已保留。'; }, 20000);
      if (url !== target.href) { url = target.href; input.value = drafts.get(url) || ''; send.disabled = true; observer?.disconnect(); clearTimeout(scheduled); frame.src = url; } else sync();
      if (!form.hidden) input.focus();
    },
    destroy() { finishQuick('操作已取消。'); pending = false; clearTimeout(timeout); clearTimeout(scheduled); observer?.disconnect(); frame.remove(); view.remove(); drafts.clear(); },
  };
}
