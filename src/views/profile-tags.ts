import type { UserProfile } from '../features/user-profile';

export function profileTagKey(label: string): string {
  if (/^(管理|管理员|admin|administrator)$/i.test(label)) return 'admin';
  if (/^(创建者|站点创建者|founder)$/i.test(label)) return 'founder';
  if (/^(服主|拥有者|所有者|站点拥有者|owner|creater)$/i.test(label)) return 'owner';
  if (/^(代理商|agency)$/i.test(label)) return 'agency';
  if (/^(博主|blog-owner)$/i.test(label)) return 'blog-owner';
  if (/^(封禁|已封禁|banned)$/i.test(label)) return 'banned';
  if (/^(诈骗|骗子|fraud)$/i.test(label)) return 'fraud';
  return label;
}

export function renderProfileTags(target: HTMLElement, user: UserProfile) {
  const labels = new Map<string, string>();
  if (user.isAdmin === true || (typeof user.isAdmin === 'number' && user.isAdmin > 0)) labels.set('admin', '管理');
  for (const role of Array.isArray(user.roles) ? user.roles : []) {
    // The API sends { name: 'fraud', display_text: '骗子' }; show the site's Chinese text, not the internal name.
    const name = typeof role === 'string' ? role : role?.display_text || role?.title || role?.name;
    if (typeof name !== 'string' || !name.trim()) continue;
    const label = name.trim(); const key = profileTagKey(label);
    const display = typeof role === 'string' ? undefined : role?.display_text?.trim();
    labels.set(key, display || ({ admin: '管理', founder: '创建者', owner: '服主', agency: '代理商', 'blog-owner': '博主', banned: '封禁', fraud: '诈骗' } as Record<string, string>)[key] || label);
  }
  target.replaceChildren();
  for (const [key, label] of labels) {
    const tag = document.createElement('span'); tag.className = 'role-tag nspp-profile-role'; tag.textContent = label;
    if (['admin', 'founder', 'owner'].includes(key)) tag.dataset.nsppRole = key;
    target.append(tag);
  }
  target.hidden = !labels.size;
}
