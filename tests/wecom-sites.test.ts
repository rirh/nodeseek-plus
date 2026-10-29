import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { avatarUrl, discourseNoticeRows, discoursePage, discourseRoute, discourseRows, discourseSections, discourseTarget, jsonPath } from '../src/features/wecom/sites/discourse-parse.ts';
import { relativeDate, v2exDate, v2exMission, v2exNoticeRows, v2exOnce, v2exPage, v2exRoute, v2exRows, v2exTarget, v2exUnread, v2exUser } from '../src/features/wecom/sites/v2ex-parse.ts';
import { pageHealthy, siteKind } from '../src/lib/site.ts';
import { fixture, waitFor } from './helpers/bundle-fixture.ts';

const LINUXDO = 'https://linux.do';
const V2EX = 'https://www.v2ex.com';
const docOf = (html: string, url = V2EX) => new new Window({ url }).DOMParser().parseFromString(html, 'text/html') as unknown as Document;
const inert = (html: string) => docOf(`<div>${html}</div>`, LINUXDO).body.firstElementChild!;

// ---------- linux.do (Discourse JSON) ----------

const categories = [
  { id: 5, name: '开发调优', slug: 'develop', color: '25AAE2', position: 2 },
  { id: 6, name: '资源荟萃', slug: 'resource', color: '12A89D', position: 1 },
  { id: 7, name: '前端', slug: 'frontend', parent_category_id: 5, position: 1 },
];
const latest = {
  users: [{ id: 1, username: 'neo', avatar_template: '/user_avatar/linux.do/neo/{size}/1_2.png' }, { id: 2, username: 'trinity', avatar_template: 'https://cdn.example/t/{size}.png' }],
  topic_list: { more_topics_url: '/latest?page=1', topics: [
    { id: 101, title: '第一个话题', slug: 'first', posts_count: 3, category_id: 5, bumped_at: '2026-10-29T02:00:00Z', last_poster_username: 'trinity', unread_posts: 2, posters: [{ user_id: 1, description: '原始发帖人, 最新发帖人' }, { user_id: 2, description: '频繁发帖人' }] },
    { id: 102, title: '置顶公告', posts_count: 1, category_id: 6, pinned: true, unseen: true, posters: [{ user_id: 2, description: 'Original Poster' }] },
  ] },
};
const thread = {
  id: 101, title: '第一个话题', slug: 'first', posts_count: 3, views: 42, category_id: 5, details: { created_by: { username: 'neo' } },
  post_stream: { stream: [1001, 1002, 1003], posts: [
    { id: 1001, post_number: 1, username: 'neo', user_id: 1, avatar_template: '/user_avatar/linux.do/neo/{size}/1_2.png', created_at: '2026-10-29T01:00:00Z',
      cooked: '<p>正文 <img class="emoji" src="/images/emoji/smile.png" alt=":smile:"></p><aside class="onebox" data-onebox-src="https://example.com/a"><header><a href="https://example.com/a">example.com</a></header><h3><a href="https://example.com/a">示例页面</a></h3></aside><div class="poll"><ul><li>选项</li></ul></div>',
      actions_summary: [{ id: 2, count: 4, can_act: true }] },
    { id: 1002, post_number: 2, username: 'tester', user_id: 7, avatar_template: '/user_avatar/linux.do/tester/{size}/7_2.png', created_at: '2026-10-29T01:10:00Z',
      cooked: '<aside class="quote"><div class="title"><img class="avatar" src="/a.png"> neo:</div><blockquote><p>正文</p></blockquote></aside><p>回复内容 <a href="/t/topic/102/1">链接</a></p>', actions_summary: [] },
    { id: 1003, post_number: 3, username: 'trinity', user_id: 2, admin: true, user_title: '版主', created_at: '2026-10-29T01:20:00Z', updated_at: '2026-10-29T01:30:00Z', version: 2,
      cooked: '<p>第三楼</p>', actions_summary: [{ id: 2, count: 1, acted: true, can_undo: true }] },
  ] },
};

test('linux.do and V2EX are told apart from NodeSeek by host', () => {
  assert.equal(siteKind('linux.do'), 'linuxdo');
  assert.equal(siteKind('www.v2ex.com'), 'v2ex');
  assert.equal(siteKind('v2ex.com'), 'v2ex');
  assert.equal(siteKind('www.nodeseek.com'), 'nodeseek');
  assert.equal(siteKind('www.deepflood.com'), 'nodeseek');
});

test('Cloudflare checks and error pages are not taken for the forum', () => {
  const page = (html: string, title = '') => { const doc = docOf(`<title>${title}</title>${html}`, LINUXDO); return doc; };
  assert.equal(pageHealthy('linuxdo', page('<div id="data-preloaded"></div><section id="main"></section>')), true);
  assert.equal(pageHealthy('linuxdo', page('<div id="challenge-running"></div>', 'Just a moment...')), false);
  assert.equal(pageHealthy('linuxdo', page('<h1>502 Bad Gateway</h1>')), false);
  assert.equal(pageHealthy('v2ex', page('<div id="Wrapper"><div id="Main"></div></div>')), true);
  assert.equal(pageHealthy('v2ex', page('<div id="cf-wrapper"></div>', 'Attention Required! | Cloudflare')), false);
  assert.equal(pageHealthy('nodeseek', page('<div>任意页面</div>')), true);
  assert.equal(pageHealthy('nodeseek', page('<form id="challenge-form"></form>', 'Just a moment...')), false);
});

