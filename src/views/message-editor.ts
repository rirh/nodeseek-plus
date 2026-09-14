import type { Context } from '../core/types';
import { GM_getValue } from '../lib/userscript';
import { getNodeImageKey, uploadNodeImage } from '../features/nodeimage-upload';
import { uploadRequest, uploadResult } from '../features/actions-upload-protocol';
import { renderMessageMarkdown } from './message-markdown';

type Options = { peer(): number | undefined; insert(peer: number, text: string): void; changed(): void; original(): void };
type History = { entries: string[]; cursor: number };
const paths: Record<string, string> = {
  bold: 'M7 4h6a4 4 0 0 1 0 8H7m0 0h7a4 4 0 0 1 0 8H7V4',
  italic: 'M10 4h8M6 20h8M14 4 10 20',
  strike: 'M17 6c-1-2-8-3-10 1-2 4 4 5 7 6s5 5 1 7c-3 1-7 0-9-2M3 12h18',
  heading: 'M5 4v16M19 4v16M5 12h14',
  unordered: 'M8 5h13M8 12h13M8 19h13M3 5h.1M3 12h.1M3 19h.1',
  ordered: 'M9 5h12M9 12h12M9 19h12M2 3h2v5M2 12c4-3 4 1 0 4h4',
  quote: 'M4 12h6v7H3v-7c0-5 3-7 6-7M16 12h5v7h-7v-7c0-5 3-7 6-7',
  link: 'm10 13 4-4M8 15l-2 2a3 3 0 0 1-4-4l5-5a3 3 0 0 1 4 0M16 9l2-2a3 3 0 0 0-4-4l-5 5',
  image: 'M3 4h18v16H3zM3 17l6-6 4 4 3-3 5 5M16 8h.1',
  code: 'm7 6-5 6 5 6m10-12 5 6-5 6M14 3l-4 18',
  table: 'M3 4h18v16H3zM3 9h18M3 15h18M10 4v16',
  rule: 'M3 12h18',
  undo: 'M3 10h11a6 6 0 0 1 0 12M3 10l5-5m-5 5 5 5',
  redo: 'M21 10H10a6 6 0 0 0 0 12m17-12-5-5m5 5-5 5',
  clear: 'm9 4 12 10-7 8H8L1 16zM6 11l10 9M14 22h8',
  document: 'M5 2h9l5 5v15H5zM14 2v6h5M8 12h8M8 16h8',
};

