import { userHover, userHoverSelector, isUserHoverAnchor } from '../views/user-hover';
import { format } from 'date-fns';
import { siteIcon } from './post-interaction-data';
import type { Feature } from '../core/types';
import { authorId, forumAge, registration, trustScore, type UserProfile } from './user-profile';


export const userBadges: Feature = {
  id: 'user-level', title: '等级、信任分与身份徽章', description: '显示等级、加入天数与可查看明细的本地信任参考分，并突出管理员、站点创建者与拥有者身份。', group: '用户', defaults: { enabled: true, colors: 'original', levelColor: '#9198a1', trustColor: '#9198a1', roleColor: '#9198a1' },
  fields: {
    colors: { label: '徽章配色', type: 'select', options: [{ label: '原有彩色（默认）', value: 'original' }, { label: '自定义', value: 'custom' }, { label: '柔和单色', value: 'muted' }] },
    levelColor: { label: '等级与加入天数颜色', type: 'color' }, trustColor: { label: '信任分颜色', type: 'color' }, roleColor: { label: '身份徽章颜色', type: 'color' },
  },
  mount(ctx) {
    const colorStyle = document.createElement('style');
    if (ctx.get('colors') !== 'original') {
      const color = (key: string) => ctx.get('colors') === 'custom' && /^#[0-9a-f]{6}$/i.test(ctx.get<string>(key)) ? ctx.get<string>(key) : 'var(--nspp-muted, #9198a1)';
      colorStyle.textContent = `.nspp-user-badges .nspp-level,.nspp-user-badges .nspp-age{color:${color('levelColor')}!important;background:transparent!important;box-shadow:none!important}.nspp-user-badges .nspp-trust{color:${color('trustColor')}!important;background:transparent!important;box-shadow:none!important}.role-tag[data-nspp-role]{color:${color('roleColor')}!important;background:transparent!important;box-shadow:none!important}`;
      document.head.append(colorStyle);
    }
    let scoreDialog: HTMLDialogElement | undefined;
    const roles = new Map<Element, string | null>();
    type CachedProfile = { time: number; user: UserProfile };
    const fresh = (entry: CachedProfile | undefined): entry is CachedProfile => !!entry && Number.isFinite(entry.time) && Date.now() >= entry.time && Date.now() - entry.time < 24 * 60 * 60 * 1000;
    const cache = new Map<string, CachedProfile>();
    const inflight = new Map<string, Promise<UserProfile>>();
    const nodes = new Map<Element, { id: string; badge: HTMLElement; details: HTMLElement; release(): void }>();
    const getProfile = (id: string): Promise<UserProfile> => {
      const cached = cache.get(id);
      if (fresh(cached)) return Promise.resolve(cached.user);
      cache.delete(id);
      if (inflight.has(id)) return inflight.get(id)!;
      const stored = ctx.get<Record<string, CachedProfile>>('profiles') || {};
      if (fresh(stored[id])) {
        cache.set(id, stored[id]);
        return Promise.resolve(stored[id].user);
      }
      const request = ctx.request<{ success?: boolean; detail?: UserProfile }>(`/api/account/getInfo/${id}`).then(result => {
        if (!result?.success || !result.detail || typeof result.detail !== 'object') throw new Error('资料不可用');
        const entry = { time: Date.now(), user: result.detail };
        cache.set(id, entry);
        const latest = ctx.get<typeof stored>('profiles') || {};
        latest[id] = entry;
        ctx.set('profiles', Object.fromEntries(Object.entries(latest).filter(([, value]) => fresh(value))));
        return result.detail;
      });
      inflight.set(id, request);
      void request.then(() => inflight.delete(id), () => inflight.delete(id));
      return request;
    };
    const load = async (author: Element, id: string, badge: HTMLElement) => {
      badge.setAttribute('aria-busy', 'true');
      badge.textContent = '加载中';
      try {
        const user = await getProfile(id);
        if (ctx.signal.aborted || !author.isConnected || nodes.get(author)?.badge !== badge) return;
        const info = registration(user);
        const profileDetails = nodes.get(author)!.details;
        profileDetails.replaceChildren();
        for (const [label, value, icon] of [
          ['等级', info.level === null ? '—' : `Lv ${info.level}`, 'level'], ['主题帖', String(user.nPost ?? '—'), 'write-6ncdp62p'],
          ['鸡腿', String(user.coin ?? '—'), 'chicken-leg'], ['评论数', String(user.nComment ?? '—'), 'comments-6ncdh3ka'],
          ['星辰', String(user.stardust ?? '—'), 'wallet'], ['粉丝', String(user.fans ?? '—'), 'concern'],
        ]) {
          const cell = document.createElement('div');
          const term = document.createElement('dt'); term.textContent = label; term.prepend(siteIcon(icon));
          const valueNode = document.createElement('dd'); valueNode.textContent = value;
          if (label === '等级') {
            valueNode.className = 'nspp-user-badges';
            const badgeValue = document.createElement('span'); badgeValue.className = 'nspp-level'; badgeValue.dataset.level = String(info.level ?? 'unknown');
            badgeValue.textContent = value; valueNode.replaceChildren(badgeValue);
          }
          cell.append(term, valueNode); profileDetails.append(cell);
        }

        badge.replaceChildren();
        const level = document.createElement('span');
        level.className = 'nspp-level';
        level.textContent = info.level === null ? 'Lv?' : `Lv${info.level}`;
        level.prepend(siteIcon('level'));
        level.dataset.level = String(info.level ?? 'unknown');
        const age = document.createElement('button');
        age.type = 'button';
        age.dataset.tone = info.tone;
        age.className = 'nspp-age';
        age.textContent = info.days === null ? '加入时间未知' : `${info.days}天`;
        age.prepend(siteIcon('calendar-thirty'));
        age.title = [info.days === null ? '注册时长未知' : `已加入 ${info.days} 天`, Number.isFinite(info.timestamp) ? `加入于 ${new Date(info.timestamp).toLocaleDateString('zh-CN')}` : '注册时间未知', `发帖 ${user.nPost ?? '—'} · 评论 ${user.nComment ?? '—'}`].join('\n');
        age.setAttribute('aria-label', `${age.textContent}，查看注册资料`);
        age.addEventListener('click', () => {
          scoreDialog?.remove();
          scoreDialog = document.createElement('dialog');
          scoreDialog.className = 'nspp-history nspp-profile-dialog';
          scoreDialog.setAttribute('aria-label', '注册资料');
          const header = document.createElement('header');
          const heading = document.createElement('h2'); heading.textContent = '注册资料';
          const close = document.createElement('button'); close.type = 'button'; close.textContent = '关闭';
          close.addEventListener('click', () => scoreDialog?.close(), { signal: ctx.signal });
          header.append(heading, close);
          const summary = document.createElement('div'); summary.className = 'nspp-profile-summary';
          const duration = document.createElement('strong'); duration.textContent = info.days === null ? '时间未知' : `${info.days} 天`;
          const stage = document.createElement('span'); stage.className = 'nspp-age'; stage.dataset.tone = info.tone; stage.textContent = info.label;
          summary.append(duration, stage);
          const data = document.createElement('dl');
          for (const [label, value] of [
            ['论坛存续', `${forumAge()} 天`],
            ['注册日期', info.days !== null ? new Date(info.timestamp).toLocaleDateString('zh-CN') : '未知'],
            ['发帖', String(user.nPost ?? '—')], ['评论', String(user.nComment ?? '—')],
          ]) {
            const term = document.createElement('dt'); term.textContent = label;
            const detail = document.createElement('dd'); detail.textContent = value;
            data.append(term, detail);
          }
          scoreDialog.append(header, summary, data);
          if (info.tone === 'new' || info.tone === 'recent') {
            const note = document.createElement('p'); note.textContent = '新加入的成员，参与记录尚少；交易前请核实信息。'; scoreDialog.append(note);
          }
          document.body.append(scoreDialog); scoreDialog.showModal();
        }, { signal: ctx.signal });
        const trust = trustScore(user);
        const score = document.createElement('button');
        score.type = 'button'; score.className = 'nspp-trust';
        score.textContent = trust ? String(trust.score) : '—';
        score.dataset.tier = !trust ? 'unknown' : trust.score === 100 ? 'perfect' : trust.score >= 70 ? 'success' : trust.score >= 40 ? 'warning' : 'danger';
        score.prepend(siteIcon('crown-two'));
        const explanation = trust
          ? `信任分 ${trust.score}/100\n注册时长 ${trust.age.toFixed(1)}/35 · 主题帖 ${trust.posts.toFixed(1)}/20 · 评论 ${trust.comments.toFixed(1)}/20\n鸡腿 ${trust.coin.toFixed(1)}/10 · 星辰 ${trust.stardust.toFixed(1)}/10 · 粉丝 ${trust.fans.toFixed(1)}/5`
          : '资料不足：需要注册日期、主题帖、评论、鸡腿、星辰和粉丝数据。';
        const details = `${explanation}\n\n规则 v4：注册时长按 √(天数 / 730) × 35 计算，最多 35 分；其余指标按 ln(1 + 数量) / ln(1 + 上限) × 权重计算。上限：主题帖 300、评论 2000、鸡腿 6000、星辰 500、粉丝 50。负余额按 0 计算；等级不重复加分；缺少数据不评分。\n\n这是社区资料参考分，余额可转移，粉丝和发言数量不等于交易信用。`;
        score.title = details;
        score.setAttribute('aria-label', `信任分 ${trust?.score ?? "未知"}，查看评分依据`);
        score.addEventListener('click', () => {
          scoreDialog?.remove();
          scoreDialog = document.createElement('dialog'); scoreDialog.className = 'nspp-history nspp-trust-dialog'; scoreDialog.setAttribute('aria-label', '信任分依据');
          const heading = document.createElement('h2'); heading.textContent = '信任分依据';
          const body = document.createElement('p'); body.textContent = details;
          const close = document.createElement('button'); close.type = 'button'; close.textContent = '关闭';
          close.addEventListener('click', () => scoreDialog?.close(), { signal: ctx.signal });
          scoreDialog.append(heading, body, close); document.body.append(scoreDialog); scoreDialog.showModal();
        }, { signal: ctx.signal });
        badge.append(score, age, level);
        const card = profileDetails.parentElement!;
        card.dataset.trust = !trust ? 'unknown' : trust.score === 100 ? 'perfect' : trust.score >= 70 ? 'success' : trust.score >= 40 ? 'warning' : 'danger';
        card.querySelector('.nspp-user-hover-signature')?.remove();
        const signatureText = [user.bio, user.introduction, user.signature_text, user.signature].find(value => typeof value === 'string' && value.trim());
        if (signatureText) {
          const signature = document.createElement('p'); signature.className = 'nspp-user-hover-signature'; signature.textContent = signatureText.trim();
          card.querySelector('.nspp-user-hover-header')!.after(signature);
        }
        card.querySelector('.nspp-user-hover-score')?.remove();
        const headline = document.createElement('button'); headline.type = 'button'; headline.className = 'nspp-user-hover-score';
        headline.setAttribute('aria-label', `信任分 ${trust?.score ?? '未知'}，查看评分依据`);
        const number = document.createElement('strong'); number.textContent = trust ? String(trust.score) : '—';
        const scoreLabel = document.createElement('small'); scoreLabel.textContent = '信任分'; headline.append(number, scoreLabel);
        headline.addEventListener('click', () => score.click(), { signal: ctx.signal }); card.querySelector('.nspp-user-hover-header')!.append(headline);
        card.querySelector('.nspp-user-hover-rich')?.remove();
        const rich = document.createElement('div'); rich.className = 'nspp-user-hover-rich nspp-user-badges';
        const duration = age.cloneNode(true) as HTMLButtonElement; duration.removeAttribute('title');
        const dayCount = document.createElement('strong'); dayCount.textContent = info.days === null ? '未知' : String(info.days);
        duration.replaceChildren(siteIcon('calendar-thirty'), document.createTextNode('加入 '), dayCount, document.createTextNode(info.days === null ? '' : ' 天'));
        duration.addEventListener('click', () => age.click(), { signal: ctx.signal });
        const joined = document.createElement('span'); joined.textContent = `注册 ${info.days === null ? '未知' : format(new Date(info.timestamp), 'yyyy-MM-dd')}`;
        rich.append(duration, joined); profileDetails.after(rich);
      } catch {
        if (ctx.signal.aborted || !badge.isConnected) return;
        const details = nodes.get(author)?.details; if (details) details.textContent = '资料读取失败，可点击用户名旁的重试。';
        const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '重试资料';
        retry.addEventListener('click', () => { void load(author, id, badge); }, { signal: ctx.signal });
        badge.replaceChildren(retry);
      } finally { badge.removeAttribute('aria-busy'); }
    };
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        observer?.unobserve(entry.target);
        const state = nodes.get(entry.target);
        if (state) void load(entry.target, state.id, state.badge);
      }
    }, { rootMargin: '200px' }) : null;
    const scan = () => {
      document.querySelectorAll('.role-tag:not(.user-level)').forEach(tag => {
        const text = tag.textContent?.trim();
        const role = text === '管理员' || text === '管理' ? 'admin' : text === '站点创建者' || text === '创建者' ? 'founder' : text === '服主' || text === '拥有者' || text === '所有者' || text === '站点拥有者' ? 'owner' : undefined;
        if (role) {
          if (!roles.has(tag)) roles.set(tag, tag.getAttribute('data-nspp-role'));
          if (tag.getAttribute('data-nspp-role') !== role) tag.setAttribute('data-nspp-role', role);
        } else if (roles.has(tag)) {
          const original = roles.get(tag);
          if (original === null) tag.removeAttribute('data-nspp-role');
          else if (original !== undefined) tag.setAttribute('data-nspp-role', original);
          roles.delete(tag);
        }
      });
      for (const tag of roles.keys()) if (!tag.isConnected) roles.delete(tag);
      for (const [author, state] of nodes) if (!author.isConnected) { observer?.unobserve(author); state.badge.remove(); state.details.remove(); state.release(); nodes.delete(author); }
      document.querySelectorAll<HTMLAnchorElement>(userHoverSelector).forEach(author => {
        if (!isUserHoverAnchor(author)) return;
        if (author.closest('.nspp-user-hover, .nspp-profile-dialog')) return;
        if (!author.textContent?.trim() && !author.querySelector('img')) return;
        const id = authorId(author, location.origin); if (!id) return;
        const previous = nodes.get(author);
        if (previous?.id === id && previous.badge.isConnected) return;
        previous?.badge.remove(); previous?.details.remove(); previous?.release();
        const badge = document.createElement('span'); badge.className = 'nspp-user-badges';
        badge.setAttribute('aria-label', '用户资料');
        badge.hidden = !!author.closest('.info-last-commenter') || !!author.querySelector('img') || !author.matches('.author-info a, a.info-author, .info-author a, a.post-author, .post-author a, .nsk-content-meta-info a');
        const hover = userHover(author, ctx);
        const details = document.createElement('dl'); details.textContent = '正在读取用户资料…'; hover.element.insertBefore(details, hover.element.querySelector('.nspp-user-hover-actions, :scope > .nspp-block-toggle'));
        author.after(badge); nodes.set(author, { id, badge, details, release: hover.release });
        if (badge.hidden) {
          let started = false;
          const start = () => { if (!started) { started = true; void load(author, id, badge); } };
          author.addEventListener('mouseenter', start, { signal: ctx.signal });
          author.addEventListener('focus', start, { signal: ctx.signal });
          author.addEventListener('click', start, { signal: ctx.signal });
          return;
        }
        // Start visible names immediately, even if the observer callback is delayed.
        const rect = author.getBoundingClientRect();
        if (!observer || (rect.bottom >= 0 && rect.top <= innerHeight + 200)) void load(author, id, badge);
        else observer.observe(author);
      });
    };
    const stop = ctx.watch(scan);
    return () => { stop(); colorStyle.remove(); scoreDialog?.remove(); roles.forEach((original, tag) => { if (original === null) tag.removeAttribute('data-nspp-role'); else tag.setAttribute('data-nspp-role', original); }); observer?.disconnect(); nodes.forEach(({ badge, details, release }) => { badge.remove(); details.remove(); release(); }); };
  },
};
