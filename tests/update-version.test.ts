import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNewerVersion, readUpdateVersion, UPDATE_META_URL, UPDATE_URL } from '../src/lib/update-version.ts';

test('update metadata accepts userscript headers and rejects errors or script-body version strings', () => {
  const header = '// ==UserScript==\r\n// @name NodeSeek++\r\n// @version 26.914.1121\r\n// ==/UserScript==';
  assert.equal(readUpdateVersion(header), '26.914.1121');
  for (const source of ['<html>Service unavailable</html>', '// @version 99.999.9999', '// ==UserScript==\n// ==/UserScript==\n// @version 99.999.9999']) {
    assert.throws(() => readUpdateVersion(source), /有效版本/);
  }
  assert.equal(UPDATE_META_URL, UPDATE_URL.replace('.user.js', '.meta.js'));
});

test('only strictly newer numeric versions trigger updates, including same-minute releases', () => {
  assert.equal(isNewerVersion('26.101.0900', '26.930.2300'), false);
  assert.equal(isNewerVersion('26.1014.0900', '26.914.2300'), true);
  assert.equal(isNewerVersion('26.914.1121.1', '26.914.1121'), true);
  assert.equal(isNewerVersion('26.914.1121', '26.914.1121.1'), false);
  assert.equal(isNewerVersion('26.914.1121.0', '26.914.1121'), false);
  assert.equal(isNewerVersion('26.914.0900', '26.914.900'), false);
  assert.equal(isNewerVersion('27.11.0000', '26.1231.2359'), true);
  assert.equal(isNewerVersion('invalid', '26.914.1121'), false);
});
