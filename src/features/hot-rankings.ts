import { gmRequest } from '../lib/userscript';
import type { Feature } from '../core/types';
import { iconButton, toolIcon } from '../lib/tool-icon';
import burningFlame from '../assets/hot-flame.svg?raw';
import { createSheet } from '../views/sheet';

export const rankings = { hot: '实时热榜', daily: '日榜', weekly: '周榜' };
export type Ranking = keyof typeof rankings;
export type Post = { id: number; title: string; author: string; views: number; comments: number; score: number; authorId?: number; posted?: number; category?: string };
type Snapshot = { posts: Post[]; updated: number; fetched: number };

function parse(text: string): Snapshot {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.posts)) throw new Error('热榜数据格式无效');
  const seen = new Set<number>();
  const count = (n: unknown) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  const posts: Post[] = data.posts.flatMap((entry: { post?: Partial<Post> & { author_id?: unknown; post_timestamp?: unknown; category?: unknown }; score?: unknown } | null) => {
    const post = entry?.post;
    if (!post || !Number.isSafeInteger(post.id) || post.id! <= 0 || typeof post.title !== 'string' || !post.title.trim() || seen.has(post.id!)) return [];
    seen.add(post.id!);
    // author_id, post_timestamp and category are optional extras (avatars and times in 摸鱼模式).
    const authorId = count(post.author_id), posted = count(post.post_timestamp) * 1000;
    return [{ id: post.id!, title: post.title, author: typeof post.author === 'string' ? post.author : '', views: count(post.views), comments: count(post.comments), score: count(entry?.score),
      ...(authorId ? { authorId } : {}), ...(posted ? { posted } : {}), ...(typeof post.category === 'string' && post.category ? { category: post.category } : {}) }];
  });
  if (data.posts.length && !posts.length) throw new Error('热榜数据格式无效');
  return { posts, updated: count(data.updated_at) * 1000, fetched: Date.now() };
}

export function requestRanking(kind: Ranking, signal: AbortSignal): Promise<Snapshot> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('已取消')); return; }
    const cleanup = () => signal.removeEventListener('abort', cancel);
    const request = gmRequest({
      method: 'GET', url: `https://api.bimg.eu.org/${kind}.json?t=${Date.now()}`, anonymous: true, timeout: 20000,
      headers: { Accept: 'application/json' },
      onload: response => {
        cleanup();
        try { if (response.status !== 200) throw new Error(`热榜 HTTP ${response.status}`); resolve(parse(response.responseText)); }
        catch (error) { reject(error); }
      },
      onerror: () => { cleanup(); reject(new Error('热榜连接失败')); },
      ontimeout: () => { cleanup(); reject(new Error('热榜请求超时')); },
      onabort: () => { cleanup(); reject(new Error('已取消')); },
    });
    function cancel() { request.abort(); }
    signal.addEventListener('abort', cancel, { once: true });
  });
}

