import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequestQueue, retryDelay } from '../src/lib/request-scheduler.ts';

test('requests run serially and a failure does not stall subsequent requests', async () => {
  const enqueue = createRequestQueue();
  const events: string[] = [];
  let release!: () => void;
  const first = enqueue(async () => { events.push('first'); await new Promise<void>(resolve => { release = resolve; }); throw new Error('failed'); });
  const failed = assert.rejects(first, /failed/);
  const second = enqueue(async () => { events.push('second'); return 2; });
  await Promise.resolve();
  assert.deepEqual(events, ['first']);
  release();
  await failed;
  assert.equal(await second, 2);
});

test('Retry-After respects seconds and HTTP dates, with conservative fallback', () => {
  assert.equal(retryDelay('120'), 120000);
  assert.equal(retryDelay('Thu, 01 Jan 1970 00:02:00 GMT', 0), 120000);
  assert.equal(retryDelay(null), 60000);
  assert.equal(retryDelay('invalid'), 60000);
  assert.equal(retryDelay('0'), 60000);
});

test('foreground requests take priority over queued profile decoration', async () => {
  const enqueue = createRequestQueue();
  let release!: () => void;
  const events: string[] = [];
  const active = enqueue(() => new Promise<void>(resolve => { release = resolve; }));
  const background = enqueue(async () => { events.push('profile'); }, 1);
  const foreground = enqueue(async () => { events.push('page'); });
  release();
  await Promise.all([active, background, foreground]);
  assert.deepEqual(events, ['page', 'profile']);
});
