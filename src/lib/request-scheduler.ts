export function retryDelay(value: string | null, now = Date.now()): number {
  if (!value) return 60_000;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now;
  return Number.isFinite(delay) ? Math.max(60_000, delay) : 60_000;
}

export function createRequestQueue() {
  const pending: { priority: number; run(): Promise<void> }[] = [];
  let active = false;
  const drain = async () => {
    if (active) return;
    active = true;
    while (pending.length) {
      pending.sort((a, b) => a.priority - b.priority);
      await pending.shift()!.run();
    }
    active = false;
  };
  return <T>(task: () => Promise<T>, priority = 0): Promise<T> => new Promise((resolve, reject) => {
    pending.push({ priority, run: async () => { try { resolve(await task()); } catch (error) { reject(error); } } });
    void drain();
  });
}