export const hotRankings: Feature = {
  id: 'hot-rankings', title: 'NodeSeek 热榜', description: '查看日榜、周榜和实时热榜；打开时按需获取，缓存 5 分钟。', group: '导航', defaults: { enabled: true },
  mount(ctx) {
    // These rankings contain NodeSeek post IDs, not DeepFlood post IDs.
    if (location.hostname !== 'www.nodeseek.com') return;
    let active: Ranking = 'hot';
    const cache = new Map<Ranking, Snapshot>();
    const pending = new Map<Ranking, Promise<void>>();
    const errors = new Set<Ranking>();
    const launch = document.createElement('button'); launch.type = 'button'; launch.className = 'nspp-tool-icon'; launch.title = 'NodeSeek 热榜'; launch.setAttribute('aria-label', launch.title); launch.dataset.nsppHotLauncher = '';
    launch.append(document.importNode(new DOMParser().parseFromString(burningFlame, 'image/svg+xml').documentElement, true));
    const panel = createSheet('nspp-monitor nspp-hot-rankings', 'NodeSeek 热榜', { tall: true });
    const head = document.createElement('div'); head.className = 'nspp-hot-header'; const title = document.createElement('h2'); title.textContent = 'NodeSeek 热榜';
    const close = document.createElement('button'); close.type = 'button'; close.className = 'nspp-hot-close'; iconButton(close, 'close', '关闭热榜'); close.addEventListener('click', () => panel.close(), { signal: ctx.signal }); head.append(title, close);
    const toolbar = document.createElement('nav'); toolbar.setAttribute('aria-label', '热榜类型');
    const tabs = Object.entries(rankings).map(([kind, label]) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.dataset.ranking = kind;
      button.addEventListener('click', () => { active = kind as Ranking; void load(); }, { signal: ctx.signal }); toolbar.append(button); return button;
    });
    const refresh = document.createElement('button'); refresh.type = 'button'; iconButton(refresh, 'refresh', '刷新'); refresh.addEventListener('click', () => { void load(true); }, { signal: ctx.signal }); toolbar.append(refresh);
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    const list = document.createElement('ol'); list.className = 'nspp-sheet-body';
    head.replaceChildren(title, toolbar, close); panel.append(head, status, list); document.body.append(panel);
    const tools = document.getElementById('nspp-tools') || document.body;
    const monitor = tools.querySelector('[data-nspp-monitor-launcher]');
    if (monitor) monitor.after(launch); else tools.prepend(launch);
    const render = () => {
      if (ctx.signal.aborted) return;
      const snapshot = cache.get(active), busy = pending.has(active);
      tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.ranking === active)));
      refresh.disabled = busy; iconButton(refresh, 'refresh', errors.has(active) ? '重试' : '刷新');
      status.classList.toggle('nspp-sweep-shine', busy);
      for (const control of [status, refresh]) {
        if (busy) control.setAttribute('aria-busy', 'true'); else control.removeAttribute('aria-busy');
      }
      const updated = snapshot?.updated ? new Date(snapshot.updated).toLocaleString('zh-CN') : '';
      status.textContent = busy ? '正在加载…' : errors.has(active) ? `加载失败，点击重试${snapshot ? '；保留上次结果' : ''}` : `${snapshot?.posts.length ?? 0} 条${updated ? ` · 更新于 ${updated}` : ''}`;
      list.replaceChildren();
      if (busy && !snapshot) {
        for (let index = 0; index < 8; index++) {
          const row = document.createElement('li'); row.className = 'nspp-hot-skeleton'; row.setAttribute('aria-hidden', 'true');
          for (const part of ['rank', 'title', 'heat']) {
            const block = document.createElement('span'); block.className = `nspp-hot-skeleton-${part} nspp-skeleton-shine`; row.append(block);
          }
          list.append(row);
        }
      }
      for (const [index, post] of (snapshot?.posts ?? []).entries()) {
        const row = document.createElement('li'); row.dataset.rank = String(index + 1);
        const rank = document.createElement('span'); rank.className = 'nspp-hot-rank'; rank.textContent = String(index + 1); rank.setAttribute('aria-label', `第 ${index + 1} 名`);
        const link = document.createElement('a'); link.href = `https://www.nodeseek.com/post-${post.id}-1`; link.textContent = post.title; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.title = `${post.title}\n${post.author} · ${post.views} 浏览 · ${post.comments} 回复 · 热度 ${post.score}`;
        const heat = document.createElement('span'); heat.className = 'nspp-hot-heat'; heat.setAttribute('aria-label', `热度 ${post.score}`); heat.title = `热度 ${post.score}`;
        if (index < 3) heat.append(toolIcon('hot'));
        heat.append(document.createTextNode(post.score >= 10000 ? `${(post.score / 10000).toFixed(1)}万` : post.score.toLocaleString('zh-CN')));
        row.append(rank, link, heat); list.append(row);
      }
    };
    async function load(force = false) {
      const kind = active, snapshot = cache.get(kind);
      if (pending.has(kind) || (!force && snapshot && Date.now() - snapshot.fetched < 300000)) { render(); return; }
      errors.delete(kind);
      const task = requestRanking(kind, ctx.signal).then(data => { if (!ctx.signal.aborted) cache.set(kind, data); }).catch(() => { if (!ctx.signal.aborted) errors.add(kind); }).finally(() => { pending.delete(kind); if (active === kind) render(); });
      pending.set(kind, task); render(); await task;
    }
    launch.addEventListener('click', () => { panel.showModal(); void load(); }, { signal: ctx.signal });
    return () => { panel.remove(); launch.remove(); };
  },
};
