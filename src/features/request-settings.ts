import type { Feature } from '../core/types';

export const requestSettings: Feature = {
  id: 'request-settings', title: '接口请求频率', group: '网络',
  description: '请求完成后的等待时间，越小加载越快。用户资料默认 100 毫秒，其他站内接口默认不额外等待；0 表示不额外等待，范围 0–5000 毫秒。仍按顺序请求，并遵守站点限流冷却。用户资料缓存一天，缓存命中不请求；RSS 频率在监控设置中调整。关闭后使用默认间隔。',
  defaults: { enabled: true, profileInterval: 100, requestInterval: 0 },
  fields: {
    profileInterval: { label: '用户资料请求间隔（毫秒，0–5000）', type: 'number' },
    requestInterval: { label: '其他站内接口间隔（毫秒，0–5000）', type: 'number' },
  },
  mount() {},
};
