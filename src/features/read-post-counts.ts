import type { Context } from '../core/types';
import { postURL, reactionCounts } from './post-interaction-data';

export async function readPostCounts(ctx: Context, href: string): Promise<(number | null)[]> {
  const url = postURL(href, location.origin);
  if (!url || ctx.signal.aborted) throw new Error('计数读取已取消');
  const html = await ctx.request<string>(url.href, { responseType: 'text' });
  if (ctx.signal.aborted) throw new Error('计数读取已取消');
  const counts = reactionCounts(new DOMParser().parseFromString(html, 'text/html'));
  // Unknown counts stay empty; opening a hidden page would repeat the request and its subresources.
  return counts;
}
