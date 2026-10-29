import type { Feature } from '../core/types';
import { withTabLock } from '../lib/tab-lock';
import { toolIcon } from '../lib/tool-icon';
import { v2exMission, v2exUser } from './wecom/sites/v2ex-parse';

// V2EX's daily login reward resets at midnight Beijing time.
const day = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());

/** V2EX 签到: redeems the daily login reward once a day, as the toolbar button or automatically on any page. */
export const v2exAttendance: Feature = {
  id: 'attendance', title: '签到', group: '操作辅助',
  description: '领取 V2EX 每日登录奖励。每天尝试一次，成功、已领取或失败都会记住当天并隐藏按钮，次日再试；按账户隔离。未登录时不显示。',
  defaults: { enabled: true, automatic: true },
  fields: { automatic: { label: '每天自动签到', type: 'text' } },
  mount(ctx) {
    const user = v2exUser(document, location.origin);
    if (!user) return;
    const key = `day:${user.name}`;
    const known = () => ctx.get<string>(key) === day();
    const control = document.createElement('button'); control.type = 'button';
    control.className = 'nspp-action nspp-tool-icon'; control.dataset.nsppAttendance = '';
    const render = (label = '签到') => { control.replaceChildren(toolIcon('attendance')); control.title = label; control.setAttribute('aria-label', label); };
    render(); control.hidden = known();
    (document.getElementById('nspp-tools') || document.body).append(control);

    async function run(manual: boolean) {
      if (control.disabled || ctx.signal.aborted) return;
      if (known()) { control.hidden = true; if (manual) ctx.notify('今日已签到'); return; }
      const today = day();
      control.disabled = true; render('签到中…'); control.setAttribute('aria-busy', 'true');
      try {
        // One tab redeems; the others see the day recorded when the lock frees.
        await withTabLock(`attendance:${user!.name}`, 10000, async () => {
          if (known() || ctx.signal.aborted) return;
          const mission = v2exMission(await ctx.request<string>('/mission/daily', { responseType: 'text' }));
          let days = mission.days;
          if (mission.redeem) {
            const result = v2exMission(await ctx.request<string>(mission.redeem, { responseType: 'text' }));
            days = result.days ?? days;
            if (!result.done) throw new Error('V2EX 未确认领取，可打开每日任务页面查看');
            ctx.notify(days ? `V2EX 签到成功，已连续登录 ${days} 天` : 'V2EX 签到成功');
          } else if (manual) ctx.notify(mission.done ? '今日已签到' : '未找到可领取的每日奖励');
          ctx.set(key, today);
        });
      } catch (error) {
        if (!ctx.signal.aborted) { ctx.set(key, today); ctx.notify(`签到未完成：${error instanceof Error ? error.message : '请稍后重试'}`); }
      } finally {
        control.disabled = false; control.removeAttribute('aria-busy'); render(); control.hidden = known();
      }
    }
    control.addEventListener('click', () => { void run(true); }, { signal: ctx.signal });
    const tick = () => { if (ctx.get<boolean>('automatic') && !known() && !document.hidden) void run(false); else control.hidden = known(); };
    window.addEventListener('focus', tick, { signal: ctx.signal });
    document.addEventListener('visibilitychange', tick, { signal: ctx.signal });
    const rollover = setInterval(tick, 60000);
    tick();
    return () => { clearInterval(rollover); control.remove(); };
  },
};
