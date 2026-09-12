// ==UserScript==
// @name         NodeSeek X
// @namespace    http://www.nodeseek.com/
// @version      1.1.5
// @description  增强 NodeSeek/DeepFlood 论坛体验：支持自动签到、下拉加载、快捷评论、图床上传、内容过滤、链接净化、消息提醒、浏览历史等功能，并提供可视化设置面板。
// @author       dabao
// @match        *://www.nodeseek.com/*
// @match        *://www.deepflood.com/*
// @require      https://s4.zstatic.net/ajax/libs/layui/2.10.3/layui.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getResourceURL
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      api.nodeimage.com
// @connect      *
// @run-at       document-idle
// @license      GPL-3.0
// @supportURL   https://www.nodeseek.com/post-36263-1
// @homepageURL  https://www.nodeseek.com/post-36263-1
// @downloadURL https://update.greasyfork.org/scripts/479426/NodeSeek%20X.user.js
// @updateURL https://update.greasyfork.org/scripts/479426/NodeSeek%20X.meta.js
// ==/UserScript==

(function () {
    'use strict';

    // NSX Core - 核心
    // 环境 + DOM + 网络 + 存储 + 模块管理

    const SITES = [
        { host: "www.nodeseek.com", code: "ns", name: "NodeSeek" },
        { host: "www.deepflood.com", code: "df", name: "DeepFlood" }
    ];

    const info = GM_info?.script || {};
    const site = SITES.find(s => s.host === location.host);
    let debug = false;
    try { debug = GM_getValue("settings", {})?.debug?.enabled; } catch { }

    // ===== 环境 =====
    const env = {
        info, site, BASE_URL: location.origin,
        log: (...a) => debug && console.log(`[NSX]`, ...a),
        warn: (...a) => debug && console.warn(`[NSX]`, ...a),
        error: (...a) => console.error(`[NSX]`, ...a)
    };

    // ===== DOM =====
    const $ = (s, r = document) => r?.querySelector(s);
    const $$ = (s, r = document) => [...(r?.querySelectorAll(s) || [])];

    function addStyle(id, val) {
        if (document.getElementById(id)) return;
        const isUrl = /^(https?:|blob:|data:)/.test(val) || /^\/\//.test(val);
        const el = document.createElement(isUrl ? "link" : "style");
        el.id = id;
        isUrl ? (el.rel = "stylesheet", el.href = val) : (el.textContent = val);
        document.head?.appendChild(el);
    }

    function addScript(id, val, onload) {
        if (document.getElementById(id)) return null;
        const el = document.createElement("script");
        el.id = id;
        if (/^(https?:)?\/\//.test(val)) { el.src = val; if (onload) el.onload = onload; }
        else el.textContent = val;
        document.body?.appendChild(el);
        return el;
    }

    const debounce = (fn, ms) => {
        let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
        d.cancel = () => clearTimeout(t); return d;
    };

    const throttle = (fn, ms) => {
        let last = 0;
        return (...a) => { const now = Date.now(); if (now - last >= ms) { last = now; fn(...a); } };
    };

    // ===== 存储 =====
    const cfgFragments = new Map(), metaFragments = new Map();
    let cfgCache = null;

    const isObj = v => v && typeof v === "object" && !Array.isArray(v);
    const merge = (t, s) => { for (const k in s) isObj(s[k]) ? (isObj(t[k]) || (t[k] = {}), merge(t[k], s[k])) : t[k] === undefined && (t[k] = s[k]); };
    const getPath = (o, p) => p.split(".").reduce((a, k) => a?.[k], o);
    const setPath = (o, p, v) => { const ks = p.split("."), l = ks.pop(); ks.reduce((a, k) => a[k] ??= {}, o)[l] = v; };

    const store = {
        reg(id, cfg, meta) { cfg && cfgFragments.set(id, cfg); meta && metaFragments.set(id, meta); },
        getDefaults() { const d = { version: info.version, debug: { enabled: false } }; cfgFragments.forEach(f => merge(d, f)); return d; },
        getMeta() { const m = {}; metaFragments.forEach(f => merge(m, f)); return m; },
        init() {
            if (cfgCache) return cfgCache;
            const def = this.getDefaults();
            cfgCache = GM_getValue("settings", null) || {};
            merge(cfgCache, def);
            cfgCache.version = def.version;
            GM_setValue("settings", cfgCache);
            return cfgCache;
        },
        get(p, fb) { const v = getPath(this.init(), p); return v === undefined ? fb : v; },
        set(p, v) { setPath(this.init(), p, v); GM_setValue("settings", cfgCache); }
    };

    // ===== 网络 =====
    const net = {
        async fetch(url, { method = "GET", data, headers = {}, type = "json" } = {}) {
            const r = await fetch(url.startsWith("http") ? url : env.BASE_URL + url, {
                method, credentials: "include",
                headers: { ...(data ? { "Content-Type": "application/json" } : {}), ...headers },
                body: data ? JSON.stringify(data) : undefined
            });
            return r[type]().catch(() => null);
        },
        get: (u, h, t) => net.fetch(u, { headers: h, type: t }),
        post: (u, d, h, t) => net.fetch(u, { method: "POST", data: d, headers: h, type: t })
    };

    // ===== 模块管理 =====
    const modules = new Map();

    function define(cfg) {
        if (!cfg?.id) throw new Error("id required");
        cfg.deps ??= [];
        cfg.order ??= 100;
        modules.set(cfg.id, cfg);
        cfg.cfg && store.reg(cfg.id, cfg.cfg, cfg.meta);
        return cfg;
    }

    function boot(ctx) {
        store.init();
        // 拓扑排序
        const list = [...modules.values()];
        const indeg = new Map(list.map(m => [m.id, 0]));
        const edges = new Map(list.map(m => [m.id, []]));
        list.forEach(m => m.deps.forEach(d => { if (modules.has(d)) { edges.get(d).push(m.id); indeg.set(m.id, indeg.get(m.id) + 1); } }));
        const q = list.filter(m => indeg.get(m.id) === 0).sort((a, b) => a.order - b.order);
        const sorted = [];
        while (q.length) {
            const cur = q.shift(); sorted.push(cur);
            edges.get(cur.id).forEach(n => { indeg.set(n, indeg.get(n) - 1); if (!indeg.get(n)) q.push(modules.get(n)); });
            q.sort((a, b) => a.order - b.order);
        }
        // 初始化与注册监听
        sorted.forEach(m => {
            try {
                if (m.match?.(ctx) !== false) {
                    m.init?.(ctx);
                    if (ctx.watch && m.watch) {
                        const w = typeof m.watch === "function" ? m.watch(ctx) : m.watch;
                        [].concat(w || []).filter(Boolean).forEach(i => ctx.watch(i.sel, i.fn, i.opts));
                    }
                }
            } catch (e) {
                env.error(m.id, e);
            }
        });
    }

    // 下拉加载翻页

    const PROFILES = {
        list: { path: /^\/(categories\/|page|award|search|$)/, threshold: 1500, next: ".nsk-pager a.pager-next", list: "ul.post-list:not(.topic-carousel-panel)", pagerTop: "div.nsk-pager.pager-top", pagerBot: "div.nsk-pager.pager-bottom" },
        post: { path: /^\/post-/, threshold: 690, next: ".nsk-pager a.pager-next", list: "ul.comments", pagerTop: "div.nsk-pager.post-top-pager", pagerBot: "div.nsk-pager.post-bottom-pager" }
    };

    const autoLoading = {
        id: "autoLoading",
        order: 100,
        cfg: { loading_post: { enabled: true }, loading_comment: { enabled: true } },
        meta: { loading_post: { label: "加载帖子", group: "内容设置" }, loading_comment: { label: "加载评论", group: "内容设置" } },
        match: ctx => ctx.store.get("loading_post.enabled", true) || ctx.store.get("loading_comment.enabled", true),
        init(ctx) {
            const profile = (ctx.isList && ctx.store.get("loading_post.enabled", true)) ? PROFILES.list : 
                            (ctx.isPost && ctx.store.get("loading_comment.enabled", true)) ? PROFILES.post : null;
            if (!profile) return;

            let busy = false, prevY = scrollY;

            const blockByLevel = (doc) => {
                const lv = ctx.user?.rank || 0;
                doc.querySelectorAll('.post-list-item use[href="#lock"]').forEach(el => {
                    const n = +(el.closest("span")?.textContent?.match(/\d+/)?.[0] || 0);
                    if (n > lv) el.closest(".post-list-item")?.classList.add("blocked-post");
                });
            };

            const _showCard = (anchor, uid) => {
                const hc = unsafeWindow.hoverCard;
                if (!hc) return;
                if (!hc.$el || !document.body.contains(hc.$el)) {
                    hc.setIsHoverCard(true);
                    hc.$mount(document.body.appendChild(document.createElement("div")));
                }
                const { left, top } = anchor.getBoundingClientRect();
                Object.assign(hc, { left, top });
                hc.loadUser(uid);
                hc.show();
            };

            const bindPostList = (doc) => {
                doc.querySelectorAll(".post-list .avatar-normal").forEach(n => {
                    const uid = +n.dataset.uid;
                    if (!isNaN(uid)) n.addEventListener("click", e => { e.preventDefault(); _showCard(n, uid); });
                });
            };

            const bindCommentList = (doc, cfg) => {
                if (!cfg?.postData?.comments) return;
                doc.querySelectorAll(".content-item").forEach((item, i) => {
                    const uid = cfg.postData.comments[i]?.poster?.uid;
                    const avatar = item.querySelector(".avatar-normal");
                    if (uid && avatar) avatar.addEventListener("click", e => { e.preventDefault(); _showCard(avatar, uid); });
                });
            };

            const syncCommentData = (doc) => {
                const json = doc.getElementById("temp-script")?.textContent;
                if (!json) return null;
                try {
                    const cfg = JSON.parse(decodeURIComponent(atob(json).split("").map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")));
                    if (cfg?.postData?.comments) ctx.uw.__config__.postData.comments.push(...cfg.postData.comments);
                    return cfg;
                } catch {
                    return null;
                }
            };

            const mountCommentVueComponents = () => {
                const vue = $(".comment-menu")?.__vue__;
                if (!vue) return;
                $$(".content-item").forEach((item, index) => {
                    const mp = $(".comment-menu-mount", item);
                    if (mp) {
                        const inst = new vue.$root.constructor(vue.$options);
                        inst.setIndex(index);
                        inst.$mount(mp);
                    }
                });
            };

            const load = async () => {
                if (busy) return;
                const atBottom = document.documentElement.scrollHeight <= innerHeight + scrollY + profile.threshold;
                if (!atBottom) return;
                const nextUrl = ctx.$(profile.next)?.href;
                if (!nextUrl) return;

                busy = true;
                try {
                    const html = await net.get(nextUrl, {}, "text");
                    const doc = new DOMParser().parseFromString(html, "text/html");

                    if (ctx.isList) {
                        blockByLevel(doc);
                        bindPostList(doc);
                    } else if (ctx.isPost) {
                        const cfg = syncCommentData(doc);
                        bindCommentList(doc, cfg);
                    }

                    const src = doc.querySelector(profile.list), dst = document.querySelector(profile.list);
                    if (src && dst) dst.append(...src.children);

                    if (ctx.isPost) {
                        mountCommentVueComponents();
                    }

                    [profile.pagerTop, profile.pagerBot].forEach(sel => {
                        const s = doc.querySelector(sel), d = document.querySelector(sel);
                        if (s && d) d.innerHTML = s.innerHTML;
                    });

                    history.pushState(null, null, nextUrl);
                } catch (e) { ctx.env.error("autoLoading", e); }
                busy = false;
            };

            const deb = debounce(load, 300);
            addEventListener("scroll", throttle(() => { if (scrollY > prevY) deb(); prevY = scrollY; }, 200), { passive: true });
        }
    };

    const __vite_glob_0_0 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: autoLoading
    }, Symbol.toStringTag, { value: 'Module' }));

    // 屏蔽用户

    const blockMembers = {
        id: "blockMembers",
        order: 240,
        cfg: { block_members: { enabled: true } },
        meta: { block_members: { label: "屏蔽用户", group: "过滤设置" } },
        match: ctx => ctx.loggedIn && ctx.store.get("block_members.enabled", true),
        init(ctx) {
            addStyle("nsx-block", ".usercard-button-group .btn{padding:0 .8rem}");
            const block = name => net.post("/api/block-list/add", { block_member_name: name })
                .then(r => ctx.ui.alert?.("提示", r?.success ? `屏蔽【${name}】成功` : `屏蔽失败：${r?.message || ""}`));

            document.querySelectorAll(".post-list .post-list-item,.content-item").forEach(item => {
                const avatar = item.querySelector(".avatar-normal");
                if (!avatar) return;
                avatar.addEventListener("click", () => {
                    let tries = 0;
                    const check = setInterval(() => {
                        if (++tries > 60) { clearInterval(check); return; } // 3 秒超时 (50ms × 60)
                        const card = document.querySelector("div.user-card.hover-user-card");
                        const pm = card?.querySelector("a.btn");
                        if (!card || !pm) return;
                        clearInterval(check);
                        const name = card.querySelector("a.Username")?.textContent;
                        if (!name || card.querySelector(".nsx-block-btn")) return;

                        const btn = pm.cloneNode(false);
                        btn.className = "btn nsx-block-btn";
                        btn.textContent = "屏蔽";
                        btn.style.cssText = "float:left;background-color:rgba(0,0,0,.3)!important";
                        btn.onclick = e => { e.preventDefault(); ctx.ui.confirm?.(`屏蔽"${name}"？`, "可在设置=>屏蔽用户解除", () => block(name)); };
                        pm.after(btn);
                    }, 50);
                });
            });
        }
    };

    const __vite_glob_0_1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: blockMembers
    }, Symbol.toStringTag, { value: 'Module' }));

    // 屏蔽帖子（关键词）

    const mark$2 = new WeakSet();
    const run$1 = (els, ctx) => {
        const kws = (ctx.store.get("block_posts.keywords", []) || []).map(k => String(k).trim().toLowerCase()).filter(Boolean);
        els.forEach(item => {
            if (mark$2.has(item)) return;
            mark$2.add(item);
            const title = item.querySelector(".post-title>a")?.textContent?.toLowerCase() || "";
            if (kws.some(k => title.includes(k))) item.classList.add("blocked-post");
        });
    };

    const blockPosts = {
        id: "blockPosts",
        order: 220,
        cfg: { block_posts: { enabled: true, keywords: [] } },
        meta: { block_posts: { label: "屏蔽帖子", group: "过滤设置", fields: { keywords: { type: "TEXTAREA", label: "关键词", placeholder: "每行一个", valueType: "array" } } } },
        match: ctx => ctx.isList && ctx.store.get("block_posts.enabled", true),
        init(ctx) { run$1($$(".post-list-item"), ctx); },
        watch: ctx => ({ sel: ".post-list-item", fn: els => run$1(els, ctx), opts: { debounce: 80 } })
    };

    const __vite_glob_0_2 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: blockPosts
    }, Symbol.toStringTag, { value: 'Module' }));

    // 屏蔽低等级可见帖子

    const mark$1 = new WeakSet();
    const run = (els, ctx) => {
        const lv = ctx.user?.rank || 0;
        els.forEach(el => {
            const item = el.closest(".post-list-item");
            if (!item || mark$1.has(item)) return;
            mark$1.add(item);
            const n = +(el.closest("span")?.textContent?.match(/\d+/)?.[0] || 0);
            if (n > lv) item.classList.add("blocked-post");
        });
    };

    const blockViewLevel = {
        id: "blockViewLevel",
        order: 222,
        cfg: { block_view_level: { enabled: true } },
        meta: { block_view_level: { label: "隐藏高权限帖", group: "过滤设置" } },
        match: ctx => ctx.isList && ctx.store.get("block_view_level.enabled", true),
        init(ctx) { run($$('.post-list-item use[href="#lock"]'), ctx); },
        watch: ctx => ({ sel: '.post-list-item use[href="#lock"]', fn: els => run(els, ctx), opts: { debounce: 80 } })
    };

    const __vite_glob_0_3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: blockViewLevel
    }, Symbol.toStringTag, { value: 'Module' }));

    // 代码高亮

    const codeHighlight = {
        id: "codeHighlight",
        order: 140,
        cfg: { code_highlight: { enabled: true } },
        meta: { code_highlight: { label: "代码高亮", group: "内容设置" } },
        match: ctx => ctx.store.get("code_highlight.enabled", true),
        init(ctx) {
            // 挂载 highlight.js
            addScript("nsx-hljs-script", "https://s4.zstatic.net/ajax/libs/highlight.js/11.9.0/highlight.min.js");
            addScript("nsx-hljs-onload", `(()=>{const r=()=>{if(window.hljs){document.querySelectorAll('.post-content pre code').forEach(el=>{if(el.classList.contains('language-mermaid'))return;const s=el.querySelector('span');if(s&&Array.from(s.classList).some(c=>c.startsWith('hljs-')))return;try{window.hljs.highlightElement(el)}catch(e){}})}};document.readyState==="complete"?r():window.addEventListener("load",r,{once:true})})()`);

            // 挂载 mermaid.js
            addScript("nsx-mermaid-script", "https://s4.zstatic.net/ajax/libs/mermaid/11.15.0/mermaid.min.js");
            addScript("nsx-mermaid-onload", `(()=>{const r=()=>{if(window.mermaid){mermaid.initialize({startOnLoad:false,theme:'default'});const nodes=document.querySelectorAll('.language-mermaid');if(nodes.length)mermaid.run({nodes})}};document.readyState==="complete"?r():window.addEventListener("load",r,{once:true})})()`);
        },
        watch: ctx => ({
            sel: ".post-content pre code",
            fn: els => {
                const mermaidEls = [];
                els.forEach(el => {
                    console.log('hihg-watch');
                    if (el.classList.contains("language-mermaid")) {
                        mermaidEls.push(el);
                    } else {
                        // 判断第1个 span 元素是否存在 hljs- 开头的 class
                        const firstSpan = el.querySelector("span");
                        const isHighlighted = firstSpan && Array.from(firstSpan.classList).some(c => c.startsWith("hljs-"));
                        if (!isHighlighted) {
                            ctx.uw.hljs?.highlightElement(el);
                        }
                    }
                });
                if (mermaidEls.length > 0 && ctx.uw.mermaid) {
                    try {
                        ctx.uw.mermaid.run({ nodes: mermaidEls });
                    } catch (e) {
                        console.error("Mermaid run error:", e);
                    }
                }
            },
            opts: { debounce: 80 }
        })
    };

    const __vite_glob_0_4 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: codeHighlight
    }, Symbol.toStringTag, { value: 'Module' }));

    // 回帖足迹模块 (NodeSeek & DeepFlood)

    const DB = 'nsx-comments-db';
    const ST = 'nsx-comments-store';
    const K = { I: "nsx_init", P: "nsx_page", T: "nsx_time", C: "nsx_count" };

    const REPLIED_BADGE_CSS = `
.replied-badge {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 8px;
    font-size: 12px;
    color: #fff;
    background: #10b981;
    border-radius: 4px;
    text-decoration: none;
    transition: background 0.2s ease, transform 0.1s ease;
}
.replied-badge:hover {
    background: #059669;
    color: #fff !important;
    transform: translateY(-1px);
}
`;

    // 数据库单例连接与操作
    let dbInstance = null;
    let dbInitPromise = null;

    const getDB = () => {
        if (dbInstance) return Promise.resolve(dbInstance);
        if (dbInitPromise) return dbInitPromise;

        dbInitPromise = new Promise((resolve, reject) => {
            const r = indexedDB.open(DB, 1);

            r.onerror = () => {
                dbInitPromise = null;
                reject(r.error || new Error('DB Open Failed'));
            };

            r.onupgradeneeded = e => {
                const db = e.target.result;
                if (db.objectStoreNames.contains(ST)) db.deleteObjectStore(ST);
                const s = db.createObjectStore(ST, { keyPath: ['uid', 'post_id', 'floor_id'] });
                s.createIndex('upid', ['uid', 'post_id']);
            };

            r.onsuccess = e => {
                dbInstance = e.target.result;

                dbInstance.onclose = () => {
                    dbInstance = null;
                    dbInitPromise = null;
                };
                dbInstance.onversionchange = () => {
                    dbInstance.close();
                    dbInstance = null;
                    dbInitPromise = null;
                };

                resolve(dbInstance);
            };
        });

        return dbInitPromise;
    };

    const dbAct = async (mode, fn) => {
        const db = await getDB();
        return new Promise((res, rej) => {
            const tx = db.transaction([ST], mode);
            tx.onerror = () => rej(tx.error || new Error('Transaction Error'));
            tx.onabort = () => rej(tx.error || new Error('Transaction Aborted'));

            try {
                fn(tx.objectStore(ST), res, rej);
            } catch (e) {
                rej(e);
            }
        });
    };

    // 列表帖子标记具体实现
    const markElement = async (ctx, el, uid) => {
        const linkEl = el.querySelector('.post-title a');
        if (!linkEl) return;
        const match = linkEl.href.match(/-(\d+)-/);
        if (!match) return;
        const pid = parseInt(match[1]);

        try {
            const max = await dbAct('readonly', (s, r) => {
                const range = IDBKeyRange.bound([uid, pid, 0], [uid, pid, Infinity]);
                s.openCursor(range, 'prev').onsuccess = e => r(e.target.result?.value.floor_id || 0);
            });

            if (max > 0 && !el.querySelector('.replied-badge')) {
                const b = document.createElement('a');
                const commentPerPage = ctx.uw?.__config__?.commentPerPage || 10;
                const targetPage = Math.ceil(max / commentPerPage);
                Object.assign(b, {
                    className: 'replied-badge',
                    target: '_blank',
                    textContent: `已回复 #${max}`,
                    href: `/post-${pid}-${targetPage}#${max}`
                });
                el.querySelector('.post-title').append(b);
            }
        } catch (e) {
            ctx.env.warn('[Mark Error]', pid, e);
        }
    };

    const commentFootprint = {
        id: "commentFootprint",
        order: 360,
        cfg: {
            comment_footprint: {
                enabled: false,
                reset_db: "",
                show_stats: ""
            }
        },
        meta: {
            comment_footprint: {
                label: "回帖足迹",
                group: "实验性",
                fields: {
                    reset_db: {
                        type: "BUTTON",
                        label: "重置数据",
                        buttonText: "重置足迹",
                        action: "comment_footprint:reset",
                        desc: "清空本地数据库中的回帖历史并重新同步。"
                    },
                    show_stats: {
                        type: "BUTTON",
                        label: "数据统计",
                        buttonText: "查看统计",
                        action: "comment_footprint:stats",
                        desc: "查看当前账号的回帖同步状态与记录总数。"
                    }
                }
            }
        },
        match: ctx => ctx.loggedIn && ctx.store.get("comment_footprint.enabled", false),
        init(ctx) {
            const uid = ctx.uid;
            const uName = ctx.user?.member_name;
            const SID = location.host.replace(/\W/g, '');

            addStyle("nsx-replied-badge", REPLIED_BADGE_CSS);

            // 存储与抓取配置
            const getProgress = (k, def) => (GM_getValue(SID, {})[uid]?.[k] ?? def);
            const setProgress = (k, v) => {
                const d = GM_getValue(SID, {});
                if (!d[uid]) d[uid] = {};
                d[uid][k] = v;
                GM_setValue(SID, d);
            };
            const sleep = ms => new Promise(r => setTimeout(r, ms));

            // 核心同步逻辑
            const sync = async (mode) => {
                const isInit = mode === 'init';
                let p = isInit ? getProgress(K.P, 1) : 1;
                let n = 0;
                let stop = 0;
                const max = Math.ceil((ctx.user?.nComment || 0) / 15) || 999;
                ctx.env.log(`[${SID}#${uName}] ${mode} start p:${p}`);

                while (!stop && (isInit ? p <= max : true)) {
                    const subEl = document.querySelector('.msc-sub');
                    if (subEl) {
                        subEl.textContent = `正在同步: 第 ${p} / ${isInit ? max : '?'} 页`;
                    }

                    const res = await ctx.net.get(`/api/content/list-comments?uid=${uid}&page=${p}`);
                    if (!res || !res.success || !res.comments?.length) break;

                    for (const c of res.comments) {
                        if (!c.floor_id) continue;
                        const exist = await dbAct('readonly', (s, r) => s.get([uid, c.post_id, c.floor_id]).onsuccess = e => r(!!e.target.result));
                        if (!isInit && exist) {
                            stop = 1;
                        } else {
                            await dbAct('readwrite', (s, r) => s.put({ uid, post_id: c.post_id, floor_id: c.floor_id }).onsuccess = () => r(n++));
                        }
                    }
                    if (isInit) setProgress(K.P, p);
                    p++;
                    await sleep(1000);
                }

                const total = await dbAct('readonly', (s, r) => s.index('upid').count(IDBKeyRange.bound([uid, 0], [uid, Infinity])).onsuccess = e => r(e.target.result));
                setProgress(K.C, total);
                setProgress(K.T, Date.now());
                if (isInit) {
                    setProgress(K.I, true);
                    setProgress(K.P, 1);
                }
                return n;
            };

            const markAll = () => {
                if (!ctx.isList) return;
                ctx.$$('.post-list-item').forEach(el => {
                    if (!el.classList.contains('nsx-replied-checked')) {
                        el.classList.add('nsx-replied-checked');
                        markElement(ctx, el, uid);
                    }
                });
            };

            // 启动主同步流（加排他锁）
            const startSync = () => {
                navigator.locks.request(`nsx_sync_${uid}`, { ifAvailable: true }, async lock => {
                    markAll();
                    if (!lock) return;

                    try {
                        if (!getProgress(K.I)) {
                            const last = getProgress(K.P, 1);
                            const title = last > 1 ? '断点续传' : '初始化回复数据';
                            const msg = last > 1
                                ? `检测到账号 [${uName}] 上次同步中断，进度第 ${last} 页。\n是否继续？`
                                : `检测到账号 [${uName}] 尚未同步记录。\n是否开始抓取？`;

                            ctx.ui.confirm(title, msg, async () => {
                                ctx.ui.alert('正在同步', `账号: ${uName}\n请保持页面开启...`);
                                try {
                                    const n = await sync('init');
                                    const confirmEl = document.querySelector('.msc-confirm');
                                    if (confirmEl) confirmEl.remove();
                                    ctx.ui.success(`同步完成: 新增 ${n} 条记录`);
                                    markAll();
                                } catch (e) {
                                    const confirmEl = document.querySelector('.msc-confirm');
                                    if (confirmEl) confirmEl.remove();
                                    ctx.ui.error(`同步失败: ${e.message}`);
                                }
                            });
                        } else {
                            const n = await sync('inc');
                            if (n > 0) markAll();
                        }
                    } catch (e) {
                        ctx.env.error('[NSX Critical Error]', e);
                    }
                });
            };

            // 事件动作响应
            const handleActions = async (e) => {
                if (e.detail === 'comment_footprint:reset') {
                    if (!ctx.ui.layer) return;
                    ctx.ui.layer.confirm('仅清空当前账号的缓存记录，不影响其他账号。', { title: '确认重置？', icon: 3 }, async (index) => {
                        ctx.ui.layer.close(index);
                        try {
                            await dbAct('readwrite', (s, r) => {
                                const req = s.index('upid').openCursor(IDBKeyRange.bound([uid, 0], [uid, Infinity]));
                                req.onsuccess = event => {
                                    const cursor = event.target.result;
                                    if (cursor) {
                                        cursor.delete();
                                        cursor.continue();
                                    } else {
                                        r();
                                    }
                                };
                            });
                            const d = GM_getValue(SID, {});
                            delete d[uid];
                            GM_setValue(SID, d);
                            ctx.ui.success("重置成功，页面即将刷新...");
                            setTimeout(() => location.reload(), 1000);
                        } catch (err) {
                            ctx.ui.error(`重置失败: ${err.message}`);
                        }
                    });
                } else if (e.detail === 'comment_footprint:stats') {
                    if (!ctx.ui.layer) return;
                    const timeStr = getProgress(K.T) ? new Date(getProgress(K.T)).toLocaleString() : '无';
                    ctx.ui.layer.alert(`用户: ${uName}<br>状态: ${getProgress(K.I) ? '✅ 完成' : '⏳ 进行中'}<br>更新: ${timeStr}<br>记录: ${getProgress(K.C, 0)} 条`, { title: '数据统计', icon: 1 });
                }
            };

            document.addEventListener('nsx-action', handleActions);
            startSync();
        },
        watch: ctx => ({
            sel: '.post-list-item:not(.nsx-replied-checked)',
            fn: els => {
                els.forEach(el => {
                    el.classList.add('nsx-replied-checked');
                    markElement(ctx, el, ctx.uid);
                });
            }
        })
    };

    const __vite_glob_0_5 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: commentFootprint
    }, Symbol.toStringTag, { value: 'Module' }));

    // 暗色模式样式切换
    const darkMode = {
        id: "darkMode",
        order: 180,
        init(ctx) {
            const body = document.body;
            if (!body) return;

            const apply = () => {
                const dark = body.classList.contains("dark-layout");
                // 为 html 添加/移除 .dark 类以触发 layui 深色主题
                document.documentElement.classList.toggle("dark", dark);
            };
            apply();
            new MutationObserver(() => apply()).observe(body, { attributes: true, attributeFilter: ["class"] });
        }
    };

    const __vite_glob_0_6 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: darkMode
    }, Symbol.toStringTag, { value: 'Module' }));

    // 编辑器增强 (Callout / Tabs / Details / 快捷键)

    const CSS$5 = `.nsx-ee-btn{position:relative;display:inline-flex;align-items:center}.nsx-ee-btn>span.i-icon{padding:0;border:none;background:0 0;cursor:pointer;display:flex;color:currentColor}.nsx-ee-btn>span.i-icon:hover{opacity:.7}.nsx-ee-drop{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:8px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:1000;min-width:140px;display:none;background:var(--bg-color,#fff);border:1px solid var(--border-color,#eee);overflow:hidden}.nsx-ee-drop.show{display:block}.nsx-ee-item{display:flex;align-items:stretch;font-size:13px;border-bottom:1px solid var(--border-color,#eee);transition:background .15s}.nsx-ee-item:last-child{border-bottom:none}.nsx-ee-main{padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;flex:1}.nsx-ee-item:hover{background:rgba(128,128,128,.1)}.nsx-ee-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}.nsx-ee-actions{display:flex;align-items:stretch;border-left:1px solid var(--border-color,#eee)}.nsx-ee-act{padding:0 10px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:14px;transition:background .15s}.nsx-ee-act:hover{background:rgba(128,128,128,.1)}`;

    const SVG_CALLOUT = `<svg width="16" height="16" viewBox="0 0 48 48" fill="none"><path d="M44 8H4v30h15l5 5 5-5h15V8Z" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 18v10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="33" r="2" fill="currentColor"/></svg>`;
    const SVG_LAYOUT = `<svg width="16" height="16" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 4L4 14v20l20 10 20-10V14L24 4z"/><path d="M4 14l20 10 20-10M24 24v20"/></svg>`;

    const CALLOUT_MENUS = [
        { k: "note", n: "笔记", c: "9,105,218" },
        { k: "tip", n: "提示", c: "26,127,55" },
        { k: "important", n: "重要", c: "130,80,223" },
        { k: "warning", n: "警告", c: "154,103,0" },
        { k: "caution", n: "注意", c: "207,34,46" }
    ];
    const LAYOUT_MENUS = [
        { k: "details", n: "通用折叠" },
        { k: "tabs", n: "Tabs 面板" }
    ];

    const insertText = (editor, action, type, fold = "") => {
        const cm = editor.querySelector(".CodeMirror")?.CodeMirror;
        if (!cm) return;
        const doc = cm.getDoc();
        let cur = doc.getCursor();

        if (action === "callout") {
            const lvl = (doc.getLine(cur.line).match(/^(>\s*)+/)?.[0].match(/>/g) || []).length;
            if (lvl > 0) {
                let last = cur.line;
                for (let i = cur.line + 1; i < doc.lineCount(); i++) { if (doc.getLine(i).match(/^>\s*/)) last = i; else break; }
                cur = { line: last, ch: doc.getLine(last).length };
            }
            const pre = lvl > 0 ? ">".repeat(lvl + 1) + " " : "> ";
            doc.replaceRange((lvl > 0 ? "\n" : "") + `${pre}[!${type}]${fold} \n${pre}`, cur);
            doc.setCursor({ line: cur.line + (lvl > 0 ? 1 : 0) + 1, ch: pre.length });
        } else if (action === "layout") {
            const tpl = type === "details"
                ? `\n::: details 点击展开\n这里是被折叠内容\n:::\n`
                : `\n:::: tabs\n::: tab-item 标签一\n内容一\n:::\n::: tab-item 标签二\n内容二\n:::\n::::\n`;
            const offset = type === "details" ? 2 : 3;
            doc.replaceRange(tpl, cur);
            const targetLine = cur.line + offset;
            doc.setSelection({ line: targetLine, ch: 0 }, { line: targetLine, ch: doc.getLine(targetLine).length });
        }
        cm.focus();
    };

    const bindShortcut = (editor) => {
        const cmEl = editor.querySelector(".CodeMirror");
        const cm = cmEl?.CodeMirror;
        if (!cm || cm.__nsx) return;
        cm.__nsx = true;

        const getBtn = () => editor.querySelector("button.submit.btn.focus-visible") || document.querySelector(".md-editor button.submit.btn.focus-visible");
        const bind = () => {
            const btn = getBtn();
            if (btn && !/Ctrl\+Enter/i.test(btn.textContent)) btn.textContent += "(Ctrl+Enter)";
            if (btn && !cm.__nsxMap) {
                cm.__nsxMap = { "Ctrl-Enter": () => getBtn()?.click() };
                cm.addKeyMap(cm.__nsxMap);
            } else if (!btn && cm.__nsxMap) {
                cm.removeKeyMap(cm.__nsxMap);
                cm.__nsxMap = null;
            }
        };
        bind();
        cmEl.addEventListener("focusin", bind, true);
        cmEl.addEventListener("focusout", bind, true);
    };

    let clickBound = false;
    const createInserters = (ctx) => {
        const editor = $(".md-editor");
        if (!editor) return;

        // 绑定快捷键
        if (ctx.store.get("editorEnhance.shortcut", true)) bindShortcut(editor);

        const bar = editor.querySelector(".mde-toolbar");
        if (!bar) return;

        const vAttr = [...(bar.querySelector(".toolbar-item")?.attributes || [])].find(a => a.name.startsWith("data-v-"))?.name;
        const v = vAttr ? ` ${vAttr}=""` : "";

        // 生成 Callout 按钮
        if (ctx.store.get("editorEnhance.callout", true) && !bar.querySelector("[data-toggle='callout']")) {
            bar.insertAdjacentHTML("beforeend", `<div class="sep"${v}></div><span class="nsx-ee-btn toolbar-item"${v} title="Callout - NodeSeek X" data-toggle="callout"><span class="i-icon"${v}>${SVG_CALLOUT}</span>
            <div class="nsx-ee-drop" style="min-width:200px">
                ${CALLOUT_MENUS.map(t => `<div class="nsx-ee-item"><div class="nsx-ee-main" data-action="callout" data-type="${t.k}"><span class="nsx-ee-dot" style="background:rgb(${t.c})"></span>${t.n}[${t.k}]</div><div class="nsx-ee-actions"><div class="nsx-ee-act" data-action="callout" data-type="${t.k}" data-fold="+">+</div><div class="nsx-ee-act" data-action="callout" data-type="${t.k}" data-fold="-">-</div></div></div>`).join("")}
            </div>
        </span>`);
        }

        // 生成 Tabs/Details 按钮
        if (ctx.store.get("editorEnhance.layout", true) && !bar.querySelector("[data-toggle='layout']")) {
            bar.insertAdjacentHTML("beforeend", `<div class="sep"${v}></div><span class="nsx-ee-btn toolbar-item"${v} title="排版语法 (Tabs / 折叠) - NodeSeek X" data-toggle="layout"><span class="i-icon"${v}>${SVG_LAYOUT}</span>
            <div class="nsx-ee-drop">
                ${LAYOUT_MENUS.map(t => `<div class="nsx-ee-item"><div class="nsx-ee-main" data-action="layout" data-type="${t.k}">${t.n}</div></div>`).join("")}
            </div>
        </span>`);
        }

        // 绑定全局委托点击事件（只绑一次）
        if (!clickBound) {
            document.addEventListener("click", e => {
                const toggle = e.target.closest("[data-toggle]");
                const action = e.target.closest("[data-action]");

                // 点击下拉项，执行插入操作
                if (action) {
                    const act = action.getAttribute("data-action");
                    const type = action.getAttribute("data-type");
                    const fold = action.getAttribute("data-fold") || "";

                    const curEditor = action.closest(".md-editor") || $(".md-editor");
                    if (curEditor) insertText(curEditor, act, type, fold);

                    $$(".nsx-ee-drop").forEach(d => d.classList.remove("show"));
                    return;
                }

                // 点击主按钮，切换下拉面板
                if (toggle) {
                    const targetDrop = toggle.querySelector(".nsx-ee-drop");
                    if (targetDrop) {
                        const isShowing = targetDrop.classList.contains("show");
                        $$(".nsx-ee-drop").forEach(d => d.classList.remove("show"));
                        if (!isShowing) targetDrop.classList.add("show");
                    }
                    return;
                }

                // 点击空白处，关闭全部面板
                $$(".nsx-ee-drop").forEach(d => d.classList.remove("show"));
            });
            clickBound = true;
        }
    };

    const editorEnhance = {
        id: "editorEnhance",
        order: 360,
        cfg: {
            editorEnhance: {
                enabled: true,
                callout: true,
                layout: true,
                shortcut: true
            }
        },
        meta: {
            editorEnhance: {
                label: "编辑器增强",
                group: "内容设置",
                fields: {
                    callout: { type: "SWITCH", label: "Callout" },
                    layout: { type: "SWITCH", label: "Tabs/折叠" },
                    shortcut: { type: "SWITCH", label: "快捷键发帖" }
                }
            }
        },
        match: ctx => (ctx.isPost || /^\/new-discussion/.test(location.pathname)) && ctx.store.get("editorEnhance.enabled", true) && (ctx.store.get("editorEnhance.callout", true) || ctx.store.get("editorEnhance.layout", true) || ctx.store.get("editorEnhance.shortcut", true)),
        init(ctx) {
            addStyle("nsx-ee", CSS$5);
            createInserters(ctx);
            document.addEventListener("click", e => { if (e.target?.closest?.(".md-editor")) requestAnimationFrame(() => createInserters(ctx)); });
        },
        watch: ctx => [{ sel: ".md-editor", fn: () => createInserters(ctx), opts: { debounce: 80 } }]
    };

    const __vite_glob_0_7 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: editorEnhance
    }, Symbol.toStringTag, { value: 'Module' }));

    // 浏览历史

    const CSS$4 = `#nsx-history-panel{position:fixed;right:12px;top:56px;width:min(380px,94vw);height:70vh;background:#fff;border:1px solid #e4e4e4;border-radius:12px;box-shadow:0 16px 32px rgba(0,0,0,.12);z-index:9999;display:none;flex-direction:column;font-size:13px;color:#1f1f1f;box-sizing:border-box;font-family:"Segoe UI","Microsoft YaHei",sans-serif}#nsx-history-panel.show{display:flex}.nsx-history-header{display:flex;align-items:center;justify-content:space-between;padding:12px 12px 6px}.nsx-history-title{font-size:15px;font-weight:600}.nsx-history-action{border:0;background:0;color:#666;cursor:pointer;font-size:12px;padding:4px 8px;border-radius:6px}.nsx-history-action:hover{background:#f2f3f5}.nsx-history-search{display:flex;align-items:center;gap:6px;margin:0 12px 8px;border:1px solid #e1e1e1;border-radius:8px;padding:6px 8px}.nsx-history-search input{border:0;background:0;outline:0;width:100%;font-size:13px}.nsx-history-tabs{display:flex;gap:16px;padding:0 12px 6px;border-bottom:1px solid #f0f0f0}.nsx-history-tab{border:0;background:0;cursor:pointer;color:#6b6b6b;font-size:12px;padding:6px 0;font-weight:600;border-bottom:2px solid transparent}.nsx-history-tab.is-active{color:#0a62ff;border-bottom-color:#0a62ff}.nsx-history-list{flex:1;overflow-y:auto;padding:6px 8px 12px}.nsx-history-group{margin-bottom:10px}.nsx-history-group-title{display:flex;align-items:center;justify-content:space-between;padding:4px;color:#666;font-size:12px}.nsx-history-items{list-style:none;margin:0;padding:0}.nsx-history-item{display:flex;align-items:center;gap:8px;padding:6px;border-radius:8px}.nsx-history-item:hover{background:#f5f7fb}.nsx-history-link{display:flex;align-items:center;gap:8px;flex:1;min-width:0;text-decoration:none;color:inherit}.nsx-history-icon{width:20px;height:20px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}.nsx-history-icon img{width:100%;height:100%;object-fit:cover}.nsx-history-item-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.nsx-history-time{color:#9a9a9a;font-size:12px;margin-left:auto}.nsx-history-empty{padding:10px 6px;color:#999;font-size:12px}.nsx-history-close,.nsx-history-restore{border:0;background:0;cursor:pointer;font-size:12px;padding:2px 4px;border-radius:6px;display:none}.nsx-history-close{color:#999}.nsx-history-restore{color:#0a62ff}.nsx-history-item:hover .nsx-history-time{display:none}.nsx-history-item:hover .nsx-history-close,.nsx-history-item:hover .nsx-history-restore{display:block}.nsx-history-group-title .nsx-history-close{display:block;opacity:.9}.nsx-history-close:hover{color:#ff4d4f}.nsx-history-restore:hover{background:#eef3ff}.dark-layout #nsx-history-panel{background:#1e1e1e;border-color:#3a3a3a;color:#e0e0e0}.dark-layout .nsx-history-action{color:#999}.dark-layout .nsx-history-action:hover{background:#2a2a2a}.dark-layout .nsx-history-search{border-color:#3a3a3a}.dark-layout .nsx-history-search input{color:#e0e0e0}.dark-layout .nsx-history-tabs{border-bottom-color:#3a3a3a}.dark-layout .nsx-history-tab{color:#999}.dark-layout .nsx-history-group-title{color:#888}.dark-layout .nsx-history-item:hover{background:#2a2a2a}.dark-layout .nsx-history-icon{background:#3a3a3a}.dark-layout .nsx-history-time{color:#666}.dark-layout .nsx-history-empty{color:#666}`;

    const HKEY = "nsx_browsing_history", RKEY = "nsx_recently_closed";

    const pad = n => String(n).padStart(2, "0");
    const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const fmtTime = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const now = () => new Date().toISOString();
    const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

    const history$1 = {
        id: "history",
        order: 300,
        cfg: { history: { enabled: true, limit: 100, days: 7 } },
        meta: { history: { label: "浏览历史", group: "显示设置", fields: { limit: { type: "NUMBER", label: "保存上限", valueType: "number" }, days: { type: "NUMBER", label: "保存天数", valueType: "number" } } } },
        match: ctx => (ctx.isPost || ctx.isList) && ctx.store.get("history.enabled", true),
        init(ctx) {
            const maxItems = ctx.store.get("history.limit", 100) || 100;
            const maxAge = (ctx.store.get("history.days", 7) || 7) * 864e5;

            const prune = arr => {
                const t = Date.now();
                return (arr || []).filter(i => t - new Date(i.time).getTime() < maxAge).sort((a, b) => new Date(a.time) - new Date(b.time)).slice(-maxItems);
            };
            const load = k => { try { const r = JSON.parse(localStorage.getItem(k) || "[]"); const n = prune(r); if (n.length !== r.length) localStorage.setItem(k, JSON.stringify(n)); return n; } catch { return []; } };
            const save = (k, a) => localStorage.setItem(k, JSON.stringify(prune(a)));
            const getH = () => load(HKEY), saveH = a => save(HKEY, a);
            const getR = () => load(RKEY), saveR = a => save(RKEY, a);

            // 使用 postData 获取帖子信息
            const add = (pd, list, saveFn) => {
                if (!pd?.postId) return;
                const id = pd.postId;
                const h = list(), i = h.findIndex(x => x.postId === id);
                const e = { postId: id, title: pd.title || document.title, time: now(), uid: pd.op?.uid || null, author: pd.op?.name || null };
                i > -1 ? Object.assign(h[i], e) : h.push(e);
                saveFn(h);
            };

            addStyle("nsx-hist", CSS$4);
            let panel = null, trigger = null, state = { open: false, tab: "all", kw: "" };

            const orig = $("#nsk-head .color-theme-switcher");
            if (!orig) return;
            trigger = orig.cloneNode(false);
            trigger.classList.replace("color-theme-switcher", "history-dropdown-on");
            trigger.title = "历史记录";
            trigger.innerHTML = `<svg class="iconpark-icon" style="width:17px;height:17px"><use href="#history"></use></svg>`;
            orig.before(trigger);

            const fmtDayTitle = day => {
                const d = new Date(`${day}T00:00:00`);
                const title = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${WEEK[d.getDay()]}`;
                return day === fmtDate(new Date()) ? `今天 - ${title}` : title;
            };

            const open = () => {
                if (!panel) {
                    panel = document.createElement("div");
                    panel.id = "nsx-history-panel";
                    panel.innerHTML = `<div class="nsx-history-header"><div class="nsx-history-title">历史记录</div><button class="nsx-history-action" data-a="clear">清空</button></div><div class="nsx-history-search">🔍<input placeholder="搜索"/></div><div class="nsx-history-tabs"><button class="nsx-history-tab is-active" data-t="all">全部</button><button class="nsx-history-tab" data-t="recent">最近关闭</button></div><div class="nsx-history-list"></div>`;
                    document.body.appendChild(panel);
                    panel.querySelector("input").oninput = e => { state.kw = e.target.value.toLowerCase(); render(); };
                    panel.onclick = e => {
                        e.stopPropagation();
                        const t = e.target.closest("[data-t]");
                        if (t) { state.tab = t.dataset.t; render(); return; }
                        const a = e.target.closest("[data-a]");
                        if (!a) return;
                        const act = a.dataset.a, id = a.dataset.id;
                        if (act === "clear") ctx.ui.confirm("确认", "确定要清空所有记录吗？", () => { localStorage.removeItem(state.tab === "recent" ? RKEY : HKEY); render(); });
                        if (act === "del") { state.tab === "recent" ? saveR(getR().filter(x => x.postId != id)) : saveH(getH().filter(x => x.postId != id)); render(); }
                        if (act === "clear-day") { const key = state.tab === "recent" ? RKEY : HKEY; save(key, load(key).filter(i => fmtDate(new Date(i.time)) !== a.dataset.day)); render(); }
                        if (act === "restore") window.open(`/post-${id}-1`, "_blank");
                    };
                    document.addEventListener("click", e => { if (state.open && !panel.contains(e.target) && !trigger.contains(e.target)) close(); });
                    document.addEventListener("keydown", e => { if (state.open && e.key === "Escape") close(); });
                }
                const r = trigger.getBoundingClientRect();
                panel.style.top = `${r.bottom + 8}px`;
                panel.style.height = `${innerHeight - r.bottom - 16}px`;
                render();
                panel.classList.add("show");
                state.open = true;
            };
            const close = () => { panel?.classList.remove("show"); state.open = false; };
            const toggle = () => state.open ? close() : open();

            const render = () => {
                let list = (state.tab === "recent" ? getR() : getH()).sort((a, b) => new Date(b.time) - new Date(a.time));
                if (state.kw) list = list.filter(i => (i.title || "").toLowerCase().includes(state.kw));
                panel.querySelectorAll(".nsx-history-tab").forEach(b => b.classList.toggle("is-active", b.dataset.t === state.tab));
                const lEl = panel.querySelector(".nsx-history-list");
                if (!list.length) { lEl.innerHTML = `<div class="nsx-history-empty">暂无记录</div>`; return; }
                const g = {};
                list.forEach(i => { const d = fmtDate(new Date(i.time)); (g[d] ||= []).push(i); });
                lEl.innerHTML = Object.entries(g).map(([day, items]) => {
                    const itemsHtml = items.map(i => {
                        if (!i.postId) return "";
                        const url = `/post-${i.postId}-1`;
                        const avatar = i.uid ? `<img src="/avatar/${i.uid}.png" onerror="this.style.display='none'">` : "";
                        const restore = state.tab === "recent" ? `<button class="nsx-history-restore" data-a="restore" data-id="${i.postId}" title="恢复">↗</button>` : "";
                        return `<li class="nsx-history-item"><a class="nsx-history-link" href="${url}"><span class="nsx-history-icon"${i.author ? ` title="@${esc(i.author)}"` : ""}>${avatar}</span><span class="nsx-history-item-title">${esc((i.title || "").slice(0, 32))}</span></a><span class="nsx-history-time">${fmtTime(new Date(i.time))}</span>${restore}<button class="nsx-history-close" data-a="del" data-id="${i.postId}">✖</button></li>`;
                    }).join("");
                    return `<div class="nsx-history-group"><div class="nsx-history-group-title"><span>${fmtDayTitle(day)}</span><button class="nsx-history-close" data-a="clear-day" data-day="${day}" title="清除当天">✕</button></div><ul class="nsx-history-items">${itemsHtml}</ul></div>`;
                }).join("");
            };

            trigger.onclick = e => { e.preventDefault(); e.stopPropagation(); toggle(); };

            // 记录当前页面
            const pd = ctx.uw?.__config__?.postData;
            if (pd) add(pd, getH, saveH);

            // 监听页面关闭
            addEventListener("beforeunload", () => {
                const pd = ctx.uw?.__config__?.postData;
                if (pd) add(pd, getR, saveR);
            }, { capture: true });
        }
    };

    const __vite_glob_0_8 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: history$1
    }, Symbol.toStringTag, { value: 'Module' }));

    // 图片预览

    const mark = new WeakSet();
    const bind = (els, ctx) => {
        els.forEach(img => {
            const post = img.closest("article.post-content");
            if (!post || mark.has(img)) return;
            mark.add(img);
            const newImg = img.cloneNode(true);
            img.replaceWith(newImg);
            mark.add(newImg);
            newImg.addEventListener("click", e => {
                e.preventDefault();
                const imgs = [...post.querySelectorAll("img:not(.sticker)")];
                const data = imgs.map((x, i) => ({ alt: x.alt, pid: i + 1, src: x.src }));
                ctx.ui.layer?.photos({ photos: { title: "图片预览", start: imgs.indexOf(newImg), data } });
            }, true);
        });
    };

    const imageSlide = {
        id: "imageSlide",
        order: 160,
        cfg: { image_slide: { enabled: true } },
        meta: { image_slide: { label: "图片预览", group: "内容设置" } },
        match: ctx => ctx.isPost && ctx.store.get("image_slide.enabled", true),
        init(ctx) { bind($$("article.post-content img:not(.sticker)"), ctx); },
        watch: ctx => ({ sel: "article.post-content img:not(.sticker)", fn: els => bind(els, ctx), opts: { debounce: 80 } })
    };

    const __vite_glob_0_9 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: imageSlide
    }, Symbol.toStringTag, { value: 'Module' }));

    // 图床上传模块 (NodeSeek 编辑器增强)

    let ctx, pendingLogin = false, lastSyncTime = 0, tokenRequest = null;
    const KEY = "image_upload", NODE = "NodeImage", API = "https://api.nodeimage.com", COOLDOWN = 5 * 60 * 1000;
    const NAMES = { NodeImage: "NodeImage", Chevereto: "Chevereto", LskyPro: "LskyPro", EasyImages: "EasyImages", Telegraph: "Telegraph", Telegraph2: "Telegraph v2" };
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const key = k => `${KEY}.${k}`;
    const get = (k, d = "") => ctx.store.get(key(k), d);
    const set = (k, v) => ctx.store.set(key(k), v);
    const md = (file, url) => `![${file.name || "image"}](${url})`;
    const imgs = items => Array.from(items || []).filter(i => /image\//.test(i.type || i.kind) || (isSafari && i.kind === "file" && !i.type)).map(i => i.getAsFile ? i.getAsFile() : i).filter(Boolean);

    const normalize = f => f.type && f.size ? Promise.resolve(f) : new Promise((y, n) => {
        const r = new FileReader(); r.onerror = n; r.readAsDataURL(f);
        r.onload = e => { const i = new Image(); i.onerror = n; i.src = e.target.result;
            i.onload = () => { const c = Object.assign(document.createElement("canvas"), { width: i.width, height: i.height }), x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(i, 0, 0); c.toBlob(b => b ? y(new File([b], (f.name || "img").replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" })) : n("blob"), "image/jpeg", 0.92); };
        };
    });

    const fd = (name, file, extra = {}) => {
        const data = new FormData();
        data.append(name, file);
        Object.entries(extra).forEach(([k, v]) => data.append(k, v));
        return data;
    };

    const log = (msg, color = "") => {
        const box = document.getElementById("ex-log") || document.querySelector(".mde-toolbar")?.appendChild(Object.assign(document.createElement("div"), { id: "ex-log" }));
        if (!box) return;
        box.textContent = "";
        if (msg) {
            const span = Object.assign(document.createElement("span"), { textContent: msg });
            span.style.cssText = `color:${color};margin-left:10px`;
            box.appendChild(span);
        }
    };

    const hostName = () => NAMES[get("active", NODE)] || get("active", NODE);
    const updatePicTitles = () => document.querySelectorAll(".i-icon-pic.t-hj").forEach(el => { el.title = hostName(); });

    const request = ({ method = "POST", url, data = null, headers = {}, withCredentials = false, responseType }) => {
        if ((m => m === "fetch" || m === "auto" && isSafari)(get("reqMode", "auto"))) return fetch(url, { method, body: data, credentials: "omit", headers }).then(r => r.ok ? r.json() : Promise.reject(Object.assign(new Error(`HTTP ${r.status}`), { status: r.status })));
        return new Promise((resolve, reject) => GM_xmlhttpRequest({
            method, url, data, headers, withCredentials, responseType,
            onload: r => {
                try {
                    const body = responseType === "json" ? r.response : JSON.parse(r.responseText);
                    r.status >= 200 && r.status < 300 ? resolve(body) : reject(Object.assign(new Error(`HTTP ${r.status}`), { status: r.status, response: body }));
                } catch { reject(new Error(`解析响应失败: ${r.responseText}`)); }
            },
            onerror: reject
        }));
    };

    const nodeToken = async () => {
        try {
            const r = await request({ method: "GET", url: `${API}/api/user/api-key`, headers: { Accept: "application/json" }, withCredentials: true, responseType: "json" });
            return { token: r?.api_key || null, status: r?.api_key ? "ok" : "error" };
        } catch (e) {
            return { token: null, status: [401, 403].includes(e.status) ? "not_logged_in" : "error" };
        }
    };

    const requestNodeToken = () => tokenRequest ||= nodeToken().finally(() => { tokenRequest = null; });

    const saveToken = (token, notify = false) => {
        set("token", token);
        log("Token 获取成功", "green");
        setTimeout(() => log(""), 2000);
        notify && ctx.ui?.success?.("NodeImage Token 自动获取成功！");
        return token;
    };

    const ensureToken = async () => {
        const token = get("token", "");
        if (token) return token;

        log("正在获取 Token...", "#4D82D6");
        const r = await requestNodeToken();
        if (r.token) return saveToken(r.token);
        if (r.status === "not_logged_in") {
            pendingLogin = true;
            log("未登录，即将打开登录页...", "#D6A14D");
            setTimeout(() => GM_openInTab("https://www.nodeimage.com", { active: true }), 1500);
        } else log("Token 获取失败，请检查 network", "red");
        return null;
    };

    const syncNodeToken = async () => {
        if (get("active", NODE) !== NODE) return;
        const token = get("token", "");
        if (isSafari && token) return;
        if (!token && !pendingLogin) return;
        if (token && Date.now() - lastSyncTime < COOLDOWN) return;
        lastSyncTime = Date.now();

        if (!token) log("正在获取 Token...", "#4D82D6");
        const r = await requestNodeToken();
        if (r.token && r.token !== token) {
            pendingLogin = false;
            saveToken(r.token, true);
        } else if (!r.token && token) {
            set("token", "");
            ctx.ui?.warning?.("NodeImage Token 已失效，已清除本地缓存。");
        }
    };

    const headers = () => {
        try {
            const raw = get("headers", "");
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.error("[NSX-IMG] 解析 Headers 失败:", e);
            return {};
        }
    };

    const providers = {
        Telegraph: {
            build: (f, e) => ({ url: `${e.base}/upload`, data: fd("file", f), headers: e.headers }),
            parse: (r, e) => `${e.base}${r[0].src.startsWith("/") ? "" : "/"}${r[0].src}`
        },
        Telegraph2: {
            build: (f, e) => ({ url: `${e.base}/upload`, data: fd("file", f), headers: e.headers }),
            parse: r => r.data
        },
        LskyPro: {
            build: (f, e) => ({ url: `${e.base}/api/v1/upload`, data: fd("file", f), headers: { Accept: "application/json", Authorization: `Bearer ${e.token}`, ...e.headers } }),
            parse: r => r.data.links.url
        },
        Chevereto: {
            build: (f, e) => ({ url: `${e.base}/api/1/upload`, data: fd("source", f), headers: { Accept: "application/json", "X-API-Key": e.token, ...e.headers } }),
            parse: r => r.image.url
        },
        EasyImages: {
            build: (f, e) => {
                const ok = !!e.token;
                return { url: `${e.base}${ok ? "/api/index.php" : "/app/upload.php"}`, data: fd(ok ? "image" : "file", f, ok ? { token: e.token } : { sign: Math.floor(Date.now() / 1000) }), headers: e.headers };
            },
            parse: r => r.url
        },
        NodeImage: {
            build: (f, e) => ({ url: `${API}/api/upload`, data: fd("image", f), headers: { Accept: "application/json", "X-API-Key": e.token, ...e.headers } }),
            parse: r => r.links.direct
        }
    };

    const special = {
        [NODE]: {
            before: async env => env.token || (env.token = await ensureToken()),
            retry: async (e, env) => {
                if (![401, 403].includes(e.status)) return false;
                const r = await requestNodeToken();
                if (!r.token) return false;
                env.token = r.token;
                set("token", r.token);
                return true;
            },
            sync: syncNodeToken
        }
    };

    const insert = text => {
        const cm = document.querySelector(".CodeMirror")?.CodeMirror;
        if (cm) cm.replaceRange(`\n${text}\n`, cm.getCursor());
    };

    const pool = (arr, fn, n = 3) => { let i = 0; const go = () => i < arr.length ? fn(arr[i], i++).then(go) : null; return Promise.all(Array.from({ length: Math.min(n, arr.length) }, go)); };

    const upload = async files => {
        if (!files.length) return;
        const env = { active: get("active", NODE), base: get("url", "https://example.com").replace(/\/$/, ""), token: get("token", ""), headers: headers() };
        const provider = providers[env.active];
        const ext = special[env.active];
        if (!provider) return;
        updatePicTitles();
        if (ext?.before && !(await ext.before(env))) return;

        log("正在上传", "green");
        ctx.ui?.info?.(`开始并发上传 ${files.length} 张图片...`);

        const results = [];
        let ok = 0, err = 0;

        const send = async file => {
            const res = await request(provider.build(file, env));
            return md(file, provider.parse(res, env));
        };

        await pool(files, async (file, index) => {
            try {
                results.push({ index, text: await send(file) });
                ok++;
                log(`已完成 ${ok + err}/${files.length}`, "green");
            } catch (e) {
                if (await ext?.retry?.(e, env)) {
                    try {
                        results.push({ index, text: await send(file) });
                        ok++;
                        log(`已完成 ${ok + err}/${files.length}`, "green");
                        return;
                    } catch (e2) { console.error("[NSX-IMG] 重试上传失败", e2); }
                }
                err++;
                log(`已完成 ${ok + err}/${files.length}，${err} 张失败`, "red");
                console.error("[NSX-IMG] 上传失败", e);
            }
        });

        if (results.length) {
            results.sort((a, b) => a.index - b.index);
            insert(results.map(r => r.text).join("\n"));
        }

        if (ctx.ui?.toast) {
            if (!err) ctx.ui.success(`全部图片上传成功！(共 ${ok} 张)`);
            else if (ok) ctx.ui.warning(`图片上传完成: ${ok} 张成功, ${err} 张失败。`);
            else ctx.ui.error("图片上传全部失败！");
        }
    };

    const prep = files => (isSafari ? Promise.all(files.map(normalize)) : Promise.resolve(files)).then(upload).catch(e => (log(`处理失败: ${e.message}`, "red"), console.error("[NSX-IMG]", e)));

    const pick = () => {
        updatePicTitles();
        const input = Object.assign(document.createElement("input"), { type: "file", multiple: true, accept: "image/*", onchange: e => prep(imgs(e.target.files)) });
        input.click();
    };

    const imageUpload = {
        id: "imageUpload",
        order: 250,
        cfg: { [KEY]: { enabled: false, active: NODE, url: "", token: "", headers: "", reqMode: "auto" } },
        meta: {
            [KEY]: {
                label: "图床上传", group: "图床设置", fields: {
                    active: {
                        type: "SELECT", label: "当前图床", options: [
                            ["NodeImage (论坛官方)", NODE], ["Chevereto", "Chevereto"], ["LskyPro", "LskyPro"], ["EasyImages", "EasyImages"], ["Telegraph (含自建)", "Telegraph"], ["Telegraph v2", "Telegraph2"]
                        ].map(([text, value]) => ({ text, value }))
                    },
                    url: { type: "TEXT", label: "图床 URL", placeholder: "https://example.com", desc: "图床服务的基础 URL（例如：https://example.com）,NodeImage 可留空" },
                    token: { type: "TEXT", label: "API Token", placeholder: "chv_q2L_... 或留空", desc: "API Token 或 Key，Telegraph 可不填" },
                    headers: { type: "TEXTAREA", label: "自定义 Headers", placeholder: "{\n  \"Authorization\": \"Basic YWR...\"\n}", desc: "可选，标准 JSON 格式，例如：{\"Authorization\": \"Basic ...\"}" },
                    reqMode: { type: "SELECT", label: "请求通道", options: [["自动 (Safari 使用 Fetch)", "auto"], ["Fetch API", "fetch"], ["GM_xmlhttpRequest", "gm"]].map(([text, value]) => ({ text, value })), desc: "Safari/iOS 建议使用 Fetch，其他浏览器建议 GM_xmlhttpRequest" }
                }
            }
        },
        match: c => c.store.get(key("enabled"), false),
        init(c) {
            ctx = c;
            updatePicTitles();
            document.addEventListener("paste", e => {
                if (!e.target.closest(".CodeMirror,.mde-toolbar")) return;
                const files = imgs((e.clipboardData || e.originalEvent?.clipboardData)?.items);
                files.length && (e.preventDefault(), prep(files));
            });
            document.addEventListener("dragover", e => e.target.closest(".CodeMirror") && e.preventDefault());
            document.addEventListener("drop", e => {
                if (!e.target.closest(".CodeMirror")) return;
                e.preventDefault();
                prep(imgs(e.dataTransfer.files));
            });
            window.addEventListener("focus", () => {
                updatePicTitles();
                special[get("active", NODE)]?.sync?.();
            });
        },
        watch: () => ({
            sel: '.mde-toolbar .i-icon-pic:not(.t-hj)',
            fn: els => els.forEach(el => {
                const btn = el.cloneNode(true);
                btn.classList.add("t-hj");
                btn.title = hostName();
                el.replaceWith(btn);
                btn.onclick = pick;
            })
        })
    };

    const __vite_glob_0_10 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: imageUpload
    }, Symbol.toStringTag, { value: 'Module' }));

    // 悬停预加载
    const instantPage = {
        id: "instantPage",
        order: 320,
        cfg: { instant_page: { enabled: true } },
        meta: { instant_page: { label: "网页预加载", group: "内容设置" } },
        match: ctx => ctx.store.get("instant_page.enabled", true),
        init(ctx) {
            const done = new Set();
            const link = document.createElement("link");
            link.rel = "prefetch";
            document.body.addEventListener("mouseover", e => {
                const a = e.target.closest("a");
                if (!a?.href?.startsWith(`${location.origin}/post-`) || done.has(a.href)) return;
                setTimeout(() => {
                    if (a.matches(":hover")) {
                        link.href = a.href;
                        document.head.appendChild(link);
                        done.add(a.href);
                    }
                }, 65);
            }, { passive: true });
        }
    };

    const __vite_glob_0_11 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: instantPage
    }, Symbol.toStringTag, { value: 'Module' }));

    // 等级标签

    const LV_COLORS = ["#c7c2c2","#ffb74d","#ff9400","#ff5252","#e53935","#ab47bc","#8e24aa","#42a5f5","#1e88e5","#66bb6a","#2e7d32","#ffca28","#ffb300","#b388ff","#7c4dff","#000"];
    const CSS$3 = `.role-tag.user-level{background:#000;border-color:#000;color:#ffd700}${LV_COLORS.map((c, i) => `.role-tag.user-lv${i}{background:${c};border-color:${c};color:#fafafa}`).join("")}.user-reg-info{margin-left:6px;font-size:12px;font-weight:600}`;

    const SEL_COMMENT = "#nsk-body .comment-container .content-item";
    const SEL_ANCHOR = ".nsk-content-meta-info .author-info>a";

    // ── 缓存层 ──
    const _cache = new Map(), _inflight = new Map();
    let _cacheTtl = 300_000;

    async function fetchUser(uid) {
        const e = _cache.get(uid);
        if (e && Date.now() - e.ts < _cacheTtl) return e.data;
        if (_inflight.has(uid)) return _inflight.get(uid);
        const p = (async () => {
            try {
                const r = await net.get(`/api/account/getInfo/${uid}`);
                if (!r?.success) return null;
                _cache.set(uid, { data: r.detail, ts: Date.now() });
                return r.detail;
            } catch { return null; }
            finally { _inflight.delete(uid); }
        })();
        _inflight.set(uid, p);
        return p;
    }

    function extractUid(anchor) {
        const href = anchor.getAttribute("href") || "";
        const m = href.match(/\/space\/(\d+)/) || href.match(/uid=(\d+)/);
        return m?.[1];
    }

    function createEl(ctx, user, mode, username) {
        const days = Math.floor((Date.now() - new Date(user.created_at)) / 864e5);
        const alarm = ctx.store.get("level_tag.low_lv_alarm") && days < ctx.store.get("level_tag.low_lv_max_days", 30) ? "⚠️" : "";
        const coin = user.coin < 0 ? 0 : user.coin;
        const rank = Math.floor(Math.sqrt(coin) / 10);
        const span = document.createElement("span");
        if (mode === "inline") {
            const f = n => (n ?? 0).toLocaleString();
            span.className = "user-reg-info";
            span.style.color = LV_COLORS[rank] || LV_COLORS[15];
            if (username) span.dataset.user = username;
            span.textContent = ` · ${alarm ? alarm + " " : ""}${f(days)} 天 · 帖 ${f(user.nPost)} · 评 ${f(user.nComment)} · 🍗 ${f(user.coin)} · ✨ ${f(user.stardust)} · 粉 ${f(user.fans)}`;
        } else {
            span.className = `nsk-badge role-tag user-level user-lv${rank}`;
            span.innerHTML = `<span>${alarm}Lv ${rank}</span>`;
            span.onmouseenter = () => ctx.ui.tips?.(`注册 <span class="layui-badge">${days}</span> 天；帖子 ${user.nPost}；评论 ${user.nComment}`, span, { tips: 3, time: 0 });
            span.onmouseleave = () => ctx.ui.layer?.closeAll?.();
        }
        return span;
    }

    let _io;
    const _observed = new WeakSet();

    const levelTag = {
        id: "levelTag",
        order: 260,
        cfg: { level_tag: { enabled: true, comment_enabled: true, show_detail: false, low_lv_alarm: true, low_lv_max_days: 30, cache_ttl: 5 } },
        meta: { level_tag: { label: "等级标签", group: "显示设置", fields: {
            show_detail: { type: "SWITCH", label: "详细信息", desc: "在用户名后直接显示注册天数、发帖数等详细数据" },
            comment_enabled: { type: "SWITCH", label: "评论等级" },
            low_lv_alarm: { type: "SWITCH", label: "低等级警告" },
            low_lv_max_days: { type: "NUMBER", label: "注册天数", valueType: "number", desc: "低于此天数的新注册用户将显示 ⚠️ 警告图标" },
            cache_ttl: { type: "NUMBER", label: "缓存时间(分钟)", valueType: "number", desc: "同一用户的等级信息在内存中保留的时间，避免重复请求" }
        } } },
        match: ctx => ctx.loggedIn && ctx.isPost && ctx.store.get("level_tag.enabled", true),
        async init(ctx) {
            addStyle("nsx-lv", CSS$3);
            _cacheTtl = ctx.store.get("level_tag.cache_ttl", 5) * 60_000;
            const detail = ctx.store.get("level_tag.show_detail", false);

            const insertFor = (container, user, anchor) => {
                const tag = createEl(ctx, user, "tag");
                anchor?.after(tag);
                if (detail) {
                    const info = anchor?.closest(".author-info");
                    const dl = createEl(ctx, user, "inline", anchor?.textContent?.trim());
                    if (info) info.appendChild(dl); else tag.after(dl);
                }
            };

            // ── 评论等级（同步初始化，确保 watch 注册前 _io 已就绪） ──
            const commentEnabled = ctx.store.get("level_tag.comment_enabled", true);
            if (commentEnabled) {
                const processItem = async el => {
                    const anchor = el.querySelector(SEL_ANCHOR);
                    if (!anchor) return;
                    const uid = extractUid(anchor);
                    if (!uid) return;
                    const user = await fetchUser(uid);
                    if (!user) return;
                    insertFor(el, user, anchor);
                };

                _io = new IntersectionObserver(entries => {
                    for (const e of entries) {
                        if (e.isIntersecting) {
                            _io.unobserve(e.target);
                            processItem(e.target);
                        }
                    }
                });

                document.querySelectorAll(SEL_COMMENT).forEach(el => {
                    _observed.add(el);
                    _io.observe(el);
                });
            }

            // ── 帖主等级（原有逻辑） ──
            const opUid = ctx.uw?.__config__?.postData?.op?.uid;
            if (opUid) {
                const user = await fetchUser(opUid);
                if (user) {
                    const anchor = ctx.$('#nsk-body .nsk-post .nsk-content-meta-info .author-info>a');
                    if (anchor) insertFor(anchor.closest('.nsk-post'), user, anchor);
                }
            }
        },
        // 处理动态加载的评论（如无限滚动）
        watch() {
            if (!_io) return null;
            return {
                sel: SEL_COMMENT,
                fn: els => {
                    for (const el of els) {
                        if (!_observed.has(el)) {
                            _observed.add(el);
                            _io.observe(el);
                        }
                    }
                }
            };
        }
    };

    const __vite_glob_0_12 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: levelTag
    }, Symbol.toStringTag, { value: 'Module' }));

    // 链接净化器 — DSL 规则引擎 / 去跳板 / 短链解析 / 外链标记

    /* ── 默认规则 (DSL 文本) ── */
    const DEFAULT_RULES = `
# ── 宏定义 ──
@utm     = utm_source, utm_medium, utm_campaign, utm_content, utm_term
@ad_ids  = ad_id, clickid, gclid, fbclid, sc_cid
@invite  = ic, invite, invitation, invited_by, ref, referral, referrer
@aff     = aff, affiliate, partner, promo, promocode, coupon, subid, affid, aff_id
@track   = aid, pid, cid, tid, sid, uid, ref_id, tag
@channel = via, from, source, campaign, channel

# ── 全局过滤 ──
* >> @utm, @ad_ids, @invite, @aff, @track, @channel

# ── YouTube ──
*.youtube.com youtu.be >> si, feature, pp

# ── B站 ──
*.bilibili.com b23.tv >> spm_id_from, from_source, from_spmid, from, seid, share_source, share_medium, share_plat, share_tag, share_session_id, share_from, bbid, ts, timestamp, unique_k, rt, tdsourcetag, spm, vd_source, trackid

# ── Amazon Path 正则 ──
*.amazon.com >> /\\/ref=[^\\/]+/

# ── 豁免 (防误杀) ──
~github.com ~gitlab.com ~gitee.com >> ref
~t.me ~telegram.me >> start
`.trim();

    const DEF_SHORT = [
        'bit.ly', 'goo.gl', 't.co', 't.cn', 'ow.ly', 'is.gd',
        'buff.ly', 'tinyurl.com', 'tr.im', 'shorturl.at', 'rebrand.ly',
        'su.pr', 'i3z.cc', 'b23.tv'
    ];

    const SEL = '.post-content a[href], .markdown-body a[href], .comment-content a[href]';

    /* ── CSS ── */
    const ICON_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'%3E%3C/path%3E%3Cpolyline points='15 3 21 3 21 9'%3E%3C/polyline%3E%3Cline x1='10' y1='14' x2='21' y2='3'%3E%3C/line%3E%3C/svg%3E")`;

    const CSS$2 = `
a.nsp-ext::after{content:"";display:inline-block;width:12px;height:12px;margin-left:4px;background:${ICON_SVG} no-repeat center/contain;vertical-align:middle;opacity:.7}
a.nsp-cleaned{border-bottom:1px dashed #28a745!important;text-decoration:none}
a.nsp-cleaned:hover{background:rgba(40,167,69,.1)}
a.nsp-cleaned[data-nsp-tip]:hover::before{content:attr(data-nsp-tip);position:absolute;background:#333;color:#f0f0f0;padding:5px 10px;border-radius:4px;font-size:12px;font-family:monospace;white-space:pre;transform:translateY(-100%);margin-top:-6px;z-index:9999;pointer-events:none;box-shadow:0 4px 6px rgba(0,0,0,.3);border:1px solid #444}
a.nsp-resolving{cursor:wait;opacity:.6}
a.nsp-resolving::after{content:"";display:inline-block;width:10px;height:10px;margin-left:5px;border:2px solid #888;border-top-color:transparent;border-radius:50%;animation:nsp-spin 1s linear infinite;vertical-align:middle;background-image:none!important}
@keyframes nsp-spin{to{transform:rotate(360deg)}}`;

    /* ── 工具 ── */
    const tryURL = (v, b) => { try { return new URL(v, b); } catch { return null; } };
    const isExt = u => /^https?:$/.test(u.protocol) && u.hostname && u.hostname !== location.hostname;

    /* ── DSL 规则解析器 (源自 t.js) ── */
    function parseRules(text) {
        const rules = { allow: [], block: [], pathBlock: [] }, macros = {};

        text.split('\n').filter(l => l.trim() && l[0] !== '#').forEach(line => {
            if (line[0] === '@') {
                const idx = line.indexOf('=');
                if (idx === -1) return;
                macros[line.slice(0, idx).trim()] = line.slice(idx + 1).split(',').map(s => s.trim());
                return;
            }
            const idx = line.indexOf('>>');
            if (idx === -1) return;
            const scopeStr = line.slice(0, idx).trim();
            const paramStr = line.slice(idx + 2).trim();
            if (!paramStr) return;

            const isAllow = scopeStr[0] === '~';
            const scopes = scopeStr.split(/\s+/).map(s => s.replace(/^~/, ''));

            paramStr.split(',').flatMap(p => macros[p.trim()] || [p.trim()]).forEach(p => {
                if (p.startsWith('/') && p.endsWith('/')) {
                    try { if (!isAllow) rules.pathBlock.push({ scopes, regex: new RegExp(p.slice(1, -1)) }); } catch { }
                } else {
                    let matcher;
                    if (p === '*') matcher = () => true;
                    else if (p.includes('*')) {
                        const re = new RegExp('^' + p.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i');
                        matcher = t => re.test(t);
                    } else {
                        const lp = p.toLowerCase();
                        matcher = t => t.toLowerCase() === lp;
                    }
                    rules[isAllow ? 'allow' : 'block'].push({ scopes, matcher });
                }
            });
        });
        return rules;
    }

    /* ── URL 净化 (源自 t.js，增加日志输出) ── */
    function purifyUrl(rawUrl, rules) {
        try {
            const u = new URL(rawUrl);
            if (!u.protocol.startsWith('http')) return { url: rawUrl, logs: [] };
            if (!u.search && !u.hash.includes('?') && !rules.pathBlock.length) return { url: rawUrl, logs: [] };

            const match = (t, s) => s === '*' || t === s || t.endsWith('.' + s);
            const logs = [];

            const clean = paramStr => {
                const params = new URLSearchParams(paramStr);
                const del = [...params.keys()].filter(k => {
                    const hit = list => list.some(r => r.scopes.some(s => match(u.hostname, s)) && r.matcher(k));
                    return !hit(rules.allow) && hit(rules.block);
                });
                if (!del.length) return null;
                del.forEach(k => { params.delete(k); logs.push(k); });
                return params.toString();
            };

            let mod = false;
            const ns = clean(u.search);
            if (ns !== null) { u.search = ns; mod = true; }

            if (u.hash.includes('?')) {
                const qIdx = u.hash.indexOf('?');
                const hp = u.hash.slice(0, qIdx);
                const hq = u.hash.slice(qIdx + 1);
                const nh = clean(hq);
                if (nh !== null) { u.hash = nh ? `${hp}?${nh}` : hp; mod = true; }
            }

            let np = u.pathname;
            rules.pathBlock.forEach(r => {
                if (r.scopes.some(s => match(u.hostname, s))) np = np.replace(r.regex, '');
            });
            if (np !== u.pathname) { u.pathname = np.replace(/\/+/g, '/') || '/'; mod = true; logs.push('(path)'); }

            return { url: mod ? u.toString() : rawUrl, logs };
        } catch { return { url: rawUrl, logs: [] }; }
    }

    /* ── 去跳板 ── */
    function unwrapJump(u) {
        const logs = [];
        for (let i = 0; i < 3 && u.origin === location.origin && u.pathname === '/jump' && u.searchParams.has('to'); i++) {
            const next = tryURL(u.searchParams.get('to'), location.href);
            if (!next) break;
            u = next;
            logs.push('🛡️ 去重定向直连');
        }
        return { u, logs };
    }

    /* ── 短链解析 ── */
    const shortCache = new Map();
    function resolveShort(href) {
        if (!shortCache.has(href)) {
            shortCache.set(href, new Promise(resolve => {
                const fallback = () => m === 'HEAD' ? try_('GET') : resolve({ ok: false, url: href });
                const try_ = m => GM_xmlhttpRequest({
                    method: m, url: href, timeout: 10000,
                    onload: r => resolve({ ok: true, url: r.finalUrl || href }),
                    onerror: fallback,
                    ontimeout: fallback
                });
                try_('HEAD');
            }));
        }
        return shortCache.get(href);
    }

    /* ── 规则编辑模态框 ── */
    function openRuleEditor(ctx) {
        if (!ctx.ui.layer) return;
        const cur = ctx.store.get("link_purifier.rules", DEFAULT_RULES);
        ctx.ui.layer.open({
            type: 1, title: "📝 链接净化规则", area: ['660px', '520px'],
            content: '<div style="padding:15px"><textarea id="nsp-rule-ta" style="width:100%;height:380px;font-family:monospace;font-size:13px;line-height:1.6;resize:vertical;padding:12px;border:1px solid #ddd;border-radius:6px;white-space:pre;tab-size:4;box-sizing:border-box;outline:none"></textarea></div>',
            btn: ['保存规则', '恢复默认', '取消'],
            success: () => { const ta = document.getElementById('nsp-rule-ta'); if (ta) ta.value = cur; },
            yes(idx) {
                const ta = document.getElementById('nsp-rule-ta');
                if (ta) {
                    const newRules = ta.value.trim();
                    ctx.store.set("link_purifier.rules", newRules);
                    ctx.ui.layer.msg("规则已保存，刷新页面后生效");
                }
                ctx.ui.layer.close(idx);
            },
            btn2: () => { const ta = document.getElementById('nsp-rule-ta'); if (ta) ta.value = DEFAULT_RULES; return false; }
        });
    }

    /* ── 模块导出 ── */
    const linkPurifier = {
        id: "link_purifier",
        order: 300,
        cfg: { link_purifier: { enabled: true, short_hosts: DEF_SHORT, mark_external: true, force_blank: true, edit_rules: null } },
        meta: {
            link_purifier: {
                label: "链接净化",
                group: "实验性",
                hidden: ["rules"],
                fields: {
                    short_hosts: { type: "TEXTAREA", label: "短链域名", placeholder: "每行一个域名", desc: "将这里的域名当做短链接网关，脚本会自动解析并替换为真实的最终跳转地址！" },
                    mark_external: { label: "外链图标标记" },
                    force_blank: { label: "外链新标签页打开" },
                    edit_rules: { type: "BUTTON", label: "净化规则", buttonText: "编辑规则", action: "edit_link_rules" }
                }
            }
        },
        match: ctx => ctx.store.get("link_purifier.enabled", true),
        init(ctx) {
            addStyle("nsx-link-purifier", CSS$2);

            const shortHosts = new Set(ctx.store.get("link_purifier.short_hosts", DEF_SHORT).map(s => s.toLowerCase()));
            const markExt = ctx.store.get("link_purifier.mark_external", true);
            const forceBlank = ctx.store.get("link_purifier.force_blank", true);
            const activeRules = parseRules(ctx.store.get("link_purifier.rules", DEFAULT_RULES));

            document.addEventListener("nsx-action", e => {
                if (e.detail === "edit_link_rules") openRuleEditor(ctx);
            });

            const processed = new WeakMap();

            async function processLink(a) {
                const href = a.getAttribute('href');
                if (!href) return;
                if (processed.get(a) === href) return;

                let u = tryURL(href, location.href);
                if (!u) return;
                const logs = [];
                let modified = false;

                // 1. 去跳板
                const j = unwrapJump(u);
                if (j.logs.length) { u = j.u; logs.push(...j.logs); modified = true; }

                if (!a.isConnected || a.getAttribute('href') !== href) return;

                // 2. 短链解析
                if (shortHosts.has(u.hostname.toLowerCase())) {
                    a.classList.add('nsp-resolving');
                    const r = await resolveShort(u.toString());
                    a.classList.remove('nsp-resolving');
                    if (r.ok) {
                        const res = tryURL(r.url);
                        if (res) { u = res; logs.push(`🔍 短链: ${u.hostname}`); modified = true; }
                    }
                }

                // 3. DSL 规则净化
                const p = purifyUrl(u.toString(), activeRules);
                if (p.logs.length) {
                    u = new URL(p.url);
                    logs.push(`✂️ 移除: ${p.logs.join(', ')}`);
                    modified = true;
                }

                // 4. 应用结果
                if (modified) {
                    a.href = u.toString();
                    a.classList.add('nsp-cleaned');
                    if (logs.length) a.setAttribute('data-nsp-tip', logs.join('\n'));
                }

                // 5. 外链标记
                if (isExt(u)) {
                    if (markExt) a.classList.add('nsp-ext');
                    if (forceBlank) {
                        a.target = '_blank';
                        if (a.relList) a.relList.add('noopener', 'noreferrer');
                    }
                }
                processed.set(a, a.getAttribute('href'));
            }

            // 批处理队列
            const queue = new Set();
            let flushing = false;
            function enqueue(root) {
                if (root instanceof HTMLAnchorElement && root.matches(SEL)) queue.add(root);
                root?.querySelectorAll?.(SEL).forEach(a => queue.add(a));
                if (flushing) return;
                flushing = true;
                Promise.resolve().then(async () => {
                    flushing = false;
                    const batch = [...queue];
                    queue.clear();
                    await Promise.allSettled(batch.map(processLink));
                    if (queue.size) enqueue();
                });
            }

            enqueue(document);

            const root = document.body || document.documentElement;
            if (!root) return;
            new MutationObserver(ms => {
                for (const m of ms) {
                    if (m.type === 'childList') m.addedNodes.forEach(n => n.nodeType === 1 && enqueue(n));
                    else if (m.type === 'attributes' && m.target instanceof HTMLAnchorElement) enqueue(m.target);
                }
            }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
        }
    };

    const __vite_glob_0_13 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: linkPurifier
    }, Symbol.toStringTag, { value: 'Module' }));

    // 菜单系统（油猴菜单 + 高级设置面板）

    const CSS$1 = `#nsx-config-menu{height:100%;overflow-y:visible;border-right:1px solid #eee}#nsx-config-content{height:100%;overflow-y:auto;padding:0 15px;background:#f8f8f8}.nsx-config-card{margin-bottom:20px}.nsx-config-card .layui-card-header{display:flex;align-items:center;justify-content:space-between;font-weight:700}.nsx-config-card .header-checkbox{position:absolute;right:15px;top:50%;transform:translateY(-50%)}.nsx-config-card .layui-form-switch{margin-top:0!important}.nsx-config-card .layui-card-body:empty{padding-top:0;padding-bottom:0}.dark-layout #nsx-config-menu{border-right-color:#3a3a3a}.dark-layout #nsx-config-content{background:#1e1e1e}`;

    const el = (t, c, p, s) => { const e = document.createElement(t); if (c) e.className = c; if (s) e.style.cssText = s; if (p) p.appendChild(e); return e; };

    const menus = {
        id: "menus",
        order: 30,
        match: () => true,
        init(ctx) {
            ctx.uw; const code = ctx.site?.code || "ns";
            const ids = [];
            const txt = (m, v) => `${m.states[v].s1} ${m.text}: ${m.states[v].s2}`;


            const regMenus = () => {
                ids.splice(0).forEach(i => GM_unregisterMenuCommand(i));
                menus.forEach(m => {
                    let lbl = m.text;
                    if (m.states.length > 0) {
                        let v = 0;
                        if (m.name === "sign_in") v = store.get(`sign_in.${code}.method`, 0);
                        else v = store.get(`${m.name}.enabled`, true) === false ? 0 : 1;
                        lbl = txt(m, v);
                    }
                    const id = GM_registerMenuCommand(lbl, () => m.cb(m.name, m.states), { autoClose: m.autoClose ?? true });
                    ids.push(id || lbl);
                });
            };

            const switchState = (n, states) => {
                if (n === "sign_in") {
                    if (!ctx.site) return;
                    let cur = store.get(`sign_in.${code}.method`, 0);
                    cur = (cur + 1) % states.length;
                    store.set(`sign_in.${code}.enabled`, cur !== 0);
                    store.set(`sign_in.${code}.method`, cur || 1);
                } else if (n === "loading_post") {
                    const next = !store.get("loading_post.enabled", true);
                    store.set("loading_post.enabled", next);
                    store.set("loading_comment.enabled", next);
                } else {
                    store.set(`${n}.enabled`, !store.get(`${n}.enabled`, true));
                }
                regMenus();
            };

            const reSign = () => {
                if (!ctx.loggedIn || store.get(`sign_in.${code}.enabled`, true) === false) return ctx.ui.alert("提示", "签到已关闭");
                store.set(`sign_in.${code}.last_date`, "1753/1/1");
                location.reload();
            };

            const advSettings = () => {
                if (!ctx.ui.layer || !window.layui) return;
                addStyle("nsx-cfg", CSS$1);

                // 获取所有模块的 cfg 和 meta
                const defs = store.getDefaults(), metas = store.getMeta();
                const ignore = new Set(["version", "debug", "ui"]);
                const entries = Object.entries(metas).filter(([k]) => defs[k] && !ignore.has(k)).map(([k, m]) => ({ key: k, meta: m }));
                const groups = {};
                entries.forEach(e => { const g = e.meta.group || "其他设置"; (groups[g] ||= []).push(e); });

                const cont = document.createElement("div");
                cont.className = "layui-row";
                cont.style.cssText = "display:flex;height:100%";
                const menuDiv = el("div", "layui-panel layui-col-xs3", cont);
                menuDiv.id = "nsx-config-menu";
                const menuList = el("ul", "layui-menu", menuDiv);
                const wrapper = el("div", "layui-col-xs9", cont);
                wrapper.id = "nsx-config-content";

                const isObj = v => v && typeof v === "object" && !Array.isArray(v);
                const inferType = (v, m) => m?.type || (Array.isArray(v) ? "TEXTAREA" : typeof v === "boolean" ? "SWITCH" : typeof v === "number" ? "NUMBER" : "TEXT");
                const inferVT = (v, m) => m?.valueType || (Array.isArray(v) ? "array" : typeof v === "number" ? "number" : typeof v === "boolean" ? "boolean" : "string");

                const makeField = (f, path, val, defaultCol = 12) => {
                    const col = f.col ?? defaultCol;
                    const w = el("div", `layui-col-md${col}`), item = el("div", "layui-form-item", w);
                    const lbl = el("label", "layui-form-label", item); lbl.textContent = f.label || f.key;
                    if (f.desc) {
                        const icon = el("i", "layui-icon layui-icon-help", lbl);
                        icon.style.cssText = "font-size:14px;color:#999;margin-left:4px;";
                        lbl.style.cursor = "help";
                        lbl.setAttribute("data-desc", f.desc);
                    }
                    const blk = el("div", "layui-input-block", item);
                    let inp;
                    if (f.type === "SWITCH") { inp = el("input", "", blk); inp.type = "checkbox"; if (val) inp.setAttribute("checked", ""); inp.setAttribute("lay-skin", "switch"); inp.setAttribute("lay-text", "开启|关闭"); inp.name = path; }
                    else if (f.type === "TEXTAREA") { inp = el("textarea", "layui-textarea", blk); inp.setAttribute("placeholder", f.placeholder || ""); inp.textContent = Array.isArray(val) ? val.join("\n") : (val ?? ""); inp.name = path; }
                    else if (f.type === "RADIO" && f.options) {
                        f.options.forEach(opt => {
                            const r = el("input", "", blk); r.type = "radio"; r.name = path; r.setAttribute("value", opt.value);
                            r.dataset.valueType = f.valueType || "";
                            if (String(val) === String(opt.value)) r.setAttribute("checked", "");
                            r.setAttribute("title", opt.text);
                        });
                        inp = blk.querySelector("input");
                    }
                    else if (f.type === "SELECT" && f.options) {
                        inp = el("select", "", blk); inp.name = path;
                        f.options.forEach(opt => {
                            const o = el("option", "", inp); o.value = opt.value; o.textContent = opt.text;
                            if (String(val) === String(opt.value)) o.setAttribute("selected", "");
                        });
                    }
                    else if (f.type === "COLOR") {
                        const inpWrap = el("div", "layui-input-inline", blk); inpWrap.style.width = "100px";
                        inp = el("input", "layui-input", inpWrap); inp.type = "text"; inp.name = path; inp.setAttribute("value", val ?? ""); inp.readOnly = true;
                        inp.style.cssText = `background:${val || "#fff"};cursor:pointer;color:transparent`;
                        const cpWrap = el("div", "layui-inline", blk); cpWrap.style.left = "-11px";
                        const wrap = el("div", "", cpWrap);
                        wrap.dataset.colorPath = path; wrap.dataset.colorVal = val ?? ""; wrap.dataset.colorInp = inp.name; wrap.dataset.colorDefault = f.defaultVal ?? "";
                    }
                    else if (f.type === "BUTTON") {
                        inp = el("button", "layui-btn layui-btn-primary layui-btn-sm", blk);
                        inp.type = "button";
                        inp.textContent = f.buttonText || "点击执行";
                        inp.style.marginTop = "4px";
                        if (f.action) inp.setAttribute("onclick", `document.dispatchEvent(new CustomEvent('nsx-action', { detail: '${f.action}' }))`);
                    }
                    else { inp = el("input", "layui-input", blk); inp.type = f.type === "NUMBER" ? "number" : "text"; inp.setAttribute("placeholder", f.placeholder || ""); inp.setAttribute("value", val ?? ""); inp.name = path; }
                    if (inp) inp.dataset.valueType = f.valueType || "";
                    return w;
                };

                const makeCard = (entry, siteCode) => {
                    const m = entry.meta || {};
                    let base = entry.key, cfg = defs[entry.key];
                    if (entry.key === "sign_in") { cfg = defs.sign_in?.[siteCode] || defs.sign_in?.ns || {}; base = `sign_in.${siteCode}`; }
                    if (!isObj(cfg)) return null;
                    const card = el("div", "layui-card layui-form nsx-config-card");
                    card.setAttribute("lay-filter", `nsx-${entry.key}`);
                    const hdr = el("div", "layui-card-header", card); hdr.textContent = m.label || entry.key;
                    if (typeof cfg.enabled === "boolean") {
                        const cbW = el("div", "header-checkbox", hdr), cb = el("input", "", cbW);
                        cb.type = "checkbox"; cb.name = `${base}.enabled`; if (store.get(`${base}.enabled`, cfg.enabled)) cb.setAttribute("checked", "");
                        cb.setAttribute("lay-skin", "switch"); cb.setAttribute("lay-text", "开启|关闭");
                        cb.setAttribute("lay-filter", "nsx-main-switch");
                    }
                    const body = el("div", "layui-card-body layui-row layui-col-space10", card);
                    const fields = m.fields || {}, hidden = new Set(m.hidden || []);
                    const cols = m.cols || 1, defaultCol = Math.floor(12 / cols);
                    Object.keys(cfg).filter(k => k !== "enabled" && !isObj(cfg[k]) && !hidden.has(k)).forEach(k => {
                        const fm = fields[k] || {};
                        const f = { key: k, label: fm.label || k, type: inferType(cfg[k], fm), options: fm.options, placeholder: fm.placeholder, valueType: inferVT(cfg[k], fm), col: fm.col, defaultVal: cfg[k], action: fm.action, buttonText: fm.buttonText, desc: fm.desc };
                        const cur = store.get(`${base}.${k}`, cfg[k]);
                        const fe = makeField(f, `${base}.${k}`, cur, defaultCol);
                        if (fe) body.appendChild(fe);
                    });
                    return card;
                };

                const orderArr = ["基本设置", "显示设置", "内容设置", "图床设置", "过滤设置", "其他设置", "实验性"];
                const groupOrderMap = {};
                orderArr.forEach((g, i) => { groupOrderMap[g.trim()] = i; });

                const sortedGroups = Object.entries(groups).sort(([g1], [g2]) => {
                    const idx1 = groupOrderMap[g1] ?? 999;
                    const idx2 = groupOrderMap[g2] ?? 999;
                    return idx1 !== idx2 ? idx1 - idx2 : g1.localeCompare(g2);
                });

                sortedGroups.forEach(([g, list], i) => {
                    const fs = el("fieldset", "layui-elem-field layui-field-title", wrapper); fs.id = `group-${i}`;
                    const lg = el("legend", "", fs); lg.textContent = g;
                    const fd = el("div", "layui-form", wrapper);
                    list.forEach(e => { const c = makeCard(e, code); if (c) fd.appendChild(c); });
                    const mi = el("li", "", menuList); if (i === 0) mi.classList.add("layui-menu-item-checked");
                    const mb = el("div", "layui-menu-body-title", mi), a = el("a", "", mb); a.href = `#group-${i}`; a.textContent = g;
                });

                // 底部提示
                const endFs = el("fieldset", "layui-elem-field layui-field-title", wrapper, "text-align:center");
                const endLg = el("legend", "", endFs, "font-size:0.8em;opacity:0.5");
                endLg.textContent = "到底了";

                const w = window.layui.device().mobile ? "100%" : "620px";
                ctx.ui.layer.open({
                    type: 1, offset: "r", anim: "slideLeft", area: [w, "100%"], scrollbar: false, shade: 0.1, shadeClose: false,
                    btn: ["保存设置", "取消"], btnAlign: "r", title: "NodeSeek X 设置", id: "setting-layer-direction-r", content: cont.outerHTML,
                    success: ly => {
                        const r = ly?.[0] || ly;
                        try { window.layui.form?.render(); } catch { }
                        r?.querySelectorAll?.("label[data-desc]").forEach(lbl => {
                            lbl.onmouseenter = () => ctx.ui.tips?.(lbl.getAttribute("data-desc"), lbl, { tips: [1, '#333'], time: 0 });
                            lbl.onmouseleave = () => ctx.ui.layer?.closeAll?.('tips');
                        });
                        // 滚动同步：右侧滚动时高亮左侧菜单
                        const content = r?.querySelector?.("#nsx-config-content");
                        const menu = r?.querySelector?.("#nsx-config-menu");
                        if (content && menu) {
                            const items = menu.querySelectorAll("li");
                            content.addEventListener("scroll", () => {
                                const groups = content.querySelectorAll("fieldset[id^='group-']");
                                let activeIdx = 0;
                                groups.forEach((g, i) => { if (g.offsetTop - content.scrollTop <= 50) activeIdx = i; });
                                items.forEach((li, i) => li.classList.toggle("layui-menu-item-checked", i === activeIdx));
                            }, { passive: true });
                        }
                        // 主开关联动
                        const toggleCard = (card, on) => {
                            card.querySelectorAll(".layui-card-body input,.layui-card-body select,.layui-card-body textarea").forEach(el => {
                                el.disabled = !on;
                                el.closest(".layui-form-item")?.classList.toggle("layui-disabled", !on);
                            });
                            window.layui.form?.render(null, card.getAttribute("lay-filter"));
                        };
                        // 初始 + 监听
                        r?.querySelectorAll?.(".header-checkbox input").forEach(cb => !cb.checked && toggleCard(cb.closest(".nsx-config-card"), false));
                        window.layui.form?.on("switch(nsx-main-switch)", d => toggleCard(d.elem.closest(".nsx-config-card"), d.elem.checked));
                        window.layui.use("colorpicker", () => {
                            const cp = window.layui.colorpicker;
                            r?.querySelectorAll?.("[data-color-path]").forEach(wrap => {
                                const inp = r.querySelector(`input[name="${wrap.dataset.colorInp}"]`), init = wrap.dataset.colorVal || "", def = wrap.dataset.colorDefault || "";
                                const setBg = c => { if (inp) inp.style.background = c || ""; };
                                const render = color => cp.render({ elem: wrap, color, alpha: true, predefine: true, format: "rgb", change: setBg, done(c) { if (inp) inp.value = c || def; if (!c && def) { render(def); setBg(def); } }, cancel: setBg });
                                render(init);
                            });
                        });
                    },
                    yes: (idx, ly) => {
                        const r = ly?.[0] || ly, sc = r?.querySelector ? r : document;
                        sc.querySelectorAll("input,select,textarea").forEach(el => {
                            if (!el.name) return;
                            // radio 只保存选中的那个
                            if (el.type === "radio" && !el.checked) return;
                            let v;
                            const vt = el.dataset.valueType;
                            if (el.type === "checkbox") v = el.checked;
                            else if (el.type === "radio") v = vt === "number" ? Number(el.value) : el.value;
                            else if (el.tagName === "TEXTAREA") v = vt === "array" ? el.value.split("\n").map(s => s.trim()).filter(Boolean) : el.value;
                            else if (el.type === "number" || vt === "number") { const n = Number(el.value); v = Number.isFinite(n) ? n : 0; }
                            else v = el.value;
                            if (v !== undefined) store.set(el.name, v);
                        });
                        ctx.ui.layer.msg("设置已保存，刷新生效");
                        ctx.ui.layer.close(idx);
                    }
                });
            };

            const menus = [
                { name: "sign_in", cb: switchState, text: "自动签到", states: [{ s1: "❌", s2: "关闭" }, { s1: "🎲", s2: "随机🍗" }, { s1: "📌", s2: "5个🍗" }] },
                { name: "re_sign", cb: reSign, text: "🔂 重试签到", states: [] },
                { name: "loading_post", cb: switchState, text: "下拉翻页", states: [{ s1: "❌", s2: "关闭" }, { s1: "✅", s2: "开启" }] },
                { name: "open_post_in_new_tab", cb: (n, s) => { switchState(n, s); ctx.ui.layer.msg("刷新页面生效"); }, text: "新标签页打开帖子", states: [{ s1: "❌", s2: "关闭" }, { s1: "✅", s2: "开启" }] },
                { name: "advanced_settings", cb: advSettings, text: "⚙️ 高级设置", states: [] },
                { name: "feedback", cb: () => GM_openInTab("https://greasyfork.org/zh-CN/scripts/479426/feedback", { active: true, insert: true, setParent: true }), text: "💬 反馈 & 建议", states: [] }
            ];

            regMenus();
        }
    };

    const __vite_glob_0_14 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: menus
    }, Symbol.toStringTag, { value: 'Module' }));

    // 新标签页打开站内帖子（底层同步）
    const openPostInNewTab = {
        id: "openPostInNewTab",
        order: 35,
        cfg: { open_post_in_new_tab: { enabled: false } },
        meta: { open_post_in_new_tab: { label: "新标签页打开帖子", group: "内容设置" } },
        match: () => true,
        init(ctx) {
            const val = ctx.store.get("open_post_in_new_tab.enabled", false);
            try {
                ctx.uw.indexedDB.open("ns-preference-db").onsuccess = e => {
                    const db = e.target.result;
                    const s = db.transaction("ns-preference-store", "readwrite").objectStore("ns-preference-store");
                    s.get("configuration").onsuccess = e2 => {
                        const c = e2.target.result || {};
                        if (c.openPostInNewPage !== val) {
                            c.openPostInNewPage = val;
                            s.put(c, "configuration");
                        }
                    };
                };
            } catch { }
        },
        watch: ctx => {
            if (!ctx.store.get("open_post_in_new_tab.enabled", false)) return;
            return {
                sel: '.post-list-item .post-title a',
                fn: els => els.forEach(a => {
                    if (a.target !== "_blank") {
                        a.target = "_blank";
                    }
                }),
                opts: { debounce: 80 }
            };
        }
    };

    const __vite_glob_0_15 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: openPostInNewTab
    }, Symbol.toStringTag, { value: 'Module' }));

    // 快捷评论

    const quickComment = {
        id: "quickComment",
        order: 120,
        cfg: { quick_comment: { enabled: true } },
        meta: { quick_comment: { label: "快捷评论", group: "内容设置" } },
        match: ctx => ctx.loggedIn && ctx.isPost && ctx.store.get("loading_comment.enabled", true) && ctx.store.get("quick_comment.enabled", true),
        init(ctx) {
            const editor = $(".md-editor"), parent = $("#back-to-parent"), group = $("#fast-nav-button-group");
            if (!editor || !parent || !group) return;
            let open = false;

            const show = e => {
                if (open) return;
                e?.preventDefault?.();
                editor.style.cssText = `position:fixed;bottom:0;margin:0;width:100%;max-width:${editor.clientWidth || 720}px;z-index:999`;
                addClose();
                open = true;
            };

            const btn = parent.cloneNode(true);
            btn.id = "back-to-comment";
            btn.innerHTML = `<svg class="iconpark-icon" style="width:24px;height:24px"><use href="#comments"></use></svg>`;
            btn.onclick = show;
            parent.before(btn);

            $$(".nsk-post .comment-menu,.comment-container .comments").forEach(el => el.addEventListener("click", e => {
                if (["引用", "回复", "编辑"].includes(e.target?.textContent)) show(e);
            }, true));

            function addClose() {
                const tb = $("#editor-body .window_header > :last-child");
                if (!tb || $(".nsx-close-editor")) return;
                const cb = tb.cloneNode(true);
                cb.classList.add("nsx-close-editor");
                cb.title = "关闭";
                const sp = cb.querySelector("span");
                if (sp) {
                    sp.classList.replace("i-icon-full-screen-one", "i-icon-close");
                    sp.innerHTML = `<svg width="16" height="16" viewBox="0 0 48 48" fill="none"><path d="M8 8L40 40M8 40L40 8" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                }
                cb.onclick = () => { editor.style.cssText = ""; cb.remove(); open = false; };
                tb.after(cb);
            }
        }
    };

    const __vite_glob_0_16 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: quickComment
    }, Symbol.toStringTag, { value: 'Module' }));

    // 自动签到

    const signIn = {
        id: "signIn",
        order: 80,
        cfg: {
            sign_in: {
                ns: { enabled: true, method: 1, last_date: "" },
                df: { enabled: true, method: 1, last_date: "" }
            }
        },
        meta: {
            sign_in: {
                label: "自动签到", group: "基本设置",
                fields: { method: { type: "RADIO", label: "签到方式", valueType: "number", options: [{ value: 1, text: "随机🍗" }, { value: 2, text: "5个🍗" }] } },
                hidden: ["last_date"]
            }
        },
        match: ctx => ctx.site && ctx.loggedIn && ctx.store.get(`sign_in.${ctx.site.code}.enabled`, true),
        async init(ctx) {
            const code = ctx.site.code;
            const method = ctx.store.get(`sign_in.${code}.method`, 0);
            const now = (() => {
                const off = new Date().getTimezoneOffset() + 480;
                const bj = new Date(Date.now() + off * 60000);
                return `${bj.getFullYear()}/${bj.getMonth() + 1}/${bj.getDate()}`;
            })();
            if (ctx.store.get(`sign_in.${code}.last_date`) === now) return;
            ctx.store.set(`sign_in.${code}.last_date`, now);
            try {
                const r = await net.post(`/api/attendance?random=${method === 1}`);
                r?.success ? ctx.ui.success?.(`签到成功！+${r.gain}🍗，共${r.current}🍗`) : ctx.ui.info?.(r?.message || "签到失败");
            } catch (e) { ctx.ui.info?.(e?.message || "签到错误"); }
        }
    };

    const __vite_glob_0_17 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: signIn
    }, Symbol.toStringTag, { value: 'Module' }));

    // 签到提示

    const CSS = `.nsplus-tip{background:rgba(255,217,0,.8);padding:3px;text-align:center;animation:blink 5s ease infinite}.nsplus-tip p,.nsplus-tip p a{color:#f00}.nsplus-tip p a:hover{color:#0ff}`;

    const signinTips = {
        id: "signinTips",
        order: 82,
        cfg: { signin_tips: { enabled: true } },
        meta: { signin_tips: { label: "签到提示", group: "基本设置" } },
        match(ctx) {
            if (!ctx.site || !ctx.loggedIn || !ctx.store.get("signin_tips.enabled", true)) return false;
            return ctx.store.get(`sign_in.${ctx.site.code}.enabled`, true) === false;
        },
        init(ctx) {
            addStyle("nsx-signtip", CSS);
            const code = ctx.site.code;
            const now = (() => { const d = new Date(Date.now() + (new Date().getTimezoneOffset() + 480) * 6e4); return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; })();
            if (now === ctx.store.get(`sign_in.${code}.ignore_date`) || now === ctx.store.get(`sign_in.${code}.last_date`)) return;

            const header = $("header");
            if (!header) return;
            const tip = document.createElement("div");
            tip.className = "nsplus-tip";
            tip.innerHTML = `<p>今天还没签到！【<a class="nsx-sign" data-r="1">随机🍗</a>】【<a class="nsx-sign" data-r="0">5个🍗</a>】【<a class="nsx-ign">今天不提示</a>】</p>`;
            header.appendChild(tip);

            $$(".nsx-sign", tip).forEach(a => a.onclick = async e => {
                e.preventDefault();
                try {
                    const r = await net.post(`/api/attendance?random=${a.dataset.r === "1"}`);
                    r?.success ? ctx.ui.success?.(`签到成功！+${r.gain}🍗`) : ctx.ui.info?.(r?.message || "签到失败");
                } catch (e) { ctx.ui.warning?.(e?.message || "失败"); }
                tip.remove();
                ctx.store.set(`sign_in.${code}.last_date`, now);
            });
            $(".nsx-ign", tip).onclick = e => { e.preventDefault(); tip.remove(); ctx.store.set(`sign_in.${code}.ignore_date`, now); };
        }
    };

    const __vite_glob_0_18 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: signinTips
    }, Symbol.toStringTag, { value: 'Module' }));

    // 平滑滚动

    const smoothScroll = {
        id: "smoothScroll",
        order: 340,
        cfg: { smooth_scroll: { enabled: true } },
        meta: { smooth_scroll: { label: "平滑滚动", group: "显示设置" } },
        match: ctx => ctx.store.get("smooth_scroll.enabled", true),
        init() {
            addStyle("nsx-smooth", "html{scroll-behavior:smooth}");
        }
    };

    const __vite_glob_0_19 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: smoothScroll
    }, Symbol.toStringTag, { value: 'Module' }));

    // 用户卡片扩展 - 跨标签页同步未读消息

    class Broadcast {
        static ins = new Map();
        constructor(name) {
            if (Broadcast.ins.has(name)) return Broadcast.ins.get(name);
            this.myId = `${Date.now()}-${Math.random()}`;
            this.recv = [];
            this.KEY = `nsx_tab_${name}`;
            try { this.ch = new BroadcastChannel(name); this.ch.onmessage = e => this.recv.forEach(f => f(e.data)); } catch { this.ch = null; }
            addEventListener("storage", e => { if (e.key === this.KEY) { e.newValue || localStorage.setItem(this.KEY, this.myId); this._up(); } });
            addEventListener("beforeunload", () => { if (this.active) localStorage.removeItem(this.KEY); });
            localStorage.setItem(this.KEY, this.myId);
            this._up();
            Broadcast.ins.set(name, this);
        }
        _up() { this.active = localStorage.getItem(this.KEY) === this.myId; }
        on(fn) { this.recv.push(fn); }
        send(data) { if (!this.ch) return; const m = { sender: this.myId, data }; this.ch.postMessage(m); this.recv.forEach(f => f(m)); }
        task(fn, ms) { setInterval(async () => { if (!this.active) return; try { const d = await fn(); if (d !== undefined) this.send(d); } catch { } }, ms); }
    }

    const userCardExt = {
        id: "userCardExt",
        order: 200,
        cfg: { user_card_ext: { enabled: true } },
        meta: { user_card_ext: { label: "用户卡片扩展", group: "显示设置" } },
        match: ctx => ctx.loggedIn && (ctx.isPost || ctx.isList) && ctx.store.get("user_card_ext.enabled", true),
        async init(ctx) {
            const bn = new Broadcast("nsx_notify");
            let unread = -1, timer = 0, originalTitle = "";
            const stopNotice = () => {
                if (!timer) return;
                clearInterval(timer);
                timer = 0;
                document.title = originalTitle;
            };
            const updateNotice = counts => {
                const next = +counts.all || 0, hasNew = unread >= 0 && next > unread;
                unread = next;
                if (!next) return stopNotice();
                if (!hasNew || document.hasFocus()) return;
                stopNotice();
                originalTitle = document.title;
                const title = [...`【🔔 新消息】${originalTitle}　`];
                document.title = title.join("");
                timer = setInterval(() => {
                    title.push(...title.splice(0, 1));
                    document.title = title.join("");
                }, 300);
            };
            addEventListener("focus", stopNotice);

            const card = $(".user-card .user-stat");
            const last = card?.querySelector(".stat-block:first-child > :last-child");
            if (!card || !last) return;

            const atEl = last.cloneNode(true), msgEl = last.cloneNode(true);
            last.after(atEl);
            card.querySelector(".stat-block:last-child")?.append(msgEl);

            const up = (el, href, icon, text, cnt) => {
                const a = el.querySelector("a");
                if (!a) return;
                a.href = href;
                el.querySelector("a svg use")?.setAttribute("href", icon);
                const t = el.querySelector("a > :nth-child(2)");
                if (t) t.textContent = `${text} `;
                const c = el.querySelector("a > :last-child");
                if (c) { c.textContent = cnt; c.classList.toggle("notify-count", cnt > 0); }
            };
            const upAll = c => { up(atEl, "/notification#/atMe", "#at-sign", "我", c.atMe); up(msgEl, "/notification#/message?mode=list", "#envelope-one", "私信", c.message); up(last, "/notification#/reply", "#remind-6nce9p47", "回复", c.reply); };

            bn.on(({ data }) => {
                if (data?.type !== "unreadCount" || !data.counts) return;
                upAll(data.counts);
                updateNotice(data.counts);
            });
            bn.send({ type: "unreadCount", counts: ctx.user?.unViewedCount || {}, timestamp: Date.now() });
            bn.task(async () => {
                const d = await net.get("/api/notification/unread-count");
                if (d?.success && d.unreadCount) return { type: "unreadCount", counts: d.unreadCount, timestamp: Date.now() };
                throw 0;
            }, 5000);
        }
    };

    const __vite_glob_0_20 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: userCardExt
    }, Symbol.toStringTag, { value: 'Module' }));

    // 已访问链接颜色

    const DEFAULT_LIGHT = "#afb9c1";
    const DEFAULT_DARK = "#393f4e";

    const visitedColor = {
        id: "visitedColor",
        order: 350,
        cfg: { visited_color: { enabled: true, light: DEFAULT_LIGHT, dark: DEFAULT_DARK } },
        meta: {
            visited_color: {
                label: "已访问颜色",
                group: "显示设置",
                // cols: 2,
                fields: {
                    light: { type: "COLOR", label: "浅色模式" },
                    dark: { type: "COLOR", label: "深色模式" }
                }
            }
        },
        match: ctx => ctx.isList && ctx.store.get("visited_color.enabled", true),
        init(ctx) {
            const light = ctx.store.get("visited_color.light", DEFAULT_LIGHT);
            const dark = ctx.store.get("visited_color.dark", DEFAULT_DARK);
            addStyle("nsx-visited-color", `.post-list .post-title a:visited{color:${light}}body.dark-layout .post-list .post-title a:visited{color:${dark}}`);
        }
    };

    const __vite_glob_0_21 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: visitedColor
    }, Symbol.toStringTag, { value: 'Module' }));

    // ===== SVG 图标 =====
    const SVG_SPRITE = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
