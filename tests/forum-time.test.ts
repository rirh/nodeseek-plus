import test from 'node:test';
import assert from 'node:assert/strict';
import { forumTime } from '../src/lib/forum-time.ts';

test('forum time uses Chinese relative dates through 30 days and full dates beyond', () => {
  const now = new Date('2026-09-12T12:00:00');
  assert.equal(forumTime('2026/09/12 11:59:40', now)?.text, '刚刚');
  assert.equal(forumTime('2026-09-12T10:00:00', now)?.text, '2 小时前');
  assert.equal(forumTime('2026-08-13T12:00:00', now)?.text, '30 天前');
  assert.equal(forumTime('2026-08-13T11:59:59', now)?.text, '2026-08-13 11:59:59');
  assert.equal(forumTime('2026-09-13T12:00:00', now)?.text, '2026-09-13 12:00:00');
  assert.equal(forumTime('未知', now), null);
});
