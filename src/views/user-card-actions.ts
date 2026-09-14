import { unsafeWindow } from '../lib/userscript';
import { request } from '../lib/request';

// API contracts: https://github.com/5151561/nodyssey (FollowRepository, StardustRepository, NodeSeekSite).

const controls = new Set<{ id: string; button: HTMLButtonElement }>();
let followed = new Set<string>();
let viewer: number | undefined, checked = 0, loading: Promise<void> | undefined;
const pending = new Set<string>();
const ownId = () => (unsafeWindow as Window & { __config__?: { user?: { member_id?: number } } }).__config__?.user?.member_id;
const render = () => controls.forEach(({ id, button }) => {
  button.disabled = !!loading || pending.has(id);
  button.textContent = followed.has(id) ? '取消关注' : '关注';
  button.setAttribute('aria-label', checked ? button.textContent : '查询关注状态');
  if (button.disabled) button.setAttribute('aria-busy', 'true'); else button.removeAttribute('aria-busy');
});
async function refreshFollowing() {
  const account = ownId();
  if (!account) throw new Error('请先登录');
  if (viewer !== account) { viewer = account; checked = 0; followed.clear(); }
  if (loading) return loading;
  loading = request<{ success?: boolean; memberList?: { member_id: number }[] }>('/api/fans/follow').then(result => {
    if (result?.success !== true || !Array.isArray(result.memberList) || result.memberList.some(row => !Number.isSafeInteger(row.member_id) || row.member_id <= 0)) throw new Error('关注状态读取失败');
    if (ownId() !== account) throw new Error('登录状态已变化');
    followed = new Set(result.memberList.map(row => String(row.member_id))); checked = Date.now();
  }).finally(() => { loading = undefined; render(); });
  render(); return loading;
}

export function userCardActions(id: string, name: () => string, notify: (message: string) => void, signal: AbortSignal) {
  const element = document.createElement('div'); element.className = 'nspp-user-hover-actions';
  const transfer = document.createElement('button'); transfer.type = 'button'; transfer.dataset.action = 'transfer'; transfer.textContent = '转账';
  const follow = document.createElement('button'); follow.type = 'button'; follow.dataset.action = 'follow'; follow.textContent = '关注';
  const message = document.createElement('a'); message.dataset.action = 'message'; message.textContent = '私信'; message.href = `/notification#/message?mode=talk&to=${id}`;
  element.append(transfer, follow, message);
  const control = { id, button: follow }; controls.add(control);
  let dialog: HTMLDialogElement | undefined;
  signal.addEventListener('abort', () => { controls.delete(control); dialog?.remove(); }, { once: true });
  const refresh = () => {
    element.hidden = String(ownId()) === id;
    if (ownId() && !element.hidden && (viewer !== ownId() || Date.now() - checked > 60000)) void refreshFollowing().catch(() => {});
  };
  render(); element.hidden = String(ownId()) === id;
  follow.addEventListener('click', async () => {
    if (pending.has(id)) return;
    const account = ownId();
    try {
      if (!account) throw new Error('请先登录');
      const remove = viewer === account && !!checked && followed.has(id);
      pending.add(id); render();
      if (viewer !== account || Date.now() - checked > 30000) {
        await refreshFollowing();
        // A stale label must not turn a requested follow into an unfollow.
        if (followed.has(id) !== remove) { notify(followed.has(id) ? '已关注' : '已取消关注'); return; }
      }
      const result = await request<{ success?: boolean; message?: string }>(`/api/fans/${remove ? 'del' : 'add'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ followed_member_id: Number(id) }), signal,
      });
      if (result?.success !== true) throw new Error(result?.message || '操作未确认，请重试查询');
      if (ownId() !== account) { checked = 0; return; }
      if (remove) followed.delete(id); else followed.add(id);
      checked = Date.now(); notify(remove ? '已取消关注' : '已关注');
    } catch (error) { checked = 0; notify(error instanceof Error ? error.message : '关注操作失败'); }
    finally { pending.delete(id); render(); }
  }, { signal });
  transfer.addEventListener('click', async () => {
    const account = ownId();
    if (!account) { notify('请先登录'); return; }
    dialog?.remove();
    const panel = document.createElement('dialog'); dialog = panel; panel.className = 'nspp-history nspp-user-transfer'; panel.setAttribute('aria-label', '星辰转账');
    const title = document.createElement('h2'); title.textContent = '星辰转账';
    const recipient = document.createElement('p'); recipient.textContent = `${name()} · UID ${id}`;
    const form = document.createElement('form');
    const label = document.createElement('label'); label.textContent = '星辰数量';
    const amount = document.createElement('input'); amount.type = 'number'; amount.min = '1'; amount.step = '1'; amount.required = true; amount.inputMode = 'numeric'; label.append(amount);
    const status = document.createElement('p'); status.setAttribute('role', 'status'); status.textContent = '正在确认收款人…';
    const actions = document.createElement('div'); actions.className = 'nspp-transfer-actions';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = '取消'; cancel.addEventListener('click', () => panel.close(), { signal });
    const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = '确认转账'; submit.disabled = true;
    actions.append(cancel, submit); form.append(label, status, actions); panel.append(title, recipient, form); document.body.append(panel); panel.showModal();
    const ref = 100 + Math.floor(Math.random() * 100000000);
    let ready = false, sending = false;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const value = Number(amount.value);
      if (!ready || sending || !Number.isSafeInteger(value) || value <= 0 || !form.reportValidity()) return;
      if (ownId() !== account) { status.textContent = '登录状态已变化，请重新打开转账'; submit.disabled = true; return; }
      sending = true; submit.disabled = true; amount.disabled = true; status.textContent = '转账中…';
      try {
        const result = await request<{ success?: boolean; message?: string }>('/api/stardust/send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_id: Number(id), diff: value, ref_id: ref, onetime: true }), signal,
        });
        if (result?.success === true) { panel.close(); notify(`已转账 ${value} 星辰`); }
        else if (result?.success === false) { status.textContent = result.message || '转账未成功'; sending = false; submit.disabled = false; amount.disabled = false; }
        else throw new Error('结果未确认');
      } catch {
        status.textContent = '结果未确认，请先核对星辰明细，勿重复转账。';
        const ledger = document.createElement('a'); ledger.href = `/stardust/list?member_id=${account}`; ledger.textContent = '查看明细'; ledger.target = '_blank'; ledger.rel = 'noopener'; status.append(' ', ledger);
      }
    }, { signal });
    try {
      const result = await request<{ success?: boolean; receiver_name?: string; message?: string }>('/api/stardust/payment-prepare', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiver_id: Number(id), origin: location.origin }), signal,
      });
      if (result?.success !== true || !result.receiver_name) throw new Error(result?.message || '无法确认收款人');
      if (!panel.open || signal.aborted) return;
      recipient.textContent = `${result.receiver_name} · UID ${id}`; status.textContent = ''; ready = true; submit.disabled = false; amount.focus();
    } catch (error) { status.textContent = error instanceof Error ? error.message : '无法确认收款人'; }
  }, { signal });
  return { element, refresh };
}
