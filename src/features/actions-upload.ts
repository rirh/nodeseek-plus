import { uploadRequest, uploadResult } from './actions-upload-protocol';
import type { Feature } from '../core/types';

type Editor = { replaceSelection(text: string): void; focus(): void };
export const imageUpload: Feature = {
  id: 'image-upload', title: '图片上传', group: '操作辅助',
  description: '选择图片上传并插入链接，支持六类图床协议。服务必须允许 CORS；密钥仅存当前页面内存。',
  defaults: { enabled: true, provider: 'NodeImage', base: '' },
  fields: {
    provider: { label: '图床协议', type: 'select', options: ['NodeImage', 'Telegraph', 'Telegraph2', 'LskyPro', 'Chevereto', 'EasyImages'].map(value => ({ label: value, value })) },
    base: { label: '图床地址（NodeImage 留空使用官方地址）', type: 'text' },
  },
  mount(ctx) {
    const bound = new WeakSet<Element>(); const bars: HTMLElement[] = []; let apiKey = '';
    function scan() {
      ctx.root.querySelectorAll<HTMLElement>('.md-editor').forEach(host => {
        if (bound.has(host)) return;
        const cm = (host.querySelector('.CodeMirror') as (HTMLElement & { CodeMirror?: Editor }) | null)?.CodeMirror;
        const ta = host.querySelector<HTMLTextAreaElement>('textarea'); if (!cm && !ta) return;
        bound.add(host);
        const bar = document.createElement('div'); bar.className = 'nspp-compose';
        const key = document.createElement('input'); key.type = 'password'; key.placeholder = '图床 API Key / Token（不保存）'; key.autocomplete = 'off'; key.setAttribute('aria-label', '图床 API Key / Token');
        key.addEventListener('input', () => { apiKey = key.value.trim(); }, { signal: ctx.signal });
        const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.setAttribute('aria-label', '选择要上传至所选图床的图片');
        const status = document.createElement('span'); status.setAttribute('role', 'status');
        input.addEventListener('change', () => { void upload(); }, { signal: ctx.signal });
        async function upload() {
          const file = input.files?.[0]; if (!file || input.disabled) return;
          if (!file.type.startsWith('image/')) { status.textContent = '请选择图片文件'; input.value = ''; return; }
          input.disabled = true; key.disabled = true; status.setAttribute('aria-busy', 'true'); status.textContent = '上传中…';
          try {
            const request = uploadRequest(ctx.get<string>('provider'), ctx.get<string>('base'), apiKey, file);
            const result = await ctx.request<unknown>(request.url, { method: 'POST', headers: request.headers, body: request.body });
            const url = uploadResult(ctx.get<string>('provider'), request.base, result);
            if (ctx.signal.aborted) return;
            const markdown = `![image](<${url.href.replace(/>/g, '%3E')}>)`;
            if (cm) { cm.replaceSelection(markdown); cm.focus(); }
            else { ta!.setRangeText(markdown, ta!.selectionStart, ta!.selectionEnd, 'end'); ta!.dispatchEvent(new Event('input', { bubbles: true })); }
            status.textContent = '上传完成，图片链接已插入';
          } catch { if (!ctx.signal.aborted) status.textContent = '上传失败：请检查 HTTPS 图床地址、API Key、协议或 CORS 支持'; }
          finally { input.disabled = false; key.disabled = false; input.value = ''; status.removeAttribute('aria-busy'); }
        }
        bar.append(key, input, status); host.prepend(bar); bars.push(bar);
      });
    }
    scan(); const unwatch = ctx.watch(scan);
    return () => { unwatch(); apiKey = ''; bars.forEach(bar => bar.remove()); };
  },
};
