import { toolIcon } from '../lib/tool-icon';
import { parseLinkRules, cleanLink, footprintHref } from '../lib/link-rules';
import { unsafeWindow } from '../lib/userscript';
import { resolveLink } from '../lib/resolve-link';
import type { Feature } from '../core/types';

type PageConfig = { user?: { member_id: number }; commentPerPage?: number };
function pageConfig(): PageConfig | undefined {
  return (unsafeWindow as Window & { __config__?: PageConfig }).__config__;
}

export const extraFeatures: Feature[] = [
  {
    id: 'footprints', title: '回帖足迹', description: '手动同步自己的历史评论，按账号缓存并提供帖子入口；可续传和清空。', group: '阅读', defaults: { enabled: false },
    mount(ctx) {
      const uid = pageConfig()?.user?.member_id; if (!uid) return;
      type Entry = { post_id: number; floor_id: number };
      const key = `records:${location.host}:${uid}`;
      let records = ctx.get<Entry[]>(key) || [];
      let cursor = ctx.get<number>(`${key}:cursor`) || 1;
      let busy = false;
      const panel = document.createElement('dialog'); panel.className = 'nspp-history nspp-footprints-dialog'; panel.dataset.nsppFootprints = '';
      const summary = document.createElement('h2'); summary.textContent = '我的回帖足迹';
      const open = document.createElement('button'); open.type = 'button'; open.className = 'nspp-tool-icon'; open.title = '回帖足迹'; open.setAttribute('aria-label', open.title); open.append(toolIcon('footprints'));
      const close = document.createElement('button'); close.type = 'button'; close.textContent = '关闭';
      open.addEventListener('click', () => panel.showModal(), { signal: ctx.signal });
      close.addEventListener('click', () => panel.close(), { signal: ctx.signal });
      const sync = document.createElement('button'); sync.type = 'button'; sync.textContent = '同步 / 继续';
      const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = '清空缓存';
      const status = document.createElement('span'); status.setAttribute('role', 'status');
      const list = document.createElement('div'); list.style.cssText = 'max-height:240px;overflow:auto;display:grid;gap:4px';
      close.prepend(toolIcon('close')); sync.prepend(toolIcon('refresh'));
      const header = document.createElement('header'); header.append(summary, close);
      const toolbar = document.createElement('div'); toolbar.className = 'nspp-footprints-toolbar'; toolbar.append(sync, reset, status);
      panel.append(header, toolbar, list);
      (document.getElementById('nspp-tools') || document.querySelector('.user-card') || document.body).append(open); document.body.append(panel);
      const badges: HTMLAnchorElement[] = [];
      const markTitles = () => {
        const latest = new Map<number, number>(); records.forEach(r => latest.set(r.post_id, Math.max(latest.get(r.post_id) || 0, r.floor_id)));
        document.querySelectorAll<HTMLElement>('.post-title').forEach(title => {
          const post = Number(title.querySelector<HTMLAnchorElement>('a[href]')?.pathname.match(/post-(\d+)/)?.[1]);
          const floor = latest.get(post); let badge = title.querySelector<HTMLAnchorElement>('[data-nspp-footprint]');
          if (!floor) { badge?.remove(); return; }
          if (!badge) { badge = document.createElement('a'); badge.dataset.nsppFootprint = ''; badge.style.marginInlineStart = '8px'; title.append(badge); badges.push(badge); }
          const href = footprintHref(post, floor, pageConfig()?.commentPerPage);
          if (badge.getAttribute('href') !== href) badge.setAttribute('href', href);
          const text = `已回复 #${floor}`; if (badge.textContent !== text) badge.textContent = text;
        });
      };
      const stopBadges = ctx.watch(markTitles);
      const render = () => {
        status.textContent = ` ${records.length} 条缓存`; list.replaceChildren(); markTitles();
        const latest = new Map<number, number>(); records.forEach(r => latest.set(r.post_id, Math.max(latest.get(r.post_id) || 0, r.floor_id)));
        [...latest].slice(0, 100).forEach(([post, floor]) => {
          const a = document.createElement('a'); a.href = footprintHref(post, floor, pageConfig()?.commentPerPage);
          a.textContent = `帖子 ${post} · 第 ${floor} 楼`; list.append(a);
        });
      };
      render();
      sync.addEventListener('click', async () => {
        if (busy) return; busy = true; sync.disabled = reset.disabled = true; sync.setAttribute('aria-busy', 'true');
        try {
          const seen = new Set(records.map(r => `${r.post_id}:${r.floor_id}`));
          // A bounded batch remains responsive; the next click resumes older pages.
          for (let i = 0; i < 10 && !ctx.signal.aborted; i++) {
            sync.textContent = `同步第 ${cursor} 页…`;
            const res = await ctx.request<{ success: boolean; comments?: Entry[] }>(`/api/content/list-comments?uid=${uid}&page=${cursor}`, { signal: ctx.signal });
            if (!res.success || !Array.isArray(res.comments)) throw new Error('评论接口返回无效数据');
            if (!res.comments.length) { cursor = 1; break; }
            for (const r of res.comments) {
              if (!Number.isInteger(r.post_id) || !Number.isInteger(r.floor_id) || r.post_id <= 0 || r.floor_id <= 0) continue;
              const id = `${r.post_id}:${r.floor_id}`; if (!seen.has(id)) { records.push({ post_id: r.post_id, floor_id: r.floor_id }); seen.add(id); }
            }
            cursor++; ctx.set(key, records); ctx.set(`${key}:cursor`, cursor);
            await new Promise<void>(resolve => {
              const done = () => { clearTimeout(timer); ctx.signal.removeEventListener('abort', done); resolve(); };
              const timer = setTimeout(done, 1000); ctx.signal.addEventListener('abort', done, { once: true });
            });
          }
          ctx.set(`${key}:cursor`, cursor); render();
        } catch { if (!ctx.signal.aborted) ctx.notify('足迹同步失败，已保留进度，请重试'); }
        finally { busy = false; sync.disabled = reset.disabled = false; sync.removeAttribute('aria-busy'); sync.textContent = '同步 / 继续'; }
      }, { signal: ctx.signal });
      reset.addEventListener('click', () => { records = []; cursor = 1; ctx.set(key, []); ctx.set(`${key}:cursor`, 1); render(); }, { signal: ctx.signal });
      return () => { stopBadges(); badges.forEach(badge => badge.remove()); open.remove(); panel.remove(); };
    },
  },
  {
    id: 'linkRules', title: '自定义链接净化', description: '支持 X 的 scope >> 参数、宏、~允许规则及 /路径正则/，也接受 host 参数名简写。短链仅在点击旁边的解析按钮时请求，需目标支持 CORS。', group: '导航',
    defaults: { enabled: false, rules: '* utm_*\n* fbclid\n* gclid', shortHosts: '' },
    fields: { rules: { label: '删除参数规则（例如 example.com ref）', type: 'textarea' }, shortHosts: { label: '短链域名（每行一个）', type: 'textarea' } },
    mount(ctx) {
      const rules = parseLinkRules(String(ctx.get('rules') || ''));
      const shortHosts = new Set(String(ctx.get('shortHosts') || '').split('\n').map(x => x.trim().toLowerCase()).filter(Boolean));
      const touched = new WeakMap<HTMLAnchorElement, string>(); const added: HTMLElement[] = [];
      const clean = (url: URL) => cleanLink(url, rules);
      const run = () => {
        document.querySelectorAll<HTMLAnchorElement>('.post-content a[href], .markdown-body a[href], .content-item .nsk-content a[href]').forEach(a => {
          if (touched.get(a) === a.href) return;
          let url: URL; try { url = new URL(a.href); } catch { return; }
          if (!/^https?:$/.test(url.protocol) || url.origin === location.origin) return;
          a.href = clean(url).href; touched.set(a, a.href);
          if (!shortHosts.has(url.hostname) || a.nextElementSibling?.hasAttribute('data-nspp-resolve')) return;
          const button = document.createElement('button'); button.type = 'button'; button.textContent = '解析短链'; button.dataset.nsppResolve = '';
          button.addEventListener('click', async () => {
            button.disabled = true; button.textContent = '解析中…'; button.setAttribute('aria-busy', 'true');
            try {
              const target = new URL(await resolveLink(a.href, ctx.signal));
              a.href = clean(target).href; touched.set(a, a.href); button.remove(); ctx.notify('已更新链接，请再次点击原链接打开');
            } catch { if (!ctx.signal.aborted) { ctx.notify('短链服务不允许跨域解析或请求失败，保留原链接'); button.textContent = '重试解析'; } }
            finally { button.disabled = false; button.removeAttribute('aria-busy'); }
          }, { signal: ctx.signal }); a.after(button); added.push(button);
        });
      };
      run(); const unwatch = ctx.watch(run); return () => { unwatch(); added.forEach(el => el.remove()); };
    },
  },
];
