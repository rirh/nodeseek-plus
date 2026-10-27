import { REPOSITORY_URL, UPDATE_URL } from '../lib/update-version';
import { sweepShine } from '../views/sweep-shine';

type Notify = (message: string, type?: 'info' | 'success' | 'error') => void;

export const SHARE_TEXT = [
  '推荐 NodeSeek++：NodeSeek / DeepFlood 论坛增强脚本，阅读增强、帖子监控、图片上传、消息中心等功能可独立开关。',
  '安装方法：先装 Tampermonkey 等脚本管理器，再打开下方链接点击“安装”。',
  `一键安装：${UPDATE_URL}`,
  `项目主页：${REPOSITORY_URL}`,
].join('\n');

function shareBlock(notify: Notify): HTMLElement {
  const block = document.createElement('div'); block.className = 'about-share';
  const text = document.createElement('textarea'); text.readOnly = true; text.rows = 4; text.value = SHARE_TEXT; text.setAttribute('aria-label', '分享文案');
  text.addEventListener('focus', () => text.select());
  const actions = document.createElement('div'); actions.className = 'about-share-actions';
  const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = '复制分享';
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(SHARE_TEXT); notify('已复制分享文案和安装地址', 'success'); }
    catch { text.focus(); text.select(); notify('复制失败，已选中文本，请手动复制', 'error'); }
  });
  actions.append(copy);
  if (typeof navigator.share === 'function') {
    const share = document.createElement('button'); share.type = 'button'; share.textContent = '系统分享';
    share.addEventListener('click', () => { navigator.share({ title: 'NodeSeek++', text: SHARE_TEXT }).catch(() => {}); });
    actions.append(share);
  }
  block.append(text, actions); return block;
}

export function aboutContent(check: () => Promise<void>, notify: Notify): HTMLElement {
  const content = document.createElement('article'); content.className = 'about-content';
  const heading = document.createElement('div'); heading.className = 'about-heading';
  const title = document.createElement('strong'); title.textContent = '关于';
  const button = document.createElement('button'); button.type = 'button'; button.className = 'check-update'; button.textContent = '检查更新';
  button.addEventListener('click', async () => {
    button.disabled = true; button.setAttribute('aria-busy', 'true'); button.replaceChildren(sweepShine('检查中…'));
    try { await check(); } finally { button.disabled = false; button.removeAttribute('aria-busy'); button.textContent = '检查更新'; }
  });
  heading.append(title, button);
  const summary = document.createElement('p'); summary.textContent = `v${__APP_VERSION__} · NodeSeek / DeepFlood 论坛增强 · GPL-3.0-only`;
  const links = document.createElement('div'); links.className = 'about-links';
  for (const [label, href] of [
    ['GitHub', REPOSITORY_URL],
    ['下载安装', UPDATE_URL],
    ['Greasy Fork', 'https://greasyfork.org/zh-CN/scripts/595488'],
    ['使用说明', 'https://github.com/rirh/nodeseek-plus#readme'],
    ['反馈问题', 'https://github.com/rirh/nodeseek-plus/issues'],
  ]) {
    const link = document.createElement('a'); link.href = href; link.textContent = label; link.target = '_blank'; link.rel = 'noopener noreferrer'; links.append(link);
  }
  content.append(heading, summary, links, shareBlock(notify)); return content;
}
