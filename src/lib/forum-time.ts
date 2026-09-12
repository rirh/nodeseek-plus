import { differenceInMilliseconds, format, isValid, parseISO, formatDistanceStrict } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function forumTime(value: string, now = new Date()) {
  const date = parseISO(value.trim().replace(/\//g, '-').replace(' ', 'T'));
  if (!isValid(date)) return null;
  const elapsed = differenceInMilliseconds(now, date);
  const full = format(date, 'yyyy-MM-dd HH:mm:ss');
  const text = elapsed < 0 || elapsed > 30 * 86400000 ? full
    : elapsed < 60000 ? '刚刚' : formatDistanceStrict(date, now, { addSuffix: true, locale: zhCN, roundingMethod: 'floor', ...(elapsed >= 86400000 ? { unit: 'day' as const } : {}) });
  return { text, full };
}
