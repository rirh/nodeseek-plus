import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registration, authorId, forumAge, trustScore } from '../src/features/user-profile.ts';
import { Window } from 'happy-dom';
const now = Date.UTC(2026, 8, 12);
const age = (days: number) => registration({ coin: 2500, created_at: now - days * 86400000 }, now);
test('registration badge boundaries and capped levels', () => {
  assert.equal(age(0).tone, 'new'); assert.equal(age(6).tone, 'new');
  assert.equal(age(7).tone, 'recent'); assert.equal(age(29).tone, 'recent');
  assert.equal(age(30).tone, 'member'); assert.equal(age(364).tone, 'member');
  assert.equal(age(365).tone, 'longtime'); assert.equal(age(365).days, 365);
  assert.equal(age(30).level, 5);
  assert.equal(registration({ coin: 1000000 }).level, 6);
});
test('invalid and future dates stay unknown; Unix seconds are supported', () => {
  for (const created_at of ['', 'invalid', now + 86400000]) assert.equal(registration({ created_at }, now).days, null);
  assert.equal(registration({ created_at: (now - 86400000) / 1000 }, now).days, 1);
  assert.equal(registration({}).level, null);
  assert.equal(registration({ rank: 3, coin: 0 }).level, 3);
});
test('user IDs support the upstream path and query formats and reject foreign hosts', () => {
  const window = new Window({ url: 'https://www.nodeseek.com/' });
  const a = window.document.createElement('a');
  for (const href of ['/space/123', '/space/123/', '/space?uid=123']) { a.href = href; assert.equal(authorId(a as unknown as Element, window.location.origin), '123'); }
  a.href = 'https://example.com/space/123'; assert.equal(authorId(a as unknown as Element, window.location.origin), undefined);
});

test('trust score requires complete valid evidence, without penalizing missing fields', () => {
  const profile = { created_at: now, nPost: 0, nComment: 0 };
  assert.equal(trustScore(profile, now)?.score, 0);
  for (const patch of [{ created_at: 'invalid' }, { created_at: now + 1 }, { nPost: undefined }, { nComment: -1 }, { nPost: NaN }, { nPost: Infinity }, { nComment: 1.5 }]) {
    assert.equal(trustScore({ ...profile, ...patch }, now), null);
  }
});
test('trust score is bounded, monotonic, diminishing and independent of rank and coins', () => {
  const profile = { created_at: now - 1388 * 86400000, nPost: 100, nComment: 500 };
  assert.equal(trustScore(profile, now)?.score, 100);
  assert.equal(trustScore({ ...profile, nPost: 10000, nComment: 10000 }, now)?.score, 100);
  assert.deepEqual(trustScore({ ...profile, rank: 6, coin: 999999 }, now), trustScore(profile, now));
  const points = (nPost: number) => trustScore({ ...profile, nPost }, now)!.posts;
  assert.ok(points(1) - points(0) > points(100) - points(99));
  for (let n = 1; n <= 100; n++) assert.ok(points(n) >= points(n - 1));
  assert.equal(trustScore({ ...profile, created_at: now, nPost: 100000, nComment: 100000 }, now)?.score, 40);
});

test('forum age and registration score cap advance by calendar day in UTC+8', () => {
  const baseline = Date.parse('2026-09-12T00:00:00+08:00');
  assert.equal(forumAge(baseline), 1388);
  assert.equal(forumAge(baseline + 86400000 - 1), 1388);
  assert.equal(forumAge(baseline + 86400000), 1389);
  const founder = { created_at: baseline - 1388 * 86400000, nPost: 100, nComment: 500 };
  assert.equal(trustScore(founder, baseline)?.score, 100);
  assert.equal(trustScore(founder, baseline + 30 * 86400000)?.score, 100);
  assert.equal(registration(founder, baseline + 86400000).days, 1389);
  assert.ok(trustScore({ ...founder, created_at: baseline - 730 * 86400000 }, baseline)!.age < 60);
});
