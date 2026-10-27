import qrcode from 'qrcode-generator';
import type { Feature } from '../core/types';
import { toolIcon } from '../lib/tool-icon';
import { REPOSITORY_URL, UPDATE_URL } from '../lib/update-version';
import { createSheet } from '../views/sheet';

export const SHARE_TITLE = 'NodeSeek++';
export const SHARE_PITCH = 'NodeSeek / DeepFlood 论坛增强脚本：用户资料卡、帖子监控、实时热榜、消息中心、阅读增强。';
export const SHARE_TEXT = [
  `推荐 ${SHARE_TITLE}：${SHARE_PITCH}`,
  `一键安装：${UPDATE_URL}`,
  `项目主页：${REPOSITORY_URL}`,
].join('\n');

const svgIcon = (d: string, fill = false) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '22'); svg.setAttribute('height', '22'); svg.setAttribute('aria-hidden', 'true');
  if (fill) svg.setAttribute('fill', 'currentColor');
  else { svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.8'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round'); }
  const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', d); svg.append(path);
  return svg;
};
const icons = {
  share: () => svgIcon('M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6M6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6M8.6 13.5l6.8 4M15.4 6.5l-6.8 4'),
  download: () => svgIcon('M12 3v12M7 10l5 5 5-5M4 19h16'),
  x: () => svgIcon('M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z', true),
  telegram: () => svgIcon('M21 4 3 11l7 2 2 7 3-5 5 4 1-15ZM10 13l11-9'),
};

/** QR code for the project page drawn into a labelled card, so a saved image explains itself. */
function shareCard(): HTMLCanvasElement {
  const qr = qrcode(0, 'M'); qr.addData(REPOSITORY_URL); qr.make();
  const cell = 8, quiet = 4, size = (qr.getModuleCount() + quiet * 2) * cell, pad = 32, header = 76, footer = 56;
  const canvas = document.createElement('canvas');
  canvas.width = size + pad * 2; canvas.height = size + pad * 2 + header + footer;
  const c = canvas.getContext('2d');
  if (!c) return canvas;
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = '#1f2328'; c.textAlign = 'center';
  c.font = '600 28px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif';
  c.fillText(SHARE_TITLE, canvas.width / 2, pad + 30);
  c.fillStyle = '#59636e'; c.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif';
  c.fillText('NodeSeek / DeepFlood 论坛增强脚本', canvas.width / 2, pad + 58);
  c.save(); c.translate(pad + quiet * cell, pad + header + quiet * cell); qr.renderTo2dContext(c, cell); c.restore();
  c.fillText('扫码查看安装方法', canvas.width / 2, pad + header + size + 30);
  return canvas;
}

export const share: Feature = {
  id: 'share', title: '分享入口', description: '工具栏显示分享按钮：保存二维码，或分享到 X、Telegram 和系统分享。', group: '操作辅助', defaults: { enabled: true },
  mount(ctx) {
    const launch = document.createElement('button'); launch.type = 'button'; launch.className = 'nspp-tool-icon'; launch.title = '分享 NodeSeek++'; launch.setAttribute('aria-label', launch.title); launch.dataset.nsppShareLauncher = '';
    launch.append(icons.share());
    const panel = createSheet('nspp-share', '分享 NodeSeek++');
    const head = document.createElement('header'); const title = document.createElement('h2'); title.textContent = '分享 NodeSeek++';
    const close = document.createElement('button'); close.type = 'button'; close.className = 'nspp-share-close'; close.title = '关闭'; close.setAttribute('aria-label', close.title); close.append(toolIcon('close'));
    close.addEventListener('click', () => panel.close(), { signal: ctx.signal }); head.append(title, close);
    const card = document.createElement('div'); card.className = 'nspp-share-card';
    const pitch = document.createElement('p'); pitch.textContent = SHARE_PITCH;
    card.append(pitch);
    const actions = document.createElement('div'); actions.className = 'nspp-share-actions';
    const action = (label: string, icon: SVGElement, run: () => void) => {
      const button = document.createElement('button'); button.type = 'button';
      const circle = document.createElement('span'); circle.append(icon);
      button.append(circle, label); button.addEventListener('click', run, { signal: ctx.signal }); actions.append(button);
    };
    const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
    const copy = async () => {
      try { await navigator.clipboard.writeText(SHARE_TEXT); ctx.notify('已复制分享文案和安装地址'); }
      catch { ctx.notify('复制失败，请手动复制项目地址'); }
    };
    let canvas: HTMLCanvasElement | undefined;
    action('保存二维码', icons.download(), () => {
      canvas ||= shareCard();
      canvas.toBlob(blob => {
        if (!blob) { ctx.notify('二维码生成失败'); return; }
        const url = URL.createObjectURL(blob); const link = document.createElement('a');
        link.href = url; link.download = 'nodeseek-plus-plus-qrcode.png'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, 'image/png');
    });
    action('X', icons.x(), () => open(`https://x.com/intent/post?text=${encodeURIComponent(`推荐 ${SHARE_TITLE}：${SHARE_PITCH}`)}&url=${encodeURIComponent(REPOSITORY_URL)}`));
    action('Telegram', icons.telegram(), () => open(`https://t.me/share/url?url=${encodeURIComponent(REPOSITORY_URL)}&text=${encodeURIComponent(`推荐 ${SHARE_TITLE}：${SHARE_PITCH}\n一键安装：${UPDATE_URL}`)}`));
    action('更多', icons.share(), () => {
      if (typeof navigator.share === 'function') navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT }).catch(error => { if (error?.name !== 'AbortError') void copy(); });
      else void copy();
    });
    const qr = document.createElement('div'); qr.className = 'nspp-share-qr';
    panel.append(head, card, qr, actions); document.body.append(panel);
    const tools = document.getElementById('nspp-tools') || document.body;
    const settings = tools.querySelector('[data-nspp-settings-launcher]');
    if (settings) settings.before(launch); else tools.append(launch);
    launch.addEventListener('click', () => {
      if (!qr.firstChild) { canvas ||= shareCard(); const image = document.createElement('img'); image.alt = 'NodeSeek++ 项目二维码'; image.src = canvas.toDataURL('image/png'); qr.append(image); }
      panel.showModal();
    }, { signal: ctx.signal });
    return () => { panel.remove(); launch.remove(); };
  },
};
