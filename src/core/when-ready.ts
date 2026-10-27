import type { Context } from './types';

/**
 * Retry `initialize` on page changes and every second until it returns a cleanup (e.g. once the
 * delayed login config appears), then stop both the watcher and the timer.
 */
export function whenReady(ctx: Context, initialize: () => (() => void) | undefined): () => void {
  let cleanup: (() => void) | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let stopWatch: (() => void) | undefined;
  const start = () => {
    if (cleanup || ctx.signal.aborted) return;
    cleanup = initialize();
    if (cleanup) { stopWatch?.(); clearInterval(timer); }
  };
  stopWatch = ctx.watch(start);
  if (cleanup) stopWatch();
  else timer = setInterval(start, 1000);
  return () => { stopWatch?.(); clearInterval(timer); cleanup?.(); };
}
