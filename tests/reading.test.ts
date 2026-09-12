import test from 'node:test';
import assert from 'node:assert/strict';
import { postPath, directLink, filterLines, shouldFilter } from '../src/features/reading-logic.ts';

const base = 'https://www.nodeseek.com/post-123-2';
test('history normalizes every page to the real first-page route', () => {
  assert.equal(postPath('/post-123-2#7', base), '/post-123-1');
  assert.equal(postPath('/post-123', base), '/post-123-1');
  assert.equal(postPath('/post-123-1', base), '/post-123-1');
  assert.equal(postPath('https://other.test/post-123-2', base), undefined);
  assert.equal(postPath('/post-123-2/not-a-post', base), undefined);
});
test('redirect cleaning unwraps local redirects and rejects executable protocols', () => {
  assert.equal(directLink('/jump?to=https%3A%2F%2Fexample.com%2Fhi', base), 'https://example.com/hi');
  assert.equal(directLink('/jump?to=javascript%3Aalert(1)', base), undefined);
  assert.equal(directLink('/jump?to=%2Fjump%3Fto%3Dhttps%253A%252F%252Fexample.com', base), 'https://example.com/');
  assert.equal(directLink('mailto:foo@example.com', base), undefined);
  assert.equal(directLink('https://example.com/jump?to=keep', base), 'https://example.com/jump?to=keep');
});
test('filtering distinguishes partial keywords, exact users and explicit locked levels', () => {
  assert.deepEqual(filterLines('  vps\n\nalice, bob '), ['vps', 'alice', 'bob']);
  assert.equal(shouldFilter('Cheap VPS', 'bob', ['vps'], [], -1, NaN), true);
  assert.equal(shouldFilter('Hello', 'bobby', [], ['bob'], -1, NaN), false);
  assert.equal(shouldFilter('Hello', 'bob', [], ['bob'], -1, NaN), true);
  assert.equal(shouldFilter('Hello', '', [], [], 3, 4), true);
  assert.equal(shouldFilter('Hello', '', [], [], 3, 3), false);
  assert.equal(shouldFilter('Hello', '', [], [], -1, 4), false);
  assert.equal(shouldFilter('Hello', '', [], [], 3, NaN), false);
});
