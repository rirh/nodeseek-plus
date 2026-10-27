import { REPOSITORY_URL, UPDATE_URL } from '../lib/update-version';
import { sweepShine } from '../views/sweep-shine';

export function aboutContent(check: () => Promise<void>, share: () => void): HTMLElement {
  const content = document.createElement('article'); content.className = 'about-content';
  const heading = document.createElement('div'); heading.className = 'about-heading';
  const title = document.createElement('strong'); title.textContent = '关于';
  const button = document.createElement('button'); button.type = 'button'; button.className = 'check-update'; button.textContent = '检查更新';
  button.addEventListener('click', async () => {
    button.disabled = true; button.setAttribute('aria-busy', 'true'); button.replaceChildren(sweepShine('检查中…'));
    try { await check(); } finally { button.disabled = false; button.removeAttribute('aria-busy'); button.textContent = '检查更新'; }
  });
  const shareButton = document.createElement('button'); shareButton.type = 'button'; shareButton.className = 'about-share'; shareButton.textContent = '分享给朋友';
  shareButton.addEventListener('click', share);
  const buttons = document.createElement('div'); buttons.className = 'about-buttons'; buttons.append(shareButton, button);
  heading.append(title, buttons);
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
  content.append(heading, summary, links); return content;
}
