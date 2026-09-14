import type { Feature } from '../core/types';

export const requestSettings: Feature = {
  id: 'request-settings', title: '接口请求并发与延迟', group: '网络',
  description: '用户资料缓存 24 小时，刷新和翻页优先复用，过期后按需更新。同页站内请求默认最多并发 4 个，相邻请求启动间隔 200ms，首个请求立即执行；排队时优先处理用户操作。保留站点限流冷却，各标签页独立调度，RSS 仍按监控周期检查。关闭后使用默认值。',
  defaults: { enabled: true, maxConcurrent: 4, requestInterval: 200 },
  fields: {
    maxConcurrent: { label: '最大并发请求数（1–10）', type: 'number' },
    requestInterval: { label: '请求间隔（毫秒，0–5000，默认 200）', type: 'number' },
  },
  mount() {},
};