<symbol id="copy" viewBox="0 0 48 48"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M13 12.432v-4.62A2.813 2.813 0 0 1 15.813 5h24.374A2.813 2.813 0 0 1 43 7.813v24.375A2.813 2.813 0 0 1 40.188 35h-4.672M7.813 13h24.374A2.813 2.813 0 0 1 35 15.813v24.374A2.813 2.813 0 0 1 32.188 43H7.813A2.813 2.813 0 0 1 5 40.188V15.813A2.813 2.813 0 0 1 7.813 13Z"/></symbol>
<symbol id="check" viewBox="0 0 48 48"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="m4 24 5-5 10 10L39 9l5 5-25 25L4 24Z"/></symbol>
<symbol id="history" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M5.818 6.727V14h7.273"/><path d="M4 24c0 11.046 8.954 20 20 20s20-8.954 20-20S35.046 4 24 4c-7.32 0-13.715 3.932-17.192 9.8"/><path d="M24 12v14l9.33 9.33"/></g></symbol>
<symbol id="comments" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="4"><path d="M44 6H4v30h8.5v7l9-7H44V6Z"/><path stroke-linecap="round" d="M14 19.5h20M14 27.5h12"/></g></symbol>
<symbol id="at-sign" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M24 44c11.046 0 20-8.954 20-20S35.046 4 24 4 4 12.954 4 24s8.954 20 20 20"/><path d="M32 24c0 4.418-3.582 10-8 10s-8-5.582-8-10 3.582-8 8-8 8 3.582 8 8m0 0v10c0 3 3 6 6 6"/></g></symbol>
<symbol id="envelope-one" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M4 39h40V9H4z"/><path d="m4 9 20 15L44 9"/></g></symbol>
<symbol id="remind-6nce9p47" viewBox="0 0 48 48"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M24 44c1.387 0 2.732-.123 4.023-.357M44 24a20 20 0 0 0-40 0c0 4.59 1.55 8.82 4.157 12.194L4 44l7.806-4.157A19.9 19.9 0 0 0 24 44a20 20 0 0 0 4.023-.357"/><path d="M33.805 40a6 6 0 1 0 5.857-9.805"/></g></symbol>
<symbol id="down" viewBox="0 0 48 48"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="m36 18-12 12-12-12"/></symbol>
</svg>`;

    // ===== 基础 CSS =====
    const BASE_CSS = `.blocked-post{display:none!important}#back-to-comment{display:flex}#fast-nav-button-group .nav-item-btn:nth-last-child(4){bottom:120px}header div.history-dropdown-on{color:var(--link-hover-color);cursor:pointer;padding:0 5px;position:absolute;right:50px}.msc-overlay{background-color:var(--bg-sub-color)}`;

    // ===== Observer =====
    class Observer {
        constructor() { this.listeners = []; this.mo = null; }
        watch(sel, fn, opts = {}) {
            this.listeners.push({ sel, fn, opts });
            if (!this.mo) {
                this.mo = new MutationObserver(debounce(() => this._run(), 50));
                this.mo.observe(document.body, { childList: true, subtree: true });
            }
        }
        _run() {
            this.listeners.forEach(({ sel, fn, opts }) => {
                const els = $$(sel);
                if (els.length) fn(els, opts);
            });
        }
    }

    // ===== 创建 ctx =====
    function createCtx(obs) {
        const uw = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
        return {
            env, $, $$, addStyle, store, net,
            uw,
            get loggedIn() { return !!uw?.__config__?.user; },
            get user() { return uw?.__config__?.user; },
            get uid() { return uw?.__config__?.user?.member_id; },
            site: env.site,
            isPost: /^\/post-/.test(location.pathname),
            isList: /^\/(categories\/|page|award|search|$)/.test(location.pathname),
            watch: obs.watch.bind(obs),
            ui: {}
        };
    }

    // ===== 启动 =====
    function start() {
        // 注入资源
        document.body?.insertAdjacentHTML("beforeend", SVG_SPRITE);
        addStyle("nsx-base", BASE_CSS);
        // layui CSS
        addStyle("nsx-layui-css", "https://s.cfn.pp.ua/layui/2.10.3/css/layui.css");
        addStyle("nsx-layui-dark", "https://s.cfn.pp.ua/layui/theme-dark/2.10.3/css/layui-theme-dark-selector.css");

        // 加载模块
        const mods = /* #__PURE__ */ Object.assign({"./features/autoLoading.js": __vite_glob_0_0,"./features/blockMembers.js": __vite_glob_0_1,"./features/blockPosts.js": __vite_glob_0_2,"./features/blockViewLevel.js": __vite_glob_0_3,"./features/codeHighlight.js": __vite_glob_0_4,"./features/commentFootprint.js": __vite_glob_0_5,"./features/darkMode.js": __vite_glob_0_6,"./features/editorEnhance.js": __vite_glob_0_7,"./features/history.js": __vite_glob_0_8,"./features/imageSlide.js": __vite_glob_0_9,"./features/imageUpload.js": __vite_glob_0_10,"./features/instantPage.js": __vite_glob_0_11,"./features/levelTag.js": __vite_glob_0_12,"./features/linkPurifier.js": __vite_glob_0_13,"./features/menus.js": __vite_glob_0_14,"./features/openPostInNewTab.js": __vite_glob_0_15,"./features/quickComment.js": __vite_glob_0_16,"./features/signIn.js": __vite_glob_0_17,"./features/signinTips.js": __vite_glob_0_18,"./features/smoothScroll.js": __vite_glob_0_19,"./features/userCardExt.js": __vite_glob_0_20,"./features/visitedColor.js": __vite_glob_0_21});
        Object.values(mods).forEach(m => m.default && define(m.default));

        // 创建 Observer & ctx
        const obs = new Observer();
        const ctx = createCtx(obs);

        // 初始化 UI (依赖 layui)
        const noop = () => { };
        const UI_NOOP = { toast: noop, info: noop, success: noop, warning: noop, error: noop, alert: noop, confirm: noop, tips: noop };
        const initUI = () => {
            if (!window.layui?.layer) return (ctx.ui = UI_NOOP);
            const layer = window.layui.layer, uw = ctx.uw;
            ctx.ui = {
                layer,
                toast: (text, style) => { const idx = layer.msg(text, { offset: 't', area: ['100%', 'auto'], anim: 'slideDown' }); layer.style(idx, Object.assign({ opacity: 0.9 }, style)); return idx; },
                info: msg => ctx.ui.toast(msg, { "background-color": "#4D82D6" }),
                success: msg => ctx.ui.toast(msg, { "background-color": "#57BF57" }),
                warning: msg => ctx.ui.toast(msg, { "background-color": "#D6A14D" }),
                error: msg => ctx.ui.toast(msg, { "background-color": "#E1715B" }),
                alert: (t, c, fn) => uw?.mscAlert ? (c === undefined ? uw.mscAlert(t) : uw.mscAlert(t, c)) : layer.alert(c, { title: t, icon: 0, btn: ["确定"] }, fn),
                confirm: (t, c, y, n) => uw?.mscConfirm ? uw.mscConfirm(t, c, y, n) : layer.confirm(c, { title: t, icon: 0, btn: ["确定", "取消"] }, y, n),
                tips: (msg, el, opts) => layer.tips(msg, el, opts)
            };
        };
        initUI();
        if (!ctx.ui.layer) {
            const timer = setInterval(() => { if (window.layui?.layer) { initUI(); clearInterval(timer); } }, 100);
            setTimeout(() => clearInterval(timer), 5000);
        }

        // vConsole（仅 debug 模式）
        if (store.get("debug.enabled")) {
            addScript("nsx-vconsole", "https://s4.zstatic.net/ajax/libs/vConsole/3.15.1/vconsole.min.js", () => new ctx.uw.VConsole());
        }

        // 启动所有模块
        boot(ctx);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

})();