test('Discourse links and routes map to topics, posts and list JSON', () => {
  assert.deepEqual(discourseTarget('/t/some-slug/12/5', LINUXDO), { id: 12, page: 0, floor: 5 });
  assert.deepEqual(discourseTarget('/t/12/5', LINUXDO), { id: 12, page: 0, floor: 5 });
  assert.deepEqual(discourseTarget('/t/some-slug/12', LINUXDO), { id: 12, page: 1, floor: null });
  assert.deepEqual(discourseTarget('/t/some-slug/12/1', LINUXDO), { id: 12, page: 1, floor: null });
  assert.equal(discourseTarget('https://example.com/t/a/12', LINUXDO), null);
  assert.equal(discourseTarget('/u/neo', LINUXDO), null);
  assert.deepEqual(discourseRoute(new URL(`${LINUXDO}/`)), { list: '/latest', topic: null });
  assert.deepEqual(discourseRoute(new URL(`${LINUXDO}/c/develop/5`)), { list: '/c/develop/5/l/latest', topic: null });
  assert.deepEqual(discourseRoute(new URL(`${LINUXDO}/top?period=weekly`)), { list: '/top?period=weekly', topic: null });
  assert.equal(discourseRoute(new URL(`${LINUXDO}/new-topic`)), null);
  assert.equal(discourseRoute(new URL(`${LINUXDO}/u/neo/summary`)), null);
  assert.equal(jsonPath('/latest?page=1'), '/latest.json?page=1');
  assert.equal(jsonPath('/c/develop/5/l/latest?order=created'), '/c/develop/5/l/latest.json?order=created');
  assert.equal(avatarUrl('/user_avatar/linux.do/neo/{size}/1_2.png', LINUXDO), 'https://linux.do/user_avatar/linux.do/neo/96/1_2.png');
});

test('Discourse topic lists show the opening poster, category, last replier and unread replies', () => {
  const page = discourseRows(latest, LINUXDO, new Map(categories.map(c => [c.id, c.name])));
  assert.equal(page.next, '/latest?page=1');
  const [first, pinned] = page.rows;
  assert.equal(first.title, '第一个话题');
  assert.equal(first.author, 'neo');
  assert.equal(first.avatar, 'https://linux.do/user_avatar/linux.do/neo/96/1_2.png');
  assert.equal(first.meta, '开发调优 · trinity');
  assert.equal(first.count, 2);
  assert.equal(first.unread, 2);
  assert.equal(pinned.pinned, true);
  assert.equal(pinned.read, false);
  assert.equal(pinned.author, 'trinity');
});

test('Discourse posts become floors numbered by post number, with likes and tidied content', () => {
  const data = discoursePage(thread, thread.post_stream.posts, 1, 1, LINUXDO, new Map([[5, '开发调优']]), inert);
  assert.equal(data.replies, 2);
  assert.equal(data.views, '42');
  assert.deepEqual(data.category, { name: '开发调优', href: '/c/5' });
  assert.deepEqual(data.floors.map(f => [f.floor, f.op, f.label]), [[1, true, '#1'], [2, false, '#2'], [3, false, '#3']]);
  const [op, mine, third] = data.floors;
  assert.equal(op.poster, true);
  assert.equal(op.postId, 1001);
  assert.deepEqual([op.likes, op.liked, op.canLike], [4, false, true]);
  assert.deepEqual([third.likes, third.liked, third.canLike], [1, true, true]);
  assert.deepEqual(third.roles, ['管理员', '版主']);
  assert.match(third.edited, /^编辑于/);
  assert.equal(mine.profile, '/u/tester');
  // Link previews collapse to one link, polls point to the original, quote headers lose their avatar.
  assert.equal(op.content!.querySelector('a')!.textContent, '示例页面');
  assert.equal(op.content!.querySelector('aside'), null);
  assert.match(op.content!.textContent!, /投票，请在原帖中查看/);
  assert.equal(mine.content!.querySelector('.title img'), null);
});

test('Discourse notifications, categories and their order', () => {
  const notices = discourseNoticeRows({ notifications: [
    { id: 9, notification_type: 2, read: false, topic_id: 101, post_number: 3, created_at: '2026-10-29T03:00:00Z', data: { topic_title: '第一个话题', display_username: 'trinity' } },
    { id: 10, notification_type: 12, read: true, data: { badge_name: '入门' } },
    { id: 11, notification_type: 5, read: true, topic_id: 102, post_number: 1, data: { topic_title: '置顶公告', display_username: 'neo' } },
  ] }, LINUXDO);
  assert.deepEqual(notices.rows.map(r => [r.id, r.floor, r.page, r.meta, r.read, r.notice]), [[101, 3, 0, 'trinity 回复了你', false, 9], [102, null, 1, 'neo 赞了你的帖子', true, 11]]);
  assert.deepEqual(discourseSections(categories).map(s => [s.name, s.path, s.depth, s.color]), [
    ['资源荟萃', '/c/resource/6/l/latest', 0, '#12A89D'],
    ['开发调优', '/c/develop/5/l/latest', 0, '#25AAE2'],
    ['前端', '/c/develop/frontend/7/l/latest', 1, undefined],
  ]);
});

// ---------- V2EX (HTML) ----------

// Markup trimmed from V2EX's own pages: a tab list, a node page with pagination, the 今日热议 sidebar.
const listCell = (id: number, title: string, author: string, last: string, replies: number, node = '<a class="node" href="/go/programmer">程序员</a> &nbsp;•&nbsp; ') => `<div class="cell item"><table><tr>`
  + `<td width="48"><a href="/member/${author}"><img src="https://cdn.v2ex.com/avatar/${author}.png" class="avatar" alt="${author}"></a></td><td width="10"></td>`
  + `<td><span class="item_title"><a href="/t/${id}#reply${replies}" class="topic-link">${title}</a></span><div class="sep5"></div>`
  + `<span class="topic_info"><div class="votes"></div>${node}<strong><a href="/member/${author}">${author}</a></strong> &nbsp;•&nbsp; <span title="2026-10-29 14:39:12 +08:00">几秒前</span>${last ? ` &nbsp;•&nbsp; 最后回复来自 <strong><a href="/member/${last}">${last}</a></strong>` : ''}</span></td>`
  + `<td width="70"><a href="/t/${id}#reply${replies}" class="count_livid">${replies}</a></td></tr></table></div>`;
const hotSidebar = '<div class="box" id="TopicsHot"><div class="cell"><span class="fade">今日热议主题</span></div>'
  + '<div class="cell from_1 hot_t_900"><table><tr><td><a href="/member/hotman"><img src="https://cdn.v2ex.com/avatar/hotman.png" class="avatar"></a></td><td></td><td><span class="item_hot_topic_title"><a href="/t/900">热议话题</a></span></td></tr></table></div></div>';
