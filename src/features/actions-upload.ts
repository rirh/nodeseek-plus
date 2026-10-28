import { getNodeImageKey, uploadImage } from './nodeimage-upload';
import { imageProviders, uploadErrorText, uploadNeedsKey, uploadRequest, uploadResult } from './actions-upload-protocol';
import { hasRequest } from '../lib/userscript';
import type { Feature } from '../core/types';
import { setShine } from '../views/sweep-shine';

type Editor = { replaceSelection(text: string): void; focus(): void };
export const imageUpload: Feature = {
  id: 'image-upload', title: '图片上传', group: '操作辅助',
  description: '选择、粘贴或拖拽图片上传并插入链接。默认使用 NodeImage 官方图床（登录后自动获取密钥）；也可选择常见图床协议或「自定义」接口。API Key 仅存当前页面内存。',
  defaults: { enabled: true, provider: 'NodeImage', base: '', customField: 'file', customHeaders: '', customResult: 'data.url' },
  fields: {
    provider: { label: '图床', type: 'select', options: imageProviders.map(value => ({ label: value === 'NodeImage' ? 'NodeImage 官方图床（默认）' : value === 'Custom' ? '自定义接口' : value, value })) },
    base: { label: '图床地址（HTTPS；自定义接口填完整上传地址）', type: 'text' },
    customField: { label: '图片表单字段名', type: 'text' },
    customHeaders: { label: '请求头（每行「名称: 值」，{key} 替换为页面填写的密钥，例如 Authorization: Bearer {key}）', type: 'textarea' },
    customResult: { label: '返回 JSON 中图片地址的路径（如 data.url、data[0].src）', type: 'text' },
  },
  mount(ctx) {
    const bound = new WeakSet<Element>(); const bars: HTMLElement[] = []; const placements: (() => void)[] = []; let apiKey = '';
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
          input.disabled = true; key.disabled = true; setShine(status, true); status.textContent = '上传中…';
          try {
            if (ctx.get<string>('provider') === 'NodeImage' && !apiKey) { status.textContent = '正在获取 NodeImage 登录状态…'; await ensureKey(); status.textContent = '上传中…'; }
            const provider = ctx.get<string>('provider');
            const request = uploadRequest(provider, ctx.get<string>('base'), apiKey, file, { field: ctx.get<string>('customField'), headers: ctx.get<string>('customHeaders') });
            const result = provider === 'NodeImage' || hasRequest()
              ? await uploadImage(request.url, request.body, request.headers, ctx.signal)
              : await ctx.request<unknown>(request.url, { method: 'POST', headers: request.headers, body: request.body });
            const url = uploadResult(provider, request.base, result, ctx.get<string>('customResult'));
            if (ctx.signal.aborted) return false;
            const markdown = `![image](<${url.href.replace(/>/g, '%3E')}>)`;
            if (cm) { cm.replaceSelection(markdown); cm.focus(); }
            else { ta!.setRangeText(markdown, ta!.selectionStart, ta!.selectionEnd, 'end'); ta!.dispatchEvent(new Event('input', { bubbles: true })); }
            status.textContent = ''; if (nodeImage) official.hidden = true; return true;
          } catch (error) { if (error instanceof Error && /密钥无效|无权限/.test(error.message)) { apiKey = ''; key.value = ''; official.hidden = false; } if (!ctx.signal.aborted) status.textContent = uploadErrorText(error); return false; }
          finally { input.disabled = false; key.disabled = false; input.value = ''; setShine(status, false); }
        }
        bar.append(official); if (uploadNeedsKey(ctx.get<string>('provider'), ctx.get<string>('customHeaders'))) bar.append(key); bar.append(input, status);
        const imageSelector = '.toolbar-item.i-icon.i-icon-pic[title="图片"]';
        host.addEventListener('click', event => {
          if (!(event.target instanceof Element) || !event.target.closest(imageSelector)) return;
          event.preventDefault(); event.stopImmediatePropagation();
          if (!uploading) input.click();
        }, { signal: ctx.signal, capture: true });
        const choose = document.createElement('button'); choose.type = 'button'; choose.className = 'nspp-upload-choose'; choose.title = '上传图片'; choose.setAttribute('aria-label', choose.title);
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('aria-hidden', 'true');
        const path = document.createElementNS(icon.namespaceURI, 'path'); path.setAttribute('d', 'M3 4h18v16H3zM3 17l6-6 4 4 3-3 5 5M16 8h.1'); icon.append(path);
        choose.append(icon);
        choose.addEventListener('click', () => { if (!uploading) input.click(); }, { signal: ctx.signal });
        // The site renders .mde-toolbar late and hides it on phones, so anchor to the always-present header row
        // (内容/预览 tabs + 行号/工具栏/全屏 buttons). Re-run on DOM changes because Vue may re-render it.
        const place = () => {
          if (!host.isConnected) return;
          const topButton = host.querySelector<HTMLElement>('.editor-top-button');
          const top = topButton?.parentElement;
          if (top && topButton) {
            if (choose.parentElement !== top) top.insertBefore(choose, topButton);
            if (bar.previousElementSibling !== top) top.after(bar);
            return;
          }
          if (!choose.isConnected) bar.prepend(choose);
          if (!bar.isConnected) host.append(bar);
        };
        place(); placements.push(place);
        bars.push(bar);
      });
    }
    scan(); checkLogin(); const unwatch = ctx.watch(() => { const count = bars.length; placements.forEach(place => place()); scan(); if (bars.length > count) checkLogin(); });
    return () => { unwatch(); apiKey = ''; bars.forEach(bar => bar.remove()); document.querySelectorAll('.nspp-upload-choose').forEach(button => button.remove()); };
  },
};
