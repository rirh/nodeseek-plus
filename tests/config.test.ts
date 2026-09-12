import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings, parseSettings, exportSettings } from '../src/core/config.ts';
import type { Feature } from '../src/core/types.ts';

const features: Feature[] = [{ id: 'demo', title: '', description: '', group: '', defaults: { enabled: false, interval: 60, mode: 'fixed', text: '' }, fields: { mode: { type: 'select', label: '', options: [{ value: 'fixed', label: '' }, { value: 'random', label: '' }] } }, mount() {} }];
test('rejects unknown fields, invalid types, enum values and prototype keys', () => {
  const input = JSON.parse('{"demo":{"enabled":"yes","interval":null,"mode":"evil","text":"valid","__proto__":{"polluted":true}},"unknown":{"enabled":true}}');
  const output = normalizeSettings(features, input);
  assert.deepEqual(output, { demo: { enabled: false, interval: 60, mode: 'fixed', text: 'valid' } });
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});
test('requires explicit schema and preserves valid imported values', () => {
  assert.throws(() => parseSettings(features, '{}'));
  assert.throws(() => parseSettings(features, JSON.stringify({ format: 'nodeseek-plus-plus', schema: 2, settings: {} })));
  const text = JSON.stringify({ format: 'nodeseek-plus-plus', schema: 1, settings: { demo: { enabled: true, mode: 'random' } } });
  assert.equal(parseSettings(features, text).demo.enabled, true);
  assert.equal(parseSettings(features, text).demo.mode, 'random');
});
test('ignores oversized strings and nonfinite numbers', () => {
  assert.equal(normalizeSettings(features, { demo: { interval: Infinity, text: 'a'.repeat(100001) } }).demo.interval, 60);
  assert.equal(normalizeSettings(features, { demo: { text: 'a'.repeat(100001) } }).demo.text, '');
  assert.throws(() => parseSettings(features, ' '.repeat(1000001)));
});

test('export strips credentials while preserving keyboard and keyword settings', () => {
  const data = JSON.parse(exportSettings({ demo: { apiKey: 'private', token: 'private', keyboard: false, keywords: 'test', enabled: true } }));
  assert.equal(data.settings.demo.apiKey, '');
  assert.equal(data.settings.demo.token, '');
  assert.equal(data.settings.demo.keyboard, false);
  assert.equal(data.settings.demo.keywords, 'test');
});