const rightbar = '<div id="Rightbar"><div class="box"><div class="cell"><table><tr><td><a href="/member/tester"><img src="https://cdn.v2ex.com/avatar/tester.png" class="avatar"></a></td><td><span class="bigger"><a href="/member/tester">tester</a></span></td></tr></table></div>'
  + '<div class="cell"><a href="/notifications" class="fade">2 条未读提醒</a></div></div>' + hotSidebar + '</div>';
const tabPage = `<div id="Top"></div><div id="Wrapper"><div class="content"><div id="Main"><div class="box"><div class="cell" id="Tabs"><a href="/?tab=tech" class="tab_current">技术</a><a href="/?tab=creative" class="tab">创意</a></div>`
  + listCell(1252735, '听说最近群晖中招了', 'CodeDAI', 'klgd', 41) + listCell(1252814, 'NyaTerm', 'CoderKang', '', 18)
  + '<div class="inner"><a href="/recent">更多新主题</a></div></div></div>' + rightbar + '</div></div>';
const nodePage = (p: number) => `<div id="Wrapper"><div id="Main"><div class="box"><div id="TopicsNode">${listCell(1252838, '我们只是普通人吗', '6581', 'Xymmh', 18, '')}</div>`
  + `<div class="cell ps_container"><a href="/go/programmer?p=1" class="page_current">${p}</a><a href="/go/programmer?p=2" class="page_normal">2</a><a href="/go/programmer?p=3" class="page_normal">3</a><input type="number" class="page_input" value="${p}" min="1" max="3"></div></div></div></div>`;
const reply = (id: number, floor: number, name: string, body: string, extra = '') => `<div id="r_${id}" class="cell"><table><tr><td width="48"><img src="https://cdn.v2ex.com/avatar/${name}.png" class="avatar" alt="${name}"></td><td width="10"></td>`
  + `<td><div class="fr">${extra} &nbsp; <span class="no">${floor}</span></div><div class="sep3"></div><strong><a href="/member/${name}" class="dark">${name}</a></strong> &nbsp; <div class="badges">${name === 'CodeDAI' ? '<div class="badge op">OP</div>' : ''}</div>&nbsp; &nbsp;<span class="ago" title="2026-10-29 09:3${floor}:25 +08:00">5 小时前</span> ${floor === 2 ? '<span class="small fade"><img src="/static/img/heart_neue_red.png" alt="❤️"> 3</span>' : ''}`
  + `<div class="sep5"></div><div class="reply_content">${body}</div></td></tr></table></div>`;
const topicPage = '<div id="Wrapper"><div id="Main"><div class="box"><div class="header"><div class="fr"><a href="/member/CodeDAI"><img src="https://cdn.v2ex.com/avatar/CodeDAI.png" class="avatar" alt="CodeDAI"></a></div>'
  + '<div><a href="/">V2EX</a> <span class="chevron">›</span> <a href="/go/nas">NAS</a></div><h1>听说最近群晖中招了</h1><small class="gray"><a href="/member/CodeDAI">CodeDAI</a> · <span title="2026-10-29 09:33:02 +08:00">5 小时前</span> · 3428 次点击</small></div>'
  + '<div class="cell"><div class="topic_content"><div class="markdown_body"><p>正文第一段</p></div></div></div>'
  + '<div class="subtle"><span class="fade">第 1 条附言 · <span title="2026-10-29 12:31:22 +08:00">2 小时前</span></span><div class="topic_content">360 的公告</div></div>'
  + '<div class="topic_buttons"><a href="/favorite/topic/1252735?once=12345" class="tb">加入收藏</a><div class="fr topic_stats">3428 次点击 ∙ 5 人收藏 ∙ 2 人感谢</div><div id="topic_thank"><a href="#;" onclick="thankTopic(1252735)" class="tb">感谢</a></div></div></div>'
  + '<div class="box"><div class="cell"><span class="gray">41 条回复 <strong class="snow">•</strong> 2026-10-29 14:39:06 +08:00</span></div>'
  + reply(18232836, 1, 'Autonomous', '不暴露任何端口') + reply(18232842, 2, 'klgd', '发生了啥？', '<div id="thank_area_18232842" class="thank_area"><a href="#;" onclick="thankReply(18232842)" class="thank">感谢回复者</a></div>')
  + reply(18232916, 3, 'CodeDAI', '楼主回复')
  + '<div class="cell ps_container"><a href="/t/1252735?p=1" class="page_current">1</a><a href="/t/1252735?p=2" class="page_normal">2</a><input type="number" class="page_input" max="2"></div></div>'
  + '<div class="box"><form method="post" action="/t/1252735"><textarea name="content"></textarea><input type="hidden" value="12345" name="once"></form></div></div>' + rightbar + '</div>';
const missionPage = (redeemed: boolean) => '<div id="Wrapper"><div id="Main"><div class="box"><div class="cell">每日登录奖励</div>'
  + (redeemed ? '<div class="cell"><span class="gray">每日登录奖励已领取</span></div>' : '<div class="cell"><input type="button" class="super normal button" value="领取 X 铜币" onclick="location.href = \'/mission/daily/redeem?once=24680\';"></div>')
  + `<div class="cell">已连续登录 ${redeemed ? 5 : 4} 天</div></div></div></div>`;
const notificationsPage = '<div id="Wrapper"><div id="Main"><div class="box">'
  + '<div class="cell" id="n_1"><table><tr><td><a href="/member/klgd"><img src="https://cdn.v2ex.com/avatar/klgd.png" class="avatar"></a></td><td><span class="fade"><a href="/member/klgd"><strong>klgd</strong></a> 在回复 <a href="/t/1252735#reply2">听说最近群晖中招了</a> 时提到了你</span> &nbsp; <span class="snow">3 小时前</span><div class="sep5"></div><div class="payload">@tester 看看这个</div></td></tr></table></div>'
  + '<div class="cell" id="n_2"><table><tr><td><a href="/member/neo"><img src="https://cdn.v2ex.com/avatar/neo.png" class="avatar"></a></td><td><span class="fade"><a href="/member/neo"><strong>neo</strong></a> 感谢了你发布的主题 › <a href="/t/1252814#reply18">NyaTerm</a></span> &nbsp; <span class="snow">1 天前</span></td></tr></table></div>'
  + '</div></div></div>';

