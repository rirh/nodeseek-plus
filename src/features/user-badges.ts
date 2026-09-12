import { userHover, userHoverSelector } from '../views/user-hover';
import { format } from 'date-fns';
import { siteIcon } from './post-interaction-data';
import type { Feature } from '../core/types';
import { authorId, forumAge, registration, trustScore, type UserProfile } from './user-profile';


export const userBadges: Feature = {
  id: 'user-level', title: '等级、信任分与身份徽章', description: '显示等级、加入天数与可查看明细的本地信任参考分，并突出管理员、站点创建者与拥有者身份。', group: '用户', defaults: { enabled: true },
  mount(ctx) {
    let scoreDialog: HTMLDialogElement | undefined;
    const roles = new Map<Element, string | null>();
    const cache = new Map<string, UserProfile>();
    const inflight = new Map<string, Promise<UserProfile>>();
    const nodes = new Map<Element, { id: string; badge: HTMLElement; details: HTMLElement; release(): void }>();
    const queue: (() => Promise<void>)[] = [];
    let active = 0;
    const drain = () => {
      while (active < 2 && queue.length && !ctx.signal.aborted) {
        active++;
        void queue.shift()!().finally(() => { active--; drain(); });
      }
    };
    const getProfile = (id: string): Promise<UserProfile> => {
      if (cache.has(id)) return Promise.resolve(cache.get(id)!);
      if (inflight.has(id)) return inflight.get(id)!;
      const request = new Promise<UserProfile>((resolve, reject) => {
        queue.push(async () => {
          try {
            const result = await ctx.request<{ success?: boolean; detail?: UserProfile }>(`/api/account/getInfo/${id}`);
            if (!result?.success || !result.detail || typeof result.detail !== 'object') throw new Error('资料不可用');
            cache.set(id, result.detail);
            resolve(result.detail);
          } catch (error) { reject(error); }
        });
      });
      inflight.set(id, request);
      drain();
      void request.then(() => inflight.delete(id), () => inflight.delete(id));
      return request;
    };
    const load = async (author: Element, id: string, badge: HTMLElement) => {
      badge.setAttribute('aria-busy', 'true');
      badge.textContent = '读取资料';
      try {
        const user = await getProfile(id);
        if (ctx.signal.aborted || !author.isConnected || nodes.get(author)?.badge !== badge) return;
        const info = registration(user);
        const profileDetails = nodes.get(author)!.details;
        profileDetails.replaceChildren();
        for (const [label, value] of [
          ['注册日期', info.days === null ? '未知' : format(new Date(info.timestamp), 'yyyy-MM-dd')],
          ['主题帖', String(user.nPost ?? '—')], ['评论', String(user.nComment ?? '—')],
        ]) { const term = document.createElement('dt'); term.textContent = label; const valueNode = document.createElement('dd'); valueNode.textContent = value; profileDetails.append(term, valueNode); }

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
        score.dataset.tier = info.level === 1 ? 'danger' : !trust ? 'unknown' : trust.score === 100 ? 'perfect' : trust.score >= 70 ? 'success' : trust.score >= 40 ? 'warning' : 'danger';
        score.prepend(siteIcon('crown-two'));
        const explanation = trust
          ? `信任参考分 ${trust.score}/100\n注册时长 ${trust.age.toFixed(1)}/60 · 发帖 ${trust.posts.toFixed(1)}/20 · 评论 ${trust.comments.toFixed(1)}/20`
          : '资料不足，暂不评分：需要有效的注册时间、发帖数和评论数。';
        const risk = info.level === 1
          ? '风险提示：该用户等级为 1 级，请谨慎核实身份与交易信息，等级和分数均不代表交易信用。'
          : trust && trust.score < 40 ? '风险提示：该用户信任参考分较低，公开参与记录有限，请谨慎核实身份与交易信息；低分不代表存在不良行为。' : '';
        if (info.level === 1) level.title = risk;
        const details = `${risk ? `${risk}\n\n` : ''}${explanation}\n规则 v2：各项按 ln(1 + 数量) / ln(1 + 上限) × 权重计算，总和四舍五入。注册时长上限为论坛存续天数（当前 ${forumAge()} 天，随日期增长）、发帖 100、评论 500。\n仅根据公开资料在本地计算社区参与参考分，非站点官方评分，不代表交易信用；低分可能只是新用户，发帖与评论数量不代表内容质量。`;
        score.title = details;
        score.setAttribute('aria-label', `信任参考分 ${trust?.score ?? "未知"}，${risk ? `${risk} ` : ""}查看评分依据`);
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
        if (typeof user.signature === 'string' && user.signature.trim()) {
          const signature = document.createElement('p'); signature.className = 'nspp-user-hover-signature'; signature.textContent = user.signature.trim();
          card.querySelector('.nspp-user-hover-header')!.after(signature);
        }
        card.querySelector('.nspp-user-hover-score')?.remove();
        const headline = document.createElement('button'); headline.type = 'button'; headline.className = 'nspp-user-hover-score'; headline.title = score.title;
        headline.setAttribute('aria-label', `信任参考分 ${trust?.score ?? '未知'}，查看评分依据`);
        const number = document.createElement('strong'); number.textContent = trust ? String(trust.score) : '—';
        const scoreLabel = document.createElement('small'); scoreLabel.textContent = '信任参考分'; headline.append(number, scoreLabel);
        headline.addEventListener('click', () => score.click(), { signal: ctx.signal }); card.querySelector('.nspp-user-hover-header')!.append(headline);
        const participation = document.createElement('span'); participation.className = 'nspp-participation';
        participation.textContent = Number.isSafeInteger(user.nPost) && Number.isSafeInteger(user.nComment) && user.nPost! >= 0 && user.nComment! >= 0 ? String(user.nPost! + user.nComment!) : '—';
        participation.title = '主题帖数 + 评论数';
        card.querySelector('.nspp-user-hover-rich')?.remove();
        const rich = document.createElement('div'); rich.className = 'nspp-user-hover-rich nspp-user-badges';
        for (const [label, source] of [['加入天数', age], ['参与次数', participation], ['用户等级', level]] as const) {
          const cell = document.createElement('div');
          const caption = document.createElement('small'); caption.textContent = label;
          const value = source.cloneNode(true) as HTMLElement;
          if (source instanceof HTMLButtonElement) value.addEventListener('click', () => { source.click(); }, { signal: ctx.signal });
          cell.append(caption, value); rich.append(cell);
        }
        card.insertBefore(rich, profileDetails);
        card.querySelector('.nspp-user-hover-note')?.remove();
        const note = document.createElement('p'); note.className = 'nspp-user-hover-note'; note.dataset.tone = info.level === 1 || (trust && trust.score < 40) ? 'danger' : info.tone;
        note.textContent = risk || `${info.label} · 本地参与度参考分，非官方信用评分`;
        note.title = details; profileDetails.after(note);
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
        const details = document.createElement('dl'); details.textContent = '正在读取用户资料…'; hover.element.insertBefore(details, hover.element.querySelector(':scope > .nspp-block-toggle'));
        author.after(badge); nodes.set(author, { id, badge, details, release: hover.release });
        // Start visible names immediately, even if the observer callback is delayed.
        const rect = author.getBoundingClientRect();
        if (!observer || (rect.bottom >= 0 && rect.top <= innerHeight + 200)) void load(author, id, badge);
        else observer.observe(author);
      });
    };
    const stop = ctx.watch(scan);
    return () => { stop(); scoreDialog?.remove(); roles.forEach((original, tag) => { if (original === null) tag.removeAttribute('data-nspp-role'); else tag.setAttribute('data-nspp-role', original); }); observer?.disconnect(); queue.length = 0; nodes.forEach(({ badge, details, release }) => { badge.remove(); details.remove(); release(); }); };
  },
};
