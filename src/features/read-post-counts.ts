import type { Context } from '../core/types';
import { postURL, reactionCounts } from './post-interaction-data';

export async function readPostCounts(ctx: Context, href: string): Promise<(number | null)[]> {
  const url = postURL(href, location.origin);
  if (!url || ctx.signal.aborted) throw new Error('计数读取已取消');
  const html = await ctx.request<string>(url.href, { responseType: 'text' });
  if (ctx.signal.aborted) throw new Error('计数读取已取消');
  const counts = reactionCounts(new DOMParser().parseFromString(html, 'text/html'));
  if (counts.every(value => value !== null)) return counts;
  // The forum hydrates its menu client-side. This isolated reader never clicks controls.
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.hidden = true; frame.tabIndex = -1; frame.title = '读取互动计数'; frame.setAttribute('aria-hidden', 'true');
    let observer: MutationObserver | undefined;
    let settled = false;
    const finish = (value?: (number | null)[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer); observer?.disconnect(); ctx.signal.removeEventListener('abort', abort); frame.remove();
      if (value) resolve(value); else reject(new Error('暂时无法读取计数'));
    };
    const abort = () => finish();
    const timer = setTimeout(() => finish(), 15000);
    const inspect = () => {
      try {
        const doc = frame.contentDocument;
        if (!doc || postURL(doc.location.href, location.origin)?.href !== url.href) return;
        const values = reactionCounts(doc);
        if (values.every(value => value !== null)) finish(values);
      } catch { finish(); }
    };
    frame.addEventListener('load', () => {
      if (settled) return;
      try {
        observer?.disconnect();
        const doc = frame.contentDocument;
        if (!doc?.body || postURL(doc.location.href, location.origin)?.href !== url.href) { finish(); return; }
        observer = new MutationObserver(inspect);
        observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
        inspect();
      } catch { finish(); }
    });
    ctx.signal.addEventListener('abort', abort, { once: true });
    frame.src = url.href; document.body.append(frame);
  });
}
