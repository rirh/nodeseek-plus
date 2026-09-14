import { getNodeImageKey, uploadNodeImage } from './nodeimage-upload';
import { uploadRequest, uploadResult } from './actions-upload-protocol';
import type { Feature } from '../core/types';

type Editor = { replaceSelection(text: string): void; focus(): void };
export const imageUpload: Feature = {
  id: 'image-upload', title: '图片上传', group: '操作辅助',
  description: '选择图片上传并插入链接，支持六类图床协议。默认使用 NodeImage 官方图床；其他服务须允许 CORS；密钥仅存当前页面内存。',
  defaults: { enabled: true, provider: 'NodeImage', base: '' },
  fields: {
    provider: { label: '图床协议', type: 'select', options: ['NodeImage', 'Telegraph', 'Telegraph2', 'LskyPro', 'Chevereto', 'EasyImages'].map(value => ({ label: value === 'NodeImage' ? 'NodeImage（论坛官方，默认）' : value, value })) },
    base: { label: '其他图床地址（NodeImage 固定使用官方地址）', type: 'text' },
  },
  mount(ctx) {
    const bound = new WeakSet<Element>(); const bars: HTMLElement[] = []; let apiKey = '';
    let auth: Promise<string> | undefined;
    let lastCheck = 0;
    const ensureKey = () => {
      if (apiKey) return Promise.resolve(apiKey);
      return auth ||= getNodeImageKey(ctx.signal).then(value => { if (!ctx.signal.aborted) apiKey = value; return value; }).finally(() => { auth = undefined; });
    };
    const checkLogin = () => {
      if (ctx.get<string>('provider') !== 'NodeImage' || apiKey || !bars.length || Date.now() - lastCheck < 3000) return;
      lastCheck = Date.now();
      void ensureKey().then(() => { if (!ctx.signal.aborted) bars.forEach(bar => { const status = bar.querySelector<HTMLElement>('[role="status"]')!; if (!status.hasAttribute('aria-busy')) status.textContent = ''; bar.querySelector<HTMLElement>('a')!.hidden = true; }); }).catch(() => { /* The login link remains available. */ });
    };
    window.addEventListener('focus', checkLogin, { signal: ctx.signal });
    function scan() {
      ctx.root.querySelectorAll<HTMLElement>('.md-editor').forEach(host => {
        if (bound.has(host)) return;
        const cm = (host.querySelector('.CodeMirror') as (HTMLElement & { CodeMirror?: Editor }) | null)?.CodeMirror;
        const ta = host.querySelector<HTMLTextAreaElement>('textarea'); if (!cm && !ta) return;
        bound.add(host);
        const bar = document.createElement('div'); bar.className = 'nspp-compose nspp-upload-status';
        const nodeImage = ctx.get<string>('provider') === 'NodeImage';
        const official = document.createElement('a'); official.href = 'https://www.nodeimage.com/'; official.target = '_blank'; official.rel = 'noopener noreferrer'; official.textContent = '登录 NodeImage'; official.hidden = ctx.get<string>('provider') !== 'NodeImage';
        const key = document.createElement('input'); key.type = 'password'; key.placeholder = '图床 API Key / Token（不保存）'; key.autocomplete = 'off'; key.setAttribute('aria-label', '图床 API Key / Token');
        key.addEventListener('input', () => { apiKey = key.value.trim(); }, { signal: ctx.signal });
        const input = document.createElement('input'); input.type = 'file'; input.hidden = true; input.multiple = true; input.accept = 'image/*'; input.setAttribute('aria-label', '选择要上传至所选图床的图片');
        const status = document.createElement('span'); status.setAttribute('role', 'status');
        let uploading = false;
        async function uploadFiles(files: File[]) {
          if (uploading) return;
          uploading = true;
          try { for (const file of files) { if (ctx.signal.aborted || !(await upload(file))) break; } }
          finally { uploading = false; }
        }
        input.addEventListener('change', () => { void uploadFiles(Array.from(input.files || [])); }, { signal: ctx.signal });
        host.addEventListener('paste', event => {
          if (!(event.target instanceof Element) || !event.target.closest('.CodeMirror, textarea') || (event.target as Element).closest('.nspp-compose')) return;
          const files = Array.from(event.clipboardData?.items || []).filter(item => item.kind === 'file' && item.type.startsWith('image/')).map(item => item.getAsFile()).filter((file): file is File => !!file);
          if (files.length) { event.preventDefault(); event.stopPropagation(); void uploadFiles(files); }
        }, { signal: ctx.signal, capture: true });
        host.addEventListener('dragover', event => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); }, { signal: ctx.signal });
        host.addEventListener('drop', event => {
          const files = Array.from(event.dataTransfer?.files || []).filter(file => file.type.startsWith('image/'));
          if (files.length) { event.preventDefault(); event.stopPropagation(); void uploadFiles(files); }
        }, { signal: ctx.signal, capture: true });
        async function upload(file: File): Promise<boolean> {
          if (input.disabled) return false;
          if (!file.type.startsWith('image/')) { status.textContent = '请选择图片文件'; input.value = ''; return false; }
          input.disabled = true; key.disabled = true; status.setAttribute('aria-busy', 'true'); status.textContent = '上传中…';
          try {
            if (ctx.get<string>('provider') === 'NodeImage' && !apiKey) { status.textContent = '正在获取 NodeImage 登录状态…'; await ensureKey(); status.textContent = '上传中…'; }
            const request = uploadRequest(ctx.get<string>('provider'), ctx.get<string>('base'), apiKey, file);
            const result = ctx.get<string>('provider') === 'NodeImage'
              ? await uploadNodeImage(request.body, request.headers, ctx.signal)
              : await ctx.request<unknown>(request.url, { method: 'POST', headers: request.headers, body: request.body });
            const url = uploadResult(ctx.get<string>('provider'), request.base, result);
            if (ctx.signal.aborted) return false;
            const markdown = `![image](<${url.href.replace(/>/g, '%3E')}>)`;
            if (cm) { cm.replaceSelection(markdown); cm.focus(); }
            else { ta!.setRangeText(markdown, ta!.selectionStart, ta!.selectionEnd, 'end'); ta!.dispatchEvent(new Event('input', { bubbles: true })); }
            status.textContent = ''; if (nodeImage) official.hidden = true; return true;
          } catch (error) { if (error instanceof Error && /密钥无效|无权限/.test(error.message)) { apiKey = ''; key.value = ''; official.hidden = false; } if (!ctx.signal.aborted) status.textContent = ctx.get<string>('provider') === 'NodeImage' && error instanceof Error ? error.message : '上传失败：请检查 HTTPS 图床地址、API Key、协议或 CORS 支持'; return false; }
          finally { input.disabled = false; key.disabled = false; input.value = ''; status.removeAttribute('aria-busy'); }
        }
        bar.append(official); if (!nodeImage) bar.append(key); bar.append(input, status);
        const toolbar = host.querySelector<HTMLElement>('.mde-toolbar');
        const imageSelector = '.toolbar-item.i-icon.i-icon-pic[title="图片"]';
        host.addEventListener('click', event => {
          if (!(event.target instanceof Element) || !event.target.closest(imageSelector)) return;
          event.preventDefault(); event.stopImmediatePropagation();
          if (!uploading) input.click();
        }, { signal: ctx.signal, capture: true });
        {
          const choose = document.createElement('button'); choose.type = 'button'; choose.className = 'nspp-upload-choose'; choose.title = '上传图片'; choose.setAttribute('aria-label', choose.title);
          const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('aria-hidden', 'true');
          const path = document.createElementNS(icon.namespaceURI, 'path'); path.setAttribute('d', 'M3 4h18v16H3zM3 17l6-6 4 4 3-3 5 5M16 8h.1'); icon.append(path);
          choose.append(icon);
          choose.addEventListener('click', () => { if (!uploading) input.click(); }, { signal: ctx.signal }); bar.prepend(choose);
        }
        (toolbar || host).append(bar); bars.push(bar);
      });
    }
    scan(); checkLogin(); const unwatch = ctx.watch(() => { const count = bars.length; scan(); if (bars.length > count) checkLogin(); });
    return () => { unwatch(); apiKey = ''; bars.forEach(bar => bar.remove()); };
  },
};
