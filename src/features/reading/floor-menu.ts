import type { Context } from '../../core/types';
import { unsafeWindow } from '../../lib/userscript';

// The forum mounts each floor's menu (点赞, 加鸡腿, 反对, 引用, 回复) from the page's own config when the page loads,
// so floors that auto-paging copies in from later pages arrive with an empty .comment-menu-mount.
// This rebuilds that menu from the fetched page's config, in the forum's markup, and acts through the forum's own
// endpoints, confirm dialog and editor.

export interface FloorRecord {
  commentId: number;
  floorIndex: number;
  poster?: { name?: string; isMe?: boolean };
  upvoted?: boolean; upvoteCount?: number;
  liked?: boolean; likeCount?: number;
  disliked?: boolean; dislikeCount?: number;
  [key: string]: unknown;
}
type PageWindow = Window & {
  JSON: JSON;
  __config__?: { user?: unknown; postData?: { postId?: number; comments?: unknown[] } };
  editor?: { reply?(index: number): void; quote?(index: number): void };
  mscAlert?(message: string): void;
  mscConfirm?(message: string, ok: () => void, cancel: () => void): void;
};
type StatResult = { success?: boolean; message?: string; current?: number };

// Same order, icons and confirmation wording as the forum's menu.
const VOTES = [
  { title: '点赞', icon: 'good-one', endpoint: 'upvote', done: 'upvoted', total: 'upvoteCount', ask: '' },
  { title: '加鸡腿', icon: 'chicken-leg', endpoint: 'like', done: 'liked', total: 'likeCount', ask: '是否投喂鸡腿，这将消耗你一个鸡腿' },
  { title: '反对', icon: 'bad-one', endpoint: 'dislike', done: 'disliked', total: 'dislikeCount', ask: '是否反对该回答，这将消耗你两个鸡腿' },
] as const;

/** The floor records a fetched post page embeds as base64 UTF-8 JSON in #temp-script. */
export function pageFloors(doc: ParentNode): FloorRecord[] {
  const raw = doc.querySelector('#temp-script')?.textContent?.trim();
  if (!raw) return [];
  try {
    const config = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(raw), c => c.charCodeAt(0))));
    const comments: unknown = config?.postData?.comments;
    return Array.isArray(comments) ? comments.filter((c): c is FloorRecord => Number.isSafeInteger(c?.commentId) && Number.isSafeInteger(c?.floorIndex)) : [];
  } catch { return []; }
}

// Callbacks handed to the page's dialogs must be callable from the page (Firefox keeps the worlds apart).
const pageCallback = <T extends (...args: never[]) => unknown>(fn: T): T => {
  const exporter = (globalThis as { exportFunction?: (fn: T, target: unknown) => T }).exportFunction;
  return typeof exporter === 'function' ? exporter(fn, unsafeWindow) : fn;
};

