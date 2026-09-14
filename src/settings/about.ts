import { UPDATE_URL } from '../lib/update-version';

export function aboutContent(check: () => Promise<void>): HTMLElement {
  const content = document.createElement('div'); content.className = 'about-content';
  const title = document.createElement('strong'); title.textContent = 'NodeSeek++';
  const version = document.createElement('span'); version.className = 'about-version'; version.textContent = `v${__APP_VERSION__}`;
  const heading = document.createElement('div'); heading.className = 'about-heading'; heading.append(title, version);
  const summary = document.createElement('p'); summary.textContent = 'NodeSeek / DeepFlood 论坛增强 · GPL-3.0-only';
  const links = document.createElement('div'); links.className = 'about-links';
  for (const [label, href] of [
    ['GitHub · rirh/nodeseek-plus', 'https://github.com/rirh/nodeseek-plus'],
    ['下载安装 / 手动更新', UPDATE_URL],
    ['Greasy Fork 脚本页', 'https://greasyfork.org/zh-CN/scripts/595488'],
    ['使用说明', 'https://github.com/rirh/nodeseek-plus#readme'],
    ['反馈问题', 'https://github.com/rirh/nodeseek-plus/issues'],
  ]) {
    const link = document.createElement('a'); link.href = href; link.textContent = label; link.target = '_blank'; link.rel = 'noopener noreferrer'; links.append(link);
  }
  const steps = document.createElement('ol');
  for (const text of ['首次安装：安装 Tampermonkey，打开上方下载链接，在脚本管理器中确认安装，再刷新论坛。', '更新脚本：点击检查更新，或重新打开下载链接确认更新，再刷新论坛；无需卸载旧版。']) {
    const step = document.createElement('li'); step.textContent = text; steps.append(step);
  }
  const button = document.createElement('button'); button.type = 'button'; button.textContent = '检查更新';
  button.addEventListener('click', async () => {
    button.disabled = true; button.setAttribute('aria-busy', 'true'); button.textContent = '检查中…';
    try { await check(); } finally { button.disabled = false; button.removeAttribute('aria-busy'); button.textContent = '检查更新'; }
  });
  content.append(heading, summary, links, steps, button); return content;
}