export function createMessageEditor(ctx: Context, input: HTMLTextAreaElement, markdown: HTMLInputElement, options: Options) {
  const root = document.createElement('div'); root.className = 'nspp-message-editor';
  const toolbar = document.createElement('div'); toolbar.className = 'nspp-message-editor-toolbar'; toolbar.setAttribute('role', 'toolbar'); toolbar.setAttribute('aria-label', 'Markdown 格式');
  const body = document.createElement('div'); body.className = 'nspp-message-editor-body';
  const preview = document.createElement('div'); preview.className = 'nspp-message-editor-preview'; preview.hidden = true;
  const status = document.createElement('div'); status.className = 'nspp-message-editor-status'; status.setAttribute('role', 'status');
  const images = document.createElement('input'); images.type = 'file'; images.accept = 'image/*'; images.multiple = true; images.hidden = true;
  const documentFile = document.createElement('input'); documentFile.type = 'file'; documentFile.accept = '.md,.markdown,text/markdown,text/plain'; documentFile.hidden = true;
  const uploadSettings = () => GM_getValue<Record<string, { provider?: string; base?: string; enabled?: boolean }>>(`nspp:settings:${location.hostname}`, {})['image-upload'] || {};
  const key = document.createElement('input'); key.type = 'password'; key.autocomplete = 'off'; key.placeholder = '图床 API Key（仅本页）'; key.setAttribute('aria-label', key.placeholder); key.hidden = !uploadSettings().provider || uploadSettings().provider === 'NodeImage';
  const login = document.createElement('a'); login.href = 'https://www.nodeimage.com/'; login.target = '_blank'; login.rel = 'noopener noreferrer'; login.textContent = '登录 NodeImage'; login.hidden = true;
  const uploadHelp = document.createElement('div'); uploadHelp.className = 'nspp-message-upload-help'; uploadHelp.append(key, login);
  body.append(input, preview); root.append(body, status, uploadHelp, images, documentFile);
  const histories = new Map<number, History>(), uploads = new Set<number>(), statuses = new Map<number, string>();
  let applying = false, previewing = false, disabled = false, nodeImageKey = '';
  let auth: Promise<string> | undefined;
  const toolButtons: HTMLButtonElement[] = [];
  function history() {
    const peer = options.peer(); if (!peer) return;
    let history = histories.get(peer);
    if (!history) { history = { entries: [input.value], cursor: 0 }; histories.set(peer, history); }
    return history;
  }
  function changed() {
    if (!applying) {
      const value = history();
      if (value && value.entries[value.cursor] !== input.value) {
        value.entries.splice(value.cursor + 1); value.entries.push(input.value);
        if (value.entries.length > 100) value.entries.shift();
        value.cursor = value.entries.length - 1;
      }
    }
    if (previewing) preview.replaceChildren(renderMessageMarkdown(input.value, markdown.checked));
  }
  function apply(value: string, start: number, end = start) {
    input.value = value; input.focus(); input.setSelectionRange(start, end); input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function insert(before: string, after = '', placeholder = '') {
    const start = input.selectionStart, end = input.selectionEnd;
    const selected = input.value.slice(start, end) || placeholder;
    markdown.checked = true;
    apply(input.value.slice(0, start) + before + selected + after + input.value.slice(end), start + before.length, start + before.length + selected.length);
  }
  function lines(prefix: string | ((index: number) => string)) {
    const start = input.value.lastIndexOf('\n', input.selectionStart - 1) + 1;
    const newline = input.value.indexOf('\n', input.selectionEnd); const end = newline < 0 ? input.value.length : newline;
    const text = input.value.slice(start, end).split('\n').map((line, index) => `${typeof prefix === 'function' ? prefix(index) : prefix}${line}`).join('\n');
    markdown.checked = true; apply(input.value.slice(0, start) + text + input.value.slice(end), start, start + text.length);
  }
  const tool = (name: string, label: string, action: () => void) => {
    const button = document.createElement('button'); button.type = 'button'; button.title = label; button.setAttribute('aria-label', label);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', paths[name]); svg.append(path); button.append(svg);
    button.addEventListener('click', () => { if (!disabled && options.peer()) action(); }, { signal: ctx.signal }); toolbar.append(button); toolButtons.push(button); return button;
  };
  tool('bold', '加粗', () => insert('**', '**', '粗体文字'));
  tool('italic', '斜体', () => insert('*', '*', '斜体文字'));
  tool('strike', '删除线', () => insert('~~', '~~', '删除文字'));
  tool('heading', '标题', () => lines('## '));
  tool('unordered', '无序列表', () => lines('- '));
  tool('ordered', '有序列表', () => lines(index => `${index + 1}. `));
  tool('quote', '引用', () => lines('> '));
  tool('link', '链接', () => insert('[', '](https://)', '链接文字'));
  tool('image', '上传图片（支持粘贴和拖拽）', () => images.click());
  tool('code', '代码块', () => insert('\n```\n', '\n```\n', '代码'));
  tool('table', '表格', () => insert('\n| 标题 | 标题 |\n| --- | --- |\n| 内容 | 内容 |\n'));
  tool('rule', '分隔线', () => insert('\n\n---\n\n'));
  const travel = (step: number) => {
    const value = history(); if (!value) return;
    value.cursor = Math.max(0, Math.min(value.entries.length - 1, value.cursor + step));
    applying = true; apply(value.entries[value.cursor], value.entries[value.cursor].length); applying = false;
  };
  tool('undo', '撤销', () => travel(-1)); tool('redo', '重做', () => travel(1));
  tool('clear', '清除格式', () => {
    const start = input.selectionStart, end = input.selectionEnd; const all = start === end;
    const text = (all ? input.value : input.value.slice(start, end)).replace(/^\s*(?:#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+)/gm, '').replace(/(\*\*|__|~~|`)(.*?)\1/g, '$2').replace(/\*([^*\n]+)\*/g, '$1');
    apply(all ? text : input.value.slice(0, start) + text + input.value.slice(end), all ? text.length : start + text.length);
  });
  tool('document', '导入 Markdown 文件', () => documentFile.click());
  const previewButton = document.createElement('button'); previewButton.type = 'button'; previewButton.className = 'nspp-message-editor-tab'; previewButton.textContent = '预览'; previewButton.setAttribute('aria-pressed', 'false');
  previewButton.addEventListener('click', () => {
    previewing = !previewing; input.hidden = previewing; preview.hidden = !previewing; previewButton.textContent = previewing ? '编辑' : '预览'; previewButton.setAttribute('aria-pressed', String(previewing));
    if (previewing) preview.replaceChildren(renderMessageMarkdown(input.value, markdown.checked)); else input.focus();
  }, { signal: ctx.signal }); toolbar.append(previewButton);
  const original = document.createElement('button'); original.type = 'button'; original.className = 'nspp-message-editor-tab'; original.textContent = '原版编辑器'; original.addEventListener('click', options.original, { signal: ctx.signal }); toolbar.append(original);
  const updateStatus = () => { status.textContent = statuses.get(options.peer() || 0) || ''; options.changed(); };
  async function uploadFiles(files: File[]) {
    const peer = options.peer(); if (!peer || disabled || uploads.has(peer) || !files.length) return;
    const settings = uploadSettings(), provider = settings.provider || 'NodeImage';
    if (settings.enabled === false) { statuses.set(peer, '请先在设置中开启图片上传'); updateStatus(); return; }
    uploads.add(peer); updateStatus();
    try {
      for (let index = 0; index < files.length; index++) {
        if (ctx.signal.aborted) return;
        const file = files[index]; if (!file.type.startsWith('image/')) continue;
        statuses.set(peer, `正在上传 ${index + 1}/${files.length}：${file.name}`); updateStatus();
        let apiKey = key.value.trim();
        if (provider === 'NodeImage') {
          if (!nodeImageKey) await (auth ||= getNodeImageKey(ctx.signal).then(value => { nodeImageKey = value; }).finally(() => { auth = undefined; }));
          apiKey = nodeImageKey;
        }
        const request = uploadRequest(provider, settings.base || '', apiKey, file);
        const result = provider === 'NodeImage' ? await uploadNodeImage(request.body, request.headers, ctx.signal)
          : await ctx.request(request.url, { method: 'POST', headers: request.headers, body: request.body });
        const url = uploadResult(provider, request.base, result);
        if (ctx.signal.aborted) return;
        options.insert(peer, `![image](<${url.href.replace(/>/g, '%3E')}>)\n`);
      }
      statuses.set(peer, '图片已插入草稿'); login.hidden = true;
    } catch (error) {
      if (provider === 'NodeImage') { nodeImageKey = ''; login.hidden = false; }
      statuses.set(peer, error instanceof Error ? error.message : '图片上传失败，请重试');
    } finally { uploads.delete(peer); images.value = ''; if (!ctx.signal.aborted) updateStatus(); }
  }
  images.addEventListener('change', () => { void uploadFiles(Array.from(images.files || [])); }, { signal: ctx.signal });
  input.addEventListener('paste', event => {
    const files = Array.from(event.clipboardData?.items || []).filter(item => item.kind === 'file' && item.type.startsWith('image/')).map(item => item.getAsFile()).filter((file): file is File => !!file);
    if (files.length && !disabled) { event.preventDefault(); void uploadFiles(files); }
  }, { signal: ctx.signal });
  root.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); }, { signal: ctx.signal });
  root.addEventListener('drop', event => { const files = Array.from(event.dataTransfer?.files || []).filter(file => file.type.startsWith('image/')); if (files.length) { event.preventDefault(); void uploadFiles(files); } }, { signal: ctx.signal });
  documentFile.addEventListener('change', async () => {
    const file = documentFile.files?.[0], peer = options.peer(); documentFile.value = ''; if (!file || !peer || disabled) return;
    if (uploads.has(peer)) { statuses.set(peer, '当前会话仍在处理文件，请稍后再导入'); updateStatus(); return; }
    uploads.add(peer); updateStatus();
    try {
      if (file.size > 2_000_000) throw new Error('Markdown 文件不能超过 2 MB');
      const text = await file.text(); if (!ctx.signal.aborted) options.insert(peer, text);
      statuses.set(peer, 'Markdown 文件已导入草稿');
    } catch (error) { statuses.set(peer, error instanceof Error ? error.message : '文件读取失败'); }
    finally { uploads.delete(peer); if (!ctx.signal.aborted) updateStatus(); }
  }, { signal: ctx.signal });
  input.addEventListener('input', changed, { signal: ctx.signal }); markdown.addEventListener('change', changed, { signal: ctx.signal });
  input.addEventListener('keydown', event => {
    if (event.isComposing || disabled || !(event.ctrlKey || event.metaKey)) return;
    if (event.key.toLowerCase() === 'z') { event.preventDefault(); travel(event.shiftKey ? 1 : -1); }
    else if (event.key.toLowerCase() === 'y') { event.preventDefault(); travel(1); }
    else if (event.key.toLowerCase() === 'b') { event.preventDefault(); insert('**', '**', '粗体文字'); }
    else if (event.key.toLowerCase() === 'i') { event.preventDefault(); insert('*', '*', '斜体文字'); }
  }, { signal: ctx.signal });
  return {
    element: root, toolbar, busy: (peer: number) => uploads.has(peer),
    activate: () => { previewing = false; preview.hidden = true; input.hidden = false; previewButton.textContent = '预览'; previewButton.setAttribute('aria-pressed', 'false'); changed(); status.textContent = statuses.get(options.peer() || 0) || ''; },
    setDisabled: (value: boolean) => { disabled = value; toolButtons.forEach(button => { button.disabled = value; }); images.disabled = value; documentFile.disabled = value; original.disabled = value; },
  };
}
