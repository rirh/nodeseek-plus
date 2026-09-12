// Adapted from NodeSeek X (GPL-3.0); see docs/feature-matrix.md.
type Rule = { scopes: string[]; test: (name: string) => boolean };
type Rules = { allow: Rule[]; block: Rule[]; paths: { scopes: string[]; regex: RegExp }[] };
export function parseLinkRules(text: string): Rules {
  const rules: Rules = { allow: [], block: [], paths: [] }; const macros = new Map<string, string[]>();
  const wildcard = (text: string) => new RegExp(`^${text.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`, 'i');
  for (const raw of text.split('\n')) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    if (line.startsWith('@') && line.includes('=')) { const i = line.indexOf('='); macros.set(line.slice(0, i).trim(), line.slice(i + 1).split(',').map(s => s.trim())); continue; }
    const split = line.includes('>>') ? line.split('>>') : line.split(/\s+/, 2);
    if (split.length !== 2) continue;
    const scopes = split[0].trim().split(/\s+/).map(s => s.replace(/^~/, '').toLowerCase());
    const allow = split[0].trim().startsWith('~');
    for (const entry of split[1].split(',').flatMap(s => macros.get(s.trim()) || [s.trim()])) {
      if (!entry) continue;
      if (entry.startsWith('/') && entry.endsWith('/')) { if (!allow) try { rules.paths.push({ scopes, regex: new RegExp(entry.slice(1, -1)) }); } catch { /* Ignore invalid regex. */ } }
      else { const regex = wildcard(entry); rules[allow ? 'allow' : 'block'].push({ scopes, test: name => regex.test(name) }); }
    }
  }
  return rules;
}
export function cleanLink(url: URL, rules: Rules): URL {
  if (!/^https?:$/.test(url.protocol)) return url;
  const scope = (scopes: string[]) => scopes.some(s => s === '*' || url.hostname === s || url.hostname.endsWith(`.${s}`) || (s.endsWith('*') && url.hostname.startsWith(s.slice(0, -1))));
  const clean = (value: string) => {
    const params = new URLSearchParams(value); let changed = false;
    for (const key of [...params.keys()]) if (!rules.allow.some(r => scope(r.scopes) && r.test(key)) && rules.block.some(r => scope(r.scopes) && r.test(key))) { params.delete(key); changed = true; }
    return changed ? params.toString() : null;
  };
  const query = clean(url.search); if (query !== null) url.search = query;
  if (url.hash.includes('?')) { const i = url.hash.indexOf('?'); const hashQuery = clean(url.hash.slice(i + 1)); if (hashQuery !== null) url.hash = url.hash.slice(0, i) + (hashQuery ? `?${hashQuery}` : ''); }
  for (const rule of rules.paths) if (scope(rule.scopes)) { const path = url.pathname.replace(rule.regex, ''); if (path !== url.pathname) url.pathname = path.replace(/\/+/g, '/') || '/'; }
  return url;
}
export function footprintHref(post: number, floor: number, perPage = 10): string {
  return `/post-${post}-${Math.max(1, Math.ceil(floor / Math.max(1, perPage)))}#${floor}`;
}
