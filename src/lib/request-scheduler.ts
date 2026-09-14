export function requestConcurrency(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(1, Math.min(10, Math.floor(value))) : 4;
}

export function requestInterval(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(5000, Math.floor(value))) : 200;
}

export function retryDelay(value: string | null, now = Date.now()): number {
  if (!value) return 60_000;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now;
  return Number.isFinite(delay) ? Math.max(60_000, delay) : 60_000;
}

export function createRequestQueue(limit: () => number = () => 1, interval: () => number = () => 0) {
  const pending: { priority: number; run(): Promise<void> }[] = [];
  let active = 0;
  let lastStarted = -Infinity;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const drain = () => {
    clearTimeout(timer);
    while (pending.length && active < requestConcurrency(limit())) {
      const delay = lastStarted + requestInterval(interval()) - Date.now();
      if (delay > 0) { timer = setTimeout(drain, delay); return; }
      pending.sort((a, b) => a.priority - b.priority);
      active++;
      lastStarted = Date.now();
      void pending.shift()!.run().finally(() => { active--; drain(); });
    }
  };
  return <T>(task: () => Promise<T>, priority = 0): Promise<T> => new Promise((resolve, reject) => {
    pending.push({ priority, run: async () => { try { resolve(await task()); } catch (error) { reject(error); } } });
    void drain();
  });
}
