import { GM_getValue, GM_setValue } from './userscript';

type Lease = { started: number; until: number; owner: string };
/** Skip instead of queuing. Persistent timestamps also throttle sequential tabs and reloads. */
export async function withTabLock(name: string, intervalMs: number, task: () => Promise<void>): Promise<boolean> {
  const key = `nspp:lock:${location.hostname}:${name}`;
  const owner = crypto.randomUUID();
  const execute = async (): Promise<boolean> => {
    const now = Date.now(); const previous = GM_getValue<Lease | null>(key, null);
    if (previous && (now - previous.started < intervalMs || previous.until > now)) return false;
    GM_setValue(key, { started: now, until: now + 120000, owner });
    // Without Web Locks, GM storage offers only a best-effort lease, not atomic compare-and-set.
    if (GM_getValue<Lease | null>(key, null)?.owner !== owner) return false;
    try { await task(); return true; }
    finally {
      const current = GM_getValue<Lease | null>(key, null);
      if (current?.owner === owner) GM_setValue(key, { ...current, until: 0 });
    }
  };
  if (navigator.locks?.request) return navigator.locks.request(key, { ifAvailable: true }, lock => lock ? execute() : false);
  return execute();
}
