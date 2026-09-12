import { toolIcon } from '../lib/tool-icon';
import { systemNotify, unsafeWindow } from '../lib/userscript';
import { withTabLock } from '../lib/tab-lock';
import type { Feature } from '../core/types';
export const serviceFeatures: Feature[] = [
  {
    id: 'notification-categories', title: '通知分类', description: '侧边卡片分别显示回复、@我、私信；每60秒检查，新回复、@我和私信使用系统通知，失败保留上次结果。', group: '操作辅助', defaults: { enabled: true },
    mount(ctx) {
      const initialize = () => {
        const uid = (unsafeWindow as Window & { __config__?: { user?: { member_id?: number } } }).__config__?.user?.member_id;
        if (!uid) return;
        const cacheKey = `counts:${uid}`;
        const host = document.createElement('span'); host.setAttribute('role', 'status'); host.className = 'nspp-notifications';
        const counters = document.createElement('span'); host.append(counters); const originals = new Map<HTMLElement, HTMLElement['hidden']>();
        const rows: HTMLElement[] = ['reply', 'atMe', 'message'].map(() => document.createElement('div'));
        rows.forEach(row => { row.className = 'nspp-notification-row'; });
        const place = () => {
          const card = document.querySelector('.user-card .user-stat, .user-stat');
          const columns = card?.querySelectorAll('.stat-block');
          if (columns && columns.length >= 2) {
            rows.forEach((row, index) => {
              const target = columns[index === 1 ? 1 : 0]!;
              if (row.parentElement !== target) target.append(row);
            });
            host.remove();
          } else {
            const target = document.getElementById('nspp-tools') || document.body;
            if (host.parentElement !== target) target.append(host);
            rows.forEach(row => { if (row.parentElement !== counters) counters.append(row); });
          }
          card?.querySelectorAll<HTMLAnchorElement>('a[href^="/notification"]').forEach(anchor => {
            if (anchor.classList.contains('nspp-notification-link')) return;
            if (!originals.has(anchor)) originals.set(anchor, anchor.hidden);
            anchor.hidden = true; anchor.classList.add('nspp-original-notification');
          });
        };
        let pending = false; let failed = false; let lastAttempt = 0;
        const render = (counts?: Record<string, number>) => {
          if (!counts) return;
          const links: HTMLAnchorElement[] = [];
          for (const [key, label, path] of [['reply', '回复', 'reply'], ['atMe', '我', 'atMe'], ['message', '私信', 'message?mode=list']]) {
            const count = counts[key]; if (!Number.isFinite(count) || count < 0) throw new Error('Invalid count');
            const a = document.createElement('a'); a.href = `/notification#/${path}`; a.className = 'nspp-notification-link';
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('fill', 'none'); icon.setAttribute('stroke', 'currentColor');
            icon.setAttribute('stroke-width', '1.8'); icon.setAttribute('stroke-linecap', 'round'); icon.setAttribute('stroke-linejoin', 'round');
            icon.setAttribute('aria-hidden', 'true'); icon.classList.add('nspp-notification-icon');
            const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            shape.setAttribute('d', key === 'reply' ? 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4' : key === 'atMe' ? 'M16 8v6a2 2 0 0 0 4 0v-2a8 8 0 1 0-3 6.25M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0' : 'M3 5h18v14H3zM3 5l9 7 9-7');
            icon.append(shape);
            const template = document.querySelector<HTMLAnchorElement>('.user-stat a[href^="/notification"]:not(.nspp-notification-link)');
            const native = template?.cloneNode(true) as HTMLAnchorElement | undefined;
            if (native && native.children.length >= 3 && native.querySelector('svg')) {
              native.removeAttribute('id'); native.hidden = false; native.classList.remove('nspp-original-notification'); native.classList.add('nspp-notification-link'); native.href = a.href;
              const nativeIcon = native.querySelector('svg')!;
              if (key !== 'reply') {
                const symbol = key === 'atMe' ? 'at-sign' : 'envelope-one';
                if (document.getElementById(symbol)) {
                  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', `#${symbol}`); nativeIcon.replaceChildren(use);
                } else {
                  for (const attr of ['viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']) nativeIcon.setAttribute(attr, icon.getAttribute(attr)!);
                  nativeIcon.replaceChildren(shape);
                }
              }
              native.children[1]!.textContent = `${label} `;
              const badge = native.lastElementChild!; badge.textContent = String(count); badge.classList.toggle('notify-count', count > 0);
              badge.classList.add(count > 0 ? 'nspp-unread-count' : 'nspp-read-count');
              links.push(native);
              const rowTemplate = template!.parentElement;
              if (rowTemplate && !rowTemplate.classList.contains('stat-block')) {
                const index = links.length - 1;
                const row = rowTemplate.cloneNode(false) as HTMLElement;
                row.removeAttribute('id'); row.hidden = false; row.classList.add('nspp-notification-row');
                row.append(...rows[index]!.childNodes);
                rows[index]!.replaceWith(row); rows[index] = row;
              }
            } else {
              const text = document.createElement('span'); text.textContent = label!; a.append(icon, text); const badge = document.createElement('span'); badge.textContent = String(count); badge.className = count > 0 ? 'notify-count nspp-unread-count' : 'nspp-read-count'; a.append(badge); links.push(a);
            }
          }
          links.forEach((link, index) => { const old = rows[index]!.querySelector('a'); if (old) old.replaceWith(link); else rows[index]!.prepend(link); });
        };
        const run = async () => {
          if (pending || ctx.signal.aborted || Date.now() - lastAttempt < 5_000) return;
          lastAttempt = Date.now(); pending = true;
          try {
            await withTabLock(`unread:${uid}`, 60_000, async () => {
              const result = await ctx.request<{ success: boolean; unreadCount?: Record<string, number> }>('/api/notification/unread-count');
              if (!result.success || !result.unreadCount) throw new Error('Invalid response');
              const previous = ctx.get<Record<string, number> | undefined>(cacheKey);
              render(result.unreadCount); ctx.set(cacheKey, result.unreadCount); failed = false;
              if (previous && !ctx.signal.aborted) {
                for (const [key, label, path] of [['reply', '新回复', 'reply'], ['atMe', '新的 @我', 'atMe'], ['message', '新私信', 'message?mode=list']]) {
                  const before = previous[key]; const count = result.unreadCount[key];
                  if (!Number.isFinite(before) || before < 0 || count <= before) continue;
                  const message = `${label} ${count - before} 条，当前未读 ${count} 条`;
                  if (!systemNotify(message, `${location.origin}/notification#/${path}`, `nspp:${location.hostname}:${uid}:${key}`)) ctx.notify(message);
                }
              }
            });
            render(ctx.get<Record<string, number>>(cacheKey));
          } catch {
            if (!ctx.signal.aborted && !failed) ctx.notify('未读消息检查失败，保留上次结果');
            failed = true;
          } finally { pending = false; }
        };
        render({ reply: 0, atMe: 0, message: 0 });
        try { render(ctx.get<Record<string, number>>(cacheKey)); } catch { /* Invalid old cache is ignored. */ }
        const stopPlacement = ctx.watch(place);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) void run(); }, { signal: ctx.signal }); void run();
        const timer = setInterval(() => { void run(); }, 60_000); return () => { clearInterval(timer); stopPlacement(); host.remove(); rows.forEach(row => row.remove()); originals.forEach((hidden, el) => { el.hidden = hidden; el.classList.remove('nspp-original-notification'); }); };
      };
      let cleanup: (() => void) | undefined;
      const start = () => { if (!cleanup && !ctx.signal.aborted) cleanup = initialize(); };
      const stop = ctx.watch(start);
      const readyTimer = setInterval(start, 1000);
      return () => { stop(); clearInterval(readyTimer); cleanup?.(); };
    },
  },
  {
    id: 'ai-polish', title: 'AI 写作助手', description: '支持写帖子、提纲、润色和续写；点击生成将正文和要求发送至配置的服务；先预览，再手动采用，不自动提交。服务需允许 CORS。', group: '编辑',
    defaults: { enabled: true, url: '', apiKey: '', model: '', prompt: '请润色以下 Markdown 文本，保留原意，只输出修改后的文本。' },
    fields: { url: { label: '完整 chat/completions 接口 URL', type: 'text' }, apiKey: { label: 'API Key（仅本机保存）', type: 'text' }, model: { label: '模型', type: 'text' }, prompt: { label: '系统提示词', type: 'textarea' } },
    mount(ctx) {
      type Editor = { getValue(): string; setValue(text: string): void; focus(): void };
      let dialog: HTMLDialogElement | undefined;
      const launch = document.createElement('button'); launch.type = 'button'; launch.className = 'nspp-tool-icon'; launch.append(toolIcon('ai')); launch.title = 'AI 写作助手'; launch.setAttribute('aria-label', launch.title); launch.dataset.nsppAiLauncher = '';
      (document.getElementById('nspp-tools') || document.body).append(launch);
      const compose = document.createElement('dialog'); compose.className = 'nspp-ai-dialog'; document.body.append(compose);
      const open = (configure = false) => {
        compose.replaceChildren(); compose.classList.remove('nspp-ai-config');
        const heading = document.createElement('h2'); heading.textContent = configure ? '配置 AI 写作助手' : 'AI 写作助手';
        const close = document.createElement('button'); close.type = 'button'; close.textContent = '关闭'; close.addEventListener('click', () => compose.close());
        const header = document.createElement('div'); header.className = 'nspp-ai-header'; header.append(toolIcon('ai'), heading); compose.append(header);
        if (configure || !ctx.get<string>('url').trim() || !ctx.get<string>('model').trim() || !ctx.get<string>('apiKey').trim()) {
          heading.textContent = '配置 AI 写作助手';
          compose.classList.add('nspp-ai-config');
          const hint = document.createElement('p'); hint.className = 'nspp-ai-hint'; hint.textContent = '连接你的 AI 服务，配置仅保存在本机。'; compose.append(hint);
          const form = document.createElement('form'); const inputs: Record<string, HTMLInputElement> = {};
          for (const [key, label] of [['url', '接口地址'], ['apiKey', 'API Key（仅本机保存）'], ['model', '模型']]) {
            const row = document.createElement('label'); row.textContent = label;
            const input = document.createElement('input'); input.type = key === 'apiKey' ? 'password' : key === 'url' ? 'url' : 'text'; input.required = true; input.value = ctx.get<string>(key); input.autocomplete = 'off'; input.placeholder = key === 'url' ? 'https://api.example.com/v1/chat/completions' : key === 'apiKey' ? '输入 API Key' : '输入模型名称'; inputs[key] = input; row.append(input); form.append(row);
          }
          const save = document.createElement('button'); save.type = 'submit'; save.textContent = '保存配置'; save.className = 'nspp-ai-primary'; const actions = document.createElement('div'); actions.className = 'nspp-ai-actions'; actions.append(close, save); form.append(actions); compose.append(form);
          form.addEventListener('submit', event => {
            event.preventDefault();
            try { if (new URL(inputs.url.value.trim()).protocol !== 'https:') throw new Error(); } catch { ctx.notify('请设置完整 HTTPS API 地址'); return; }
            if (Object.values(inputs).some(input => !input.value.trim())) { ctx.notify('请填写完整配置'); return; }
            try { for (const [key, input] of Object.entries(inputs)) ctx.set(key, input.value.trim()); } catch { ctx.notify('配置保存失败，请检查油猴存储'); return; }
            open();
          });
          if (!compose.open) compose.showModal(); return;
        }
        const nativeEditor = (document.querySelector('.md-editor .CodeMirror') as (HTMLElement & { CodeMirror?: Editor }) | null)?.CodeMirror;
        const source = document.createElement('textarea'); source.rows = 8; source.placeholder = '输入正文或材料，也可以只填写写作要求'; source.setAttribute('aria-label', 'AI 写作正文');
        const editor: Editor = nativeEditor || { getValue: () => source.value, setValue: text => { source.value = text; }, focus: () => source.focus() };
        if (!nativeEditor) compose.append(source);
        const toolbar = document.createElement('div'); toolbar.className = 'nspp-ai-actions';
        const configureButton = document.createElement('button'); configureButton.type = 'button'; configureButton.textContent = '配置'; configureButton.addEventListener('click', () => open(true)); toolbar.append(configureButton, close);
        compose.append(toolbar);
        const panel = document.createElement('div'); panel.className = 'nspp-ai-compose';
        const mode = document.createElement('select'); mode.setAttribute('aria-label', 'AI 写作方式');
        for (const label of ['润色', '写帖子', '列提纲', '续写']) { const option = document.createElement('option'); option.value = label; option.textContent = label; mode.append(option); }
        const requirements = document.createElement('textarea'); requirements.placeholder = '主题、要点、语气或写作要求（写帖子时必填）'; requirements.setAttribute('aria-label', 'AI 写作要求'); requirements.rows = 2;
        const disclosure = document.createElement('small'); disclosure.textContent = '生成时会发送当前正文和写作要求到你配置的 AI 服务，结果需手动采用。';
        panel.append(mode, requirements, disclosure); toolbar.before(panel);
        const button = document.createElement('button'); button.type = 'button'; button.textContent = 'AI 生成'; button.dataset.nsppAi = ''; toolbar.append(button);
        const test = document.createElement('button'); test.type = 'button'; test.dataset.nsppAiTest = ''; test.textContent = '测试 AI 连接'; toolbar.insertBefore(test, button);
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
          const original = editor.getValue(); if (!original.trim() && !requirements.value.trim()) { ctx.notify('请填写正文或写作要求'); return; }
          if (mode.value === '写帖子' && !requirements.value.trim()) { ctx.notify('请填写帖子主题和要点'); return; }
          const instruction = mode.value === '续写' ? '续写正文，只输出新增部分，不重复原文。' : mode.value === '列提纲' ? '根据主题和材料生成 Markdown 帖子提纲。' : mode.value === '写帖子' ? '根据主题和要点撰写 Markdown 帖子正文。' : '润色正文，保留原意。';
          const appendResult = mode.value === '续写';
          let url: URL; try { url = new URL(ctx.get<string>('url')); if (url.protocol !== 'https:') throw new Error('HTTPS required'); } catch { ctx.notify('请设置完整 HTTPS API 地址'); return; }
          if (!ctx.get<string>('model')) { ctx.notify('请先填写模型名称'); return; }
          button.disabled = true; button.textContent = '生成中…'; button.setAttribute('aria-busy', 'true');
          try {
            const response = await ctx.request<{ choices?: { message?: { content?: string } }[] }>(url.href, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.get<string>('apiKey')}` }, body: JSON.stringify({ model: ctx.get<string>('model'), messages: [{ role: 'system', content: ctx.get<string>('prompt') }, { role: 'user', content: `${instruction} 不编造事实、价格或测试数据，缺失信息用待补充标记。只输出结果。\n\n写作要求：\n${requirements.value}\n\n当前正文：\n${original}` }], stream: false }) });
            const result = response.choices?.[0]?.message?.content; if (!result) throw new Error('Empty response');
            if (ctx.signal.aborted) return;
            dialog?.remove(); dialog = document.createElement('dialog'); dialog.className = 'nspp-ai-dialog';
            const heading = document.createElement('h2'); heading.textContent = 'AI 结果预览';
            const preview = document.createElement('textarea'); preview.value = result; preview.style.cssText = 'width:100%;height:45vh;box-sizing:border-box'; preview.setAttribute('aria-label', 'AI 修改结果');
            const apply = document.createElement('button'); apply.type = 'button'; apply.textContent = appendResult ? '追加到正文' : '替换编辑器内容';
            const close = document.createElement('button'); close.type = 'button'; close.textContent = '取消'; close.addEventListener('click', () => dialog?.close(), { signal: ctx.signal });
            apply.addEventListener('click', () => { if (editor.getValue() !== original) { ctx.notify('编辑器内容已变化，请复制预览文本以免覆盖新修改'); return; } editor.setValue(appendResult ? `${original}${original ? '\n\n' : ''}${preview.value}` : preview.value); editor.focus(); dialog?.close(); }, { signal: ctx.signal });
            apply.className = 'nspp-ai-primary'; const actions = document.createElement('div'); actions.className = 'nspp-ai-actions'; actions.append(close, apply); dialog.append(heading, preview, actions); document.body.append(dialog); dialog.showModal();
          } catch { if (!ctx.signal.aborted) ctx.notify('AI 请求失败，请检查服务地址、模型、Key 和 CORS 配置'); }
          finally { button.disabled = false; button.textContent = 'AI 生成'; button.removeAttribute('aria-busy'); }
        }, { signal: ctx.signal });
      if (!compose.open) compose.showModal();
      };
      launch.addEventListener('click', () => open(), { signal: ctx.signal });
      return () => { launch.remove(); compose.remove(); dialog?.remove(); };
    },
  },
  {
    id: 'prefetch', title: '帖子悬停预加载', description: '仅预取同站帖子，最多20条，节省流量模式下不运行。', group: '导航', defaults: { enabled: false },
    mount(ctx) {
      const seen = new Set<string>();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection; if (connection?.saveData) return;
      document.addEventListener('pointerover', event => {
        clearTimeout(timer);
        const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]'); if (!anchor || seen.size >= 20) return;
        const url = new URL(anchor.href); if (url.origin !== location.origin || !/^\/post-\d+(?:-\d+)?(?:\.html)?$/.test(url.pathname) || url.search) return;
        url.hash = ''; if (seen.has(url.href)) return;
        timer = setTimeout(() => {
          seen.add(url.href);
          void ctx.request(url.href, { responseType: 'text' }).catch(() => {});
        }, 800);
      }, { signal: ctx.signal });
      document.addEventListener('pointerout', () => clearTimeout(timer), { signal: ctx.signal });
      return () => clearTimeout(timer);
    },
  },
];
