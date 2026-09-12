import type { Context } from '../core/types';

const defaults = ['感谢分享！', '学习了，感谢楼主。', '收藏了，之后仔细看看。', '感谢解答，问题解决了。', '这个方法很实用，感谢。', '请问方便补充一下具体配置吗？', '请问目前还有吗？', '祝早出！'];
export function createQuickReplies(ctx: Context, send: (link: HTMLAnchorElement, text: string) => Promise<string>) {
  const saved = ctx.get<unknown>('quickReplies');
  let replies: string[] = Array.isArray(saved) ? saved.filter((item): item is string => typeof item === 'string' && !!item.trim()).slice(0, 200) : [...defaults];
  let target: HTMLAnchorElement | undefined, page = 0, editing = -1, busy = false;
  const size = 6;
  const dialog = document.createElement('dialog'); dialog.className = 'nspp-quick-replies'; dialog.setAttribute('aria-label', '快捷回复');
  const head = document.createElement('div'); head.className = 'nspp-quick-head';
  const heading = document.createElement('strong'); heading.textContent = '快捷回复';
  const close = document.createElement('button'); close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', '关闭快捷回复');
  head.append(heading, close);
  const title = document.createElement('p'); title.className = 'nspp-quick-target';
  const toolbar = document.createElement('div'); toolbar.className = 'nspp-quick-toolbar';
  const search = document.createElement('input'); search.type = 'search'; search.placeholder = '查找回复'; search.setAttribute('aria-label', '查找回复');
  const add = document.createElement('button'); add.type = 'button'; add.textContent = '新增'; add.className = 'nspp-quick-primary'; toolbar.append(search, add);
  const list = document.createElement('div'); list.className = 'nspp-quick-list';
  const editor = document.createElement('form'); editor.hidden = true;
  const text = document.createElement('textarea'); text.maxLength = 2000; text.required = true; text.rows = 3; text.placeholder = '输入常用回复内容…'; text.setAttribute('aria-label', '模板内容');
  const save = document.createElement('button'); save.type = 'submit'; save.textContent = '保存'; save.className = 'nspp-quick-primary';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = '取消'; editor.append(text, save, cancel);
  const footer = document.createElement('div'); footer.className = 'nspp-quick-pagination';
  const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = '上一页';
  const total = document.createElement('span');
  const next = document.createElement('button'); next.type = 'button'; next.textContent = '下一页'; footer.append(previous, total, next);
  const status = document.createElement('p'); status.className = 'nspp-quick-status'; status.setAttribute('role', 'status'); status.textContent = '点击回复内容即直接发送';
  dialog.append(head, title, toolbar, list, editor, footer, status); document.body.append(dialog);
  const persist = () => ctx.set('quickReplies', replies);
  const startEdit = (index: number) => { editing = index; text.value = index < 0 ? '' : replies[index]; editor.hidden = false; text.focus(); };
  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const matches = replies.map((body, index) => ({ body, index })).filter(item => item.body.toLocaleLowerCase().includes(query));
    const pages = Math.max(1, Math.ceil(matches.length / size)); page = Math.min(page, pages - 1);
    list.replaceChildren();
    for (const { body, index } of matches.slice(page * size, (page + 1) * size)) {
      const row = document.createElement('div'); row.className = 'nspp-quick-item';
      const reply = document.createElement('button'); reply.type = 'button'; reply.className = 'nspp-quick-send'; reply.textContent = body; reply.title = `直接发送：${body}`; reply.disabled = busy;
      reply.addEventListener('click', async () => {
        if (busy || !target) return;
        const link = target; busy = true; status.textContent = '加载中'; status.setAttribute('aria-busy', 'true'); render();
        try { const result = await send(link, body); if (!ctx.signal.aborted) { status.textContent = result; dialog.close(); ctx.notify(result); } }
        catch { if (!ctx.signal.aborted) { status.textContent = '回复结果未确认，请勿重复发送。'; dialog.close(); ctx.notify(status.textContent); } }
        finally { busy = false; status.removeAttribute('aria-busy'); if (!ctx.signal.aborted) render(); }
      }, { signal: ctx.signal });
      const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '修改'; edit.disabled = busy; edit.addEventListener('click', () => startEdit(index), { signal: ctx.signal });
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '删除'; remove.className = 'nspp-quick-delete'; remove.disabled = busy; remove.addEventListener('click', () => { replies.splice(index, 1); persist(); editor.hidden = true; render(); }, { signal: ctx.signal });
      row.append(reply, edit, remove); list.append(row);
    }
    if (!matches.length) { const empty = document.createElement('p'); empty.textContent = '暂无匹配回复'; list.append(empty); }
    total.textContent = `${page + 1} / ${pages} · ${matches.length} 条`;
    previous.disabled = busy || page === 0; next.disabled = busy || page === pages - 1; add.disabled = busy || replies.length >= 200; search.disabled = busy; save.disabled = busy;
  }
  close.addEventListener('click', () => dialog.close(), { signal: ctx.signal });
  search.addEventListener('input', () => { page = 0; render(); }, { signal: ctx.signal });
  add.addEventListener('click', () => startEdit(-1), { signal: ctx.signal });
  cancel.addEventListener('click', () => { editor.hidden = true; }, { signal: ctx.signal });
  editor.addEventListener('submit', event => { event.preventDefault(); if (busy || !text.value.trim()) return; if (editing < 0) replies.push(text.value.trim()); else replies[editing] = text.value.trim(); persist(); editor.hidden = true; render(); }, { signal: ctx.signal });
  previous.addEventListener('click', () => { page--; render(); }, { signal: ctx.signal });
  next.addEventListener('click', () => { page++; render(); }, { signal: ctx.signal });
  return {
    open(link: HTMLAnchorElement) {
      if (busy) { if (!dialog.open) dialog.showModal(); return; }
      target = link; title.textContent = link.textContent?.trim() || '当前帖子'; title.title = title.textContent; editor.hidden = true; status.textContent = '点击回复内容即直接发送'; render(); if (!dialog.open) dialog.showModal();
    },
    destroy() { dialog.remove(); },
  };
}
