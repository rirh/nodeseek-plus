// WeChat-style time labels. Pure functions so unit tests can load this file directly.

const WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const pad = (n: number) => String(n).padStart(2, '0');
const days = (date: Date, now: Date) =>
  Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86400000);

/** Centered separators in the conversation: 13:36 / 昨天 13:36 / 星期三 13:36 / 9月16日 13:36 / 2025年9月16日 13:36. */
export function chatTime(date: Date, now = new Date()) {
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const ago = days(date, now);
  if (ago <= 0) return time;
  if (ago === 1) return `昨天 ${time}`;
  if (ago < 7) return `${WEEK[date.getDay()]} ${time}`;
  const day = `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
  return date.getFullYear() === now.getFullYear() ? day : `${date.getFullYear()}年${day}`;
}

/** Conversation list: 13:36 / 昨天 / 星期三 / 26/9/16. */
export function listTime(date: Date, now = new Date()) {
  const ago = days(date, now);
  if (ago <= 0) return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (ago === 1) return '昨天';
  if (ago < 7) return WEEK[date.getDay()];
  return `${String(date.getFullYear()).slice(-2)}/${date.getMonth() + 1}/${date.getDate()}`;
}
