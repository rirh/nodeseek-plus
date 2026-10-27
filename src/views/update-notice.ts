import { REPOSITORY_URL, UPDATE_URL } from '../lib/update-version';

const ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"/><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/></svg>';

// Card-style reminder in the bottom-right corner. Automatic reminders stay non-modal so the page remains usable;
// a manual check opens modally so it stays above (and interactive over) the settings dialog. Resolves once closed.
export function updateNotice(latest: string, modal: boolean, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  document.querySelector('.nspp-update-notice')?.remove();
  return new Promise(resolve => {
    const notice = document.createElement('dialog'); notice.className = 'nspp-update-notice';
    notice.setAttribute('aria-label', '发现 NodeSeek++ 新版本');
    const title = document.createElement('div'); title.className = 'nspp-update-title'; title.innerHTML = ICON;
    title.append(Object.assign(document.createElement('strong'), { textContent: '新版本已发布' }));
    const message = document.createElement('p'); message.className = 'nspp-update-message';
    message.textContent = `当前版本：${__APP_VERSION__}　最新版本：${latest}\n点击更新，在脚本管理器中确认后刷新页面。`;
    const actions = document.createElement('div'); actions.className = 'nspp-update-actions';
    const link = (className: string, href: string, text: string) => Object.assign(document.createElement('a'), { className, href, textContent: text, target: '_blank', rel: 'noopener noreferrer' });
    const install = link('nspp-update-install', UPDATE_URL, '立即更新');
    const github = link('nspp-update-github', REPOSITORY_URL, '前往 GitHub');
    const dismiss = Object.assign(document.createElement('button'), { type: 'button', className: 'nspp-update-dismiss', textContent: '稍后提醒' });
    // Opening the installer does not mean the update was applied; never reload, to keep unsaved replies.
    install.addEventListener('click', () => { message.textContent = '请在脚本管理器中确认更新，完成后刷新此页面。'; dismiss.textContent = '关闭'; });
    dismiss.addEventListener('click', () => notice.close('cancel'));
    actions.append(install, github, dismiss); notice.append(title, message, actions);
    const abort = () => notice.close('cancel');
    notice.addEventListener('close', () => { signal.removeEventListener('abort', abort); notice.remove(); resolve(); }, { once: true });
    document.body.append(notice);
    if (modal) notice.showModal(); else notice.show();
    signal.addEventListener('abort', abort, { once: true });
  });
}
