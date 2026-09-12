import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileMonitorRules } from '../src/features/monitor-rules.ts';

test('monitor rules support raw and delimited regular expressions and stable repeated matching', () => {
  const { rules, errors } = compileMonitorRules('VPS\n/香港.*(年付|月付)/i\n/token/gi\n/[bad/');
  assert.equal(rules.length, 3);
  assert.deepEqual(errors, ['/[bad/']);
  assert.equal(rules[0].matches('便宜 vps 出售'), true);
  assert.equal(rules[1].matches('香港机器，支持年付'), true);
  assert.equal(rules[1].matches('美国机器年付'), false);
  assert.equal(rules[2].matches('TOKEN'), true);
  assert.equal(rules[2].matches('TOKEN'), true);
});

test('raw input uses regex syntax and rejects invalid expressions', () => {
  const { rules, errors } = compileMonitorRules('^vmiss|搬瓦工$\n[invalid');
  assert.deepEqual(errors, ['[invalid']);
  assert.equal(rules[0].matches('VMISS 出售'), true);
  assert.equal(rules[0].matches('出售搬瓦工'), true);
  assert.equal(rules[0].matches('出售 vm iss'), false);
});
