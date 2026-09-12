import { toolIcon } from '../lib/tool-icon';
import { unsafeWindow } from '../lib/userscript';
import { withTabLock } from '../lib/tab-lock';
import type { Feature } from '../core/types';
export const serviceFeatures: Feature[] = [
  {
    id: 'unread', title: '未读消息', description: '可见页面每60秒读取回复、提及、私信数量；请求失败保留上次结果。', group: '操作辅助', defaults: { enabled: false },
    mount(ctx) {
      const uid = (unsafeWindow as Window & { __config__?: { user?: { member_id?: number } } }).__config__?.user?.member_id;
      if (!uid) return;
      const cacheKey = `counts:${uid}`;
      const host = document.createElement('span'); host.setAttribute('role', 'status');
      const refresh = document.createElement('button'); refresh.type = 'button'; refresh.className = 'nspp-tool-icon'; refresh.title = '检查消息'; refresh.setAttribute('aria-label', refresh.title); refresh.replaceChildren(toolIcon('messages')); host.append(refresh);
      const counters = document.createElement('span'); host.append(counters); (document.getElementById('nspp-tools') || document.querySelector('.user-card') || document.body).append(host);
      let pending = false; let previous = -1; let failed = false; let lastAttempt = 0;
      const render = (counts?: Record<string, number>) => {
        if (!counts) return;
        let total = 0; const fragment = document.createDocumentFragment();
        for (const [key, label, path] of [['reply', '回复', 'reply'], ['atMe', '提及', 'atMe'], ['message', '私信', 'message?mode=list']]) {
          const count = counts[key]; if (!Number.isFinite(count) || count < 0) throw new Error('Invalid count'); total += count;
          const a = document.createElement('a'); a.href = `/notification#/${path}`; a.textContent = ` ${label} ${count} `; fragment.append(a);
        }
        counters.replaceChildren(fragment); if (previous >= 0 && total > previous) ctx.notify(`有新消息，当前未读 ${total} 条`); previous = total;
      };
      const run = async () => {
        if (pending || document.hidden || ctx.signal.aborted || Date.now() - lastAttempt < 5_000) return;
        lastAttempt = Date.now(); pending = true; refresh.disabled = true; refresh.title = '检查中…'; refresh.setAttribute('aria-label', refresh.title); refresh.setAttribute('aria-busy', 'true');
        try {
          await withTabLock(`unread:${uid}`, 60_000, async () => {
            const result = await ctx.request<{ success: boolean; unreadCount?: Record<string, number> }>('/api/notification/unread-count');
            if (!result.success || !result.unreadCount) throw new Error('Invalid response');
            render(result.unreadCount); ctx.set(cacheKey, result.unreadCount); failed = false;
          });
          render(ctx.get<Record<string, number>>(cacheKey));
        } catch {
          if (!ctx.signal.aborted && !failed) ctx.notify('未读消息检查失败，保留上次结果');
          failed = true;
        } finally { pending = false; refresh.disabled = false; refresh.title = failed ? '重试检查消息' : '检查消息'; refresh.setAttribute('aria-label', refresh.title); refresh.removeAttribute('aria-busy'); }
      };
      try { render(ctx.get<Record<string, number>>(cacheKey)); } catch { /* Invalid old cache is ignored. */ }
      refresh.addEventListener('click', () => { void run(); }, { signal: ctx.signal });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) void run(); }, { signal: ctx.signal }); void run();
      const timer = setInterval(() => { void run(); }, 60_000); return () => { clearInterval(timer); host.remove(); };
    },
  },
  {
    id: 'ai-polish', title: 'AI 文本美化', description: '点击后将当前编辑器文本发送至你配置的服务；先预览，再手动采用，不自动提交。服务需允许 CORS。', group: '编辑',
    defaults: { enabled: false, url: '', apiKey: '', model: '', prompt: '请润色以下 Markdown 文本，保留原意，只输出修改后的文本。' },
    fields: { url: { label: '完整 chat/completions 接口 URL', type: 'text' }, apiKey: { label: 'API Key（仅本机保存）', type: 'text' }, model: { label: '模型', type: 'text' }, prompt: { label: '系统提示词', type: 'textarea' } },
    mount(ctx) {
      type Editor = { getValue(): string; setValue(text: string): void; focus(): void };
      const added: HTMLElement[] = []; let dialog: HTMLDialogElement | undefined;
      const scan = () => document.querySelectorAll<HTMLElement>('.md-editor').forEach(host => {
        if (host.querySelector('[data-nspp-ai]')) return;
        const editor = (host.querySelector('.CodeMirror') as (HTMLElement & { CodeMirror?: Editor }) | null)?.CodeMirror;
        const toolbar = host.querySelector('.mde-toolbar'); if (!editor || !toolbar) return;
        const button = document.createElement('button'); button.type = 'button'; button.textContent = '发送编辑器文本给 AI'; button.dataset.nsppAi = ''; toolbar.append(button); added.push(button);
        const test = document.createElement('button'); test.type = 'button'; test.dataset.nsppAiTest = ''; test.textContent = '测试 AI 连接'; toolbar.append(test); added.push(test);
        test.addEventListener('click', async () => {
          let url: URL; try { url = new URL(ctx.get<string>('url')); if (url.protocol !== 'https:') throw new Error('HTTPS required'); } catch { ctx.notify('请设置完整 HTTPS API 地址'); return; }
          if (!ctx.get<string>('model')) { ctx.notify('请先填写模型名称'); return; }
          test.disabled = true; test.textContent = '连接测试中…'; test.setAttribute('aria-busy', 'true');
          try {
            const response = await ctx.request<{ choices?: { message?: { content?: string } }[] }>(url.href, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.get<string>('apiKey')}` }, body: JSON.stringify({ model: ctx.get<string>('model'), messages: [{ role: 'user', content: 'Reply with OK. This is a connection test.' }], max_tokens: 16, stream: false }) });
            if (!response.choices?.[0]?.message?.content) throw new Error('Empty response');
            ctx.notify('AI 连接成功');
          } catch { if (!ctx.signal.aborted) ctx.notify('AI 连接失败，请检查地址、模型、Key 和 CORS'); }
          finally { test.disabled = false; test.textContent = '测试 AI 连接'; test.removeAttribute('aria-busy'); }
        }, { signal: ctx.signal });
        button.addEventListener('click', async () => {
          const original = editor.getValue(); if (!original.trim()) { ctx.notify('编辑器没有文本'); return; }
          let url: URL; try { url = new URL(ctx.get<string>('url')); if (url.protocol !== 'https:') throw new Error('HTTPS required'); } catch { ctx.notify('请设置完整 HTTPS API 地址'); return; }
          if (!ctx.get<string>('model')) { ctx.notify('请先填写模型名称'); return; }
          button.disabled = true; button.textContent = '生成中…'; button.setAttribute('aria-busy', 'true');
          try {
            const response = await ctx.request<{ choices?: { message?: { content?: string } }[] }>(url.href, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.get<string>('apiKey')}` }, body: JSON.stringify({ model: ctx.get<string>('model'), messages: [{ role: 'system', content: ctx.get<string>('prompt') }, { role: 'user', content: original }], stream: false }) });
            const result = response.choices?.[0]?.message?.content; if (!result) throw new Error('Empty response');
            if (ctx.signal.aborted) return;
            dialog?.remove(); dialog = document.createElement('dialog'); dialog.style.cssText = 'width:min(720px,92vw);max-height:85vh';
            const heading = document.createElement('h2'); heading.textContent = 'AI 结果预览';
            const preview = document.createElement('textarea'); preview.value = result; preview.style.cssText = 'width:100%;height:45vh;box-sizing:border-box'; preview.setAttribute('aria-label', 'AI 修改结果');
            const apply = document.createElement('button'); apply.type = 'button'; apply.textContent = '替换编辑器内容';
            const close = document.createElement('button'); close.type = 'button'; close.textContent = '取消'; close.addEventListener('click', () => dialog?.close(), { signal: ctx.signal });
            apply.addEventListener('click', () => { if (editor.getValue() !== original) { ctx.notify('编辑器内容已变化，请复制预览文本以免覆盖新修改'); return; } editor.setValue(preview.value); editor.focus(); dialog?.close(); }, { signal: ctx.signal });
            dialog.append(heading, preview, apply, close); document.body.append(dialog); dialog.showModal();
          } catch { if (!ctx.signal.aborted) ctx.notify('AI 请求失败，请检查服务地址、模型、Key 和 CORS 配置'); }
          finally { button.disabled = false; button.textContent = '发送编辑器文本给 AI'; button.removeAttribute('aria-busy'); }
        }, { signal: ctx.signal });
      });
      const stop = ctx.watch(scan); return () => { stop(); added.forEach(el => el.remove()); dialog?.remove(); };
    },
  },
  {
    id: 'prefetch', title: '帖子悬停预加载', description: '仅预取同站帖子，最多20条，节省流量模式下不运行。', group: '导航', defaults: { enabled: false },
    mount(ctx) {
      const seen = new Set<string>(); const links: HTMLLinkElement[] = [];
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection; if (connection?.saveData) return;
      document.addEventListener('pointerover', event => {
        const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]'); if (!anchor || seen.size >= 20) return;
        const url = new URL(anchor.href); if (url.origin !== location.origin || !/^\/post-\d+(?:-\d+)?(?:\.html)?$/.test(url.pathname) || url.search) return;
        url.hash = ''; if (seen.has(url.href)) return; seen.add(url.href);
        const link = document.createElement('link'); link.rel = 'prefetch'; link.href = url.href; document.head.append(link); links.push(link);
      }, { signal: ctx.signal }); return () => links.forEach(el => el.remove());
    },
  },
];