test('V2EX times, links and routes', () => {
  const now = new Date('2026-10-29T08:00:00Z');
  assert.equal(v2exDate('2026-10-29 14:39:12 +08:00')!.toISOString(), '2026-10-29T06:39:12.000Z');
  assert.equal(relativeDate('5 小时 6 分钟前', now)!.toISOString(), '2026-10-29T02:54:00.000Z');
  assert.equal(relativeDate('Just Now', now)!.getTime(), now.getTime());
  assert.equal(relativeDate('3 天前', now)!.toISOString(), '2026-10-26T08:00:00.000Z');
  assert.deepEqual(v2exTarget('/t/123#reply150', V2EX), { id: 123, page: 2, floor: 150 });
  assert.deepEqual(v2exTarget('https://v2ex.com/t/123?p=3', V2EX), { id: 123, page: 3, floor: null });
  assert.equal(v2exTarget('/go/python', V2EX), null);
  assert.deepEqual(v2exRoute(new URL(`${V2EX}/?tab=tech`)), { list: '/?tab=tech', topic: null });
  assert.deepEqual(v2exRoute(new URL(`${V2EX}/go/python?p=2`)), { list: '/go/python?p=2', topic: null });
  assert.equal(v2exRoute(new URL(`${V2EX}/write`)), null);
  assert.equal(v2exRoute(new URL(`${V2EX}/settings`)), null);
});

test('V2EX lists: tab rows continue at /recent, node pages count pages, 今日热议 comes from the sidebar', () => {
  const tab = v2exRows(docOf(tabPage), '/?tab=tech', V2EX);
  assert.deepEqual(tab.rows.map(r => [r.id, r.title, r.author, r.meta, r.count]), [[1252735, '听说最近群晖中招了', 'CodeDAI', '程序员 · klgd', 41], [1252814, 'NyaTerm', 'CoderKang', '程序员', 18]]);
  assert.equal(tab.rows[0].avatar, 'https://cdn.v2ex.com/avatar/CodeDAI.png');
  assert.equal(tab.rows[0].time!.toISOString(), '2026-10-29T06:39:12.000Z');
  assert.equal(tab.next, '/recent');
  const node = v2exRows(docOf(nodePage(1)), '/go/programmer', V2EX);
  assert.deepEqual(node.rows.map(r => r.meta), ['6581 · Xymmh']);
  assert.equal(node.next, '/go/programmer?p=2');
  assert.equal(v2exRows(docOf(nodePage(3)), '/go/programmer?p=3', V2EX).next, null);
  const hot = v2exRows(docOf(tabPage), '/#TopicsHot', V2EX);
  assert.deepEqual(hot.rows.map(r => [r.id, r.author, r.count]), [[900, 'hotman', null]]);
  assert.equal(hot.next, null);
  const doc = docOf(tabPage);
  assert.equal(v2exUnread(doc), 2);
  assert.deepEqual(v2exUser(doc, V2EX), { name: 'tester', avatar: 'https://cdn.v2ex.com/avatar/tester.png', profile: '/member/tester' });
});

test('V2EX topics: the opening post carries its 附言, replies keep V2EX floor numbers, thanks and pages', () => {
  const data = v2exPage(docOf(topicPage), 1252735, 1, V2EX, 'tester');
  assert.equal(data.title, '听说最近群晖中招了');
  assert.deepEqual([data.pages, data.replies, data.views, data.collections, data.collected], [2, 41, '3428', 5, false]);
  assert.deepEqual(data.category, { name: 'NAS', href: '/go/nas' });
  assert.equal(data.once, '12345');
  assert.deepEqual(data.favorite, { on: false, href: '/favorite/topic/1252735?once=12345' });
  assert.deepEqual(data.floors.map(f => [f.floor, f.author, f.poster]), [[0, 'CodeDAI', true], [1, 'Autonomous', false], [2, 'klgd', false], [3, 'CodeDAI', true]]);
  const [op, , second] = data.floors;
  assert.match(op.content!.textContent!, /正文第一段/);
  assert.match(op.content!.querySelector('blockquote')!.textContent!, /第 1 条附言.*360 的公告/);
  assert.deepEqual([op.likes, op.canLike], [2, true]);
  assert.equal(op.time, '2026-10-29T01:33:02.000Z');
  assert.deepEqual([second.postId, second.likes, second.liked, second.canLike], [18232842, 3, false, true]);
  assert.equal(data.floors[1].canLike, false);
  assert.equal(v2exPage(docOf(topicPage), 1252735, 2, V2EX).floors[0].floor, 1);
  // A topic with only 附言 shows each once.
  const noBody = v2exPage(docOf(topicPage.replace('<div class="cell"><div class="topic_content"><div class="markdown_body"><p>正文第一段</p></div></div></div>', '')), 1252735, 1, V2EX);
  assert.equal(noBody.floors[0].content!.textContent!.match(/360 的公告/g)!.length, 1);
  assert.equal(noBody.floors[0].content!.firstElementChild!.tagName, 'BLOCKQUOTE');
});

test('V2EX notifications say who did what and open at the reply', () => {
  const now = new Date('2026-10-29T08:00:00Z');
  const rows = v2exNoticeRows(docOf(notificationsPage), V2EX, now).rows;
  assert.deepEqual(rows.map(r => [r.id, r.floor, r.page, r.author, r.meta]), [
    [1252735, 2, 1, 'klgd', 'klgd 提到了你：@tester 看看这个'],
    [1252814, null, 1, 'neo', 'neo 感谢了你'],
  ]);
  assert.equal(rows[0].time!.toISOString(), '2026-10-29T05:00:00.000Z');
  assert.equal(v2exOnce(docOf('<a href="/signout?once=777">登出</a>')), '777');
});

