import type { Context } from '../core/types';
import { GM_getValue, GM_setValue } from '../lib/userscript';
import { registration, trustScore, type UserProfile } from '../features/user-profile';
import { renderProfileTags } from './profile-tags';

export function createChatProfile(ctx: Context) {
  const card = document.createElement('section'); card.className = 'nspp-chat-profile'; card.hidden = true; card.setAttribute('aria-label', '对方资料');
  let current: number | undefined, controller = new AbortController();
  async function show(id?: number, name = '') {
    if (id === current) {
      if (id && name && name !== `用户 ${id}`) {
        const heading = card.querySelector('.nspp-chat-profile-heading > strong'); if (heading && heading.textContent !== name) heading.textContent = name;
        const image = card.querySelector<HTMLImageElement>(':scope > a > img'); if (image) image.alt = name;
      }
      return;
    }
    current = id; controller.abort(); controller = new AbortController(); card.replaceChildren(); card.hidden = !id; card.dataset.trust = 'unknown';
    if (!id) return;
    const avatarLink = document.createElement('a'); avatarLink.href = `/space/${id}`; avatarLink.target = '_blank'; avatarLink.rel = 'noopener noreferrer';
    const image = document.createElement('img'); image.src = `/avatar/${id}.png`; image.alt = name; image.className = 'nspp-messages-avatar'; avatarLink.append(image);
    const details = document.createElement('div'); details.className = 'nspp-chat-profile-details';
    const heading = document.createElement('strong'); heading.textContent = name || `用户 ${id}`;
    const headingRow = document.createElement('div'); headingRow.className = 'nspp-chat-profile-heading';
    const tags = document.createElement('span'); tags.className = 'nspp-user-profile-tags'; headingRow.append(heading, tags);
    const level = document.createElement('span'); level.className = 'nspp-chat-profile-level'; level.hidden = true; headingRow.append(level);
    const meta = document.createElement('div'); meta.className = 'nspp-chat-profile-meta'; meta.textContent = `UID ${id}`;
    const data = document.createElement('div'); data.className = 'nspp-chat-profile-data'; data.textContent = '正在读取用户资料…';
    const bio = document.createElement('p'); bio.className = 'nspp-chat-profile-bio'; bio.hidden = true;
    const trust = document.createElement('div'); trust.className = 'nspp-chat-profile-trust'; trust.hidden = true; trust.title = '根据公开资料计算的本地参考分';
    const points = document.createElement('strong'); const caption = document.createElement('span'); caption.textContent = '信任分'; trust.append(points, caption);
    const notice = document.createElement('p'); notice.className = 'nspp-chat-profile-notice'; notice.hidden = true;
    details.append(headingRow, bio, meta); card.append(avatarLink, details, trust, data, notice);
    const signal = AbortSignal.any([ctx.signal, controller.signal]);
    try {
      const key = `nspp:state:${location.hostname}:user-level`;
      type State = { profiles?: Record<string, { time: number; user: UserProfile }> };
      const saved = GM_getValue<State>(key, {}).profiles?.[String(id)];
      let user = saved && Date.now() >= saved.time && Date.now() - saved.time < 86400000 ? saved.user : undefined;
      if (!user) {
        const result = await ctx.request<{ success?: boolean; detail?: UserProfile }>(`/api/account/getInfo/${id}`, { signal });
        if (!result.success || !result.detail) throw new Error('资料暂不可用');
        user = result.detail;
        if (signal.aborted) return;
        const state = GM_getValue<State>(key, {}); state.profiles ||= {}; state.profiles[id] = { time: Date.now(), user }; GM_setValue(key, state);
      }
      if (signal.aborted) return;
      if (user.member_name?.trim()) { heading.textContent = user.member_name.trim(); image.alt = user.member_name.trim(); }
      renderProfileTags(tags, user);
      const info = registration(user), score = trustScore(user);
      const tier = !score ? 'unknown' : score.score === 100 ? 'perfect' : score.score >= 70 ? 'success' : score.score >= 40 ? 'warning' : 'danger';
      card.dataset.trust = tier;
      notice.hidden = false;
      notice.textContent = !score ? '资料不完整，暂不评分；交易前请核实身份与历史记录。'
        : tier === 'danger' ? '参与记录较少，交易前请核实身份与历史记录；低分不代表不良行为。'
        : tier === 'warning' ? '资料仅供参考，交易前请独立核实；分数不代表交易信用。'
        : '参与记录较充分，分数仍是本地参考，不代表交易信用。';
      level.textContent = info.level === null ? '' : `Lv ${info.level}`; level.hidden = info.level === null;
      meta.textContent = `UID ${id}${info.days === null ? '' : ` · 加入 ${info.days} 天`}`;
      trust.hidden = !score; points.textContent = score ? String(score.score) : ''; trust.dataset.tone = score && score.score >= 70 ? 'good' : 'normal';
      data.replaceChildren();
      for (const [label, value] of [['主题', user.nPost], ['评论', user.nComment], ['鸡腿', user.coin], ['星辰', user.stardust], ['粉丝', user.fans]] as const) {
        const item = document.createElement('span'); item.className = 'nspp-chat-profile-stat';
        const term = document.createElement('small'); term.textContent = label;
        const count = document.createElement('strong'); count.textContent = value === undefined ? '—' : String(value);
        item.append(term, count); data.append(item);
      }
      bio.textContent = user.bio || user.introduction || user.signature_text || user.signature || ''; bio.hidden = !bio.textContent;
    } catch {
      if (signal.aborted) return;
      data.textContent = '资料读取失败 '; const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '重试';
      retry.addEventListener('click', () => { current = undefined; void show(id, name); }); data.append(retry);
    }
  }
  return { element: card, show, stop: () => { controller.abort(); card.remove(); } };
}
