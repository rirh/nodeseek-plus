import { toolIcon } from '../lib/tool-icon';
import { gsap } from 'gsap';
import { withTabLock } from '../lib/tab-lock';
import { unsafeWindow } from '../lib/userscript';
import { imageUpload } from './actions-upload';
import type { Context, Feature } from '../core/types';

type Editor = { getValue(): string };
export function currentUser() {
  return (unsafeWindow as Window & { __config__?: { user?: { member_id?: number; member_name?: string } } }).__config__?.user;
}
function button(label: string, fn: () => void, ctx: Context) {
  const el = document.createElement('button'); el.type = 'button'; el.textContent = label;
  el.addEventListener('click', fn, { signal: ctx.signal }); return el;
}
const attendance: Feature = {
  id: 'attendance', title: '签到', description: '每天尝试一次，成功或失败均缓存当天记录并隐藏按钮，次日再试；按账户隔离。', group: '操作辅助',
  defaults: { enabled: true, automatic: true, mode: 'fixed' },
  fields: { automatic: { label: '每天自动签到', type: 'text' }, mode: { label: '奖励方式', type: 'select', options: [{ label: '固定', value: 'fixed' }, { label: '随机', value: 'random' }] } },
  mount(ctx) {
    const initialize = () => {
    const user = currentUser(); if (!user?.member_id) return;
    const key = `day:${user.member_id}`;
    const day = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
    const control = button('签到', () => { void run(); }, ctx);
    control.className = 'nspp-action nspp-tool-icon';
    const renderControl = (label = '签到') => { control.replaceChildren(toolIcon('attendance')); control.title = label; control.setAttribute('aria-label', label); };
    renderControl(); (document.querySelector('#nspp-tools') || document.body).append(control);
    const initialDay = day();
    let animation: gsap.core.Timeline | undefined;
    const known = () => ctx.get<string>(key) === day();
    const signedText = (root: ParentNode) => Array.from(root.querySelectorAll('.user-card, .user-panel, #attendance, .attendance, a[href="/board"], button, [role="status"]')).some(el => !el.closest('#nspp-tools, .post-content, .comment-content, .markdown-body') && /^(?:[✓✔]\s*)?(?:(?:今日|今天)已(?:完成)?签到|已签到|(?:今日|今天)?签到已完成)(?:[！!。]|\s|$)/.test(el.textContent?.trim() || ''));
    const sync = () => {
      if (day() === initialDay && !known() && signedText(document)) ctx.set(key, day());
      const signed = known();
      if (!animation?.isActive()) control.hidden = signed;
    };
    sync();
    const tick = () => {
      sync();
      if (ctx.get<boolean>('automatic') && !known() && !document.hidden && !control.disabled) void run();
    };
    window.addEventListener('focus', tick, { signal: ctx.signal });
    document.addEventListener('visibilitychange', tick, { signal: ctx.signal });
    const rollover = setInterval(tick, 60000);
    const complete = (fresh: boolean) => {
      animation?.kill(); gsap.set(control, { clearProps: 'transform,opacity,visibility' });
      if (!fresh || matchMedia('(prefers-reduced-motion: reduce)').matches) { control.hidden = true; return; }
      renderControl('已签到');
      animation = gsap.timeline({ onComplete: () => { control.hidden = true; gsap.set(control, { clearProps: 'transform,opacity,visibility' }); } });
      animation.fromTo(control, { scale: .9 }, { scale: 1.06, duration: .18, ease: 'back.out(2)' })
        .to(control, { scale: 1, duration: .15 })
        .to(control, { y: -8, autoAlpha: 0, duration: .25, delay: .45, ease: 'power2.in' });
    };
    async function run() {
      if (control.disabled || ctx.signal.aborted) return;
      if (known()) { complete(false); return; }
      animation?.kill();
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.fromTo(control, { scale: .94 }, { scale: 1, duration: .2, ease: 'power2.out' });
      control.disabled = true; renderControl('签到中…'); control.setAttribute('aria-busy', 'true');
      const requestDay = day();
      try {
        await withTabLock(`attendance:${user!.member_id}`, 10000, async () => {
        if (ctx.signal.aborted) return;
        if (known()) { complete(false); return; }
        const result = await ctx.request<{ success?: boolean; message?: string; gain?: number }>(`/api/attendance?random=${ctx.get<string>('mode') === 'random'}`, { method: 'POST' });
        if (ctx.signal.aborted) return;
        ctx.set(key, requestDay);
        if (known()) complete(!!result?.success); else sync();
        if (result?.success) ctx.notify(result.message || `签到成功，获得 ${result.gain ?? ''} 鸡腿`);
        });
      } catch {
        if (!ctx.signal.aborted) { ctx.set(key, requestDay); if (known()) complete(false); else sync(); }
      }
      finally { control.disabled = false; renderControl(known() ? '已签到' : '签到'); control.removeAttribute('aria-busy'); }
    }
    const stop = ctx.watch(sync);
    tick();
    return () => { stop(); clearInterval(rollover); animation?.kill(); gsap.killTweensOf(control); control.remove(); };
    };
    let cleanup: (() => void) | undefined;
    const start = () => { if (!cleanup && !ctx.signal.aborted) cleanup = initialize(); };
    const stopReady = ctx.watch(start);
    const ready = setInterval(start, 1000);
    return () => { stopReady(); clearInterval(ready); cleanup?.(); };
  },
};
const compose: Feature = {
  id: 'compose', title: '回复快捷键', description: '可选 Ctrl+Enter 提交回复，默认关闭。', group: '操作辅助',
  defaults: { enabled: true, ctrlEnter: false },
  fields: { ctrlEnter: { label: 'Ctrl+Enter 提交回复', type: 'text' } },
  mount(ctx) {
    const bound = new WeakSet<HTMLElement>();
    const scan = () => ctx.root.querySelectorAll<HTMLElement>('.md-editor').forEach(host => {
      if (bound.has(host)) return;
      const cm = (host.querySelector('.CodeMirror') as (HTMLElement & { CodeMirror?: Editor }) | null)?.CodeMirror;
      const ta = host.querySelector<HTMLTextAreaElement>('textarea'); if (!cm && !ta) return;
      bound.add(host);
      const read = () => cm ? cm.getValue() : ta!.value;
      host.addEventListener('keydown', event => {
        if (!ctx.get<boolean>('ctrlEnter') || !event.ctrlKey || event.key !== 'Enter' || event.isComposing || event.repeat) return;
        const submit = host.querySelector<HTMLButtonElement>('button.submit.btn.focus-visible');
        if (submit && !submit.disabled && read().trim()) { event.preventDefault(); submit.click(); }
      }, { signal: ctx.signal });
    });
    scan(); const unwatch = ctx.watch(scan);
    return unwatch;
  },
};
export const actionFeatures: Feature[] = [attendance, compose, imageUpload];