test('V2EX daily reward page: the redeem link, or that it was already redeemed, and the streak', () => {
  assert.deepEqual(v2exMission(missionPage(false)), { done: false, redeem: '/mission/daily/redeem?once=24680', days: 4 });
  assert.deepEqual(v2exMission(missionPage(true)), { done: true, redeem: null, days: 5 });
  assert.deepEqual(v2exMission('<div id="Main">请先登录</div>'), { done: false, redeem: null, days: null });
});

// ---------- the script on linux.do and V2EX ----------

const desktop = (window: Window) => {
  window.matchMedia = ((query: string) => ({ matches: query === '(min-width: 1000px)', addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
};
const toggle = (doc: Document) => doc.querySelector('[data-nspp-wecom-launcher]') as HTMLButtonElement;
const click = (window: Window, target: Element, init: MouseEventInit = {}) => {
  const event = new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
  target.dispatchEvent(event); return event;
};
const rightClick = (window: Window, target: Element) => target.dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 200, clientY: 200 }));
type Sent = { method: string; path: string; body: string; headers: Record<string, string> };

function linuxdoPage(signedIn = true) {
  const preloaded = JSON.stringify({
    ...(signedIn ? { currentUser: JSON.stringify({ id: 7, username: 'tester', avatar_template: '/user_avatar/linux.do/tester/{size}/7_2.png', all_unread_notifications_count: 3 }) } : {}),
    site: JSON.stringify({ categories }),
  }).replaceAll('"', '&quot;');
  return `<meta name="csrf-token" content="csrf-abc"><div id="data-preloaded" data-preloaded="${preloaded}"></div>`
    + '<section id="main"><div class="d-header"><div class="header-dropdown-toggle current-user"><span class="badge-notification">3</span></div></div><div id="main-outlet">原生页面</div></section>';
}
function linuxdoServer(window: Window, sent: Sent[], down = false) {
  desktop(window);
  window.fetch = (async (url: unknown, init: RequestInit = {}) => {
    const target = new URL(String(url), LINUXDO), path = target.pathname + target.search;
    sent.push({ method: init.method || 'GET', path, body: String(init.body ?? ''), headers: Object.fromEntries([...new window.Headers(init.headers as HeadersInit).entries()].map(([name, value]) => [name.toLowerCase(), value])) });
    const json = (value: unknown, status = 200) => new window.Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
    // A Cloudflare check answers API calls with an HTML page.
    if (down) return new window.Response('<html><title>Just a moment...</title></html>', { status: 403, headers: { 'Content-Type': 'text/html' } });
    if (target.pathname === '/latest.json' || target.pathname === '/hot.json') return json(latest);
    if (target.pathname === '/t/101.json') return json(thread);
    if (target.pathname === '/t/101/3.json') return json(thread);
    if (target.pathname === '/notifications.json') return json({ notifications: [{ id: 9, notification_type: 2, read: false, topic_id: 101, post_number: 3, created_at: '2026-10-29T03:00:00Z', data: { topic_title: '第一个话题', display_username: 'trinity' } }] });
    if (target.pathname === '/post_actions' || target.pathname === '/notifications/mark-read') return json({ success: 'OK' });
    if (target.pathname === '/posts.json') return json({ id: 1004, post_number: 4 });
    return json({ errors: ['not found'] }, 404);
  }) as typeof window.fetch;
}
const LINUXDO_KEY = 'nspp:settings:linux.do';
const linuxdoFixture = (sent: Sent[], path = '/') => fixture({}, linuxdoPage(), path, new Map<string, unknown>([[LINUXDO_KEY, { 'request-settings': { enabled: true, requestInterval: 0 } }]]), window => linuxdoServer(window, sent), false, LINUXDO);

