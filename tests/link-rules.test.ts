import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLinkRules, cleanLink, footprintHref } from '../src/lib/link-rules.ts';

test('X macro rules apply to subdomains and allow rules take precedence', () => {
  const rules = parseLinkRules('@track = utm_*, ref\nexample.com >> @track\n~shop.example.com >> ref');
  assert.equal(cleanLink(new URL('https://shop.example.com/p?utm_source=x&ref=keep&id=3'), rules).href, 'https://shop.example.com/p?ref=keep&id=3');
  assert.equal(cleanLink(new URL('https://other.com/p?ref=x'), rules).search, '?ref=x');
});
test('hash query and path rules are cleaned, ordinary fragments survive', () => {
  const rules = parseLinkRules('* >> utm_*\nexample.com >> /track-/');
  assert.equal(cleanLink(new URL('https://example.com/track-post#/view?utm_a=1&id=2'), rules).href, 'https://example.com/post#/view?id=2');
  assert.equal(cleanLink(new URL('https://example.com/p#anchor'), rules).hash, '#anchor');
});
test('simple rules and invalid regex are handled without breaking parsing', () => {
  const rules = parseLinkRules('* fbclid\n* >> /[/');
  assert.equal(cleanLink(new URL('https://example.com/?fbclid=x&ok=y'), rules).search, '?ok=y');
});
test('footprint URLs use site page size and correct boundary', () => {
  assert.equal(footprintHref(123, 10), '/post-123-1#10');
  assert.equal(footprintHref(123, 11), '/post-123-2#11');
  assert.equal(footprintHref(123, 20, 20), '/post-123-1#20');
});

test('unmatched signed URLs retain their exact query and hash encoding', () => {
  const href = 'https://example.com/p?signature=a%20b&x=%2f#/page?token=a%20b&case=%2f';
  assert.equal(cleanLink(new URL(href), parseLinkRules('* >> utm_*')).href, href);
});
