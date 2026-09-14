import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { discussionStats } from '../src/features/discussion-stats-data.ts';

function parse(postData: unknown, id = '42') {
  const window = new Window();
  const encoded = Buffer.from(JSON.stringify({ postData })).toString('base64');
  window.document.body.innerHTML = `<script id="temp-script" type="text/plain">${encoded}</script>`;
  return discussionStats(window.document as unknown as ParentNode, id);
}

test('discussion stats decode views and only count floors on the final page', () => {
  const data = { postId: 42, title: '中文主题', views: '44724', postPage: 1, postPageCount: 26, comments: [{ floorIndex: 0 }, { floorIndex: 231 }, { floorIndex: 10 }] };
  assert.deepEqual(parse(data), { views: 44724, comments: null, lastPage: 26 });
  assert.deepEqual(parse({ ...data, postPage: 26, comments: [{ floorIndex: 251 }, { floorIndex: 256 }] }), { views: 44724, comments: 256, lastPage: 26 });
  assert.deepEqual(parse({ ...data, views: 0, postPageCount: 1, comments: [{ floorIndex: 0 }] }), { views: 0, comments: 0, lastPage: 1 });
});

test('discussion stats reject mismatched posts and keep missing counts unknown', () => {
  const data = { postId: 42, postPage: 1, postPageCount: 1 };
  assert.throws(() => parse(data, '43'), /不匹配/);
  for (const views of [undefined, null, '', -1, '12x', true]) {
    assert.deepEqual(parse({ ...data, views }), { views: null, comments: null, lastPage: 1 });
  }
});
