import type { UserProfile } from '../features/user-profile';

export function profileTagKey(label: string): string {
  if (/^(管理|管理员|admin|administrator)$/i.test(label)) return 'admin';
  if (/^(创建者|站点创建者|founder)$/i.test(label)) return 'founder';
  if (/^(服主|拥有者|所有者|站点拥有者|owner)$/i.test(label)) return 'owner';
  if (/^(代理商|agency)$/i.test(label)) return 'agency';
  if (/^(博主|blog-owner)$/i.test(label)) return 'blog-owner';
  return label;
}

export function renderProfileTags(target: HTMLElement, user: UserProfile) {
  const labels = new Map<string, string>();
  if (user.isAdmin === true || (typeof user.isAdmin === 'number' && user.isAdmin > 0)) labels.set('admin', '管理');
  for (const role of Array.isArray(user.roles) ? user.roles : []) {
    const name = typeof role === 'string' ? role : role?.name || role?.title;
    if (typeof name !== 'string' || !name.trim()) continue;
    const label = name.trim(); const key = profileTagKey(label);
    labels.set(key, ({ admin: '管理', founder: '创建者', owner: '服主', agency: '代理商', 'blog-owner': '博主' } as Record<string, string>)[key] || label);
  }
  target.replaceChildren();
  for (const [key, label] of labels) {
    const tag = document.createElement('span'); tag.className = 'role-tag nspp-profile-role'; tag.textContent = label;
    if (['admin', 'founder', 'owner'].includes(key)) tag.dataset.nsppRole = key;
    target.append(tag);
  }
  target.hidden = !labels.size;
}