/** Gives each copied-in floor its menu; `source` is the page the floors came from, used when the editor is unavailable. */
export function fillFloorMenus(ctx: Context, items: Element[], floors: FloorRecord[], source: string) {
  const page = unsafeWindow as PageWindow;
  const loggedIn = () => !!page.__config__?.user;
  const alert = (message: string) => { try { if (typeof page.mscAlert === 'function') { page.mscAlert(message); return; } } catch { /* Fall back below. */ } ctx.notify(message); };
  const confirm = (message: string) => new Promise<boolean>(resolve => {
    try {
      if (typeof page.mscConfirm === 'function') { page.mscConfirm(message, pageCallback(() => resolve(true)), pageCallback(() => resolve(false))); return; }
    } catch { /* Fall back below. */ }
    resolve(window.confirm(message));
  });
  // Copy the forum's scoped style attribute from a menu it rendered itself, so these look exactly like it.
  const native = document.querySelector('.comment-menu:not([data-nspp-floor-menu])');
  const scope = native ? Array.from(native.attributes, attribute => attribute.name).find(name => name.startsWith('data-v-')) : undefined;
  const make = <K extends 'div' | 'span'>(tag: K, className = '') => {
    const node = document.createElement(tag); if (className) node.className = className; if (scope) node.setAttribute(scope, ''); return node;
  };
  const glyph = (name: string) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'iconpark-icon');
    const use = document.createElementNS(svg.namespaceURI, 'use'); use.setAttribute('href', `#${name}`);
    if (scope) { svg.setAttribute(scope, ''); use.setAttribute(scope, ''); }
    svg.append(use); return svg;
  };
  const item = (title: string, icon: string, text: string, run: () => void) => {
    const node = make('div', 'menu-item'); node.title = title;
    // The forum's items are plain divs; these can also be reached and pressed from the keyboard.
    node.tabIndex = 0; node.setAttribute('role', 'button');
    const label = make('span'); label.textContent = text;
    node.append(glyph(icon), label);
    node.addEventListener('click', run, { signal: ctx.signal });
    node.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); run(); } }, { signal: ctx.signal });
    return node;
  };
  // 引用 and 回复 go through the forum's editor, which reads floors from the page config: register this floor there first.
  const toEditor = (action: 'reply' | 'quote', record: FloorRecord) => {
    const editor = page.editor, comments = page.__config__?.postData?.comments;
    if (typeof editor?.[action] !== 'function' || !Array.isArray(comments)) {
      window.open(`${source.replace(/#.*$/, '')}#${record.floorIndex}`, '_blank', 'noopener,noreferrer');
      return;
    }
    let index = comments.findIndex(comment => (comment as FloorRecord | null)?.commentId === record.commentId);
    if (index < 0) index = comments.push(page.JSON.parse(JSON.stringify(record))) - 1;
    editor[action]!(index);
  };

  for (const floorItem of items) {
    const mount = floorItem.querySelector(':scope > .comment-menu-mount');
    const number = Number(floorItem.querySelector('.floor-link')?.textContent?.match(/\d+/)?.[0] ?? floorItem.id);
    const record = floors.find(floor => floor.floorIndex === number);
    if (!mount || !record) continue;
    const menu = make('div', 'comment-menu'); menu.setAttribute('data-nspp-floor-menu', '');
    const parts: HTMLElement[] = [];
    for (const vote of VOTES) {
      let busy = false;
      const node = item(vote.title, vote.icon, String(record[vote.total] ?? 0), async () => {
        if (busy) return;
        if (!loggedIn()) { alert('您未登录，请登录后继续操作'); return; }
        if (vote.ask && record[vote.done]) { alert(`已经进行过${vote.title}操作`); return; }
        busy = true;
        try {
          if (vote.ask) {
            let question: string = vote.ask;
            if (vote.endpoint === 'like') {
              try {
                const today = await ctx.request<{ maxFreeLike?: number; freeLikeUsed?: number }>('/api/progress/today?scope=freelike');
                if (Number(today?.maxFreeLike) > Number(today?.freeLikeUsed)) question = '是否投喂鸡腿，本次投喂免费';
              } catch { /* Keep the wording that names the cost. */ }
            }
            if (!await confirm(question)) return;
          }
          const result = await ctx.request<StatResult>(`/api/statistics/${vote.endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commentId: record.commentId, action: 'add' }) });
          if (!result?.success) { alert(result?.message || `${vote.title}未成功`); return; }
          record[vote.done] = true;
          if (typeof result.current === 'number') record[vote.total] = result.current;
          node.classList.add('clicked');
          node.querySelector('span')!.textContent = String(record[vote.total] ?? 0);
        } catch (error) { alert(error instanceof Error ? error.message : `${vote.title}未成功`); }
        finally { busy = false; }
      });
      if (record[vote.done]) node.classList.add('clicked');
      parts.push(node);
    }
    // Like the forum: 引用 for signed-in readers, 回复 only on other people's floors.
    if (loggedIn()) {
      parts.push(item('引用', 'quote', '引用', () => toEditor('quote', record)));
      if (!record.poster?.isMe) parts.push(item('回复', 'back', '回复', () => toEditor('reply', record)));
    }
    parts.forEach((part, index) => { if (index) menu.append(' '); menu.append(part); });
    mount.replaceWith(menu);
  }
}
