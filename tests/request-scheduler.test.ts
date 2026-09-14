import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequestQueue, retryDelay, requestConcurrency, requestInterval } from '../src/lib/request-scheduler.ts';

test('request interval defaults to 200ms and allows zero delay', () => {
  for (const value of [undefined, NaN, Infinity, '200']) assert.equal(requestInterval(value), 200);
  assert.equal(requestInterval(0), 0);
  assert.equal(requestInterval(-10), 0);
  assert.equal(requestInterval(120.8), 120);
  assert.equal(requestInterval(6000), 5000);
});

test('request starts are spaced while concurrent work and foreground priority are retained', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000 });
  const enqueue = createRequestQueue(() => 2, () => 200);
  const starts: [string, number][] = [];
  const releases: (() => void)[] = [];
  const task = (name: string) => () => { starts.push([name, Date.now()]); return new Promise<void>(resolve => releases.push(resolve)); };
  const first = enqueue(task('first'));
  const background = enqueue(task('profile'), 1);
  const foreground = enqueue(task('page'));
  assert.deepEqual(starts, [['first', 1000]]);
  t.mock.timers.tick(199);
  assert.equal(starts.length, 1);
  t.mock.timers.tick(1);
  assert.deepEqual(starts, [['first', 1000], ['page', 1200]]);
  t.mock.timers.tick(500);
  assert.equal(starts.length, 2, 'interval expiry must not exceed the concurrency cap');
  releases[0](); await first;
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(starts[2], ['profile', 1700], 'an available slot starts immediately once the interval elapsed');
  releases[1](); releases[2]();
  await Promise.all([foreground, background]);
});

test('request concurrency clamps bounds and falls back for invalid settings', () => {
  assert.equal(requestConcurrency(0), 1);
  assert.equal(requestConcurrency(3), 3);
  assert.equal(requestConcurrency(100), 10);
  for (const value of [undefined, NaN, Infinity, '2']) assert.equal(requestConcurrency(value), 4);
});

test('concurrent requests share a total cap and release slots after failure', async () => {
  const enqueue = createRequestQueue(() => 2);
  const releases: (() => void)[] = [];
  let active = 0; let peak = 0;
  const tasks = Array.from({ length: 5 }, (_, i) => enqueue(async () => {
    active++; peak = Math.max(peak, active);
    await new Promise<void>(resolve => releases.push(resolve));
    active--;
    if (i === 0) throw new Error('failed');
  }));
  const result = Promise.allSettled(tasks);
  assert.equal(active, 2);
  for (let i = 0; i < 5; i++) {
    assert.ok(releases[i]); releases[i]();
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.equal(peak, 2);
  assert.equal((await result).filter(item => item.status === 'rejected').length, 1);
});

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
