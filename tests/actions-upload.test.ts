import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadRequest, uploadResult } from '../src/features/actions-upload-protocol.ts';
const base = 'https://images.example';
const file = new Blob(['image'], { type: 'image/png' });
test('six image provider contracts build the documented body and parse their response', () => {
  const cases = [
    ['NodeImage', '/api/upload', 'image', { links: { direct: base + '/a.png' } }],
    ['Telegraph', '/upload', 'file', [{ src: '/a.png' }]],
    ['Telegraph2', '/upload', 'file', { data: base + '/a.png' }],
    ['LskyPro', '/api/v1/upload', 'file', { data: { links: { url: base + '/a.png' } } }],
    ['Chevereto', '/api/1/upload', 'source', { image: { url: base + '/a.png' } }],
    ['EasyImages', '/api/index.php', 'image', { url: base + '/a.png' }],
  ] as const;
  for (const [provider, path, field, response] of cases) {
    const request = uploadRequest(provider, base, 'test-key', file);
    assert.equal(request.url, (provider === 'NodeImage' ? 'https://api.nodeimage.com' : base) + path);
    assert.ok(request.body.get(field) instanceof Blob);
    assert.equal(uploadResult(provider, base, response).href, base + '/a.png');
  }
  assert.equal(uploadRequest('LskyPro', base, 'key', file).headers.Authorization, 'Bearer key');
  assert.equal(uploadRequest('NodeImage', '', 'key', file).url, 'https://api.nodeimage.com/api/upload');
});
test('EasyImages without a token uses its anonymous contract', () => {
  const request = uploadRequest('EasyImages', base, '', file);
  assert.equal(request.url, base + '/app/upload.php');
  assert.ok(request.body.get('file') instanceof Blob);
  assert.match(String(request.body.get('sign')), /^\d+$/);
});
test('reject insecure endpoint, missing key, failed response and executable result URL', () => {
  assert.equal(uploadRequest('NodeImage', 'http://images.example', 'key', file).url, 'https://api.nodeimage.com/api/upload');
  assert.throws(() => uploadRequest('LskyPro', 'http://images.example', 'key', file));
  assert.throws(() => uploadRequest('NodeImage', base, '', file));
  assert.throws(() => uploadResult('NodeImage', base, { success: false, links: { direct: base } }));
  assert.throws(() => uploadResult('Telegraph2', base, { data: 'javascript:alert(1)' }));
  assert.throws(() => uploadResult('NodeImage', base, {}));
});
