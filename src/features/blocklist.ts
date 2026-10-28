import { userHover, userHoverSelector, isUserHoverAnchor } from '../views/user-hover';
import { siteIcon } from './post-interaction-data';
import type { Feature } from '../core/types';
import { unsafeWindow } from '../lib/userscript';
import { authorId } from './user-profile';
import { confirmDialog } from '../views/confirm-dialog';

export function parseBlocklist(value: unknown): Set<string> {
  const result = value as { success?: boolean; data?: { block_member_id?: unknown }[] } | null;
  if (result?.success !== true || !Array.isArray(result.data)) throw new Error('黑名单查询失败');
  const ids = new Set<string>();
  for (const row of result.data) {
    const id = String(row?.block_member_id ?? '');
    if (!/^[1-9]\d*$/.test(id)) throw new Error('黑名单格式异常');
    ids.add(id);
  }
  return ids;
}
export const officialBlocklist: Feature = {
  id: 'official-blocklist', title: '站点黑名单', description: '按站点当前屏蔽状态显示操作。', group: '用户', defaults: { enabled: true },
  mount(ctx) {
    const buttons = new Map<HTMLAnchorElement, { id: string; name: string; button: HTMLButtonElement; release(): void }>();
    let blocked = new Set<string>();
    let loaded = false, checked = 0;
    let fetching: Promise<void> | undefined;
    const pending = new Set<string>();
    function render() {
      // Called on every page scan: only touch buttons whose state actually changed.
      buttons.forEach(({ id, name, button }) => {
        const disabled = !!fetching || pending.has(id);
        const label = disabled ? '…' : !loaded ? '重试' : blocked.has(id) ? '取消屏蔽' : '屏蔽';
        const title = disabled ? '查询中' : !loaded ? '重试查询黑名单' : `${blocked.has(id) ? '解除屏蔽' : '屏蔽'} ${name}`;
        const state = `${label}|${title}|${loaded && blocked.has(id)}`;
        if (button.dataset.state === state && button.disabled === disabled) return;
        button.dataset.state = state; button.disabled = disabled;
        if (button.textContent !== label) button.replaceChildren(siteIcon('forbid'), document.createTextNode(label));
        button.title = title; button.setAttribute('aria-label', title);
        if (disabled) button.setAttribute('aria-busy', 'true'); else button.removeAttribute('aria-busy');
        button.dataset.blocked = String(loaded && blocked.has(id));
      });
    }
    function refresh(): Promise<void> {
      if (fetching) return fetching;
      fetching = Promise.resolve().then(async () => {
        blocked = parseBlocklist(await ctx.request('/api/block-list/list'));
        loaded = true; checked = Date.now();
      }).catch(error => { loaded = false; throw error; }).finally(() => { fetching = undefined; render(); });
      render(); return fetching;
    }
    const stop = ctx.watch(() => {
      const ownId = (unsafeWindow as Window & { __config__?: { user?: { member_id?: number } } }).__config__?.user?.member_id;
      if (!ownId) return;
      for (const [anchor, item] of buttons) if (!anchor.isConnected) { item.button.remove(); item.release(); buttons.delete(anchor); }
      const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(userHoverSelector)).filter(anchor => !anchor.closest('.nspp-user-hover, .nspp-profile-dialog'));
      // Avatar links have no text; look their names up from a map built once per scan, not by re-querying per avatar.
      let names: Map<string, string> | undefined;
      const nameOf = (id: string) => {
        if (!names) {
          names = new Map();
          for (const candidate of anchors) {
            const text = candidate.textContent?.trim(); if (!text) continue;
            const candidateId = authorId(candidate, location.origin); if (candidateId && !names.has(candidateId)) names.set(candidateId, text);
          }
        }
        return names.get(id);
      };
      anchors.forEach(anchor => {
        if (!isUserHoverAnchor(anchor)) return;
        const id = authorId(anchor, location.origin);
        if (!id || id === String(ownId) || buttons.get(anchor)?.id === id) return;
        const name = anchor.textContent?.trim() || nameOf(id) || anchor.querySelector('img')?.alt.trim();
        if (!name) return;
        const previous = buttons.get(anchor); if (previous) { previous.button.remove(); previous.release(); buttons.delete(anchor); }
        const button = document.createElement('button'); button.type = 'button'; button.className = 'nspp-block-toggle';
        const hover = userHover(anchor, ctx); (hover.element.querySelector('.nspp-user-hover-actions') || hover.element).append(button);
        buttons.set(anchor, { id, name, button, release: hover.release });
        button.addEventListener('click', async () => {
          if (pending.has(id) || fetching) return;
          if (!loaded) { try { await refresh(); } catch { ctx.notify('黑名单查询失败'); } return; }
          pending.add(id); render();
          try {
            if (Date.now() - checked > 30000) await refresh();
            const remove = blocked.has(id);
            const action = remove ? '解除屏蔽' : '屏蔽';
            if (!await confirmDialog(`${action} ${name}？`, remove ? '解除后将恢复显示该用户的内容。' : '屏蔽后将按站点规则隐藏该用户的内容，可随时解除。', `确认${action}`, ctx.signal)) return;
            if (Date.now() - checked > 30000) await refresh();
            if (blocked.has(id) !== remove || (unsafeWindow as Window & { __config__?: { user?: { member_id?: number } } }).__config__?.user?.member_id !== ownId) {
              ctx.notify('状态已变化，请重新操作'); return;
            }
            const result = await ctx.request<{ success: boolean; message?: string }>(`/api/block-list/${remove ? 'del' : 'add'}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(remove ? { block_member_id: Number(id) } : { block_member_name: name }),
            });
            if (!result?.success) throw new Error(result?.message || '操作未成功');
            if (remove) blocked.delete(id); else blocked.add(id);
            checked = Date.now();
            ctx.notify(remove ? '已解除屏蔽' : '已屏蔽');
          } catch { loaded = false; ctx.notify('操作未确认，请重新查询'); }
          finally { pending.delete(id); render(); }
        }, { signal: ctx.signal });
      });
      render();
      if (buttons.size && !checked && !fetching) { checked = Date.now(); void refresh().catch(() => {}); }
    });
    return () => { stop(); buttons.forEach(({ button, release }) => { button.remove(); release(); }); };
  },
};