test('on linux.do only 摸鱼模式 runs, and it builds its list and conversation from the forum API', async () => {
  const sent: Sent[] = [];
  const f = await linuxdoFixture(sent);
  try {
    const { window } = f, doc = window.document as unknown as Document;
    // NodeSeek's own modules stay off this site: the toolbar holds only the fish and settings.
    assert.deepEqual(f.menuLabels, ['NodeSeek++ 设置']);
    assert.equal(doc.querySelector('[data-nspp-attendance], [data-nspp-hot-launcher]'), null);
    assert.equal(toggle(doc).hidden, false);
    assert.equal(doc.documentElement.hasAttribute('data-nspp-wecom'), false);
    assert.deepEqual(sent, []);

    toggle(doc).click();
    assert.equal(doc.documentElement.dataset.nsppWecomSite, 'linuxdo');
    assert.deepEqual([...doc.querySelectorAll('.nspp-wecom-rail-top .nspp-wecom-rail-item')].map(i => i.getAttribute('aria-label')), ['通知', '帖子', '分类', '热榜']);
    assert.equal(doc.querySelector('.nspp-wecom-rail .nspp-wecom-badge')!.textContent, '3');
    assert.equal(doc.querySelector('.nspp-wecom-me img')!.getAttribute('src'), 'https://linux.do/user_avatar/linux.do/tester/96/7_2.png');
    await waitFor(() => doc.querySelectorAll('.nspp-wecom-feed li').length === 2);
    assert.equal(sent[0].path, '/latest.json');
    assert.equal(sent[0].headers['x-requested-with'], 'XMLHttpRequest');
    const first = doc.querySelector('.nspp-wecom-feed li')!;
    assert.equal(first.querySelector('strong')!.textContent, '第一个话题');
    assert.equal(first.querySelector('small')!.textContent, '开发调优 · trinity');
    assert.equal(first.querySelector('.nspp-wecom-row-badge')!.textContent, '2');
    assert.ok(doc.querySelectorAll('.nspp-wecom-feed li')[1].hasAttribute('data-pinned'));
    assert.equal(doc.querySelector('.nspp-wecom-sort')!.textContent, '新回复');

    click(window, first.querySelector('button')!);
    await waitFor(() => doc.querySelectorAll('.nspp-wecom-msg').length === 3);
    assert.ok(sent.some(entry => entry.path === '/t/101.json'));
    assert.ok(first.hasAttribute('data-nspp-wecom-active'));
    assert.equal(doc.querySelector('.nspp-wecom-chat-count')!.textContent, '(2)');
    const op = doc.querySelector('.nspp-wecom-msg[data-floor="1"]')!;
    assert.ok(op.hasAttribute('data-op'));
    assert.match(op.querySelector('.nspp-wecom-msg-meta')!.textContent!, /neo楼主#1/);
    assert.equal(op.querySelector('.nspp-wecom-floor')!.getAttribute('href'), 'https://linux.do/t/topic/101');
    assert.ok(op.querySelector('.nspp-wecom-bubble img[data-emoji]'));
    assert.equal(op.querySelector('.nspp-wecom-msg-foot')!.textContent, '4');
    assert.ok(doc.querySelector('.nspp-wecom-msg[data-floor="2"]')!.hasAttribute('data-mine'));
    // The input box is plain Markdown with the shared toolbar.
    assert.ok(doc.querySelector('.nspp-wecom-composer-tools .nspp-message-editor-toolbar button'));

    // Right-click: 点赞 posts the forum's like action with its CSRF token.
    const menu = doc.querySelector<HTMLElement>('.nspp-wecom-context')!;
    rightClick(window, op.querySelector('.nspp-wecom-bubble p')!);
    const items = () => [...menu.querySelectorAll<HTMLButtonElement>(':scope > button')];
    assert.deepEqual(items().map(b => b.firstChild!.textContent), ['点赞', '引用', '回复', '复制', '在原帖中查看']);
    items()[0].click();
    await waitFor(() => !!op.querySelector('.nspp-wecom-reaction[data-on]'));
    const liked = sent.find(entry => entry.path === '/post_actions')!;
    assert.deepEqual([liked.method, JSON.parse(liked.body), liked.headers['x-csrf-token']], ['POST', { id: 1001, post_action_type_id: 2 }, 'csrf-abc']);
    assert.equal(op.querySelector('.nspp-wecom-msg-foot')!.textContent, '5');

    // 回复 threads the reply under that post.
    rightClick(window, doc.querySelector('.nspp-wecom-msg[data-floor="3"] .nspp-wecom-bubble p')!);
    items().find(b => b.firstChild!.textContent === '回复')!.click();
    const input = doc.querySelector<HTMLTextAreaElement>('.nspp-wecom-composer textarea')!;
    assert.equal(input.value, '@trinity ');
    input.value += '好的'; input.dispatchEvent(new window.Event('input'));
    doc.querySelector<HTMLButtonElement>('.nspp-wecom-send')!.click();
    await waitFor(() => doc.querySelector('.nspp-wecom-send-status')!.textContent === '已发送');
    const posted = sent.find(entry => entry.path === '/posts.json')!;
    assert.deepEqual(JSON.parse(posted.body), { raw: '@trinity 好的', topic_id: 101, reply_to_post_number: 3 });
    assert.equal(posted.headers['x-csrf-token'], 'csrf-abc');
    assert.equal(input.value, '');

    // The sort switch reloads the list by creation time; categories come from the page's own data.
    doc.querySelector<HTMLButtonElement>('.nspp-wecom-sort')!.click();
    await waitFor(() => sent.some(entry => entry.path === '/latest.json?order=created'));
    doc.querySelector<HTMLButtonElement>('.nspp-wecom-rail-item[aria-label="分类"]')!.click();
    await waitFor(() => doc.querySelectorAll('.nspp-wecom-categories a').length === 3);
    assert.equal(doc.querySelector('.nspp-wecom-categories a[data-depth="1"]')!.textContent, '前端');
    click(window, doc.querySelector('.nspp-wecom-categories a[data-path="/c/develop/5/l/latest"]')!);
    await waitFor(() => sent.some(entry => entry.path === '/c/develop/5/l/latest.json'));
    assert.equal(doc.querySelector('.nspp-wecom-rail-item[aria-label="分类"]')!.getAttribute('aria-current'), 'page');

    toggle(doc).click();
    assert.equal(doc.documentElement.hasAttribute('data-nspp-wecom'), false);
    assert.equal(doc.documentElement.hasAttribute('data-nspp-wecom-site'), false);
  } finally { f.close(); }
});

test('linux.do 热榜 and 通知 fill the middle column; a notification opens at its post and is marked read', async () => {
  const sent: Sent[] = [];
  const f = await linuxdoFixture(sent);
  try {
    const { window } = f, doc = window.document as unknown as Document;
    toggle(doc).click();
    doc.querySelector<HTMLButtonElement>('.nspp-wecom-rail-item[aria-label="热榜"]')!.click();
    assert.equal(doc.documentElement.dataset.nsppWecomView, 'hot');
    assert.deepEqual([...doc.querySelectorAll('.nspp-wecom-ranking [role="tab"]')].map(t => t.textContent), ['热门', '日榜', '周榜', '月榜']);
    await waitFor(() => doc.querySelectorAll('.nspp-wecom-ranking li').length === 2);
    assert.equal(doc.querySelector('.nspp-wecom-ranking .nspp-wecom-hot-rank[data-top="1"]')!.textContent, '1');
    assert.ok(sent.some(entry => entry.path === '/hot.json'));

    doc.querySelector<HTMLButtonElement>('.nspp-wecom-rail-item[aria-label="通知"]')!.click();
    await waitFor(() => doc.querySelectorAll('.nspp-wecom-notices li').length === 1);
    const notice = doc.querySelector('.nspp-wecom-notices li')!;
    assert.equal(notice.querySelector('small')!.textContent, 'trinity 回复了你');
    assert.ok(notice.querySelector('.nspp-wecom-row-dot'));
    click(window, notice.querySelector('button')!);
    await waitFor(() => !!doc.querySelector('.nspp-wecom-msg[data-floor="3"]') && !notice.querySelector('.nspp-wecom-row-dot'));
    assert.ok(sent.some(entry => entry.path === '/t/101/3.json'));
    const read = sent.find(entry => entry.path === '/notifications/mark-read')!;
    assert.deepEqual([read.method, read.body], ['PUT', 'id=9']);
  } finally { f.close(); }
});

test('visitors on linux.do get no 通知, 发帖 or input box', async () => {
  const sent: Sent[] = [];
  const f = await fixture({}, linuxdoPage(false), '/', new Map<string, unknown>([[LINUXDO_KEY, { 'request-settings': { enabled: true, requestInterval: 0 }, 'moyu-mode': { enabled: true, defaultView: 'notices' } }]]), window => linuxdoServer(window, sent), false, LINUXDO);
  try {
    const { window } = f, doc = window.document as unknown as Document;
    toggle(doc).click();
    assert.equal(doc.querySelector<HTMLElement>('.nspp-wecom-rail-item[aria-label="通知"]')!.hidden, true);
    assert.equal(doc.querySelector<HTMLElement>('.nspp-wecom-compose')!.hidden, true);
    assert.equal(doc.querySelector('.nspp-wecom-me')!.getAttribute('href'), '/login');
    // The 通知 column chosen in settings falls back to the topic list.
    assert.equal(doc.documentElement.dataset.nsppWecomView, 'posts');
    await waitFor(() => doc.querySelectorAll('.nspp-wecom-feed li').length === 2);
    click(window, doc.querySelector('.nspp-wecom-feed li button')!);
    await waitFor(() => doc.querySelectorAll('.nspp-wecom-msg').length === 3);
    assert.equal(doc.querySelector<HTMLElement>('.nspp-wecom-composer')!.hidden, true);
    rightClick(window, doc.querySelector('.nspp-wecom-msg[data-floor="1"] .nspp-wecom-bubble p')!);
    assert.deepEqual([...doc.querySelectorAll('.nspp-wecom-context > button')].map(b => b.firstChild!.textContent), ['复制', '在原帖中查看']);
    assert.equal(sent.some(entry => entry.path.startsWith('/notifications')), false);
  } finally { f.close(); }
});

test('linux.do: a Cloudflare check page loads nothing, and a failing API sends the layout back to the site', async () => {
  const challenge = await fixture({}, '<div id="challenge-running"></div>', '/', new Map(), window => linuxdoServer(window, []), false, LINUXDO);
  try {
    assert.equal(challenge.window.document.getElementById('nspp-tools'), null);
    assert.deepEqual(challenge.menuLabels, []);
  } finally { challenge.close(); }

  const sent: Sent[] = [];
  const storage = new Map<string, unknown>([[LINUXDO_KEY, { 'request-settings': { enabled: true, requestInterval: 0 } }], ['nspp:state:linux.do:moyu-mode', { moyu: true }]]);
  const f = await fixture({}, linuxdoPage(), '/', storage, window => linuxdoServer(window, sent, true), false, LINUXDO);
  try {
    const doc = f.window.document as unknown as Document;
    await waitFor(() => sent.length > 0 && !doc.documentElement.hasAttribute('data-nspp-wecom'));
    assert.equal(doc.documentElement.hasAttribute('data-nspp-wecom-site'), false);
    // The choice is kept: the fish stays offered, and the next healthy visit opens the layout again.
    assert.equal((f.storage.get('nspp:state:linux.do:moyu-mode') as Record<string, unknown>).moyu, true);
    assert.equal(toggle(doc).hidden, false);
    assert.equal(toggle(doc).getAttribute('aria-pressed'), 'false');
  } finally { f.close(); }
});

test('linux.do pages the layout does not cover keep the native look', async () => {
  const sent: Sent[] = [];
  const storage = new Map<string, unknown>([[LINUXDO_KEY, { 'request-settings': { enabled: true, requestInterval: 0 } }], ['nspp:state:linux.do:moyu-mode', { moyu: true }]]);
  const f = await fixture({}, linuxdoPage(), '/new-topic', storage, window => linuxdoServer(window, sent), false, LINUXDO);
  try {
    const doc = f.window.document as unknown as Document;
    assert.equal(doc.documentElement.hasAttribute('data-nspp-wecom'), false);
    assert.equal(toggle(doc).hidden, true);
    assert.deepEqual(sent, []);
  } finally { f.close(); }
});

function v2exServer(window: Window, sent: Sent[]) {
  desktop(window);
  window.fetch = (async (url: unknown, init: RequestInit = {}) => {
    const target = new URL(String(url), V2EX), path = target.pathname + target.search;
    sent.push({ method: init.method || 'GET', path, body: String(init.body ?? ''), headers: Object.fromEntries([...new window.Headers(init.headers as HeadersInit).entries()].map(([name, value]) => [name.toLowerCase(), value])) });
    const html = (body: string) => new window.Response(`<html><body>${body}</body></html>`, { headers: { 'Content-Type': 'text/html' } });
    if (path === '/' || path === '/?tab=tech' || path === '/recent') return html(tabPage);
    if (target.pathname === '/t/1252735') return html(topicPage);
    if (path === '/notifications') return html(notificationsPage);
    if (path === '/mission/daily') return html(missionPage(false));
    if (path === '/mission/daily/redeem?once=24680') return html(`<div class="message">已成功领取每日登录奖励</div>${missionPage(true)}`);
    if (target.pathname.startsWith('/thank/')) return new window.Response(JSON.stringify({ success: true, once: '67890' }), { headers: { 'Content-Type': 'application/json' } });
    return new window.Response('', { status: 404 });
  }) as typeof window.fetch;
}

test('on V2EX the layout reads tab, topic and notification pages, and replies and thanks with the form token', async () => {
  const sent: Sent[] = [];
  const storage = new Map<string, unknown>([['nspp:settings:www.v2ex.com', { 'request-settings': { enabled: true, requestInterval: 0 }, attendance: { enabled: true, automatic: false } }]]);
  const f = await fixture({}, tabPage, '/?tab=tech', storage, window => v2exServer(window, sent), false, V2EX);
  try {
    const { window } = f, doc = window.document as unknown as Document;
    toggle(doc).click();
    assert.equal(doc.documentElement.dataset.nsppWecomSite, 'v2ex');
    assert.deepEqual([...doc.querySelectorAll('.nspp-wecom-rail-top .nspp-wecom-rail-item')].map(i => i.getAttribute('aria-label')), ['通知', '帖子', '节点', '热榜']);
    assert.equal(doc.querySelector('.nspp-wecom-rail .nspp-wecom-badge')!.textContent, '2');
    await waitFor(() => doc.querySelectorAll('.nspp-wecom-feed li').length === 2);
    assert.equal(sent[0].path, '/?tab=tech');
    // V2EX lists have one order only.
    assert.equal(doc.querySelector<HTMLElement>('.nspp-wecom-sort')!.hidden, true);
    assert.equal(doc.querySelector<HTMLElement>('.nspp-wecom-feed .nspp-wecom-more')!.hidden, false);

    click(window, doc.querySelector('.nspp-wecom-feed li button')!);
    await waitFor(() => doc.querySelectorAll('.nspp-wecom-msg').length === 4);
    assert.equal(doc.querySelector('.nspp-wecom-chat-count')!.textContent, '(41)');
    assert.match(doc.querySelector('.nspp-wecom-msg[data-op] .nspp-wecom-bubble')!.textContent!, /正文第一段.*第 1 条附言/s);
    // Replies are plain text: no Markdown toolbar.
    assert.equal(doc.querySelector('.nspp-wecom-composer-tools button'), null);

    // 感谢 costs copper coins, so the menu asks first with V2EX's wording.
    const menu = doc.querySelector<HTMLElement>('.nspp-wecom-context')!;
    rightClick(window, doc.querySelector('.nspp-wecom-msg[data-floor="2"] .nspp-wecom-bubble')!);
    const items = () => [...menu.querySelectorAll<HTMLButtonElement>(':scope > button')];
    assert.deepEqual(items().map(b => b.firstChild!.textContent), ['感谢', '引用', '回复', '复制', '在原帖中查看']);
    items()[0].click();
    assert.equal(menu.querySelector('p')!.textContent, '确认花费 10 个铜币向 @klgd 的这条回复发送感谢？');
    assert.equal(sent.some(entry => entry.path.startsWith('/thank/')), false);
    [...menu.querySelectorAll('button')].find(b => b.textContent === '确定')!.click();
    await waitFor(() => !!doc.querySelector('.nspp-wecom-msg[data-floor="2"] .nspp-wecom-reaction[data-on]'));
    assert.ok(sent.some(entry => entry.method === 'POST' && entry.path === '/thank/reply/18232842?once=12345'));

    rightClick(window, doc.querySelector('.nspp-wecom-msg[data-floor="2"] .nspp-wecom-bubble')!);
    assert.equal(items()[0].firstChild!.textContent, '已感谢');
    items().find(b => b.firstChild!.textContent === '回复')!.click();
    const input = doc.querySelector<HTMLTextAreaElement>('.nspp-wecom-composer textarea')!;
    assert.equal(input.value, '@klgd #2 ');
    input.value += '收到'; input.dispatchEvent(new window.Event('input'));
    doc.querySelector<HTMLButtonElement>('.nspp-wecom-send')!.click();
    await waitFor(() => doc.querySelector('.nspp-wecom-send-status')!.textContent === '已发送');
    const posted = sent.find(entry => entry.method === 'POST' && entry.path === '/t/1252735')!;
    // The thank answer brought a fresh token, which the reply uses.
    assert.deepEqual(Object.fromEntries(new URLSearchParams(posted.body)), { content: '@klgd #2 收到', once: '67890' });

    doc.querySelector<HTMLButtonElement>('.nspp-wecom-rail-item[aria-label="通知"]')!.click();
    await waitFor(() => doc.querySelectorAll('.nspp-wecom-notices li').length === 2);
    assert.equal(doc.querySelector('.nspp-wecom-rail .nspp-wecom-badge')!.hidden, true);
    doc.querySelector<HTMLButtonElement>('.nspp-wecom-rail-item[aria-label="热榜"]')!.click();
    assert.deepEqual([...doc.querySelectorAll('.nspp-wecom-ranking [role="tab"]')].map(t => t.textContent), ['最热', '今日热议']);
    doc.querySelector<HTMLButtonElement>('.nspp-wecom-ranking [role="tab"]:last-child')!.click();
    await waitFor(() => doc.querySelector('.nspp-wecom-ranking li strong')?.textContent === '1热议话题');
  } finally { f.close(); }
});

test('V2EX 签到 redeems the daily login reward once a day, and only for a signed-in user', async () => {
  const sent: Sent[] = [];
  const storage = new Map<string, unknown>([['nspp:settings:www.v2ex.com', { 'request-settings': { enabled: true, requestInterval: 0 } }]]);
  const f = await fixture({}, tabPage, '/', storage, window => v2exServer(window, sent), false, V2EX);
  try {
    const doc = f.window.document as unknown as Document;
    assert.ok(f.menuLabels.includes('签到'));
    await waitFor(() => (f.storage.get('nspp:state:www.v2ex.com:attendance') as Record<string, string> | undefined)?.['day:tester'] != null);
    assert.deepEqual(sent.map(entry => entry.path), ['/mission/daily', '/mission/daily/redeem?once=24680']);
    assert.equal(doc.querySelector<HTMLElement>('[data-nspp-attendance]')!.hidden, true);
  } finally { f.close(); }
  // Same day, another page: nothing is requested again.
  const again: Sent[] = [];
  const second = await fixture({}, tabPage, '/', storage, window => v2exServer(window, again), false, V2EX);
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.deepEqual(again, []);
  } finally { second.close(); }
  // Visitors get no 签到 at all.
  const visitor: Sent[] = [];
  const guest = await fixture({}, tabPage.replace(rightbar, '<div id="Rightbar"><a href="/signin">登录</a></div>'), '/', new Map(), window => v2exServer(window, visitor), false, V2EX);
  try {
    await new Promise(resolve => setTimeout(resolve, 30));
    // Compare plain values, never DOM nodes: a failing assert on a node makes Node format the whole tree for minutes.
    assert.equal(guest.window.document.querySelector('[data-nspp-attendance]') === null, true, 'no 签到 button for visitors');
    // As on linux.do, the rail keeps its 通知 item but hides it for visitors.
    assert.equal(guest.window.document.querySelector<HTMLElement>('.nspp-wecom-rail-item[aria-label="通知"]')?.hidden, true);
    assert.deepEqual(visitor, []);
  } finally { guest.close(); }
});
