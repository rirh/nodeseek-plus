import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { parseMonitorRSS } from '../src/features/monitor-rss.ts';
const window = new Window();
Object.assign(globalThis, { DOMParser: window.DOMParser });
test('RSS parses titles, deduplicates IDs and rejects foreign links', () => {
  const item = '<item><title>VPS &amp; 香港</title><link>https://www.nodeseek.com/post-123-1</link><category>trade</category></item>';
  const posts = parseMonitorRSS(`<rss><channel>${item}${item}<item><title>bad</title><link>https://evil.example/post-1-1</link></item><item><title>无摘要</title><link>https://www.nodeseek.com/post-124-1</link></item></channel></rss>`);
  assert.equal(posts.length, 2);
  assert.equal(posts[0].title, 'VPS & 香港');
  assert.equal(posts[0].category, 'trade');
  assert.equal('content' in posts[1], false);
});
test('invalid feed fails while a valid empty feed is allowed', () => {
  assert.throws(() => parseMonitorRSS('<html>Challenge</html>'));
  assert.throws(() => parseMonitorRSS('<rss><channel>'));
  assert.deepEqual(parseMonitorRSS('<rss><channel/></rss>'), []);
});
