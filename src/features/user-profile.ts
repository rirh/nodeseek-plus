export interface UserProfile { signature?: string; bio?: string; introduction?: string; signature_text?: string; coin?: number; stardust?: number; fans?: number; rank?: number; created_at?: string | number; nPost?: number; nComment?: number; }
// User-provided forum age: 1388 days on 2026-09-12 (UTC+8).
export function forumAge(now = Date.now()) {
  const baseline = Date.parse('2026-09-12T00:00:00+08:00');
  return Math.max(1, 1388 + Math.floor((now - baseline) / 86400000));
}

export function registration(user: UserProfile, now = Date.now()) {
  const raw = user.created_at;
  const timestamp = typeof raw === 'number' ? (raw < 1e12 ? raw * 1000 : raw) : typeof raw === 'string' && raw.trim() ? Date.parse(raw) : NaN;
  const days = Number.isFinite(timestamp) && timestamp <= now ? Math.floor((now - timestamp) / 86400000) : null;
  const tone = days === null ? 'unknown' : days < 7 ? 'new' : days < 30 ? 'recent' : days < 365 ? 'member' : 'longtime';
  const label = { unknown: '注册时间未知', new: '新加入', recent: '新成员', member: '成员', longtime: '长期成员' }[tone];
  const coin = user.coin === undefined || user.coin === null ? NaN : Number(user.coin);
  const level = Number.isInteger(user.rank) && user.rank! >= 0 && user.rank! <= 6 ? user.rank!
    : Number.isFinite(coin) ? Math.min(6, Math.floor(Math.sqrt(Math.max(0, coin)) / 10)) : null;
  return { days, tone, label, level, timestamp };
}
export function authorId(el: Element, base: string): string | undefined {
  const own = el.getAttribute('data-uid');
  if (own && /^\d+$/.test(own)) return own;
  const href = el.getAttribute('href');
  if (!href) return;
  try {
    const url = new URL(href, base);
    if (url.origin !== new URL(base).origin) return;
    return url.pathname.match(/^\/space\/(\d+)(?:\/|$)/)?.[1] || url.searchParams.get('uid')?.match(/^\d+$/)?.[0];
  } catch { return; }
}

// Local participation heuristic, not an official reputation or transaction rating.
export function trustScore(user: UserProfile, now = Date.now()) {
  const days = registration(user, now).days;
  const validCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  if (days === null || !validCount(user.nPost) || !validCount(user.nComment) || !validCount(user.fans)
    || !Number.isSafeInteger(user.coin) || !Number.isSafeInteger(user.stardust)) return null;
  const points = (value: number, cap: number, weight: number) => weight * Math.log1p(Math.min(value, cap)) / Math.log1p(cap);
  const age = 35 * Math.sqrt(Math.min(days, 730) / 730);
  const posts = points(user.nPost, 300, 20);
  const comments = points(user.nComment, 2000, 20);
  const coin = points(Math.max(0, user.coin!), 6000, 10);
  const stardust = points(Math.max(0, user.stardust!), 500, 10);
  const fans = points(user.fans, 50, 5);
  return { score: Math.round(age + posts + comments + coin + stardust + fans), age, posts, comments, coin, stardust, fans };
}
