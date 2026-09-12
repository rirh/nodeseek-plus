// ==UserScript==
// @name         Nodeseek Pro
// @description  用于增强 NodeSeek/DeepFlood 论坛体验的用户脚本：提供自动签到、下拉加载、快速评论、内容过滤、等级标记、浏览历史、Callout 渲染、图片预览、快捷键等功能，并带可视化设置面板可自由开关配置。
// @namespace    http://www.nodeseek.com/
// @version      1.0.8
// @match        *://www.nodeseek.com/*
// @match        *://www.deepflood.com/*
// @require      https://s4.zstatic.net/ajax/libs/layui/2.10.3/layui.min.js
// @resource     highlightStyle https://s4.zstatic.net/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css
// @resource     highlightStyle_dark https://s4.zstatic.net/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getResourceURL
// @grant        GM_addElement
// @grant        GM_addStyle
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-idle
// @license      GPL-3.0
// @downloadURL https://update.greasyfork.org/scripts/567109/Nodeseek%20Pro.user.js
// @updateURL https://update.greasyfork.org/scripts/567109/Nodeseek%20Pro.meta.js
// ==/UserScript==
(function () {
    'use strict';

    // AI 功能总开关：需在模块加载前定义
    // 设为 true 可加载 aiComment 模块
    var AI = false;

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

    function ensureIconGroup() {
        const head = document.querySelector('#nsk-head');
        if (!head) return null;

        const anchor = head.querySelector('.color-theme-switcher');
        const parent = head;

        let grp = document.getElementById('nsx-icon-group');
        if (!grp || grp.tagName !== 'DIV') {
            const old = grp;
            grp = document.createElement('div');
            grp.id = 'nsx-icon-group';
            grp.className = 'right-button-group';
            old?.replaceWith(grp);
        } else if (!grp.className) {
            grp.className = 'right-button-group';
        }

        const target = anchor && anchor.parentElement === parent ? anchor : null;
        if (target) {
            const alreadyInPlace = grp.parentElement === parent && grp.nextSibling === target;
            if (!alreadyInPlace) parent.insertBefore(grp, target);
        } else {
            const searchBox = head.querySelector('.search-box');
            if (searchBox && searchBox.parentElement === parent) {
                const alreadyInPlace = grp.parentElement === parent && grp.nextSibling === searchBox;
                if (!alreadyInPlace) parent.insertBefore(grp, searchBox);
            } else {
                const alreadyInPlace = grp.parentElement === parent && grp === parent.lastElementChild;
                if (!alreadyInPlace) parent.appendChild(grp);
            }
        }
        return grp;
    }

    function addStyle(id, val) {
        if (document.getElementById(id)) return;
        const isUrl = /^(https?:)?\/\//.test(val);
        const el = document.createElement(isUrl ? "link" : "style");
        el.id = id;
        isUrl ? (el.rel = "stylesheet", el.href = val) : (el.textContent = val);
        document.head?.appendChild(el);
    }

    function addScript(id, val) {
        if (document.getElementById(id)) return;
        const el = document.createElement("script");
        el.id = id;
        /^(https?:)?\/\//.test(val) ? (el.src = val) : (el.textContent = val);
        document.body?.appendChild(el);
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
        // 初始化和监听
        sorted.forEach(m => {
            if (m.match?.(ctx) !== false) {
                try { m.init?.(ctx); } catch (e) { env.error(m.id, e); }
                if (ctx.watch) {
                    const w = typeof m.watch === "function" ? m.watch(ctx) : m.watch;
                    [].concat(w || []).filter(Boolean).forEach(i => ctx.watch(i.sel, i.fn, i.opts));
                }
            }
        });
    }

    /* ==========================================================================
       [ 🧭 辅助工具 ] - 自动跳转外部链接
       ========================================================================== */
    const autoJump = {
        id: "autoJump",
        order: 210,
        cfg: { auto_jump_external_links: { enabled: true } },
        meta: { auto_jump_external_links: { label: "自动跳转外部链接", group: "🧭 辅助工具" } },
        match: ctx => ctx.store.get("auto_jump_external_links.enabled", true),
        init(ctx) {
            $$('a[href*="/jump?to="]').forEach(a => {
                try {
                    const to = new URL(a.href).searchParams.get("to");
                    if (to) a.href = decodeURIComponent(to);
                } catch { }
            });
            if (/^\/jump/.test(location.pathname)) ctx.$(".btn")?.click();
        }
    };

    const __vite_glob_0_0 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: autoJump
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 🧭 辅助工具 ] - 下拉加载 / 自动翻页 (Infinite Scroll)
       ========================================================================== */

    const PROFILES = {
        list: { path: /^\/(categories\/|page|award|search|$)/, threshold: 1500, next: ".nsk-pager a.pager-next", list: "ul.post-list:not(.topic-carousel-panel)", pagerTop: "div.nsk-pager.pager-top", pagerBot: "div.nsk-pager.pager-bottom" },
        post: { path: /^\/post-/, threshold: 690, next: ".nsk-pager a.pager-next", list: "ul.comments", pagerTop: "div.nsk-pager.post-top-pager", pagerBot: "div.nsk-pager.post-bottom-pager" }
    };

    const autoLoading = {
        id: "autoLoading",
        order: 220,
        cfg: { loading_post: { enabled: true }, loading_comment: { enabled: true } },
        meta: {
            loading_post: { label: "自动加载下一页(帖子)", group: "🧭 辅助工具" },
            loading_comment: { label: "自动加载下一页(评论)", group: "🧭 辅助工具" }
        },
        match: ctx => ctx.isList || ctx.isPost,
        init(ctx) {
            const profile = ctx.isList ? PROFILES.list : ctx.isPost ? PROFILES.post : null;
            if (!profile) return;

            const cfgKey = ctx.isList ? "loading_post.enabled" : "loading_comment.enabled";
            let isEnabled = ctx.store.get(cfgKey, true);

            // 注入快捷开关按钮：纯净创造节点，以原生的 class 和 CSS 层叠逻辑定位
            const navGroup = ctx.$("#fast-nav-button-group");
            if (navGroup) {
                const btn = document.createElement("a");
                btn.className = "nav-item-btn";
                btn.id = "nsx-toggle-autoload";
                btn.href = "javascript:void(0);";

                const updateBtn = () => {
                    // 开启时：绿色向下加载流水线； 关闭时：鲜红色带禁止图标
                    if (isEnabled) {
                        btn.title = "瀑布流自动加载：已开启 (点击休眠)";
                        btn.innerHTML = `<svg viewBox="0 0 48 48" fill="none" class="iconpark-icon" style="width:24px;height:24px;color:#4caf50;"><path d="M24 10V38M12 26L24 38L36 26" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                    } else {
                        btn.title = "瀑布流自动加载：已休眠 (点击开启)";
                        btn.innerHTML = `<svg viewBox="0 0 48 48" fill="none" class="iconpark-icon" style="width:24px;height:24px;color:#f44336;"><path d="M24 10V38M12 26L24 38L36 26" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 8L40 40" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                    }
                };
                updateBtn();

                btn.onclick = (e) => {
                    e.preventDefault();
                    isEnabled = !isEnabled;
                    ctx.store.set(cfgKey, isEnabled);
                    updateBtn();
                    ctx.ui?.toast?.(isEnabled ? "✅ 瀑布流向下加载已开启" : "❌ 瀑布流加载已停用");
                };

                // 置于结构序列的第一位，由扩展的 nth-last-child CSS 接管精准定位！
                navGroup.prepend(btn);
            }

            let busy = false, prevY = scrollY;

            const blockByLevel = (doc) => {
                const lv = ctx.user?.rank || 0;
                doc.querySelectorAll('.post-list-item use[href="#lock"]').forEach(el => {
                    const n = +(el.closest("span")?.textContent?.match(/\d+/)?.[0] || 0);
                    if (n > lv) el.closest(".post-list-item")?.classList.add("blocked-post");
                });
            };
            const processCommentMenus = (commentElements) => {
                if (!ctx.isPost || !commentElements?.length) return;
                const existingMenu = document.querySelector(".comment-menu");
                const vue = existingMenu?.__vue__;
                if (!vue?.$root?.constructor || !vue?.$options) return;
                const startIndex = document.querySelectorAll(".content-item").length - commentElements.length;
                commentElements.forEach((comment, index) => {
                    const menuMount = document.createElement("div");
                    menuMount.className = "comment-menu-mount";
                    comment.appendChild(menuMount);
                    try {
                        const menuInstance = new vue.$root.constructor(vue.$options);
                        if (typeof menuInstance.setIndex === "function") menuInstance.setIndex(startIndex + index);
                        if (typeof menuInstance.$mount === "function") menuInstance.$mount(menuMount);
                    } catch { }
                });
            };

            const load = async () => {
                if (!isEnabled || busy) return;
                const atBottom = document.documentElement.scrollHeight <= innerHeight + scrollY + profile.threshold;
                if (!atBottom) return;
                const nextUrl = ctx.$(profile.next)?.href;
                if (!nextUrl) return;

                busy = true;
                try {
                    const html = await net.get(nextUrl, {}, "text");
                    const doc = new DOMParser().parseFromString(html, "text/html");
                    blockByLevel(doc);

                    // 评论数据同步
                    if (ctx.isPost) {
                        const json = doc.getElementById("temp-script")?.textContent;
                        if (json) try {
                            const cfg = JSON.parse(decodeURIComponent(atob(json).split("").map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")));
                            if (cfg?.postData?.comments) ctx.uw.__config__.postData.comments.push(...cfg.postData.comments);
                        } catch { }
                    }

                    const src = doc.querySelector(profile.list), dst = document.querySelector(profile.list);
                    if (src && dst) {
                        const appended = Array.from(src.children);
                        dst.append(...appended);
                        processCommentMenus(appended);
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

            document.addEventListener('click', e => {
                const a = e.target.closest('a');
                if (a && (a.classList.contains('pager-pos') || a.classList.contains('pager-prev') || a.classList.contains('pager-next') || a.closest('.nsk-pager'))) {
                    a.target = '_self';
                    e.stopImmediatePropagation();
                }
            }, true);
        }
    };

    const __vite_glob_0_1 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: autoLoading
    }, Symbol.toStringTag, { value: 'Module' }));


    /* ==========================================================================
       [ 🚫 过滤设置 ] - 关键字过滤 (帖子屏蔽)
       ========================================================================== */



    const blockPosts = {
        id: "blockPosts",
        order: 380,
        cfg: { block_posts: { enabled: true, highlight_color: "#fff9c4" } },
        meta: {
            block_posts: {
                label: "关键字管理", group: "🚫 过滤设置",
                fields: {
                    highlight_color: { type: "COLOR", label: "默认高亮色" }
                }
            }
        },
        match: ctx => (ctx.isList || ctx.isPost) && ctx.store.get("block_posts.enabled", true),
        init(ctx) {
            const keywordsKey = 'nsx_advanced_keywords';
            const getMap = () => { try { return JSON.parse(localStorage.getItem(keywordsKey) || '{}'); } catch { return {}; } };
            const saveMap = (map) => localStorage.setItem(keywordsKey, JSON.stringify(map));

            const runFilter = (els) => {
                const kws = getMap();
                const kwEntries = Object.entries(kws);
                if (!kwEntries.length) return;
                const hColor = ctx.store.get("block_posts.highlight_color", "#fff9c4");

                els.forEach(item => {
                    if (item.dataset.nsxKwProcessed) return;
                    const titleEl = item.querySelector(".post-title>a");
                    const title = titleEl?.textContent?.toLowerCase() || "";
                    if (!title) return;

                    let matchedColors = [];
                    let shouldHide = false;
                    let foldWords = [];

                    for (const [word, info] of kwEntries) {
                        const groupWords = String(word || "").split(/[，,]/).map(s => s.trim().toLowerCase()).filter(Boolean);
                        if (!groupWords.length) continue;
                        const hit = groupWords.some(w => title.includes(w));
                        if (!hit) continue;

                        if (info.type === 'highlight') {
                            matchedColors.push(info.color || "#fff9c4");
                        } else if (info.type === 'block') {
                            if (info.mode === 'hide') {
                                shouldHide = true;
                                break;
                            } else {
                                foldWords.push(word);
                            }
                        }
                    }

                    if (shouldHide) {
                        item.style.display = 'none';
                    } else if (foldWords.length > 0) {
                        item.classList.add('nsx-post-folded');
                        if (!item.querySelector('.nsx-fold-notice')) {
                            const notice = document.createElement('div');
                            notice.className = 'nsx-fold-notice';
                            notice.style.padding = '10px 15px';
                            const kwText = foldWords.map(w => w.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])).join(', ');
                            notice.innerHTML = `<span>已折叠包含关键词 [<b>${kwText}</b>] 的主题</span><span class="nsx-unfold-btn" style="text-decoration:underline;cursor:pointer">点此查看</span>`;
                            notice.querySelector('.nsx-unfold-btn').onclick = () => { item.classList.remove('nsx-post-folded'); notice.style.display = 'none'; };
                            item.prepend(notice);
                        }
                    } else if (matchedColors.length > 0) {
                        item.style.transition = "background-color 0.3s, background 0.3s";
                        if (matchedColors.length === 1) {
                            item.style.backgroundColor = matchedColors[0];
                        } else {
                            // 多个关键字冲突：使用线性渐变色
                            const uniqueColors = [...new Set(matchedColors)];
                            if (uniqueColors.length === 1) {
                                item.style.backgroundColor = uniqueColors[0];
                            } else {
                                item.style.background = `linear-gradient(90deg, ${uniqueColors.join(', ')})`;
                            }
                        }
                    }

                    if (shouldHide || foldWords.length > 0 || matchedColors.length > 0) {
                        item.dataset.nsxKwProcessed = "1";
                    }
                });
            };

            const reapplyKeywords = () => {
                const all = $$(".post-list-item");
                all.forEach(item => {
                    delete item.dataset.nsxKwProcessed;
                    item.style.display = "";
                    item.style.backgroundColor = "";
                    item.style.background = "";
                    item.style.transition = "";
                    item.classList.remove("nsx-post-folded");
                    item.querySelectorAll(".nsx-fold-notice").forEach(n => n.remove());
                });
                runFilter(all);
            };

            runFilter($$(".post-list-item"));
            ctx.watch(".post-list-item", els => runFilter(els), { debounce: 150 });
            window.__nsxRuntime ||= {};
            window.__nsxRuntime.reapplyKeywords = reapplyKeywords;

            // --- 独立的关键字面板逻辑 ---
            let kwPanel = null, kwTrigger = null, pState = { open: false, kw: "", tab: "block" };
            const head = ctx.$("#nsk-head");
            if (head) {
                const grp = ensureIconGroup();
                if (!grp) return;
                kwTrigger = document.createElement("div");
                kwTrigger.className = "filter-dropdown-on";
                kwTrigger.style.cssText = "";
                kwTrigger.innerHTML = `<svg viewBox="0 0 48 48" fill="none" style="width:17px;height:17px;color:currentColor;"><path d="M6 9L20.4 25.8178V38.4444L27.6 42V25.8178L42 9H6Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>`;
                kwTrigger.title = "关键字过滤管理";
                grp.appendChild(kwTrigger);

                const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

                const renderList = () => {
                    const map = getMap();
                    let list = Object.entries(map).map(([k, v]) => ({ word: k, ...v }));
                    if (pState.kw) list = list.filter(i => i.word.toLowerCase().includes(pState.kw));
                    list = list.filter(i => (pState.tab === 'highlight' ? i.type === 'highlight' : i.type !== 'highlight'));
                    list.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

                    kwPanel.querySelectorAll('.nsx-rel-tab').forEach(b => b.classList.toggle('is-active', b.dataset.t === pState.tab));
                    const lEl = kwPanel.querySelector(".nsx-rel-list");
                    if (!list.length) { lEl.innerHTML = `<div class="nsx-rel-empty">当前分组没有关键字</div>`; return; }

                    lEl.innerHTML = list.map(i => {
                        let iconColor = i.type === 'highlight' ? (i.color || "#ffb300") : "#9e9e9e";
                        return `<div class="nsx-rel-item">
                            <div class="nsx-rel-link">
                                <span class="nsx-rel-icon" style="color:white;background:${iconColor};opacity:0.8;font-size:14px;${i.type === 'highlight' ? 'border:1px solid rgba(0,0,0,0.1)' : ''}">#</span>
                                <div class="nsx-rel-info">
                                    <span class="nsx-rel-item-title" data-un="${esc(i.word)}">${esc(i.word)}</span>
                                    <span class="nsx-rel-remark" data-un="${esc(i.word)}">${i.type === 'highlight' ? '高亮 (颜色: ' + (i.color || "默认") + ')' : (i.mode === 'hide' ? '彻底隐藏' : '折叠展示')}（双击编辑）</span>
                                </div>
                            </div>
                            <span class="nsx-rel-time">${i.time ? i.time.split(' ')[0] : ''}</span>
                            <button class="nsx-rel-close" data-a="del" data-un="${esc(i.word)}">移除</button>
                        </div>`;
                    }).join("");
                };

                const openPanel = () => {
                    if (!kwPanel) {
                        kwPanel = document.createElement("div"); kwPanel.id = "nsx-filter-panel";
                        kwPanel.innerHTML = `
                                <div class="nsx-rel-header"><div class="nsx-rel-title">关键字过滤</div><div style="display:flex;gap:8px;"><button class="nsx-rel-action" data-a="add">➕ 新增</button><button class="nsx-rel-action" data-a="clear">清空当前组</button></div></div>
                                <div class="nsx-rel-search">🔍<input placeholder="搜索关键字与配置..."/></div>
                                <div class="nsx-rel-tabs"><button class="nsx-rel-tab is-active" data-t="block">🚫 屏蔽</button><button class="nsx-rel-tab" data-t="highlight">🎨 高亮</button></div>
                                <div class="nsx-rel-list"></div>
                            `;
                        document.body.appendChild(kwPanel);

                        kwPanel.querySelector("input").oninput = e => { pState.kw = e.target.value.toLowerCase(); renderList(); };
                        kwPanel.onclick = e => {
                            e.stopPropagation();
                            const t = e.target.closest('[data-t]');
                            if (t) { pState.tab = t.dataset.t; renderList(); return; }
                            const a = e.target.closest("[data-a]"); if (!a) return;
                            const act = a.dataset.a, un = a.dataset.un;

                            if (act === "clear") {
                                ctx.ui.confirm("清空列表?", `确定要删除当前分组（${pState.tab === 'highlight' ? '高亮' : '屏蔽'}）的关键字吗？`, () => {
                                    const map = getMap();
                                    Object.keys(map).forEach(k => {
                                        const it = map[k] || {};
                                        const isHighlight = it.type === 'highlight';
                                        if ((pState.tab === 'highlight' && isHighlight) || (pState.tab === 'block' && !isHighlight)) delete map[k];
                                    });
                                    saveMap(map); reapplyKeywords(); renderList(); ctx.ui.toast("已清空");
                                });
                            }
                            if (act === "del") {
                                const map = getMap(); delete map[un]; saveMap(map); reapplyKeywords(); renderList(); ctx.ui.toast("已移除");
                            }
                            if (act === "add") {
                                const html = `
                                        <style>
                                            .nsx-kw-form .layui-form-label{width:76px;padding-left:0}
                                            .nsx-kw-form .layui-input-block{margin-left:96px}
                                            .nsx-mobile .nsx-kw-form .layui-form-label{width:auto;float:none;text-align:left;padding:0 0 4px}
                                            .nsx-mobile .nsx-kw-form .layui-input-block{margin-left:0}
                                        </style>
                                        <div class="layui-form nsx-kw-form" style="padding:20px 20px 0;">
                                            <div class="layui-form-item"><label class="layui-form-label">关键字</label><div class="layui-input-block"><input type="text" id="nkw-v" class="layui-input" placeholder="输入词语（可用 , 分隔，同一组）"></div></div>
                                            <div class="layui-form-item"><label class="layui-form-label">类型</label><div class="layui-input-block"><select id="nkw-t" lay-filter="nkw-t-filter"><option value="block" ${pState.tab === 'block' ? 'selected' : ''}>🚫 屏蔽</option><option value="highlight" ${pState.tab === 'highlight' ? 'selected' : ''}>🎨 高亮</option></select></div></div>
                                            <div class="layui-form-item" id="nkw-m-box"><label class="layui-form-label">模式</label><div class="layui-input-block"><select id="nkw-m"><option value="fold">优雅折叠</option><option value="hide">彻底隐藏</option></select></div></div>
                                            <div class="layui-form-item" id="nkw-c-box" style="display:none;"><label class="layui-form-label">高亮颜色</label><div class="layui-input-block">
                                                <div id="nkw-color-picker"></div>
                                                <input type="hidden" id="nkw-c-val" value="#fff9c4">
                                            </div></div>
                                        </div>
                                    `;
                                ctx.ui.layer.open({
                                    title: '新增关键字', content: html, area: ['min(520px,94vw)', 'auto'], btn: ['添加', '取消'],
                                    success: (l) => {
                                        layui.use(['form', 'colorpicker'], function () {
                                            const form = layui.form;
                                            form.render('select');

                                            const syncTypeUI = (val) => {
                                                const isH = val === 'highlight';
                                                l.find('#nkw-m-box').toggle(!isH);
                                                l.find('#nkw-c-box').toggle(isH);
                                            };

                                            form.on('select(nkw-t-filter)', function (data) {
                                                syncTypeUI(data.value);
                                            });

                                            // 首次打开时根据默认选中项立即同步显示区域
                                            syncTypeUI(l.find('#nkw-t').val());

                                            layui.colorpicker.render({
                                                elem: '#nkw-color-picker',
                                                color: '#fff9c4',
                                                predefine: true,
                                                alpha: true,
                                                done: function (color) { l.find('#nkw-c-val').val(color); }
                                            });
                                        });
                                    },
                                    yes: (idx, l) => {
                                        const w = l.find('#nkw-v').val().trim();
                                        if (!w) return;
                                        const map = getMap();
                                        const type = l.find('#nkw-t').val();
                                        map[w] = {
                                            type,
                                            mode: type === 'block' ? l.find('#nkw-m').val() : null,
                                            color: type === 'highlight' ? l.find('#nkw-c-val').val() : null,
                                            time: new Date().toLocaleString()
                                        };
                                        saveMap(map); reapplyKeywords(); ctx.ui.layer.close(idx); renderList(); ctx.ui.toast("已添加");
                                    }
                                });
                            }
                        };
                        kwPanel.ondblclick = (e) => {
                            const target = e.target.closest('.nsx-rel-item-title,.nsx-rel-remark');
                            if (!target) return;
                            e.preventDefault();
                            e.stopPropagation();
                            const un = target.dataset.un;
                            const map = getMap();
                            const info = map[un];
                            if (!info) return;

                            const html = `
                                <style>
                                    .nsx-kw-form .layui-form-label{width:76px;padding-left:0}
                                    .nsx-kw-form .layui-input-block{margin-left:96px}
                                    .nsx-mobile .nsx-kw-form .layui-form-label{width:auto;float:none;text-align:left;padding:0 0 4px}
                                    .nsx-mobile .nsx-kw-form .layui-input-block{margin-left:0}
                                </style>
                                <div class="layui-form nsx-kw-form" style="padding:20px 20px 0;">
                                    <div class="layui-form-item"><label class="layui-form-label">关键字</label><div class="layui-input-block"><input type="text" id="nkw-e-v" class="layui-input" value="${esc(un)}" placeholder="可用 , 分隔，作为同一组"></div></div>
                                    <div class="layui-form-item"><label class="layui-form-label">类型</label><div class="layui-input-block"><select id="nkw-e-t" lay-filter="nkw-e-t-filter"><option value="block" ${info.type === 'highlight' ? '' : 'selected'}>🚫 屏蔽</option><option value="highlight" ${info.type === 'highlight' ? 'selected' : ''}>🎨 高亮</option></select></div></div>
                                    <div class="layui-form-item" id="nkw-e-m-box" style="${info.type === 'highlight' ? 'display:none;' : ''}"><label class="layui-form-label">模式</label><div class="layui-input-block"><select id="nkw-e-m"><option value="fold" ${info.mode === 'hide' ? '' : 'selected'}>优雅折叠</option><option value="hide" ${info.mode === 'hide' ? 'selected' : ''}>彻底隐藏</option></select></div></div>
                                    <div class="layui-form-item" id="nkw-e-c-box" style="${info.type === 'highlight' ? '' : 'display:none;'}"><label class="layui-form-label">高亮颜色</label><div class="layui-input-block"><div id="nkw-e-color-picker"></div><input type="hidden" id="nkw-e-c-val" value="${esc(info.color || '#fff9c4')}"></div></div>
                                </div>`;
                            ctx.ui.layer.open({
                                title: '编辑关键字', content: html, area: ['min(520px,94vw)', 'auto'], btn: ['保存', '取消'],
                                success: (l) => {
                                    layui.use(['form', 'colorpicker'], function () {
                                        const form = layui.form;
                                        form.render('select');
                                        form.on('select(nkw-e-t-filter)', function (data) {
                                            const isH = data.value === 'highlight';
                                            l.find('#nkw-e-m-box').toggle(!isH);
                                            l.find('#nkw-e-c-box').toggle(isH);
                                        });
                                        layui.colorpicker.render({ elem: '#nkw-e-color-picker', color: info.color || '#fff9c4', predefine: true, alpha: true, done: color => l.find('#nkw-e-c-val').val(color) });
                                    });
                                },
                                yes: (idx, l) => {
                                    const nw = l.find('#nkw-e-v').val().trim();
                                    if (!nw) return;
                                    const type = l.find('#nkw-e-t').val();
                                    delete map[un];
                                    map[nw] = { type, mode: type === 'block' ? l.find('#nkw-e-m').val() : null, color: type === 'highlight' ? l.find('#nkw-e-c-val').val() : null, time: new Date().toLocaleString() };
                                    saveMap(map); reapplyKeywords(); ctx.ui.layer.close(idx); renderList(); ctx.ui.toast('已更新');
                                }
                            });
                        };
                        document.addEventListener("click", e => {
                            const inLayer = !!e.target.closest('.layui-layer,.layui-layer-page,.layui-layer-dialog,.layui-colorpicker');
                            if (inLayer) return;
                            const hasTopLayer = !!document.querySelector('.layui-layer[style*="z-index"]');
                            if (hasTopLayer) return;
                            if (pState.open && !kwPanel.contains(e.target) && !kwTrigger.contains(e.target)) closePanel();
                        });
                    }
                    const r = kwTrigger.getBoundingClientRect();
                    kwPanel.style.top = `${r.bottom + 8}px`;
                    kwPanel.style.height = `${innerHeight - r.bottom - 16}px`;
                    kwPanel.style.right = ``;
                    renderList(); kwPanel.classList.add("show"); pState.open = true;
                };
                const closePanel = () => { kwPanel?.classList.remove("show"); pState.open = false; };
                window.__nsxPanelCtrl ||= {};
                window.__nsxPanelCtrl.filter = { close: closePanel, isOpen: () => pState.open };
                kwTrigger.onclick = e => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!pState.open) {
                        window.__nsxPanelCtrl.history?.close?.();
                        window.__nsxPanelCtrl.relation?.close?.();
                    }
                    pState.open ? closePanel() : openPanel();
                };
            }
        }
    };

    const __vite_glob_0_3 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: blockPosts
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 🚫 过滤设置 ] - 低等级可见内容屏蔽
       ========================================================================== */

    const mark$2 = new WeakSet();
    const run = (els, ctx) => {
        const lv = ctx.user?.rank || 0;
        els.forEach(el => {
            const item = el.closest(".post-list-item");
            if (!item || mark$2.has(item)) return;
            mark$2.add(item);
            const n = +(el.closest("span")?.textContent?.match(/\d+/)?.[0] || 0);
            if (n > lv) item.classList.add("blocked-post");
        });
    };

    const blockViewLevel = {
        id: "blockViewLevel",
        order: 222,
        cfg: { block_view_level: { enabled: true } },
        meta: { block_view_level: { label: "低等级内容屏蔽", group: "🚫 过滤设置" } },
        match: ctx => ctx.isList && ctx.store.get("block_view_level.enabled", true),
        init(ctx) { run($$('.post-list-item use[href="#lock"]'), ctx); },
        watch: ctx => ({ sel: '.post-list-item use[href="#lock"]', fn: els => run(els, ctx), opts: { debounce: 80 } })
    };

    const __vite_glob_0_4 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: blockViewLevel
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 🎨 视觉美化 ] - Callout 语法支持 (引述增强)
       ========================================================================== */

    const CSS_BASE = `.post-content blockquote{border-left:none;border-radius:4px;margin:1em 0;box-shadow:inset 4px 0 0 0 rgba(0,0,0,.1)}.callout{--c:8,109,221;overflow:hidden;border-radius:4px;margin:1em 0;padding:12px 12px 12px 24px!important;box-shadow:inset 4px 0 0 0 rgba(var(--c),.5)}.callout.is-collapsible .callout-title{cursor:pointer}.callout-title{display:flex;gap:4px;color:rgb(var(--c));line-height:1.3;align-items:flex-start}.callout-content{overflow-x:auto}.callout-icon{flex:0 0 auto;display:flex;align-items:center}.callout-icon .svg-icon,.callout-fold .svg-icon{color:rgb(var(--c));height:18px;width:18px}.callout-title-inner{font-weight:600}.callout-fold{display:flex;align-items:center;padding-inline-end:8px}.callout-fold .svg-icon{transition:transform .1s}.callout-fold.is-collapsed .svg-icon{transform:rotate(-90deg)}.callout.is-collapsed .callout-content{display:none}.callout[data-callout="abstract"],.callout[data-callout="summary"],.callout[data-callout="tldr"]{--c:83,223,221}.callout[data-callout="info"],.callout[data-callout="todo"]{--c:8,109,221}.callout[data-callout="tip"],.callout[data-callout="hint"],.callout[data-callout="important"]{--c:83,223,221}.callout[data-callout="success"],.callout[data-callout="check"],.callout[data-callout="done"]{--c:68,207,110}.callout[data-callout="question"],.callout[data-callout="help"],.callout[data-callout="faq"]{--c:236,117,0}.callout[data-callout="warning"],.callout[data-callout="caution"],.callout[data-callout="attention"]{--c:236,117,0}.callout[data-callout="failure"],.callout[data-callout="fail"],.callout[data-callout="missing"]{--c:233,49,71}.callout[data-callout="danger"],.callout[data-callout="error"]{--c:233,49,71}.callout[data-callout="bug"]{--c:233,49,71}.callout[data-callout="example"]{--c:120,82,238}.callout[data-callout="quote"],.callout[data-callout="cite"]{--c:158,158,158}.callout-inserter-wrapper{position:relative;display:inline-flex;align-items:center}.callout-inserter-btn{padding:0;border:none;background:0 0;cursor:pointer;display:flex;color:currentColor}.callout-inserter-btn:hover{opacity:.7}.callout-inserter-dropdown{position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:8px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:1000;min-width:160px;display:none;overflow:auto;max-height:240px;background:#fff;border:1px solid #e5e7eb}.dark-layout .callout-inserter-dropdown{background:#1f1f1f;border-color:#3a3a3a}.callout-inserter-dropdown.show{display:block}.callout-inserter-item{padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;transition:background .15s}.callout-inserter-item:hover{background:#f5f5f5}.dark-layout .callout-inserter-item:hover{background:#2a2a2a}.callout-inserter-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}`;
    const CSS_COLORFUL = `.callout{background:rgba(var(--c),.1)}`;

    const ICONS = { note: "M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5zm-6.17-1.81 4 4", abstract: "M8 2h8v4H8zM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M12 11h4M12 16h4M8 11h.01M8 16h.01", info: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 14v-4m0-4h.01", tip: "M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4", success: "M20 6 9 17l-5-5", question: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01", warning: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4m0 4h.01", failure: "M18 6 6 18M6 6l12 12", danger: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z", bug: "M12 20v-9m2-6a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4zM14.12 3.88 16 2M8 2l1.88 1.88M9 7.13V6a3 3 0 1 1 6 0v1.13", example: "M3 5h.01M3 12h.01M3 19h.01M8 5h13M8 12h13M8 19h13", quote: "M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2zM5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z", fold: "m6 9 6 6 6-6" };
    const TYPE_MAP = { summary: "abstract", tldr: "abstract", hint: "tip", important: "tip", check: "success", done: "success", help: "question", faq: "question", caution: "warning", attention: "warning", fail: "failure", missing: "failure", error: "danger", cite: "quote" };
    const MENUS = [{ k: "note", n: "笔记", c: "8,109,221" }, { k: "info", n: "信息", c: "8,109,221" }, { k: "tip", n: "提示", c: "83,223,221" }, { k: "warning", n: "警告", c: "236,117,0" }, { k: "danger", n: "危险", c: "233,49,71" }, { k: "success", n: "成功", c: "68,207,110" }, { k: "question", n: "问题", c: "236,117,0" }, { k: "example", n: "示例", c: "120,82,238" }];
    const svg = d => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><path d="${d}"/></svg>`;
    const RE = /^\[!(\w+)\]([+-])?(?:\s+([^<\n]+))?(?:<br\s*\/?>)?([\s\S]*)$/i;

    const render = (els) => {
        els.forEach(bq => {
            if (bq.classList.contains("oc-done") || bq.closest("blockquote.oc-done")) return;
            bq.classList.add("oc-done");
            const p = bq.querySelector(":scope > p");
            const m = (p?.innerHTML?.trim() || "").match(RE);
            if (!m) return;
            const [, type, fold, title, content] = m;
            const t = type.toLowerCase(), base = TYPE_MAP[t] || t, icon = ICONS[base] || ICONS.note;
            const isColl = fold === "+" || fold === "-", isCol = fold === "-";
            const wrap = document.createElement("div");
            wrap.className = `callout${isColl ? " is-collapsible" : ""}${isCol ? " is-collapsed" : ""}`;
            wrap.dataset.callout = t;
            const titleEl = document.createElement("div");
            titleEl.className = "callout-title";
            titleEl.innerHTML = `<div class="callout-icon">${svg(icon)}</div><div class="callout-title-inner">${title?.trim() || type[0].toUpperCase() + type.slice(1)}</div>`;
            if (isColl) {
                const foldEl = document.createElement("div");
                foldEl.className = `callout-fold${isCol ? " is-collapsed" : ""}`;
                foldEl.innerHTML = svg(ICONS.fold);
                titleEl.appendChild(foldEl);
                titleEl.onclick = () => { wrap.classList.toggle("is-collapsed"); foldEl.classList.toggle("is-collapsed"); };
            }
            wrap.appendChild(titleEl);
            const cont = document.createElement("div");
            cont.className = "callout-content";
            if (content?.trim()) { const pp = document.createElement("p"); pp.innerHTML = content.trim(); cont.appendChild(pp); }
            let sib = p.nextSibling;
            while (sib) { const next = sib.nextSibling; cont.appendChild(sib); sib = next; }
            if (cont.childNodes.length) wrap.appendChild(cont);
            bq.replaceWith(wrap);
        });
    };

    const insertCallout = (editor, type) => {
        const cm = editor.querySelector(".CodeMirror")?.CodeMirror;
        if (!cm) return;
        const doc = cm.getDoc();
        let cur = doc.getCursor();
        const lvl = (doc.getLine(cur.line).match(/^(>\s*)+/)?.[0].match(/>/g) || []).length;
        if (lvl > 0) {
            let last = cur.line;
            for (let i = cur.line + 1; i < doc.lineCount(); i++) { if (doc.getLine(i).match(/^>\s*/)) last = i; else break; }
            cur = { line: last, ch: doc.getLine(last).length };
        }
        const pre = lvl > 0 ? ">".repeat(lvl + 1) + " " : "> ";
        doc.replaceRange((lvl > 0 ? "\n" : "") + `${pre}[!${type}] \n${pre}`, cur);
        doc.setCursor({ line: cur.line + (lvl > 0 ? 1 : 0), ch: `${pre}[!${type}] `.length });
        cm.focus();
    };

    let clickBound = false;
    const createInserter = () => {
        const editor = $(".md-editor");
        const bar = editor?.querySelector(".mde-toolbar");
        if (!editor || !bar) return;

        const cleanupManagedSeps = () => {
            bar.querySelectorAll(".nsx-callout-sep").forEach(s => s.remove());
        };

        const ensureSepBetween = (left, right) => {
            if (!left || !right) return;
            if (left.parentElement !== right.parentElement) return;
            let cur = left.nextElementSibling;
            while (cur && cur !== right) {
                const next = cur.nextElementSibling;
                if (cur.classList?.contains("sep")) cur.remove();
                cur = next;
            }
            if (cur !== right) return;

            const sep = document.createElement("div");
            sep.className = "sep nsx-callout-sep";
            right.before(sep);
        };

        const isMobile = document.documentElement.classList.contains("nsx-mobile");
        const quickReplyWrap = bar.querySelector(".nsx-quick-reply-wrap");
        const existedWrap = bar.querySelector(".callout-inserter-wrapper");
        const aiSep = bar.querySelector(".nsx-ai-sep");
        if (existedWrap) {
            cleanupManagedSeps();
            if (quickReplyWrap && quickReplyWrap !== existedWrap) {
                if (!isMobile) {
                    if (quickReplyWrap.previousElementSibling !== existedWrap) {
                        quickReplyWrap.before(existedWrap);
                    }
                    ensureSepBetween(existedWrap, quickReplyWrap);
                } else {
                    if (quickReplyWrap.nextElementSibling !== existedWrap) {
                        quickReplyWrap.after(existedWrap);
                    }
                    ensureSepBetween(quickReplyWrap, existedWrap);
                }
            } else if (!isMobile && aiSep) {
                if (aiSep.previousElementSibling !== existedWrap) {
                    aiSep.before(existedWrap);
                }
            }
            return;
        }

        const vAttr = [...(bar.querySelector(".toolbar-item")?.attributes || [])].find(a => a.name.startsWith("data-v-"))?.name;
        const setV = el => vAttr && el.setAttribute(vAttr, "");

        const wrap = document.createElement("span");
        wrap.className = "callout-inserter-wrapper toolbar-item";
        wrap.title = "Callout - Nodeseek Pro";
        setV(wrap);

        const btn = document.createElement("span");
        btn.className = "callout-inserter-btn i-icon";
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 48 48" fill="none"><path d="M44 8H4v30h15l5 5 5-5h15V8Z" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 18v10" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="33" r="2" fill="currentColor"/></svg>`;
        setV(btn);

        const drop = document.createElement("div");
        drop.className = "callout-inserter-dropdown";
        MENUS.forEach(t => {
            const item = document.createElement("div");
            item.className = "callout-inserter-item";
            item.innerHTML = `<span class="callout-inserter-dot" style="background:rgb(${t.c})"></span>${t.n}[${t.k}]`;
            item.onclick = e => { e.stopPropagation(); insertCallout(editor, t.k); drop.classList.remove("show"); };
            drop.appendChild(item);
        });

        btn.onclick = e => { e.stopPropagation(); drop.classList.toggle("show"); };
        if (!clickBound) { document.addEventListener("click", () => $$(".callout-inserter-dropdown.show").forEach(d => d.classList.remove("show"))); clickBound = true; }

        const sep = document.createElement("div");
        sep.className = "sep nsx-callout-sep";
        setV(sep);
        wrap.append(btn, drop);

        if (quickReplyWrap) {
            if (!isMobile) {
                quickReplyWrap.before(wrap);
                ensureSepBetween(wrap, quickReplyWrap);
            } else {
                quickReplyWrap.after(wrap);
                ensureSepBetween(quickReplyWrap, wrap);
            }
        } else {
            const aiWrap = bar.querySelector(".nsx-ai-wrap");
            const aiSep = bar.querySelector(".nsx-ai-sep");
            if (aiSep) {
                aiSep.before(wrap);
            } else if (aiWrap) {
                const prev = aiWrap.previousElementSibling;
                if (prev?.classList?.contains("sep")) aiWrap.before(wrap);
                else aiWrap.before(sep, wrap);
            } else {
                const last = bar.lastElementChild;
                if (last?.classList?.contains("sep")) bar.append(wrap);
                else bar.append(sep, wrap);
            }
        }
    };

    const callout = {
        id: "callout",
        order: 360,
        cfg: { callout: { enabled: true, style: "colorful" } },
        meta: { callout: { label: "Callout 语法支持", group: "🎨 视觉美化", fields: { style: { type: "RADIO", label: "风格", options: [{ value: "colorful", text: "绚丽" }, { value: "clean", text: "清新" }] } } } },
        match: ctx => (ctx.isPost || /^\/new-discussion/.test(location.pathname)) && ctx.store.get("callout.enabled", true),
        init(ctx) {
            const style = ctx.store.get("callout.style", "colorful");
            addStyle("nsx-callout", CSS_BASE + (style === "colorful" ? CSS_COLORFUL : ""));
            render($$(".post-content blockquote"));
            createInserter();
            document.addEventListener("click", e => { if (e.target?.closest?.(".md-editor")) requestAnimationFrame(createInserter); });
        },
        watch: () => [{ sel: ".post-content blockquote", fn: render, opts: { debounce: 80 } }, { sel: ".mde-toolbar", fn: createInserter, opts: { debounce: 80 } }]
    };

    const __vite_glob_0_5 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: callout
    }, Symbol.toStringTag, { value: 'Module' }));

    // 代码高亮 + 复制按钮

    const CSS$4 = `.post-content pre{position:relative}.post-content pre span.copy-code{position:absolute;right:.5em;top:.5em;cursor:pointer;color:#c1c7cd}.post-content pre .iconpark-icon{width:16px;height:16px;margin:3px}.post-content pre .iconpark-icon:hover{color:var(--link-hover-color)}.dark-layout .post-content pre code.hljs{padding:1em!important}`;

    const mark$1 = new WeakSet();
    const addCopyBtn = (els, ctx) => {
        els.forEach(code => {
            if (mark$1.has(code)) return;
            mark$1.add(code);
            const btn = document.createElement("span");
            btn.className = "copy-code";
            btn.title = "复制代码";
            btn.innerHTML = `<svg class="iconpark-icon"><use href="#copy"></use></svg>`;
            btn.onclick = async () => {
                let ok = false;
                const text = code.textContent || "";
                try {
                    if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(text);
                        ok = true;
                    }
                } catch { }

                if (!ok) {
                    try {
                        const sel = getSelection(), range = document.createRange();
                        range.selectNodeContents(code);
                        sel.removeAllRanges();
                        sel.addRange(range);
                        ok = document.execCommand("copy");
                        sel.removeAllRanges();
                    } catch { ok = false; }
                }

                if (ok) {
                    btn.querySelector("use")?.setAttribute("href", "#check");
                    setTimeout(() => btn.querySelector("use")?.setAttribute("href", "#copy"), 1000);
                    ctx.ui.tips?.("复制成功", btn, { tips: 4, time: 1000 });
                } else {
                    ctx.ui.warning?.("复制失败，请手动复制");
                }
            };
            code.after(btn);
        });
    };

    /* ==========================================================================
       [ 🎨 视觉美化 ] - 代码高亮 + 复制按钮
       ========================================================================== */
    const codeHighlight = {
        id: "codeHighlight",
        deps: ["ui"],
        order: 140,
        cfg: { code_highlight: { enabled: true } },
        meta: { code_highlight: { label: "代码高亮", group: "🎨 视觉美化" } },
        match: ctx => ctx.store.get("code_highlight.enabled", true),
        init(ctx) {
            addStyle("nsx-hl-css", CSS$4);
            addCopyBtn($$(".post-content pre code"), ctx);
        },
        watch: ctx => ({ sel: ".post-content pre code", fn: els => addCopyBtn(els, ctx), opts: { debounce: 80 } })
    };

    const __vite_glob_0_6 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: codeHighlight
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 🧭 辅助工具 ] - 快捷键回复 (Ctrl+Enter)
       ========================================================================== */
    const commentShortcut = {
        id: "commentShortcut",
        order: 135,
        cfg: { comment_shortcut: { enabled: true } },
        meta: { comment_shortcut: { label: "快捷键快捷回复", group: "🧭 辅助工具" } },
        match: ctx => ctx.isPost && ctx.store.get("comment_shortcut.enabled", true),
        init(ctx) {
            const getBtn = () => $(".md-editor button.submit.btn.focus-visible");
            $$(".CodeMirror").forEach(cmEl => {
                const cm = cmEl?.CodeMirror;
                if (!cm || cm.__nsx) return;
                cm.__nsx = true;
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
            });
        }
    };

    const __vite_glob_0_7 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: commentShortcut
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 🎨 视觉美化 ] - 深色模式同步系统
       ========================================================================== */
    const darkMode = {
        id: "darkMode",
        order: 180,
        cfg: { dark_mode_sync: { enabled: true } },
        meta: { dark_mode_sync: { label: "深色模式皮肤同步", group: "🎨 视觉美化" } },
        init(ctx) {
            const body = document.body;
            if (!body) return;
            const lightHl = GM_getResourceURL("highlightStyle");
            const darkHl = GM_getResourceURL("highlightStyle_dark");

            const apply = () => {
                const dark = body.classList.contains("dark-layout");
                // 为 html 添加/移除 .dark 类以触发 layui 深色主题
                document.documentElement.classList.toggle("dark", dark);
                // 切换 highlight.js 样式（同时移除 start() 中注入的初始样式避免冲突）
                document.getElementById("hightlight-style")?.remove();
                document.getElementById("nsx-hl")?.remove();
                addStyle("nsx-hl", dark ? darkHl : lightHl);
            };
            apply();
            new MutationObserver(() => apply()).observe(body, { attributes: true, attributeFilter: ["class"] });
        }
    };

    const __vite_glob_0_8 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: darkMode
    }, Symbol.toStringTag, { value: 'Module' }));

    // 浏览历史

    const CSS$3 = `.nsx-history-header{display:flex;align-items:center;justify-content:space-between;padding:12px 12px 6px}.nsx-history-title{font-size:15px;font-weight:600}.nsx-history-action{border:0;background:0;color:#666;cursor:pointer;font-size:12px;padding:4px 8px;border-radius:6px}.nsx-history-action:hover{background:#f2f3f5}.nsx-history-search{display:flex;align-items:center;gap:6px;margin:0 12px 8px;border:1px solid #e1e1e1;border-radius:8px;padding:6px 8px}.nsx-history-search input{border:0;background:0;outline:0;width:100%;font-size:13px}.nsx-history-tabs{display:flex;gap:16px;padding:0 12px 6px;border-bottom:1px solid #f0f0f0}.nsx-history-tab{border:0;background:0;cursor:pointer;color:#6b6b6b;font-size:12px;padding:6px 0;font-weight:600;border-bottom:2px solid transparent}.nsx-history-tab.is-active{color:#0a62ff;border-bottom-color:#0a62ff}.nsx-history-list{flex:1;overflow-y:auto;padding:6px 8px 12px}.nsx-history-group{margin-bottom:10px}.nsx-history-group-title{display:flex;align-items:center;justify-content:space-between;padding:4px;color:#666;font-size:12px}.nsx-history-items{list-style:none;margin:0;padding:0}.nsx-history-item{display:flex;align-items:center;gap:8px;padding:6px;border-radius:8px}.nsx-history-item:hover{background:#f5f7fb}.nsx-history-link{display:flex;align-items:center;gap:8px;flex:1;min-width:0;text-decoration:none;color:inherit}.nsx-history-icon{width:20px;height:20px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}.nsx-history-icon img{width:100%;height:100%;object-fit:cover}.nsx-history-item-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.nsx-history-time{color:#9a9a9a;font-size:12px;margin-left:auto}.nsx-history-empty{padding:10px 6px;color:#999;font-size:12px}.nsx-history-close,.nsx-history-restore{border:0;background:0;cursor:pointer;font-size:12px;padding:2px 4px;border-radius:6px;display:none}.nsx-history-close{color:#999}.nsx-history-restore{color:#0a62ff}.nsx-history-item:hover .nsx-history-time{display:none}.nsx-history-item:hover .nsx-history-close,.nsx-history-item:hover .nsx-history-restore{display:block}.nsx-history-group-title .nsx-history-close{display:block;opacity:.9}.nsx-history-close:hover{color:#ff4d4f}.nsx-history-restore:hover{background:#eef3ff}.dark-layout .nsx-history-action{color:#999}.dark-layout .nsx-history-action:hover{background:#2a2a2a}.dark-layout .nsx-history-search{border-color:#3a3a3a}.dark-layout .nsx-history-search input{color:#e0e0e0}.dark-layout .nsx-history-tabs{border-bottom-color:#3a3a3a}.dark-layout .nsx-history-tab{color:#999}.dark-layout .nsx-history-group-title{color:#888}.dark-layout .nsx-history-item:hover{background:#2a2a2a}.dark-layout .nsx-history-icon{background:#3a3a3a}.dark-layout .nsx-history-time{color:#666}.dark-layout .nsx-history-empty{color:#666}`;

    const HKEY = "nsx_browsing_history", RKEY = "nsx_recently_closed";

    const pad = n => String(n).padStart(2, "0");
    const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const fmtTime = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const now = () => new Date().toISOString();
    const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
    const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

    /* ==========================================================================
       [ 🧭 辅助工具 ] - 浏览历史记录 (右侧面板)
       ========================================================================== */
    const history$1 = {
        id: "history",
        order: 400,
        cfg: { history: { enabled: true, limit: 100, days: 7 } },
        meta: { history: { label: "浏览历史记录", group: "🧭 辅助工具", fields: { limit: { type: "NUMBER", label: "保存上限", valueType: "number" }, days: { type: "NUMBER", label: "保存天数", valueType: "number" } } } },
        match: ctx => (ctx.isPost || ctx.isList) && ctx.store.get("history.enabled", true),
        init(ctx) {
            let maxItems = ctx.store.get("history.limit", 100) || 100;
            let maxAge = (ctx.store.get("history.days", 7) || 7) * 864e5;

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

            addStyle("nsx-hist", CSS$3);
            let panel = null, trigger = null, state = { open: false, tab: "all", kw: "" };

            const head = $("#nsk-head");
            if (!head) return;
            const grp = ensureIconGroup();
            if (!grp) return;
            trigger = document.createElement("div");
            trigger.className = "history-dropdown-on";
            trigger.title = "历史记录";
            trigger.innerHTML = `<svg class="iconpark-icon" style="width:17px;height:17px"><use href="#history"></use></svg>`;
            grp.appendChild(trigger);

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
            window.__nsxPanelCtrl ||= {};
            window.__nsxPanelCtrl.history = { close, isOpen: () => state.open };
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

            trigger.onclick = e => {
                e.preventDefault();
                e.stopPropagation();
                if (!state.open) {
                    window.__nsxPanelCtrl.filter?.close?.();
                    window.__nsxPanelCtrl.relation?.close?.();
                }
                toggle();
            };

            // 记录当前页面
            const pd = ctx.uw?.__config__?.postData;
            if (pd) add(pd, getH, saveH);

            // 监听页面关闭
            addEventListener("beforeunload", () => {
                const pd = ctx.uw?.__config__?.postData;
                if (pd) add(pd, getR, saveR);
            }, { capture: true });

            window.__nsxRuntime ||= {};
            window.__nsxRuntime.refreshHistory = () => {
                maxItems = ctx.store.get("history.limit", 100) || 100;
                maxAge = (ctx.store.get("history.days", 7) || 7) * 864e5;
                const h = prune(getH());
                const r = prune(getR());
                localStorage.setItem(HKEY, JSON.stringify(h));
                localStorage.setItem(RKEY, JSON.stringify(r));
                if (panel && state.open) render();
            };
        }
    };

    const __vite_glob_0_9 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: history$1
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 🎨 视觉美化 ] - 图片沉浸预览 (灯箱效果)
       ========================================================================== */
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
        deps: ["ui"],
        order: 160,
        cfg: { image_slide: { enabled: true } },
        meta: { image_slide: { label: "图片沉浸预览", group: "🎨 视觉美化" } },
        match: ctx => ctx.isPost && ctx.store.get("image_slide.enabled", true),
        init(ctx) { bind($$("article.post-content img:not(.sticker)"), ctx); },
        watch: ctx => ({ sel: "article.post-content img:not(.sticker)", fn: els => bind(els, ctx), opts: { debounce: 80 } })
    };

    const __vite_glob_0_10 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: imageSlide
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 🧭 辅助工具 ] - 网页预加载 (Instant Page)
       ========================================================================== */
    const instantPage = {
        id: "instantPage",
        order: 320,
        cfg: { instant_page: { enabled: true } },
        meta: { instant_page: { label: "鼠标悬停预加载", group: "🧭 辅助工具" } },
        match: ctx => ctx.store.get("instant_page.enabled", true),
        init(ctx) {
            const done = new Set();
            const inflight = new Set();
            document.body.addEventListener("mouseover", e => {
                const a = e.target.closest("a");
                if (!a?.href?.startsWith(`${location.origin}/post-`) || done.has(a.href) || inflight.has(a.href)) return;
                setTimeout(() => {
                    if (!a.matches(":hover") || done.has(a.href) || inflight.has(a.href)) return;
                    const link = document.createElement("link");
                    link.rel = "prefetch";
                    link.href = a.href;
                    inflight.add(a.href);
                    const clear = () => {
                        done.add(a.href);
                        inflight.delete(a.href);
                        link.remove();
                    };
                    link.addEventListener("load", clear, { once: true });
                    link.addEventListener("error", clear, { once: true });
                    document.head.appendChild(link);
                    setTimeout(clear, 5000);
                }, 65);
            }, { passive: true });
        }
    };

    const __vite_glob_0_11 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: instantPage
    }, Symbol.toStringTag, { value: 'Module' }));

    // 等级标签已被移除
    const levelTag = {
        id: "levelTag",
        cfg: {},
        meta: {},
        match: ctx => false,
        init: () => { }
    };

    const __vite_glob_0_12 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: levelTag
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 系统核心 ] - 设置菜单 (高级设置面板)
       ========================================================================== */
    // 菜单系统（油猴菜单 + 高级设置面板）

    const CSS$1 = `#nsx-config-menu{height:100%;overflow-y:visible;border-right:1px solid #eee}#nsx-config-content{height:100%;overflow-y:auto;padding:0 15px;background:#f8f8f8}.nsx-config-card{margin-bottom:20px}.nsx-config-card .layui-card-header{display:flex;align-items:center;justify-content:space-between;font-weight:700}.nsx-config-card .header-checkbox{position:absolute;right:15px;top:50%;transform:translateY(-50%)}.nsx-config-card .layui-form-switch{margin-top:0!important}.nsx-config-card .layui-card-body:empty{padding-top:0;padding-bottom:0}.nsx-config-card .layui-form-label{width:110px!important;padding:9px 10px!important}.nsx-config-card .layui-input-block{margin-left:140px!important}.nsx-config-tools{display:flex;gap:10px;flex-wrap:wrap}.nsx-config-tools .layui-btn{min-width:120px}.nsx-config-tools-tip{margin-top:10px;font-size:12px;color:#888;line-height:1.6}.dark-layout #nsx-config-menu{border-right-color:#3a3a3a}.dark-layout #nsx-config-content{background:#1e1e1e}.dark-layout .nsx-config-tools-tip{color:#999}`;

    const el = (t, c, p, s) => { const e = document.createElement(t); if (c) e.className = c; if (s) e.style.cssText = s; if (p) p.appendChild(e); return e; };
    const BACKUP_SCHEMA_VERSION = 2;
    const BACKUP_LOCAL_KEYS = [
        "nsx_advanced_keywords",
        "nsx_browsing_history",
        "nsx_recently_closed",
        "nodeseek_quick_reply",
        "nodeseek_quick_reply_auto_submit",
        "nsx_advanced_friends",
        "nsx_advanced_blacklist",
        "nsx_visited_posts"
    ];
    const BACKUP_PLAIN_STRING_KEYS = new Set(["nodeseek_quick_reply_auto_submit"]);
    const BACKUP_NS_PREFERENCE_DB = "ns-preference-db";
    const BACKUP_NS_PREFERENCE_STORE = "ns-preference-store";
    const cloneData = v => {
        try { return JSON.parse(JSON.stringify(v)); } catch { return v; }
    };
    const normalizeSettingsForBackup = (settings) => {
        const normalized = cloneData(settings || {});
        merge(normalized, store.getDefaults());
        normalized.version = store.getDefaults().version;
        return normalized;
    };
    const readBackupLocalValue = key => {
        const raw = localStorage.getItem(key);
        if (raw == null) return null;
        if (BACKUP_PLAIN_STRING_KEYS.has(key)) return raw;
        try { return JSON.parse(raw); } catch { return raw; }
    };
    const writeBackupLocalValue = (key, value) => {
        if (value == null) localStorage.removeItem(key);
        else if (BACKUP_PLAIN_STRING_KEYS.has(key)) localStorage.setItem(key, String(value));
        else localStorage.setItem(key, JSON.stringify(value));
    };
    const readNsPreferenceConfig = () => new Promise(resolve => {
        try {
            const req = indexedDB.open(BACKUP_NS_PREFERENCE_DB);
            req.onerror = () => resolve(null);
            req.onupgradeneeded = () => resolve(null);
            req.onsuccess = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(BACKUP_NS_PREFERENCE_STORE)) {
                    db.close();
                    return resolve(null);
                }
                const tx = db.transaction(BACKUP_NS_PREFERENCE_STORE, "readonly");
                const store = tx.objectStore(BACKUP_NS_PREFERENCE_STORE);
                const getReq = store.get("configuration");
                getReq.onerror = () => { db.close(); resolve(null); };
                getReq.onsuccess = () => {
                    const cfg = getReq.result;
                    db.close();
                    resolve(cfg && typeof cfg === "object" ? cloneData(cfg) : null);
                };
            };
        } catch {
            resolve(null);
        }
    });
    const writeNsPreferenceConfig = (config) => new Promise(resolve => {
        try {
            const req = indexedDB.open(BACKUP_NS_PREFERENCE_DB);
            req.onerror = () => resolve(false);
            req.onsuccess = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(BACKUP_NS_PREFERENCE_STORE)) {
                    db.close();
                    return resolve(false);
                }
                const tx = db.transaction(BACKUP_NS_PREFERENCE_STORE, "readwrite");
                const store = tx.objectStore(BACKUP_NS_PREFERENCE_STORE);
                const putReq = store.put(config || {}, "configuration");
                putReq.onerror = () => { db.close(); resolve(false); };
                putReq.onsuccess = () => { db.close(); resolve(true); };
            };
            req.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(BACKUP_NS_PREFERENCE_STORE)) {
                    db.createObjectStore(BACKUP_NS_PREFERENCE_STORE);
                }
            };
        } catch {
            resolve(false);
        }
    });
    const createBackupPayload = async () => ({
        format: "nsx-backup",
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        scriptVersion: info.version,
        data: {
            settings: normalizeSettingsForBackup(store.init()),
            localStorage: BACKUP_LOCAL_KEYS.reduce((acc, key) => {
                const value = readBackupLocalValue(key);
                if (value !== null) acc[key] = cloneData(value);
                return acc;
            }, {}),
            indexedDB: {
                nsPreferenceConfiguration: await readNsPreferenceConfig()
            }
        }
    });
    const isValidBackupPayload = payload => {
        if (!payload || typeof payload !== "object") return false;
        if (payload.format !== "nsx-backup") return false;
        if (!payload.data || typeof payload.data !== "object") return false;
        if (!payload.data.settings || typeof payload.data.settings !== "object" || Array.isArray(payload.data.settings)) return false;
        const ls = payload.data.localStorage;
        if (!(ls === undefined || (ls && typeof ls === "object" && !Array.isArray(ls)))) return false;
        const idb = payload.data.indexedDB;
        return idb === undefined || (idb && typeof idb === "object" && !Array.isArray(idb));
    };
    const applyBackupPayload = async (payload) => {
        const importedSettings = normalizeSettingsForBackup(payload?.data?.settings || {});
        const importedLs = payload?.data?.localStorage || {};
        const importedIdb = payload?.data?.indexedDB || {};
        const schemaVersion = Number(payload?.schemaVersion || 1);
        const shouldClearMissingLocalKeys = schemaVersion >= BACKUP_SCHEMA_VERSION;
        cfgCache = null;
        GM_setValue("settings", importedSettings);
        BACKUP_LOCAL_KEYS.forEach(key => {
            if (Object.prototype.hasOwnProperty.call(importedLs, key)) writeBackupLocalValue(key, importedLs[key]);
            else if (shouldClearMissingLocalKeys) localStorage.removeItem(key);
        });
        if (Object.prototype.hasOwnProperty.call(importedIdb, "nsPreferenceConfiguration") && importedIdb.nsPreferenceConfiguration && typeof importedIdb.nsPreferenceConfiguration === "object") {
            await writeNsPreferenceConfig(importedIdb.nsPreferenceConfiguration);
        } else if (schemaVersion >= 2) {
            await writeNsPreferenceConfig({ openPostInNewPage: !!importedSettings?.open_post_in_new_tab?.enabled });
        }
        cfgCache = null;
    };
    const downloadBackupFile = payload => {
        const stamp = new Date().toISOString().replace(/[:T]/g, "-").replace(/\..+/, "");
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `NSX_Pro_backup_${stamp}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const menus = {
        id: "menus",
        deps: ["ui"],
        order: 30,
        cfg: { open_post_in_new_tab: { enabled: false } },
        meta: { open_post_in_new_tab: { label: "新标签页打开帖子", group: "🧭 辅助工具" } },
        match: () => true,
        init(ctx) {
            const uw = ctx.uw, code = ctx.site?.code || "ns";
            const ids = [];
            const txt = (m, v) => `${m.text}: ${m.states[v].s1} ${m.states[v].s2}`;


            const regMenus = () => {
                ids.splice(0).forEach(i => GM_unregisterMenuCommand(i));
                menuItems.forEach(m => {
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

            const exportConfig = async () => {
                try {
                    const payload = await createBackupPayload();
                    downloadBackupFile(payload);
                    ctx.ui.success?.("配置已导出");
                } catch (e) {
                    env.error("Export config failed", e);
                    ctx.ui.error?.("导出失败，请稍后重试");
                }
            };

            const importConfig = () => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "application/json,.json";
                input.style.display = "none";
                input.onchange = () => {
                    const file = input.files?.[0];
                    if (!file) return input.remove();
                    const reader = new FileReader();
                    reader.onload = () => {
                        try {
                            const payload = JSON.parse(String(reader.result || ""));
                            if (!isValidBackupPayload(payload)) throw new Error("备份文件格式不正确");
                            const proceed = async () => {
                                try {
                                    await applyBackupPayload(payload);
                                    ctx.ui.success?.("配置已还原，页面即将刷新");
                                    setTimeout(() => location.reload(), 600);
                                } catch (e) {
                                    env.error("Import config apply failed", e);
                                    ctx.ui.error?.("还原失败，请检查备份文件");
                                }
                            };
                            const msg = "将覆盖当前脚本设置、关键词、浏览历史、快捷回复和社交关系数据，是否继续？";
                            if (window.confirm(msg)) proceed();
                        } catch (e) {
                            env.error("Import config parse failed", e);
                            ctx.ui.error?.(e?.message || "备份文件解析失败");
                        } finally {
                            input.remove();
                        }
                    };
                    reader.onerror = () => {
                        input.remove();
                        ctx.ui.error?.("读取备份文件失败");
                    };
                    reader.readAsText(file, "utf-8");
                };
                document.body.appendChild(input);
                input.click();
            };

            const bindBackupTools = (root) => {
                const exportBtn = root?.querySelector?.("[data-nsx-action='export-config']");
                const importBtn = root?.querySelector?.("[data-nsx-action='import-config']");
                if (exportBtn && !exportBtn.dataset.nsxBound) {
                    exportBtn.dataset.nsxBound = "1";
                    exportBtn.addEventListener("click", e => {
                        e.preventDefault();
                        exportConfig();
                    });
                }
                if (importBtn && !importBtn.dataset.nsxBound) {
                    importBtn.dataset.nsxBound = "1";
                    importBtn.addEventListener("click", e => {
                        e.preventDefault();
                        importConfig();
                    });
                }
            };

            const switchNewTab = () => {
                const next = !store.get("open_post_in_new_tab.enabled", false);
                try {
                    uw.indexedDB.open("ns-preference-db").onsuccess = e => {
                        const db = e.target.result;
                        const s = db.transaction("ns-preference-store", "readwrite").objectStore("ns-preference-store");
                        s.get("configuration").onsuccess = e2 => {
                            const c = e2.target.result || {};
                            c.openPostInNewPage = next;
                            s.put(c, "configuration");
                            store.set("open_post_in_new_tab.enabled", next);
                            regMenus();
                            ctx.ui.alert("", `已${next ? "开启" : "关闭"}新标签页打开链接`);
                        };
                    };
                } catch { }
            };

            const advSettings = () => {
                if (!ctx.ui.layer || !window.layui) return;
                addStyle("nsx-cfg", CSS$1);

                // 获取所有模块的 cfg 和 meta
                const defs = store.getDefaults(), metas = store.getMeta();
                const ignore = new Set(["version", "debug", "ui"]);

                // 建立 meta key 到 order 的映射关系
                const metaToOrder = new Map();
                modules.forEach(m => {
                    if (m.meta) {
                        Object.keys(m.meta).forEach(k => metaToOrder.set(k, m.order || 999));
                    }
                });

                // 获取所有设置条目并附加 order
                const entries = Object.entries(metas)
                    .filter(([k]) => defs[k] && !ignore.has(k))
                    .map(([k, m]) => ({
                        key: k,
                        meta: m,
                        order: metaToOrder.get(k) || 999
                    }));

                // 核心：按照 order 从小到大排序
                entries.sort((a, b) => a.order - b.order);

                const groups = {};
                const groupOrder = []; // 记录分组出现的先后顺序
                entries.forEach(e => {
                    const g = e.meta.group || "其他设置";
                    if (!groups[g]) {
                        groups[g] = [];
                        groupOrder.push(g);
                    }
                    groups[g].push(e);
                });

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
                    const blk = el("div", "layui-input-block", item);

                    if (f.type === "SWITCH") {
                        item.style.cssText = "display:flex;align-items:center;margin-bottom:15px;";
                        lbl.style.cssText = "float:none;display:inline-block;padding:0 15px 0 0;width:auto;text-align:left;line-height:normal;";
                        blk.style.cssText = "margin-left:0;min-height:auto;";
                        let inp = el("input", "", blk); inp.type = "checkbox"; if (val) inp.setAttribute("checked", ""); inp.setAttribute("lay-skin", "switch"); inp.setAttribute("lay-text", "开启|关闭"); inp.name = path;
                    }
                    else if (f.type === "TEXTAREA") { let inp = el("textarea", "layui-textarea", blk); inp.setAttribute("placeholder", f.placeholder || ""); inp.textContent = Array.isArray(val) ? val.join("\n") : (val ?? ""); inp.name = path; }
                    else if (f.type === "RADIO" && f.options) {
                        f.options.forEach(opt => {
                            const r = el("input", "", blk); r.type = "radio"; r.name = path; r.setAttribute("value", opt.value);
                            r.dataset.valueType = f.valueType || "";
                            if (String(val) === String(opt.value)) r.setAttribute("checked", "");
                            r.setAttribute("title", opt.text);
                        });
                    }
                    else if (f.type === "SELECT" && f.options) {
                        const sel = el("select", "", blk); sel.name = path;
                        sel.dataset.valueType = f.valueType || "";
                        Object.entries(f.options).forEach(([k, v]) => {
                            const opt = el("option", "", sel);
                            opt.value = k; opt.textContent = v;
                            if (String(val) === String(k)) opt.setAttribute("selected", "selected");
                        });
                    }
                    else if (f.type === "COLOR") {
                        const inpWrap = el("div", "layui-input-inline", blk); inpWrap.style.width = "100px";
                        let inp = el("input", "layui-input", inpWrap);
                        inp.type = "text";
                        inp.setAttribute("name", path);
                        inp.setAttribute("value", val ?? "");
                        inp.readOnly = true;
                        inp.style.cssText = `background:${val || "#fff"};cursor:pointer;color:transparent`;
                        const cpWrap = el("div", "layui-inline", blk); cpWrap.style.left = "-11px";
                        const wrap = el("div", "", cpWrap);
                        wrap.setAttribute("data-color-path", path);
                        wrap.setAttribute("data-color-val", val ?? "");
                        wrap.setAttribute("data-color-inp", path);
                        wrap.setAttribute("data-color-default", f.defaultVal ?? "");
                    }
                    else {
                        let inp = el("input", "layui-input", blk);
                        inp.type = f.type === "NUMBER" ? "number" : "text";
                        inp.setAttribute("value", val ?? "");
                        inp.setAttribute("name", path);
                        inp.dataset.valueType = f.valueType || "";
                    }

                    const firstInp = w.querySelector("input, textarea");
                    if (firstInp && !firstInp.dataset.valueType) firstInp.dataset.valueType = f.valueType || "";
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
                        const f = { key: k, label: fm.label || k, type: inferType(cfg[k], fm), options: fm.options, placeholder: fm.placeholder, valueType: inferVT(cfg[k], fm), col: fm.col, defaultVal: cfg[k] };
                        let cur = store.get(`${base}.${k}`, cfg[k]);
                        // 处理旧版本 hide -> official 的映射
                        if (k === 'blacklist_mode' && cur === 'hide') cur = 'official';

                        const fe = makeField(f, `${base}.${k}`, cur, defaultCol);
                        if (fe) body.appendChild(fe);
                    });
                    return card;
                };

                // 按照排好序的分组进行渲染
                groupOrder.forEach((g, i) => {
                    const list = groups[g];
                    const fs = el("fieldset", "layui-elem-field layui-field-title", wrapper); fs.id = `group-${i}`;
                    const lg = el("legend", "", fs); lg.textContent = g;
                    const fd = el("div", "layui-form", wrapper);
                    list.forEach(e => { const c = makeCard(e, code); if (c) fd.appendChild(c); });
                    const mi = el("li", "", menuList); if (i === 0) mi.classList.add("layui-menu-item-checked");
                    const mb = el("div", "layui-menu-body-title", mi), a = el("a", "", mb); a.href = `#group-${i}`; a.textContent = g;
                });

                const backupIdx = groupOrder.length;
                const backupFs = el("fieldset", "layui-elem-field layui-field-title", wrapper); backupFs.id = `group-${backupIdx}`;
                const backupLg = el("legend", "", backupFs); backupLg.textContent = "配置备份";
                const backupWrap = el("div", "layui-form", wrapper);
                const backupCard = el("div", "layui-card layui-form nsx-config-card", backupWrap);
                const backupHdr = el("div", "layui-card-header", backupCard); backupHdr.textContent = "导出与还原";
                const backupBody = el("div", "layui-card-body", backupCard);
                backupBody.innerHTML = `<div class="nsx-config-tools"><button type="button" class="layui-btn layui-btn-normal" data-nsx-action="export-config">导出配置</button><button type="button" class="layui-btn layui-btn-primary" data-nsx-action="import-config">还原配置</button></div><div class="nsx-config-tools-tip">会备份设置面板中的开关、颜色、数值等配置，以及关键词、历史记录、快捷回复、好友和黑名单等本地数据。</div>`;
                const backupMi = el("li", "", menuList);
                const backupMb = el("div", "layui-menu-body-title", backupMi), backupA = el("a", "", backupMb);
                backupA.href = `#group-${backupIdx}`;
                backupA.textContent = "配置备份";

                // 底部提示
                const endFs = el("fieldset", "layui-elem-field layui-field-title", wrapper, "text-align:center");
                const endLg = el("legend", "", endFs, "font-size:0.8em;opacity:0.5");
                endLg.textContent = "到底了";

                const w = window.layui.device().mobile ? "100%" : "620px";
                ctx.ui.layer.open({
                    type: 1, offset: "r", anim: "slideLeft", area: [w, "100%"], scrollbar: false, shade: 0.1, shadeClose: false,
                    btn: ["保存设置", "取消"], btnAlign: "r", title: "Nodeseek Pro 设置", id: "setting-layer-direction-r", content: cont.outerHTML,
                    success: ly => {
                        const r = ly?.[0] || ly;
                        try { window.layui.form?.render(); } catch { }
                        bindBackupTools(r);
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
                                const path = wrap.getAttribute("data-color-inp");
                                const inp = r.querySelector(`input[name="${path}"]`);
                                const init = wrap.getAttribute("data-color-val") || "";
                                const def = wrap.getAttribute("data-color-default") || "";
                                if (!inp) return;

                                const setBg = c => { inp.style.background = c || ""; };
                                cp.render({
                                    elem: wrap, color: init, alpha: true, predefine: true, format: "rgb",
                                    change: setBg,
                                    done(c) {
                                        const final = c || def;
                                        inp.value = final;
                                        setBg(final);
                                    },
                                    cancel: setBg
                                });
                            });
                        });
                    },
                    yes: (idx, ly) => {
                        const r = ly?.[0] || ly, sc = r?.querySelector ? r : document;
                        const changedKeys = [];
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
                            if (v !== undefined) {
                                const oldV = store.get(el.name);
                                const o = typeof oldV === "object" ? JSON.stringify(oldV) : String(oldV);
                                const n = typeof v === "object" ? JSON.stringify(v) : String(v);
                                if (o !== n) changedKeys.push(el.name);
                                store.set(el.name, v);
                            }
                        });
                        applyRuntimeSettings(ctx, changedKeys);
                        ctx.ui.layer.msg("设置已保存，已即时生效");
                        setTimeout(() => ctx.ui.layer.close(idx), 300);
                    }
                });
            };

            const menuItems = [
                { name: "sign_in", cb: switchState, text: "自动签到", states: [{ s1: "❌", s2: "关闭" }, { s1: "🎲", s2: "随机🍗" }, { s1: "📌", s2: "5个🍗" }] },
                { name: "re_sign", cb: reSign, text: "🔂 重试签到", states: [] },
                { name: "open_post_in_new_tab", cb: switchNewTab, text: "新标签页打开帖子", states: [{ s1: "❌", s2: "关闭" }, { s1: "✅", s2: "开启" }] },
                { name: "export_config", cb: exportConfig, text: "📦 导出配置", states: [] },
                { name: "import_config", cb: importConfig, text: "♻️ 还原配置", states: [], autoClose: false },
                { name: "advanced_settings", cb: advSettings, text: "⚙️ 高级设置", states: [] },
                { name: "feedback", cb: () => GM_openInTab("https://greasyfork.org/zh-CN/scripts/567109/feedback", { active: true, insert: true, setParent: true }), text: "💬 反馈 & 建议", states: [] }
            ];

            regMenus();
        }
    };

    const __vite_glob_0_13 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: menus
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 🧭 辅助工具 ] - 快捷评论 (快捷回复区)
       ========================================================================== */

    const quickComment = {
        id: "quickComment",
        order: 120,
        cfg: { quick_comment: { enabled: true } },
        meta: { quick_comment: { label: "快捷评论", group: "🧭 辅助工具" } },
        match: ctx => ctx.loggedIn && ctx.isPost && ctx.store.get("quick_comment.enabled", true),
        init(ctx) {
            const editor = $(".md-editor"), parent = $("#back-to-parent"), group = $("#fast-nav-button-group");
            if (!editor || !parent || !group) return;
            let open = false;
            addStyle("nsx-quick-reply", `
.mde-toolbar > .sep{width:2px !important;height:20px !important;background:#e5e7eb !important;margin:0 6px !important;flex-shrink:0 !important;display:inline-block !important}
.nsx-quick-reply-wrap{position:relative;display:inline-flex;align-items:center}
.nsx-quick-reply-btn{height:auto;line-height:1;border:none;background:transparent;color:var(--text-color,#333);padding:0;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:4px}
.nsx-quick-reply-btn:hover{color:#1677ff}
.nsx-quick-reply-menu{position:absolute;left:0;top:36px;z-index:1002;min-width:280px;max-width:min(500px,88vw);background:var(--bg-color,#fff);border:1px solid var(--border-color,#e5e7eb);border-radius:10px;box-shadow:0 8px 22px rgba(0,0,0,.12);padding:8px;display:none}
.nsx-quick-reply-menu.show{display:block}
.nsx-quick-reply-tabs-wrap{display:flex;align-items:flex-start;gap:6px;padding-bottom:11px;margin-bottom:6px;border-bottom:1px solid #eee}
.nsx-quick-reply-tabs{flex:1;display:flex;gap:6px;overflow:auto hidden;scrollbar-width:thin;overflow-y:hidden}
.nsx-quick-reply-tab{flex:0 0 calc((100% - 12px)/3);max-width:calc((100% - 12px)/3);border:1px solid #e4e6eb;background:#fff;border-radius:999px;padding:3px 8px;cursor:pointer;font-size:12px;white-space:nowrap;overflow:hidden;text-align:center;display:flex;align-items:center;justify-content:center;gap:6px}
.nsx-quick-reply-tab .nsx-quick-reply-tab-text{min-width:0;overflow:hidden;text-overflow:ellipsis}
.nsx-quick-reply-tab .nsx-quick-reply-tab-del{flex:0 0 auto;border:0;background:transparent;color:#999;cursor:pointer;line-height:1;padding:0 2px;font-size:12px}
.nsx-quick-reply-tab .nsx-quick-reply-tab-del:hover{color:#ff4d4f}
.nsx-quick-reply-tab.active{background:#1677ff;color:#fff;border-color:#1677ff}
.nsx-quick-reply-tab.active .nsx-quick-reply-tab-del{color:rgba(255,255,255,.85)}
.nsx-quick-reply-tab.active .nsx-quick-reply-tab-del:hover{color:#fff}
.nsx-quick-reply-tab-add-fixed{flex:0 0 auto;border:1px dashed #1677ff;background:#fff;color:#1677ff;border-radius:999px;padding:3px 10px;cursor:pointer;font-size:12px;white-space:nowrap}
.nsx-quick-reply-list{height:216px;overflow-y:auto;overflow-x:hidden;padding-right:2px}
.nsx-quick-reply-item{display:flex;align-items:center;width:100%;text-align:left;border:0;background:transparent;color:inherit;cursor:pointer;border-radius:8px;padding:0 6px 0 10px;height:36px;box-sizing:border-box}
.nsx-quick-reply-item .nsx-quick-reply-item-text{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.nsx-quick-reply-item .nsx-quick-reply-item-del{flex:0 0 auto;border:0;background:transparent;color:#999;cursor:pointer;line-height:1;padding:4px 6px;font-size:12px;border-radius:6px}
.nsx-quick-reply-item .nsx-quick-reply-item-del:hover{color:#ff4d4f;background:rgba(255,77,79,.12)}
.nsx-quick-reply-item:hover{background:var(--hover-color,#f3f4f6)}
.nsx-quick-reply-empty{padding:10px;color:#999;font-size:12px}
.nsx-quick-reply-foot{display:flex;justify-content:space-between;align-items:center;padding-top:6px;margin-top:6px;border-top:1px solid #eee}
.nsx-quick-reply-autosend-wrap{display:flex;align-items:center;gap:4px;font-size:12px;color:#666}
.nsx-quick-reply-autosend-check{width:14px;height:14px;cursor:pointer;accent-color:#1677ff}
.nsx-quick-reply-autosend-label{cursor:pointer;user-select:none}
.nsx-quick-reply-op{border:1px solid #e4e6eb;background:#fff;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:12px}
.nsx-quick-reply-op:disabled{opacity:.45;cursor:not-allowed}
.nsx-quick-reply-add{border:1px solid #1677ff;background:#1677ff;color:#fff;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:12px}
.dark-layout .mde-toolbar > .sep{background:#666 !important}
.dark-layout .nsx-quick-reply-btn:hover{color:#64b5f6}
.dark-layout .nsx-quick-reply-menu{background:#222;border-color:#3a3a3a;box-shadow:0 8px 22px rgba(0,0,0,.35)}
.dark-layout .nsx-quick-reply-tabs-wrap{border-bottom-color:#3a3a3a}
.dark-layout .nsx-quick-reply-tabs{border-bottom-color:#3a3a3a}
.dark-layout .nsx-quick-reply-tab{background:#2a2a2a;border-color:#444;color:#ddd}
.dark-layout .nsx-quick-reply-tab.active{background:#1677ff;border-color:#1677ff;color:#fff}
.dark-layout .nsx-quick-reply-tab-add-fixed{background:#2a2a2a;border-color:#1677ff;color:#8dbdff}
.dark-layout .nsx-quick-reply-item .nsx-quick-reply-item-del:hover{background:rgba(255,77,79,.18)}
.dark-layout .nsx-quick-reply-item:hover{background:#333}
.dark-layout .nsx-quick-reply-foot{border-top-color:#3a3a3a}
.dark-layout .nsx-quick-reply-autosend-wrap{color:#aaa}
.dark-layout .nsx-quick-reply-op{background:#2a2a2a;border-color:#444;color:#ddd}
`);

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

            mountQuickReplyMenu();

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

            function mountQuickReplyMenu() {
                const bar = editor.querySelector(".mde-toolbar");
                if (!bar || bar.querySelector(".nsx-quick-reply-wrap")) return;
                const state = { groupIdx: 0 };

                const sep = document.createElement("div");
                const wrap = document.createElement("div");
                wrap.className = "nsx-quick-reply-wrap toolbar-item";
                const btn = document.createElement("span");
                btn.className = "nsx-quick-reply-btn i-icon";
                btn.title = "快捷回复 - Nodeseek Pro";
                btn.textContent = "快捷回复";
                const menu = document.createElement("div");
                menu.className = "nsx-quick-reply-menu";

                // 让菜单始终可见：窗口缩放/滚动时自动贴边，避免跑出视窗外
                const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
                const placeMenu = () => {
                    if (!menu.classList.contains("show")) return;

                    // 覆盖 CSS 里的 absolute，避免父容器溢出/裁剪导致看不到
                    menu.style.position = "fixed";
                    menu.style.margin = "0";

                    const pad = 8;
                    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
                    const vh = window.innerHeight || document.documentElement.clientHeight || 0;

                    const bRect = btn.getBoundingClientRect();
                    const mRect = menu.getBoundingClientRect();
                    const w = mRect.width || Math.min(500, Math.max(280, vw * 0.88));
                    const h = mRect.height || 320;

                    let left = clamp(bRect.left, pad, Math.max(pad, vw - w - pad));
                    let top = bRect.bottom + 6;

                    // 优先显示在按钮下方；放不下就翻到上方
                    if (top + h + pad > vh && bRect.top - 6 - h - pad >= 0) {
                        top = bRect.top - 6 - h;
                    }
                    top = clamp(top, pad, Math.max(pad, vh - h - pad));

                    menu.style.left = `${left}px`;
                    menu.style.top = `${top}px`;
                };

                // 支持拖拽移动：按住标签栏区域拖动菜单
                let dragOn = false, dragStartX = 0, dragStartY = 0, dragLeft = 0, dragTop = 0;
                const onDragMove = (e) => {
                    if (!dragOn) return;
                    const pad = 8;
                    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
                    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
                    const r = menu.getBoundingClientRect();
                    const nextLeft = clamp(dragLeft + (e.clientX - dragStartX), pad, Math.max(pad, vw - r.width - pad));
                    const nextTop = clamp(dragTop + (e.clientY - dragStartY), pad, Math.max(pad, vh - r.height - pad));
                    menu.style.left = `${nextLeft}px`;
                    menu.style.top = `${nextTop}px`;
                };
                const onDragEnd = () => { dragOn = false; };

                const tabsWrap = document.createElement("div");
                tabsWrap.className = "nsx-quick-reply-tabs-wrap";
                const tabs = document.createElement("div");
                tabs.className = "nsx-quick-reply-tabs";
                const addGroupTab = document.createElement("button");
                addGroupTab.type = "button";
                addGroupTab.className = "nsx-quick-reply-tab-add-fixed";
                addGroupTab.textContent = "+ 分组";
                addGroupTab.onclick = e => {
                    e.preventDefault();
                    e.stopPropagation();
                    openAddGroupDialog(() => {
                        state.groupIdx = Math.max(0, getQuickReplyGroups().length - 1);
                        state.page = 1;
                        renderMenu();
                    });
                };
                const list = document.createElement("div");
                list.className = "nsx-quick-reply-list";
                const foot = document.createElement("div");
                foot.className = "nsx-quick-reply-foot";
                tabsWrap.append(tabs, addGroupTab);
                menu.append(tabsWrap, list, foot);

                tabsWrap.style.cursor = "move";
                tabsWrap.addEventListener("pointerdown", (e) => {
                    if (!menu.classList.contains("show")) return;
                    if (e.button !== 0) return;
                    if (e.target?.closest?.("button,input,select,textarea,a,.nsx-quick-reply-tab,.nsx-quick-reply-tab-add-fixed")) return;
                    e.preventDefault();
                    e.stopPropagation();

                    placeMenu();
                    const r = menu.getBoundingClientRect();
                    dragOn = true;
                    dragStartX = e.clientX;
                    dragStartY = e.clientY;
                    dragLeft = r.left;
                    dragTop = r.top;
                    try { tabsWrap.setPointerCapture(e.pointerId); } catch { }
                }, { passive: false });
                tabsWrap.addEventListener("pointermove", onDragMove);
                tabsWrap.addEventListener("pointerup", onDragEnd);
                tabsWrap.addEventListener("pointercancel", onDragEnd);

                const renderMenu = () => {
                    const groups = getQuickReplyGroups();
                    tabs.innerHTML = "";
                    list.innerHTML = "";
                    foot.innerHTML = "";
                    if (!groups.length) {
                        const empty = document.createElement("div");
                        empty.className = "nsx-quick-reply-empty";
                        empty.textContent = "未找到快捷回复，请先在快捷回复面板中配置。";
                        list.appendChild(empty);
                        const addBtn = document.createElement("button");
                        addBtn.type = "button";
                        addBtn.className = "nsx-quick-reply-add";
                        addBtn.textContent = "新增";
                        addBtn.onclick = () => openAddDialog("", () => {
                            state.groupIdx = 0;
                            renderMenu();
                        });
                        foot.appendChild(addBtn);
                        return;
                    }

                    state.groupIdx = Math.max(0, Math.min(state.groupIdx, groups.length - 1));
                    groups.forEach((g, i) => {
                        // 不要在 button 里嵌套 button（浏览器行为不一致，可能导致误触发关闭）
                        const t = document.createElement("div");
                        t.className = `nsx-quick-reply-tab${i === state.groupIdx ? " active" : ""}`;
                        t.setAttribute("role", "button");
                        t.tabIndex = 0;

                        const label = g.name || `分组${i + 1}`;
                        const text = document.createElement("span");
                        text.className = "nsx-quick-reply-tab-text";
                        text.textContent = label;

                        const del = document.createElement("span");
                        del.className = "nsx-quick-reply-tab-del";
                        del.title = "删除分组";
                        del.textContent = "✕";
                        del.setAttribute("role", "button");
                        del.tabIndex = 0;
                        del.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const groupName = g.name || "";
                            if (!groupName) return;
                            const doDel = () => {
                                let parsed = {};
                                try { parsed = JSON.parse(localStorage.getItem("nodeseek_quick_reply") || "{}") || {}; } catch { parsed = {}; }
                                delete parsed[groupName];
                                localStorage.setItem("nodeseek_quick_reply", JSON.stringify(parsed));
                                state.groupIdx = Math.max(0, Math.min(state.groupIdx, Object.keys(parsed).length - 1));
                                renderMenu();
                            };
                            if (ctx.ui?.confirm) ctx.ui.confirm("确认删除?", `确定要删除分组【${groupName}】吗？（该分组下的快捷回复会一起删除）`, doDel);
                            else if (window.confirm(`确定要删除分组【${groupName}】吗？（该分组下的快捷回复会一起删除）`)) doDel();
                        };

                        const pick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            state.groupIdx = i;
                            renderMenu();
                        };
                        t.onclick = pick;
                        t.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") pick(e); };

                        t.append(text, del);
                        tabs.appendChild(t);
                    });
                    const curGroup = groups[state.groupIdx];
                    const curItems = curGroup.items || [];
                    if (!curItems.length) {
                        const empty = document.createElement("div");
                        empty.className = "nsx-quick-reply-empty";
                        empty.textContent = "当前分组暂无内容，点击右下角“新增”添加。";
                        list.appendChild(empty);
                    }

                    const curGroupName = curGroup?.name || "";
                    curItems.forEach((item, idx) => {
                        // 同理：避免在 button 里嵌套 button
                        const it = document.createElement("div");
                        it.className = "nsx-quick-reply-item";
                        it.setAttribute("role", "button");
                        it.tabIndex = 0;
                        it.title = item.text;

                        const text = document.createElement("span");
                        text.className = "nsx-quick-reply-item-text";
                        text.textContent = item.label;

                        const del = document.createElement("span");
                        del.className = "nsx-quick-reply-item-del";
                        del.title = "删除";
                        del.textContent = "✕";
                        del.setAttribute("role", "button");
                        del.tabIndex = 0;
                        del.onclick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!curGroupName) return;
                            const doDel = () => {
                                let parsed = {};
                                try { parsed = JSON.parse(localStorage.getItem("nodeseek_quick_reply") || "{}") || {}; } catch { parsed = {}; }
                                const raw = parsed[curGroupName];
                                const arr = normalizeItems(raw).map(x => ({ title: x.label, content: x.text }));
                                arr.splice(idx, 1);
                                parsed[curGroupName] = arr;
                                localStorage.setItem("nodeseek_quick_reply", JSON.stringify(parsed));
                                renderMenu();
                            };
                            if (ctx.ui?.confirm) ctx.ui.confirm("确认删除?", `确定要删除这条快捷回复吗？`, doDel);
                            else if (window.confirm("确定要删除这条快捷回复吗？")) doDel();
                        };

                        it.append(text, del);
                        const doInsert = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            insertReplyText(item.text);
                            menu.classList.remove("show");
                            // 检查是否自动点击提交按钮
                            const autoSendCheck = document.getElementById("nsx-quick-reply-autosend");
                            if (autoSendCheck && autoSendCheck.checked) {
                                setTimeout(() => {
                                    const submitBtn = editor.querySelector(".md-editor button.submit.btn");
                                    if (submitBtn) submitBtn.click();
                                }, 100);
                            }
                        };
                        it.onclick = doInsert;
                        it.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") doInsert(e); };
                        list.appendChild(it);
                    });

                    // 自动发送勾选框
                    const autoSendWrap = document.createElement("div");
                    autoSendWrap.className = "nsx-quick-reply-autosend-wrap";
                    const autoSendCheck = document.createElement("input");
                    autoSendCheck.type = "checkbox";
                    autoSendCheck.id = "nsx-quick-reply-autosend";
                    autoSendCheck.className = "nsx-quick-reply-autosend-check";
                    // 从localStorage读取上次设置（兼容NS综合.js的key）
                    const savedAutoSend = localStorage.getItem("nodeseek_quick_reply_auto_submit") === "true";
                    autoSendCheck.checked = savedAutoSend;
                    const autoSendLabel = document.createElement("label");
                    autoSendLabel.htmlFor = "nsx-quick-reply-autosend";
                    autoSendLabel.className = "nsx-quick-reply-autosend-label";
                    autoSendLabel.textContent = "自动提交";
                    // 保存设置到localStorage（使用NS综合.js的key保持兼容）
                    autoSendCheck.onchange = () => {
                        localStorage.setItem("nodeseek_quick_reply_auto_submit", autoSendCheck.checked);
                    };
                    autoSendWrap.append(autoSendCheck, autoSendLabel);

                    const addBtn = document.createElement("button");
                    addBtn.type = "button";
                    addBtn.className = "nsx-quick-reply-add";
                    addBtn.textContent = "新增";
                    addBtn.onclick = () => openAddDialog(curGroup.name || "", () => renderMenu());
                    foot.append(autoSendWrap, addBtn);
                };

                btn.onclick = e => {
                    e.preventDefault();
                    e.stopPropagation();
                    renderMenu();
                    menu.classList.toggle("show");
                    if (menu.classList.contains("show")) requestAnimationFrame(placeMenu);
                };

                document.addEventListener("click", e => {
                    // 当 layui 弹窗打开时（例如“新建分组”的确认/取消），不要自动关闭快捷回复面板
                    // 处理两类情况：1) 点击发生在 layer 内部；2) layer 存在时点击落在外部但仍希望保持面板不被误关
                    if (e.target?.closest?.(".layui-layer,.layui-layer-page,.layui-layer-dialog,.layui-layer-content,.layui-layer-btn,.layui-layer-shade,.layui-colorpicker,.layui-form-select")) return;
                    if (menu.classList.contains("show") && document.querySelector(".layui-layer")) return;
                    if (!wrap.contains(e.target)) menu.classList.remove("show");
                });

                // 窗口变化时重新定位，避免面板被挤出屏幕
                addEventListener("resize", placeMenu, { passive: true });
                addEventListener("scroll", placeMenu, { passive: true });

                sep.className = "sep";
                wrap.append(btn, menu);
                const lastEl = bar.lastElementChild;
                if (lastEl?.classList?.contains("sep")) {
                    bar.append(wrap);
                } else {
                    bar.append(sep, wrap);
                }
            }

            function insertReplyText(text) {
                if (!text) return;
                const cm = editor.querySelector(".CodeMirror")?.CodeMirror;
                if (cm) {
                    const doc = cm.getDoc();
                    const cur = doc.getCursor();
                    doc.replaceRange(text, cur);
                    cm.focus();
                    return;
                }
                const ta = editor.querySelector("textarea");
                if (!ta) return;
                const start = ta.selectionStart ?? ta.value.length;
                const end = ta.selectionEnd ?? ta.value.length;
                ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
                const pos = start + text.length;
                ta.setSelectionRange(pos, pos);
                ta.dispatchEvent(new Event("input", { bubbles: true }));
                ta.focus();
            }

            function getQuickReplyGroups() {
                const raw = localStorage.getItem("nodeseek_quick_reply");
                if (!raw) return [];
                let parsed;
                try { parsed = JSON.parse(raw); } catch { return []; }
                if (!parsed || typeof parsed !== "object") return [];
                const groups = [];
                Object.entries(parsed).forEach(([name, val]) => {
                    const items = normalizeItems(val);
                    groups.push({ name, items });
                });
                return groups;
            }

            function openAddGroupDialog(onDone) {
                const layer = ctx.ui?.layer;
                if (!layer) {
                    const val = window.prompt("请输入分组名：", "默认");
                    const groupName = String(val ?? "").trim();
                    if (!groupName) return;
                    ensureQuickReplyGroup(groupName);
                    ctx.ui?.success?.("分组已创建");
                    onDone?.();
                    return;
                }
                layer.prompt({ title: "新建分组", formType: 0, value: "默认" }, (val, idx) => {
                    const groupName = String(val ?? "").trim();
                    if (!groupName) return ctx.ui?.warning?.("分组名不能为空");
                    ensureQuickReplyGroup(groupName);
                    layer.close(idx);
                    ctx.ui?.success?.("分组已创建");
                    onDone?.();
                });
            }

            function openAddDialog(defaultGroupName, onDone) {
                const layer = ctx.ui?.layer;
                let groups = getQuickReplyGroups().map(g => g.name).filter(Boolean);
                if (!layer || !window.layui) {
                    const ask = (label, def = "") => {
                        const v = window.prompt(label, def);
                        return v == null ? null : String(v).trim();
                    };
                    const group = ask("请输入分组名：", defaultGroupName || groups[0] || "默认");
                    if (group == null) return;
                    if (!group) { ctx.ui?.warning?.("分组名不能为空"); return; }
                    const content = ask("请输入快捷回复内容：", "");
                    if (content == null) return;
                    if (!content.trim()) { ctx.ui?.warning?.("内容不能为空"); return; }
                    const title = ask("请输入标题（可留空自动截断内容）：", "") || shrink(content);
                    saveQuickReplyItem(group, { title, content: content.trim() });
                    ctx.ui?.success?.("快捷回复已添加");
                    onDone?.();
                    return;
                }

                // 没有任何分组时，先创建一个默认分组，避免下拉为空无法选择
                if (!groups.length) {
                    ensureQuickReplyGroup("默认");
                    groups = getQuickReplyGroups().map(g => g.name).filter(Boolean);
                }

                const escHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
                const defaultGroup = defaultGroupName || groups[0] || "默认";
                const optsHtml = groups.map(g => `<option value="${escHtml(g)}"${g === defaultGroup ? " selected" : ""}>${escHtml(g)}</option>`).join("");
                const html = `
                    <style>
                        .nsx-qr-form .layui-form-label{width:70px}
                        .nsx-qr-form .layui-input-block{margin-left:100px}
                        .nsx-qr-tip{font-size:12px;color:#999;margin-top:4px}
                    </style>
                    <div class="layui-form nsx-qr-form" style="padding:16px 16px 0;">
                        <div class="layui-form-item">
                            <label class="layui-form-label">分组</label>
                            <div class="layui-input-block">
                                <select id="nsx-qr-group">
                                    ${optsHtml}
                                </select>
                                <div class="nsx-qr-tip">需要新分组请点工具栏右侧的“+ 分组”。</div>
                            </div>
                        </div>
                        <div class="layui-form-item">
                            <label class="layui-form-label">内容</label>
                            <div class="layui-input-block">
                                <textarea id="nsx-qr-content" class="layui-textarea" style="min-height:130px" placeholder="输入快捷回复正文"></textarea>
                                <div class="nsx-qr-tip">支持多行文本，插入时会保持换行。标题将自动使用内容前 28 字。</div>
                            </div>
                        </div>
                    </div>
                `;
                layer.open({
                    type: 1,
                    title: "新增快捷回复",
                    area: [window.layui.device().mobile ? "95%" : "560px", "420px"],
                    btn: ["保存", "取消"],
                    content: html,
                    success: ly => {
                        const r = ly?.[0] || ly;
                        if (window.layui?.form) {
                            layui.use("form", () => {
                                const form = layui.form;
                                form.render("select");
                            });
                        }
                        const c = r?.querySelector?.("#nsx-qr-content");
                        c?.focus?.();
                    },
                    yes: idx => {
                        const r = document.getElementById("layui-layer" + idx) || document;
                        const group = r.querySelector("#nsx-qr-group")?.value?.trim() || "";
                        const content = r.querySelector("#nsx-qr-content")?.value || "";
                        if (!group) return ctx.ui?.warning?.("分组名不能为空");
                        if (!content.trim()) return ctx.ui?.warning?.("内容不能为空");
                        const title = shrink(content);
                        saveQuickReplyItem(group, { title, content: content.trim() });
                        layer.close(idx);
                        ctx.ui?.success?.("快捷回复已添加");
                        onDone?.();
                    }
                });
            }

            function ensureQuickReplyGroup(groupName) {
                let parsed = {};
                try { parsed = JSON.parse(localStorage.getItem("nodeseek_quick_reply") || "{}") || {}; } catch { parsed = {}; }
                if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) parsed = {};
                if (!Object.prototype.hasOwnProperty.call(parsed, groupName)) parsed[groupName] = [];
                localStorage.setItem("nodeseek_quick_reply", JSON.stringify(parsed));
            }

            function saveQuickReplyItem(groupName, item) {
                let parsed = {};
                try { parsed = JSON.parse(localStorage.getItem("nodeseek_quick_reply") || "{}") || {}; } catch { parsed = {}; }
                if (!parsed[groupName]) parsed[groupName] = [];
                if (Array.isArray(parsed[groupName])) {
                    parsed[groupName].push(item);
                } else if (parsed[groupName] && typeof parsed[groupName] === "object") {
                    const arr = normalizeItems(parsed[groupName]).map(i => ({ title: i.label, content: i.text }));
                    arr.push(item);
                    parsed[groupName] = arr;
                } else {
                    parsed[groupName] = [item];
                }
                localStorage.setItem("nodeseek_quick_reply", JSON.stringify(parsed));
            }

            function normalizeItems(src) {
                const arr = Array.isArray(src) ? src : (src && typeof src === "object" ? Object.values(src) : []);
                return arr.map(v => {
                    if (typeof v === "string") return { label: shrink(v), text: v };
                    if (!v || typeof v !== "object") return null;
                    const text = String(v.content ?? v.text ?? v.value ?? "").trim();
                    if (!text) return null;
                    const label = String(v.title ?? v.name ?? v.label ?? shrink(text));
                    return { label, text };
                }).filter(Boolean);
            }

            function shrink(s) {
                const t = String(s).replace(/\s+/g, " ").trim();
                return t.length > 28 ? `${t.slice(0, 28)}...` : t;
            }
        }
    };

    const __vite_glob_0_14 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: quickComment
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 🤖 AI美化 ] - AI 主题美化功能
       ========================================================================== */
    const aiComment = {
        id: "aiComment",
        order: 121,
        deps: ["quickComment"],
        cfg: { ai_comment: { enabled: false, api_type: "openai", api_key: "", api_url: "", model: "gpt-3.5-turbo", system_prompt: "你是 NodeSeek 发帖润色助手。请将用户输入的主题内容进行美化与优化，保持原意不跑题，输出结构清晰、可直接发布的版本。要求：1) 使用 Markdown 语法（标题、列表、引用、代码块按需使用）；2) 语言自然、有可读性；3) 可适度加入 Emoji 提升表达（每段 0-2 个，避免堆砌）；4) 不编造事实，不添加广告或引战内容；5) 若信息不足，用一句简短提示提醒补充关键细节。" } },
        meta: {
            ai_comment: {
                label: "AI美化",
                group: "🧭 辅助工具",
                fields: {
                    api_type: { type: "SELECT", label: "API类型", options: { openai: "OpenAI", custom: "自定义API" } },
                    api_url: { type: "INPUT", label: "API地址" },
                    model: { type: "INPUT", label: "模型名称" },
                    api_key: { type: "INPUT", label: "API密钥" },
                    system_prompt: { type: "TEXTAREA", label: "系统提示词" }
                }
            }
        },
        match: ctx => location.pathname.startsWith("/new-discussion") && ctx.store.get("ai_comment.enabled", false),
        init(ctx) {
            const editor = $(".md-editor");
            const bar = editor?.querySelector(".mde-toolbar");
            if (!bar) return;
            if (bar.querySelector(".nsx-ai-wrap")) return;
            const vAttr = [...(bar.querySelector(".toolbar-item")?.attributes || [])].find(a => a.name.startsWith("data-v-"))?.name;
            const setV = el => vAttr && el.setAttribute(vAttr, "");

            addStyle("nsx-ai-reply", `
    .nsx-ai-reply-btn{display:flex;align-items:center;gap:4px;color:#1677ff;cursor:pointer;font-size:12px;transition:all .2s}
    .nsx-ai-reply-btn:hover{color:#4096ff}
    .nsx-ai-reply-btn.loading{opacity:.6;cursor:not-allowed}
    .nsx-ai-reply-btn svg{width:16px;height:16px}
    .nsx-ai-reply-icon{animation:aiSpin 1s linear infinite}
    @keyframes aiSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    .dark-layout .nsx-ai-reply-btn{color:#64b5f6}
    .dark-layout .nsx-ai-reply-btn:hover{color:#90caf9}
    `);

            const sep = document.createElement("div");
            sep.className = "sep nsx-ai-sep";
            setV(sep);

            const wrap = document.createElement("div");
            wrap.className = "nsx-ai-wrap toolbar-item";
            setV(wrap);

            const btn = document.createElement("span");
            btn.className = "nsx-ai-reply-btn i-icon";
            btn.title = "AI美化 - Nodeseek Pro";
            btn.innerHTML = `<svg viewBox="0 0 48 48" fill="none"><path d="M24 4C13 4 4 13 4 24s9 20 20 20 20-9 20-20S35 4 24 4z" stroke="currentColor" stroke-width="4"/><path d="M24 14v10m0 4v6" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>AI美化`;
            setV(btn);

            wrap.append(btn);
            // 插入到快捷回复按钮后面（分隔符 + 自动回复按钮）
            const quickReplyWrap = bar.querySelector(".nsx-quick-reply-wrap");
            if (quickReplyWrap) {
                const next = quickReplyWrap.nextElementSibling;
                if (next?.classList?.contains("sep")) {
                    next.after(wrap);
                } else {
                    quickReplyWrap.after(sep, wrap);
                }
            } else {
                const last = bar.lastElementChild;
                if (last?.classList?.contains("sep")) bar.append(wrap);
                else bar.append(sep, wrap);
            }

            btn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (btn.classList.contains("loading")) return;

                // 打开配置面板
                const apiKey = ctx.store.get("ai_comment.api_key") || "";
                if (!apiKey) {
                    openConfigPanel(ctx);
                    return;
                }

                await generateAIReply(ctx, editor, btn);
            };

            function openConfigPanel(ctx) {
                const escHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

                const apiType = ctx.store.get("ai_comment.api_type", "openai");
                const apiUrl = ctx.store.get("ai_comment.api_url", apiType === "openai" ? "https://api.openai.com/v1/chat/completions" : "");
                const model = ctx.store.get("ai_comment.model", "gpt-3.5-turbo");
                const sysPrompt = ctx.store.get("ai_comment.system_prompt", "你是 NodeSeek 发帖润色助手。请将用户输入的主题内容进行美化与优化，保持原意不跑题，输出结构清晰、可直接发布的版本。要求：1) 使用 Markdown 语法（标题、列表、引用、代码块按需使用）；2) 语言自然、有可读性；3) 可适度加入 Emoji 提升表达；4) 不编造事实，不添加广告或引战内容；5) 若信息不足，用一句简短提示提醒补充关键细节。");

                const html = `
                    <style>
                        .nsx-ai-form .layui-form-label{width:90px;padding-left:0}
                        .nsx-ai-form .layui-input-block{margin-left:120px}
                        .nsx-ai-tip{font-size:12px;color:#999;margin-top:4px}
                    </style>
                    <div class="layui-form nsx-ai-form" style="padding:16px 16px 0;">
                        <div class="layui-form-item">
                            <label class="layui-form-label">API类型</label>
                            <div class="layui-input-block">
                                <select id="nsx-ai-type" lay-filter="nsx-ai-type">
                                    <option value="openai" ${apiType === 'openai' ? 'selected' : ''}>OpenAI</option>
                                    <option value="custom" ${apiType === 'custom' ? 'selected' : ''}>自定义API</option>
                                </select>
                            </div>
                        </div>
                        <div class="layui-form-item">
                            <label class="layui-form-label">API地址</label>
                            <div class="layui-input-block">
                                <input type="text" id="nsx-ai-url" class="layui-input" value="${escHtml(apiUrl)}" placeholder="如 https://api.openai.com/v1/chat/completions">
                            </div>
                        </div>
                        <div class="layui-form-item">
                            <label class="layui-form-label">模型名称</label>
                            <div class="layui-input-block">
                                <input type="text" id="nsx-ai-model" class="layui-input" value="${escHtml(model)}" placeholder="如 gpt-3.5-turbo">
                                <div class="nsx-ai-tip">请输入您的API所使用的模型名称</div>
                            </div>
                        </div>
                        <div class="layui-form-item">
                            <label class="layui-form-label">API密钥</label>
                            <div class="layui-input-block">
                                <input type="password" id="nsx-ai-key" class="layui-input" value="${escHtml(apiKey)}" placeholder="sk-...">
                                <div class="nsx-ai-tip">您的API密钥将仅保存在本地浏览器中</div>
                            </div>
                        </div>
                        <div class="layui-form-item">
                            <label class="layui-form-label">系统提示词</label>
                            <div class="layui-input-block">
                                <textarea id="nsx-ai-prompt" class="layui-textarea" style="min-height:80px" placeholder="自定义AI美化风格">${escHtml(sysPrompt)}</textarea>
                                <div class="nsx-ai-tip">设置AI的美化风格</div>
                            </div>
                        </div>
                    </div>
                `;

                ctx.ui.layer.open({
                    title: 'AI美化配置',
                    content: html,
                    area: ['min(600px,94vw)', 'min(500px,90vh)'],
                    btn: ['保存', '测试连接', '取消'],
                    success: (layero) => {
                        layui.use(['form'], function () {
                            const form = layui.form;
                            form.render('select');
                            form.on('select(nsx-ai-type)', function (data) {
                                const typeInput = layero.find('#nsx-ai-url');
                                if (data.value === 'openai') {
                                    typeInput.val('https://api.openai.com/v1/chat/completions');
                                }
                            });
                        });
                    },
                    yes: (idx) => {
                        const r = document.getElementById("layui-layer" + idx) || document;
                        const type = r.querySelector("#nsx-ai-type")?.value || "openai";
                        const url = r.querySelector("#nsx-ai-url")?.value?.trim() || "";
                        const modelVal = r.querySelector("#nsx-ai-model")?.value?.trim() || "gpt-3.5-turbo";
                        const key = r.querySelector("#nsx-ai-key")?.value?.trim() || "";
                        const prompt = r.querySelector("#nsx-ai-prompt")?.value?.trim() || "";

                        if (!key) return ctx.ui?.warning?.("请输入API密钥");
                        if (!url) return ctx.ui?.warning?.("请输入API地址");
                        if (!modelVal) return ctx.ui?.warning?.("请输入模型名称");

                        ctx.store.set("ai_comment.api_type", type);
                        ctx.store.set("ai_comment.api_url", url);
                        ctx.store.set("ai_comment.model", modelVal);
                        ctx.store.set("ai_comment.api_key", key);
                        ctx.store.set("ai_comment.system_prompt", prompt);

                        ctx.ui.layer.close(idx);
                        ctx.ui?.success?.("配置已保存");
                    },
                    btn2: async (idx) => {
                        const r = document.getElementById("layui-layer" + idx) || document;
                        const url = r.querySelector("#nsx-ai-url")?.value?.trim() || "";
                        const key = r.querySelector("#nsx-ai-key")?.value?.trim() || "";
                        const modelVal = r.querySelector("#nsx-ai-model")?.value?.trim() || "";

                        if (!url || !key) return ctx.ui?.warning?.("请先填写API地址和密钥");

                        try {
                            await testConnection(url, key, modelVal);
                            ctx.ui?.success?.("连接成功！");
                        } catch (err) {
                            ctx.ui?.error?.("连接失败: " + err.message);
                        }
                        return false;
                    }
                });
            }

            async function generateAIReply(ctx, editor, btn) {
                // 获取帖子/评论内容
                const postContent = getPostContent();
                if (!postContent.text) {
                    ctx.ui?.error?.("无法获取帖子内容");
                    return;
                }

                btn.classList.add("loading");
                const originalHtml = btn.innerHTML;
                btn.innerHTML = `<svg class="nsx-ai-reply-icon" viewBox="0 0 48 48" fill="none"><path d="M24 4C13 4 4 13 4 24s9 20 20 20 20-9 20-20S35 4 24 4z" stroke="currentColor" stroke-width="4"/><path d="M24 14v10m0 4v6" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>生成中...`;

                try {
                    const apiType = ctx.store.get("ai_comment.api_type", "openai");
                    let apiUrl = ctx.store.get("ai_comment.api_url", "");
                    const apiKey = ctx.store.get("ai_comment.api_key", "");
                    const model = ctx.store.get("ai_comment.model", "gpt-3.5-turbo");
                    const systemPrompt = ctx.store.get("ai_comment.system_prompt", "");

                    // 智能补全 API 地址：自动追加 /v1/chat/completions
                    apiUrl = apiUrl.replace(/\/+$/, ""); // 去掉末尾斜杠
                    if (!apiUrl.includes("/chat/completions")) {
                        if (apiUrl.endsWith("/v1")) {
                            apiUrl += "/chat/completions";
                        } else {
                            apiUrl += "/v1/chat/completions";
                        }
                    }

                    // 构建消息内容：仅基于文本美化
                    const promptText = `请根据以下主题内容进行润色美化，输出可直接发布的 Markdown 成稿：\n\n${postContent.text}`;

                    await new Promise((resolve, reject) => {
                        GM_xmlhttpRequest({
                            method: "POST",
                            url: apiUrl,
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${apiKey}`
                            },
                            data: JSON.stringify({
                                model: model,
                                messages: [
                                    { role: "system", content: systemPrompt },
                                    { role: "user", content: promptText }
                                ],
                                max_tokens: 500,
                                temperature: 0.7,
                                stream: false
                            }),
                            onload: (xhr) => {
                                try {
                                    // 先检查 HTTP 状态码
                                    if (xhr.status < 200 || xhr.status >= 300) {
                                        let errMsg = `HTTP ${xhr.status}`;
                                        try {
                                            const errBody = JSON.parse(xhr.responseText || "{}");
                                            if (errBody.error?.message) errMsg = errBody.error.message;
                                        } catch { }
                                        throw new Error(errMsg);
                                    }
                                    let responseText = (xhr.responseText || "").trim();
                                    let result;

                                    // 尝试直接解析 JSON
                                    try {
                                        result = JSON.parse(responseText);
                                    } catch (_) {
                                        // 如果直接解析失败，尝试按 SSE (Server-Sent Events) 格式解析
                                        // SSE 格式形如: data: {...}\ndata: {...}\ndata: [DONE]
                                        const lines = responseText.split("\n").filter(l => l.startsWith("data: ") && !l.includes("[DONE]"));
                                        if (lines.length > 0) {
                                            // 非流式：取最后一个完整的 data 行
                                            const lastLine = lines[lines.length - 1].replace(/^data:\s*/, "");
                                            result = JSON.parse(lastLine);
                                            // 如果是流式 SSE，拼接所有 delta content
                                            if (!result.choices?.[0]?.message && result.choices?.[0]?.delta) {
                                                let fullContent = "";
                                                for (const line of lines) {
                                                    try {
                                                        const chunk = JSON.parse(line.replace(/^data:\s*/, ""));
                                                        fullContent += chunk.choices?.[0]?.delta?.content || "";
                                                    } catch { }
                                                }
                                                result = { choices: [{ message: { content: fullContent } }] };
                                            }
                                        } else {
                                            throw new Error("无法解析API响应: " + responseText.substring(0, 200));
                                        }
                                    }

                                    if (result.choices && result.choices[0]) {
                                        const msg = result.choices[0].message || result.choices[0].delta;
                                        const aiReply = (msg?.content || "").trim();
                                        if (aiReply) {
                                            insertReplyText(editor, aiReply);
                                            ctx.ui?.success?.("AI美化已完成");
                                        } else {
                                            throw new Error("AI返回内容为空");
                                        }
                                    } else if (result.error) {
                                        throw new Error(result.error.message || "API返回错误");
                                    } else {
                                        throw new Error("API返回格式异常");
                                    }
                                    resolve();
                                } catch (err) {
                                    reject(err);
                                }
                            },
                            onerror: (err) => reject(new Error("请求失败: " + err))
                        });
                    });
                } catch (err) {
                    ctx.ui?.error?.("AI美化失败: " + err.message);
                } finally {
                    btn.classList.remove("loading");
                    btn.innerHTML = originalHtml;
                }
            }

            function getPostContent() {
                const isNewDiscussion = location.pathname.startsWith("/new-discussion");
                let text = "";
                let title = "";
                let contentText = "";

                if (isNewDiscussion) {
                    const titleEl = document.querySelector('input[name="title"], input[placeholder*="标题"], .md-editor input[type="text"]');
                    title = titleEl?.value?.trim?.() || "";

                    const cm = editor?.querySelector(".CodeMirror")?.CodeMirror;
                    if (cm && typeof cm.getValue === "function") {
                        contentText = (cm.getValue() || "").trim();
                    }
                    if (!contentText) {
                        const ta = editor?.querySelector("textarea") || document.querySelector("#editor textarea, .md-editor textarea, textarea");
                        contentText = ta?.value?.trim?.() || "";
                    }

                    if (title) text += "标题: " + title + "\n\n";
                    if (contentText) text += "内容: " + contentText;
                } else {
                    // 兼容帖子页
                    const titleEl = $(".nsk-post h1, .post-title, .post-content-title");
                    const contentEl = $(".nsk-post .post-content, .post-detail-content");
                    if (titleEl) text += "标题: " + titleEl.textContent.trim() + "\n\n";
                    if (contentEl) text += "内容: " + contentEl.textContent.trim();
                    if (!text) text = document.querySelector(".post-content")?.textContent || "";
                }

                return { text };
            }

            function insertReplyText(editor, text) {
                if (!text) return;
                const cm = editor.querySelector(".CodeMirror")?.CodeMirror;
                if (cm) {
                    const doc = cm.getDoc();
                    doc.setValue(text);
                    doc.setCursor(doc.lineCount(), 0);
                    cm.focus();
                    return;
                }
                const ta = editor.querySelector("textarea");
                if (!ta) return;
                ta.value = text;
                const pos = ta.value.length;
                ta.setSelectionRange(pos, pos);
                ta.dispatchEvent(new Event("input", { bubbles: true }));
                ta.focus();
            }

            async function testConnection(url, key, model) {
                return new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: "POST",
                        url: url,
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${key}`
                        },
                        data: JSON.stringify({
                            model: model,
                            messages: [{ role: "user", content: "Hello" }],
                            max_tokens: 10
                        }),
                        onload: (xhr) => {
                            if (xhr.status === 200) resolve({ status: xhr.status });
                            else reject(new Error(`HTTP ${xhr.status}`));
                        },
                        onerror: (err) => reject(err)
                    });
                });
            }
        }
    };

    const __vite_glob_0_15 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: aiComment
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 🚀 基础功能 ] - 自动签到系统
       ========================================================================== */
    const signIn = {
        id: "signIn",
        deps: ["ui"],
        order: 80,
        cfg: {
            sign_in: {
                ns: { enabled: true, method: 1, last_date: "", ignore_date: "" },
                df: { enabled: true, method: 1, last_date: "", ignore_date: "" }
            }
        },
        meta: {
            sign_in: {
                label: "自动签到", group: "🚀 基础功能",
                fields: { method: { type: "RADIO", label: "签到方式", valueType: "number", options: [{ value: 1, text: "随机🍗" }, { value: 2, text: "5个🍗" }] } },
                hidden: ["last_date", "ignore_date"]
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
            try {
                const r = await net.post(`/api/attendance?random=${method === 1}`);
                ctx.store.set(`sign_in.${code}.last_date`, now);
                if (r?.success) {
                    ctx.ui.success?.(`签到成功！+${r.gain}🍗，共${r.current}🍗`);
                } else {
                    ctx.ui.info?.(r?.message || "签到失败");
                }
            } catch (e) { ctx.ui.info?.(e?.message || "签到错误"); }
        }
    };

    const __vite_glob_0_16 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: signIn
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 🚀 基础功能 ] - 签到过期提醒
       ========================================================================== */

    const CSS = `.nsplus-tip{background:rgba(255,217,0,.8);padding:3px;text-align:center;animation:blink 5s ease infinite}.nsplus-tip p,.nsplus-tip p a{color:#f00}.nsplus-tip p a:hover{color:#0ff}`;

    const signinTips = {
        id: "signinTips",
        deps: ["ui"],
        order: 79,
        cfg: { signin_tips: { enabled: true } },
        meta: { signin_tips: { label: "签到提示", group: "🚀 基础功能" } },
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

    const __vite_glob_0_17 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: signinTips
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 🧭 辅助工具 ] - 网页平滑滚动
       ========================================================================== */
    const smoothScroll = {
        id: "smoothScroll",
        order: 340,
        cfg: { smooth_scroll: { enabled: true } },
        meta: { smooth_scroll: { label: "网页平滑滚动", group: "🧭 辅助工具" } },
        match: ctx => ctx.store.get("smooth_scroll.enabled", true),
        init() {
            addStyle("nsx-smooth", "html{scroll-behavior:smooth}");
        }
    };

    const __vite_glob_0_18 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: smoothScroll
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 🧭 辅助工具 ] - 侧边卡片通知增强
       ========================================================================== */

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
        task(fn, ms) {
            let timer = null;
            let backoff = 1;
            const run = async () => {
                if (!this.active || document.hidden) {
                    timer = setTimeout(run, ms);
                    return;
                }
                try {
                    const d = await fn();
                    if (d !== undefined) this.send(d);
                    backoff = 1;
                } catch {
                    backoff = Math.min(backoff * 2, 6);
                }
                timer = setTimeout(run, ms * backoff);
            };
            run();
            return () => timer && clearTimeout(timer);
        }
    }

    const userCardExt = {
        id: "userCardExt",
        order: 200,
        cfg: { user_card_ext: { enabled: true } },
        meta: { user_card_ext: { label: "侧边卡片通知增强", group: "🧭 辅助工具" } },
        match: ctx => ctx.loggedIn && (ctx.isPost || ctx.isList) && ctx.store.get("user_card_ext.enabled", true),
        async init(ctx) {
            const bn = new Broadcast("nsx_notify");
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

            bn.on(({ data }) => { if (data?.type === "unreadCount" && data.counts) upAll(data.counts); });
            bn.send({ type: "unreadCount", counts: ctx.user?.unViewedCount || {}, timestamp: Date.now() });
            bn.task(async () => {
                const r = await fetch("/api/notification/unread-count", { credentials: "include" });
                if (!r.ok) throw 0;
                const d = await r.json();
                if (d?.success && d.unreadCount) return { type: "unreadCount", counts: d.unreadCount, timestamp: Date.now() };
                throw 0;
            }, 5000);
        }
    };

    const __vite_glob_0_19 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: userCardExt
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 🎨 视觉美化 ] - 已访问帖子链接染色
       ========================================================================== */

    const DEFAULT_LIGHT = "#afb9c1";
    const DEFAULT_DARK = "#393f4e";
    const VISITED_POSTS_KEY = "nsx_visited_posts";
    const VISITED_POSTS_LIMIT = 4000;

    const getVisitedPostKey = (href) => {
        if (!href) return "";
        try {
            const url = new URL(href, location.origin);
            const id = url.pathname.match(/^\/post-(\d+)/)?.[1];
            return id ? `post:${id}` : `${url.origin}${url.pathname}`;
        } catch {
            return "";
        }
    };

    const readVisitedPosts = () => {
        try {
            const parsed = JSON.parse(localStorage.getItem(VISITED_POSTS_KEY) || "[]");
            return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
        } catch {
            return [];
        }
    };

    const writeVisitedPosts = (items) => {
        const uniq = [...new Set((items || []).filter(Boolean))];
        localStorage.setItem(VISITED_POSTS_KEY, JSON.stringify(uniq.slice(-VISITED_POSTS_LIMIT)));
    };

    const markVisitedPostLink = (link, visitedSet) => {
        if (!link) return;
        const key = getVisitedPostKey(link.href);
        if (!key) return;
        if (visitedSet?.has(key)) link.classList.add("nsx-visited-link");
        else link.classList.remove("nsx-visited-link");
    };

    const visitedColor = {
        id: "visitedColor",
        order: 350,
        cfg: { visited_color: { enabled: true, light: DEFAULT_LIGHT, dark: DEFAULT_DARK } },
        meta: {
            visited_color: {
                label: "已访问颜色",
                group: "🎨 视觉美化",
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
            addStyle("nsx-visited-color", `.post-list .post-title a:visited,.post-list .post-title a.nsx-visited-link{color:${light}}body.dark-layout .post-list .post-title a:visited,body.dark-layout .post-list .post-title a.nsx-visited-link{color:${dark}}`);

            const applyVisitedState = (links = $$(".post-list .post-title a[href*='/post-']")) => {
                const visitedSet = new Set(readVisitedPosts());
                links.forEach(link => markVisitedPostLink(link, visitedSet));
            };

            const persistVisitedLink = (link) => {
                const key = getVisitedPostKey(link?.href);
                if (!key) return;
                const list = readVisitedPosts();
                if (list.includes(key)) {
                    link.classList.add("nsx-visited-link");
                    return;
                }
                list.push(key);
                writeVisitedPosts(list);
                link.classList.add("nsx-visited-link");
            };

            applyVisitedState();
            document.addEventListener("click", (e) => {
                const link = e.target.closest(".post-list .post-title a[href*='/post-']");
                if (!link) return;
                persistVisitedLink(link);
            }, true);
            document.addEventListener("auxclick", (e) => {
                const link = e.target.closest(".post-list .post-title a[href*='/post-']");
                if (!link) return;
                persistVisitedLink(link);
            }, true);

            window.__nsxRuntime ||= {};
            window.__nsxRuntime.refreshVisitedColor = applyVisitedState;
        },
        watch: () => ({ sel: ".post-list .post-title a[href*='/post-']", fn: els => window.__nsxRuntime?.refreshVisitedColor?.(els), opts: { debounce: 100 } })
    };

    const __vite_glob_0_20 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: visitedColor
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 🧭 辅助工具 ] - 邮箱导航入口
       ========================================================================== */
    const EMAIL_LINK_URL = "https://seek.li/";

    const emailNavLink = {
        id: "emailNavLink",
        order: 205,
        cfg: { email_nav_link: { enabled: true } },
        meta: { email_nav_link: { label: "邮箱入口", group: "🧭 辅助工具" } },
        match: ctx => ctx.store.get("email_nav_link.enabled", true),
        init(ctx) {
            const TEXT_LINK_ID = "nsx-email-nav";
            const ICON_LINK_ID = "nsx-email-icon-link";

            const isMobile = document.documentElement.classList.contains("nsx-mobile");

            const ensureEntry = () => {
                const headerLinks = [...document.querySelectorAll("header a")];
                const deepFloodLink = headerLinks.find(a => {
                    const t = a.textContent.trim();
                    return t === "DeepFlood" || t === "DF";
                });
                const textLink = document.getElementById(TEXT_LINK_ID);
                const iconLink = document.getElementById(ICON_LINK_ID);

                // 手机端或找到 DF/DeepFlood 链接时，使用文字链接
                if (deepFloodLink || isMobile) {
                    iconLink?.remove();
                    if (textLink) {
                        if (deepFloodLink && textLink.previousElementSibling !== deepFloodLink) deepFloodLink.after(textLink);
                        return true;
                    }

                    const newLink = document.createElement("a");
                    newLink.id = TEXT_LINK_ID;
                    newLink.href = EMAIL_LINK_URL;
                    newLink.textContent = "邮箱";
                    newLink.target = "_blank";
                    newLink.rel = "noopener noreferrer";
                    if (deepFloodLink) {
                        newLink.className = deepFloodLink.className;
                        newLink.style.marginLeft = "16px";
                        deepFloodLink.after(newLink);
                    } else {
                        // 手机端没有 DF 链接时，追加到 header 导航最后
                        const navLinks = document.querySelector("header .nav-links, header nav, #nsk-head .header-nav");
                        if (navLinks) {
                            const lastLink = [...navLinks.querySelectorAll("a")].pop();
                            if (lastLink) {
                                newLink.className = lastLink.className;
                                newLink.style.marginLeft = "16px";
                                lastLink.after(newLink);
                            } else {
                                navLinks.appendChild(newLink);
                            }
                        }
                    }
                    return true;
                }

                // 桌面端无 DeepFlood 链接时，使用图标
                const grp = ensureIconGroup();
                if (!grp) return false;

                if (textLink) textLink.remove();
                if (iconLink) return true;

                const newIconLink = document.createElement("a");
                newIconLink.id = ICON_LINK_ID;
                newIconLink.href = EMAIL_LINK_URL;
                newIconLink.target = "_blank";
                newIconLink.rel = "noopener noreferrer";
                newIconLink.className = "email-dropdown-on";
                newIconLink.title = "邮箱";
                newIconLink.innerHTML = `<svg class="iconpark-icon" style="width:17px;height:17px"><use href="#envelope-one"></use></svg>`;
                grp.appendChild(newIconLink);
                return true;
            };

            ensureEntry();

            const header = document.querySelector("header");
            if (!header) return;
            const syncEntry = debounce(() => { ensureEntry(); }, 120);
            new MutationObserver(syncEntry).observe(header, { childList: true, subtree: true });
        }
    };

    const __vite_glob_0_22 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: emailNavLink
    }, Symbol.toStringTag, { value: 'Module' }));

    /* ==========================================================================
       [ 🎨 视觉美化 ] - 相对时间中文化
       ========================================================================== */
    const timeChinese = {
        id: "timeChinese",
        order: 110,
        cfg: { time_chinese: { enabled: true } },
        meta: { time_chinese: { label: "时间中文化", group: "🎨 视觉美化" } },
        match: ctx => ctx.store.get("time_chinese.enabled", true),
        init(ctx) {
            const trans = (text) => {
                if (!text) return text;
                let res = text.trim();
                const lower = res.toLowerCase();
                if (lower.includes('just now')) return '刚刚';

                let prefix = "";
                if (lower.startsWith('edited')) {
                    prefix = "编辑于 ";
                    res = res.substring(6).trim();
                }

                res = res.replace(/(\d+)\s*y(ears?)?/gi, '$1年');
                res = res.replace(/(\d+)\s*mo(nths?)?/gi, '$1月');
                res = res.replace(/(\d+)\s*d(ays?)?/gi, '$1天');
                res = res.replace(/(\d+)\s*h(ours?)?/gi, '$1小时');
                res = res.replace(/(\d+)\s*min(utes?)?/gi, '$1分钟');
                res = res.replace(/(\d+)\s*s(econds?)?(?!\w)/gi, '$1秒');
                res = res.replace(/ago/gi, '前');

                return prefix + res.replace(/\s+/g, '');
            };
            const run = (els) => {
                els.forEach(el => {
                    const target = el.tagName === 'TIME' ? el : (el.querySelector('time') || el);
                    if (target.dataset.nsxTime) return;
                    const orig = target.textContent.trim();
                    if (!orig || /^\d{4}-\d{2}-\d{2}/.test(orig)) return;

                    const translated = trans(orig);
                    if (orig !== translated) {
                        target.dataset.nsxTime = orig;
                        target.textContent = translated;
                    }
                });
            };
            const sels = 'time, .date-created, .date-updated, .post-info, .comment-info';
            const doRun = () => run(ctx.$$(sels));
            doRun();
            ctx.watch(sels, doRun, { debounce: 200 });
        }
    };

    const __vite_glob_0_21 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
        __proto__: null,
        default: timeChinese
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
    const BASE_CSS = `.blocked-post{display:none!important}#nsx-toggle-autoload{display:flex;justify-content:center;align-items:center}#back-to-comment{display:flex}#fast-nav-button-group .nav-item-btn:nth-last-child(4){bottom:120px}#fast-nav-button-group .nav-item-btn:nth-last-child(5){bottom:160px}#fast-nav-button-group .nav-item-btn:nth-last-child(6){bottom:200px}#fast-nav-button-group .nav-item-btn:nth-last-child(7){bottom:240px}#nsx-icon-group{display:flex;align-items:center;gap:0!important;list-style:none;border-left:1px solid var(--border-color,#e5e7eb);margin-left:6px!important;padding-left:6px!important;height:30px}#nsx-icon-group>.filter-dropdown-on,#nsx-icon-group>.relation-dropdown-on,#nsx-icon-group>.history-dropdown-on,#nsx-icon-group>.email-dropdown-on{cursor:pointer;display:flex!important;align-items:center;justify-content:center;height:30px!important;padding:0 6px!important;min-width:auto!important;width:auto!important;margin:0!important;position:relative!important;top:0!important;transition:opacity .1s;color:inherit;text-decoration:none}#nsx-icon-group>.filter-dropdown-on svg,#nsx-icon-group>.relation-dropdown-on svg,#nsx-icon-group>.history-dropdown-on svg,#nsx-icon-group>.email-dropdown-on svg{display:block!important;width:16px!important;height:16px!important;transform:translateY(0)!important}#nsx-icon-group>.filter-dropdown-on:hover,#nsx-icon-group>.relation-dropdown-on:hover,#nsx-icon-group>.history-dropdown-on:hover,#nsx-icon-group>.email-dropdown-on:hover{opacity:.6}#nsx-filter-panel,#nsx-history-panel,#nsx-rel-panel{position:fixed;right:12px;top:60px;width:min(380px,94vw);height:min(700px,80vh);background:#fff;border:1px solid #e4e4e4;border-radius:12px;box-shadow:0 16px 32px rgba(0,0,0,.12);z-index:99999;display:none;flex-direction:column;overflow:hidden}#nsx-filter-panel.show,#nsx-history-panel.show,#nsx-rel-panel.show{display:flex}.nsx-mode-layer .layui-layer-content{overflow:visible!important;padding-bottom:8px}.nsx-mode-layer .layui-form-select dl{z-index:999999!important}.dark-layout #nsx-filter-panel,.dark-layout #nsx-history-panel,.dark-layout #nsx-rel-panel{background:#1e1e1e;border-color:#3a3a3a;color:#e0e0e0}.dark-layout #nsx-icon-group{border-left-color:#3a3a3a}.msc-overlay{background-color:var(--bg-sub-color)}.nsx-mobile .md-editor .mde-toolbar{display:flex;flex-wrap:wrap;align-items:center;height:auto!important;min-height:40px;padding-right:4px;overflow:visible}.nsx-mobile .md-editor .mde-toolbar>*{flex:0 0 auto}.nsx-mobile .md-editor .mde-toolbar .toolbar-item{height:30px;line-height:30px}.nsx-mobile .md-editor .mde-toolbar .toolbar-item.right{margin-left:auto}.nsx-mobile .md-editor .mde-toolbar .toolbar-tabs{width:100%;order:-1}.nsx-mobile .layui-layer{max-width:94vw!important}.nsx-mobile .layui-layer .layui-form-label{width:auto!important;float:none!important;text-align:left!important;padding:0 0 4px!important}.nsx-mobile .layui-layer .layui-input-block{margin-left:0!important}.nsx-mobile .nsx-ai-form .layui-form-label{width:auto!important;float:none!important;text-align:left!important;padding:0 0 4px!important}.nsx-mobile .nsx-ai-form .layui-input-block{margin-left:0!important}`;

    const applyRuntimeSettings = (ctx, changedKeys = []) => {
        const changed = new Set(changedKeys || []);
        const has = (prefix) => [...changed].some(k => k === prefix || k.startsWith(prefix + "."));

        if (has("block_posts")) window.__nsxRuntime?.reapplyKeywords?.();
        if (has("relation")) window.__nsxRuntime?.reapplyRelation?.();
        if (has("history")) window.__nsxRuntime?.refreshHistory?.();
        if (has("visited_color")) {
            const styleId = "nsx-visited-color";
            const enabled = ctx.store.get("visited_color.enabled", true);
            const old = document.getElementById(styleId);
            if (!enabled) {
                old?.remove();
            } else {
                const light = ctx.store.get("visited_color.light", DEFAULT_LIGHT);
                const dark = ctx.store.get("visited_color.dark", DEFAULT_DARK);
                const css = `.post-list .post-title a:visited,.post-list .post-title a.nsx-visited-link{color:${light}}body.dark-layout .post-list .post-title a:visited,body.dark-layout .post-list .post-title a.nsx-visited-link{color:${dark}}`;
                if (old && old.tagName === "STYLE") {
                    old.textContent = css;
                } else {
                    old?.remove();
                    const el = document.createElement("style");
                    el.id = styleId;
                    el.textContent = css;
                    document.head?.appendChild(el);
                }
            }
            window.__nsxRuntime?.refreshVisitedColor?.();
        }

        if (has("button_pos") || has("layout") || has("ui")) {
            addStyle("nsx-icon-pos-runtime", ``);
        }
    };

    // ===== Observer =====
    class Observer {
        constructor() { this.listeners = []; this.mo = null; }
        watch(sel, fn, opts = {}) {
            this.listeners.push({ sel, fn, opts });
            if (!this.mo) {
                this.mo = new MutationObserver(debounce((muts) => {
                    if (!muts?.some(m => m.addedNodes?.length)) return;
                    this._run();
                }, 50));
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
        const isMobileClient = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.matchMedia?.("(hover: none) and (pointer: coarse)")?.matches;
        if (isMobileClient) document.documentElement.classList.add("nsx-mobile");

        // 注入资源
        document.body?.insertAdjacentHTML("beforeend", SVG_SPRITE);
        addStyle("nsx-base", BASE_CSS);
        // layui CSS
        addStyle("nsx-layui-css", "https://s.cfn.pp.ua/layui/2.10.3/css/layui.css");
        addStyle("nsx-layui-dark", "https://s.cfn.pp.ua/layui/theme-dark/2.10.3/css/layui-theme-dark-selector.css");

        // highlight.js 脚本
        addScript("nsx-hljs-script", "https://s4.zstatic.net/ajax/libs/highlight.js/11.9.0/highlight.min.js");
        // highlight.js 样式
        addStyle("hightlight-style", GM_getResourceURL("highlightStyle"));
        // hljs 初始化
        addScript("nsx-hljs-onload", `(()=>{const r=()=>{if(window.hljs&&typeof hljs.highlightAll==="function")hljs.highlightAll()};document.readyState==="complete"?r():window.addEventListener("load",r,{once:true})})()`);

        // 加载模块
        const mods = /* #__PURE__ */ Object.assign({ "./features/autoJump.js": __vite_glob_0_0, "./features/autoLoading.js": __vite_glob_0_1, "./features/callout.js": __vite_glob_0_5, "./features/codeHighlight.js": __vite_glob_0_6, "./features/commentShortcut.js": __vite_glob_0_7, "./features/darkMode.js": __vite_glob_0_8, "./features/history.js": __vite_glob_0_9, "./features/imageSlide.js": __vite_glob_0_10, "./features/instantPage.js": __vite_glob_0_11, "./features/levelTag.js": __vite_glob_0_12, "./features/menus.js": __vite_glob_0_13, "./features/quickComment.js": __vite_glob_0_14, "./features/aiComment.js": __vite_glob_0_15, "./features/signIn.js": __vite_glob_0_16, "./features/signinTips.js": __vite_glob_0_17, "./features/smoothScroll.js": __vite_glob_0_18, "./features/userCardExt.js": __vite_glob_0_19, "./features/visitedColor.js": __vite_glob_0_20, "./features/timeChinese.js": __vite_glob_0_21, "./features/emailNavLink.js": __vite_glob_0_22 });
        Object.values(mods).forEach(m => {
            const mod = m?.default;
            if (!mod) return;
            if (!AI && mod.id === "aiComment") return;
            define(mod);
        });

        // 创建 Observer & ctx
        const obs = new Observer();
        const ctx = createCtx(obs);
        ensureIconGroup();
        const headEl = document.querySelector('#nsk-head');
        if (headEl) {
            let syncingIconGroup = false;
            const syncIconGroup = debounce(() => {
                if (syncingIconGroup) return;
                syncingIconGroup = true;
                try { ensureIconGroup(); } finally { syncingIconGroup = false; }
            }, 120);
            new MutationObserver(syncIconGroup).observe(headEl, { childList: true });
        }

        // 初始化 UI (依赖 layui)
        const initUI = () => {
            if (!window.layui?.layer) return (ctx.ui = {});
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

        // 启动所有模块
        /* ==========================================================================
           [ 🚀 基础功能 ] - 图床上传助手 (NodeImage)
           ========================================================================== */
        const imageUpload = {
            id: "imageUpload",
            deps: ["ui"],
            order: 150,
            cfg: { image_upload: { enabled: true, api_key: "" } },
            meta: {
                image_upload: {
                    label: "图床上传助手",
                    group: "🚀 基础功能",
                    fields: {
                        api_key: { type: "TEXT", label: "NodeImage API Key", placeholder: "留空或填写 API Key" }
                    }
                }
            },
            match: ctx => (ctx.isPost || location.pathname.startsWith('/new-discussion') || location.pathname.startsWith('/notification')) && ctx.store.get("image_upload.enabled", true),
            init(ctx) {
                const APP = {
                    api: {
                        key: ctx.store.get("image_upload.api_key", ""),
                        setKey: key => {
                            ctx.store.set("image_upload.api_key", key);
                            APP.api.key = key;
                            UI.updateState();
                        },
                        clearKey: () => {
                            ctx.store.set("image_upload.api_key", "");
                            APP.api.key = '';
                            UI.updateState();
                        },
                        endpoints: {
                            upload: 'https://api.nodeimage.com/api/upload',
                            apiKey: 'https://api.nodeimage.com/api/user/api-key'
                        }
                    },
                    site: { url: 'https://www.nodeimage.com' },
                    storage: {
                        keys: { loginCheck: 'nodeimage_login_check', loginStatus: 'nodeimage_login_status', logout: 'nodeimage_logout' },
                        get: key => localStorage.getItem(APP.storage.keys[key]),
                        set: (key, value) => localStorage.setItem(APP.storage.keys[key], value),
                        remove: key => localStorage.removeItem(APP.storage.keys[key])
                    },
                    retry: { max: 2, delay: 1000 },
                    statusTimeout: 2000,
                    auth: { recentLoginGracePeriod: 30000, loginCheckInterval: 3000, loginCheckTimeout: 300000 }
                };

                const SELECTORS = { editor: '.CodeMirror', toolbar: '.mde-toolbar', imgBtn: '.toolbar-item.i-icon.i-icon-pic[title="图片"]', container: '#nodeimage-toolbar-container' };

                const STATUS = {
                    SUCCESS: { class: 'success', color: '#42d392' },
                    ERROR: { class: 'error', color: '#f56c6c' },
                    WARNING: { class: 'warning', color: '#e6a23c' },
                    INFO: { class: 'info', color: '#0078ff' }
                };

                const MESSAGE = { READY: '图床已就绪', UPLOADING: '上传中...', UPLOAD_SUCCESS: '上传成功！', LOGIN_EXPIRED: '图床登录已失效', LOGOUT: '图床已退出登录', RETRY: (c, m) => `重试 (${c}/${m})` };

                const DOM = {
                    editor: null,
                    statusElements: new Set(),
                    loginButtons: new Set(),
                    getEditor: () => DOM.editor?.CodeMirror
                };

                addStyle("nsx-image-upload", `
                #nodeimage-status { margin-left: 10px; display: inline-block; font-size: 13px; height: 28px; line-height: 28px; transition: all 0.3s ease; }
                #nodeimage-status.success { color: ${STATUS.SUCCESS.color}; }
                #nodeimage-status.error { color: ${STATUS.ERROR.color}; }
                #nodeimage-status.warning { color: ${STATUS.WARNING.color}; }
                #nodeimage-status.info { color: ${STATUS.INFO.color}; }
                .nodeimage-login-btn { cursor: pointer; margin-left: 10px; color: ${STATUS.WARNING.color}; font-size: 13px; background: rgba(230,162,60,0.1); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(230,162,60,0.2); }
                .nodeimage-toolbar-container { display: flex; align-items: center; margin-left: auto; margin-right: 10px; }
            `);

                const Utils = {
                    waitForElement: selector => new Promise(res => {
                        const el = document.querySelector(selector);
                        if (el) return res(el);
                        new MutationObserver((_, o) => { const found = document.querySelector(selector); if (found) { o.disconnect(); res(found); } }).observe(document.body, { childList: true, subtree: true });
                    }),
                    isEditingInEditor: () => { const a = document.activeElement; return a && (a.classList.contains('CodeMirror') || a.closest('.CodeMirror') || a.tagName === 'TEXTAREA'); },
                    getActiveCodeMirror: (evtTarget = null) => {
                        const fromTarget = evtTarget?.closest?.('.CodeMirror')?.CodeMirror;
                        if (fromTarget) return fromTarget;
                        const active = document.activeElement;
                        const fromActive = active?.closest?.('.CodeMirror')?.CodeMirror || (active?.classList?.contains('CodeMirror') ? active.CodeMirror : null);
                        if (fromActive) return fromActive;
                        return DOM.getEditor();
                    },
                    createFileInput: cb => { const i = Object.assign(document.createElement('input'), { type: 'file', multiple: true, accept: 'image/*' }); i.onchange = e => cb([...e.target.files]); i.click(); },
                    delay: ms => new Promise(r => setTimeout(r, ms))
                };

                const API = {
                    request: ({ url, method = 'GET', data = null, headers = {}, withAuth = false }) => {
                        return new Promise((resolve, reject) => {
                            GM_xmlhttpRequest({
                                method, url,
                                headers: { 'Accept': 'application/json', ...(withAuth && APP.api.key ? { 'X-API-Key': APP.api.key } : {}), ...headers },
                                data, withCredentials: true, responseType: 'json',
                                onload: response => { if (response.status === 200 && response.response) resolve(response.response); else reject(response); },
                                onerror: reject
                            });
                        });
                    },
                    checkLoginAndGetKey: async () => {
                        try {
                            const response = await API.request({ url: APP.api.endpoints.apiKey });
                            if (response.api_key) { APP.api.setKey(response.api_key); return true; }
                            if (response.error) APP.api.clearKey();
                            return false;
                        } catch (error) { APP.api.clearKey(); return false; }
                    },
                    uploadImage: async (file, retries = 0) => {
                        try {
                            const formData = new FormData();
                            formData.append('image', file);
                            const result = await API.request({ url: APP.api.endpoints.upload, method: 'POST', data: formData, withAuth: true });
                            if (result.success) return { url: result.links.direct, markdown: result.links.markdown };
                            else {
                                const errorMsg = result.error || '未知错误';
                                if (errorMsg.toLowerCase().match(/unauthorized|invalid api key|未授权|无效的api密钥/)) { APP.api.clearKey(); throw new Error(MESSAGE.LOGIN_EXPIRED); }
                                throw new Error(errorMsg);
                            }
                        } catch (error) {
                            if (error.status === 401 || error.status === 403) { APP.api.clearKey(); throw new Error(MESSAGE.LOGIN_EXPIRED); }
                            if (retries < APP.retry.max) {
                                setStatus(STATUS.WARNING.class, MESSAGE.RETRY(retries + 1, APP.retry.max));
                                await Utils.delay(APP.retry.delay);
                                return API.uploadImage(file, retries + 1);
                            }
                            throw error instanceof Error ? error : new Error(String(error));
                        }
                    }
                };

                const setStatus = (cls, msg, ttl = 0) => { DOM.statusElements.forEach(el => { el.className = cls; el.textContent = msg; }); if (ttl) return Utils.delay(ttl).then(UI.updateState); };

                const UI = {
                    updateState: () => {
                        const isLoggedIn = Boolean(APP.api.key);
                        DOM.loginButtons.forEach(btn => { btn.style.display = isLoggedIn ? 'none' : 'inline-block'; });
                        DOM.statusElements.forEach(el => {
                            if (isLoggedIn) { el.className = STATUS.SUCCESS.class; el.textContent = MESSAGE.READY; }
                            else { el.textContent = ''; }
                        });
                    },
                    openLogin: () => { APP.storage.set('loginStatus', 'login_pending'); window.open(APP.site.url, '_blank'); },
                    setupToolbar: toolbar => {
                        if (!toolbar || toolbar.querySelector(SELECTORS.container)) return;
                        const container = document.createElement('div'); container.id = 'nodeimage-toolbar-container'; container.className = 'nodeimage-toolbar-container';

                        const fullScreenBtn = toolbar.querySelector('.i-icon-full-screen-one')?.parentElement || toolbar.querySelector('.i-icon-off-screen-one')?.parentElement || toolbar.querySelector('.toolbar-item.right');
                        if (fullScreenBtn) {
                            toolbar.insertBefore(container, fullScreenBtn);
                        } else {
                            toolbar.appendChild(container);
                        }

                        const imgBtn = toolbar.querySelector(SELECTORS.imgBtn);
                        if (imgBtn) {
                            const newBtn = imgBtn.cloneNode(true);
                            imgBtn.parentNode.replaceChild(newBtn, imgBtn);
                            newBtn.addEventListener('click', async () => {
                                DOM.editor = document.activeElement?.closest?.('.CodeMirror') || DOM.editor;
                                if (!APP.api.key || !(await Auth.checkLoginIfNeeded())) { UI.openLogin(); return; }
                                const targetCm = Utils.getActiveCodeMirror();
                                Utils.createFileInput(files => ImageHandler.handleFiles(files, targetCm));
                            });
                        }

                        const statusEl = document.createElement('div'); statusEl.id = 'nodeimage-status'; statusEl.className = STATUS.INFO.class;
                        container.appendChild(statusEl); DOM.statusElements.add(statusEl);
                        const loginBtn = document.createElement('div'); loginBtn.className = 'nodeimage-login-btn'; loginBtn.textContent = '登录 NodeImage';
                        loginBtn.addEventListener('click', UI.openLogin); loginBtn.style.display = 'none';
                        container.appendChild(loginBtn); DOM.loginButtons.add(loginBtn);
                        UI.updateState();
                    }
                };

                const ImageHandler = {
                    handlePaste: e => {
                        if (!Utils.isEditingInEditor()) return;
                        const targetCm = Utils.getActiveCodeMirror(e.target);
                        if (targetCm?.getWrapperElement) DOM.editor = targetCm.getWrapperElement();
                        const dt = e.clipboardData || e.originalEvent?.clipboardData; if (!dt) return;
                        let files = [];
                        if (dt.files && dt.files.length) { files = Array.from(dt.files).filter(f => f.type.startsWith('image/')); }
                        else if (dt.items && dt.items.length) { files = Array.from(dt.items).filter(i => i.kind === 'file' && i.type.startsWith('image/')).map(i => i.getAsFile()).filter(Boolean); }
                        if (files.length) {
                            e.preventDefault(); e.stopPropagation();
                            if (!APP.api.key) { UI.openLogin(); return; }
                            ImageHandler.handleFiles(files, targetCm);
                        }
                    },
                    handleFiles: (files, targetCm = null) => {
                        if (!APP.api.key) { UI.openLogin(); return; }
                        files.filter(file => file?.type.startsWith('image/')).forEach(file => ImageHandler.uploadAndInsert(file, targetCm));
                    },
                    uploadAndInsert: async (file, targetCm = null) => {
                        setStatus(STATUS.INFO.class, MESSAGE.UPLOADING);
                        try {
                            const result = await API.uploadImage(file);
                            ImageHandler.insertMarkdown(result.markdown, targetCm);
                            await setStatus(STATUS.SUCCESS.class, MESSAGE.UPLOAD_SUCCESS, APP.statusTimeout);
                        } catch (error) {
                            if (error.message === MESSAGE.LOGIN_EXPIRED) await Auth.checkLoginIfNeeded(true);
                            console.error('[NodeImage]', error);
                            await setStatus(STATUS.ERROR.class, `上传失败: ${error.message}`, APP.statusTimeout);
                            ctx.ui.error?.(`图片上传失败: ${error.message}`);
                        }
                    },
                    insertMarkdown: (markdown, preferredCm = null) => {
                        const cm = preferredCm || Utils.getActiveCodeMirror();
                        if (cm) { const cursor = cm.getCursor(); cm.replaceRange(`\n${markdown}\n`, cursor); }
                    }
                };

                const Auth = {
                    checkLoginIfNeeded: async (forceCheck = false) => {
                        if (APP.api.key && !forceCheck) return true;
                        const isLoggedIn = await API.checkLoginAndGetKey();
                        if (!isLoggedIn && APP.api.key) setStatus(STATUS.WARNING.class, MESSAGE.LOGIN_EXPIRED);
                        UI.updateState();
                        return isLoggedIn;
                    },
                    checkLogoutFlag: () => { if (APP.storage.get('logout') === 'true') { APP.api.clearKey(); APP.storage.remove('logout'); setStatus(STATUS.WARNING.class, MESSAGE.LOGOUT); } },
                    checkRecentLogin: async () => { const lastLoginCheck = APP.storage.get('loginCheck'); if (lastLoginCheck && (Date.now() - parseInt(lastLoginCheck) < APP.auth.recentLoginGracePeriod)) { await API.checkLoginAndGetKey(); APP.storage.remove('loginCheck'); } },
                    setupStorageListener: () => {
                        window.addEventListener('storage', event => {
                            const { loginStatus, logout } = APP.storage.keys;
                            if (event.key === loginStatus && event.newValue === 'login_success') { API.checkLoginAndGetKey(); localStorage.removeItem(loginStatus); }
                            else if (event.key === logout && event.newValue === 'true') { APP.api.clearKey(); localStorage.removeItem(logout); }
                        });
                    }
                };

                const initModule = async () => {
                    document.addEventListener('paste', ImageHandler.handlePaste, true);
                    window.addEventListener('focus', () => Auth.checkLoginIfNeeded());
                    Utils.waitForElement(SELECTORS.editor).then(editor => {
                        DOM.editor = editor;
                        editor.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
                        editor.addEventListener('drop', e => {
                            e.preventDefault();
                            const targetCm = Utils.getActiveCodeMirror(e.target);
                            if (targetCm?.getWrapperElement) DOM.editor = targetCm.getWrapperElement();
                            ImageHandler.handleFiles(Array.from(e.dataTransfer.files), targetCm);
                        });
                    });
                    Utils.waitForElement(SELECTORS.toolbar).then(UI.setupToolbar);
                    ctx.watch(SELECTORS.toolbar, () => {
                        const toolbar = document.querySelector(SELECTORS.toolbar);
                        if (toolbar && !toolbar.querySelector(SELECTORS.container)) UI.setupToolbar(toolbar);
                    }, { debounce: 200 });
                    const observer = new MutationObserver(() => {
                        const editor = document.querySelector(SELECTORS.editor);
                        if (editor) DOM.editor = editor;
                        const toolbar = document.querySelector(SELECTORS.toolbar);
                        if (toolbar && !toolbar.querySelector(SELECTORS.container)) UI.setupToolbar(toolbar);
                    });
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['class', 'style']
                    });
                    document.addEventListener('click', e => {
                        if (e.target.closest('.tab-option')) {
                            setTimeout(() => {
                                const editor = document.querySelector(SELECTORS.editor);
                                if (editor) DOM.editor = editor;
                                const toolbar = document.querySelector(SELECTORS.toolbar);
                                if (toolbar && !toolbar.querySelector(SELECTORS.container)) UI.setupToolbar(toolbar);
                            }, 100);
                        }
                    });

                    Auth.checkLogoutFlag(); Auth.setupStorageListener(); await Auth.checkRecentLogin(); await Auth.checkLoginIfNeeded();
                };

                initModule();
            }
        };
        define(imageUpload);

        /* ==========================================================================
           [ 🧭 辅助工具 ] - 新标签页打开链接修复
           ========================================================================== */
        const openInNewTabFix = {
            id: "openInNewTabFix",
            order: 390,
            match: ctx => ctx.store.get("open_post_in_new_tab.enabled", false),
            meta: { open_post_in_new_tab: { label: "新标签页打开帖子", group: "🧭 辅助工具" } },
            init(ctx) {
                const addTarget = (els) => {
                    els.forEach(a => {
                        if (a.getAttribute("target") !== "_blank") {
                            a.setAttribute("target", "_blank");
                        }
                    });
                };
                addTarget(document.querySelectorAll('a[href^="/post-"]'));
                ctx.watch('a[href^="/post-"]', addTarget, { debounce: 100 });
            }
        };
        define(openInNewTabFix);

        /* ==========================================================================
           [ 🎨 视觉美化 ] - 名望诊断系统 (Reputation System)
           ========================================================================== */
        const inlineUserInfo = {
            id: "inlineUserInfo",
            deps: ["ui"],
            order: 390,
            cfg: { inline_user_info: { enabled: true, show_op: true, show_cmt: true, simple_lv_style: false, simple_lv_color: "rgba(0, 206, 209, 1)" } },
            meta: {
                inline_user_info: {
                    label: "名望诊断系统",
                    group: "🧭 辅助工具",
                    fields: {
                        show_op: { type: "SWITCH", label: "作用于楼主" },
                        show_cmt: { type: "SWITCH", label: "作用于评论" },
                        simple_lv_style: { type: "SWITCH", label: "简洁颜色模式" },
                        simple_lv_color: { type: "COLOR", label: "简洁模式颜色" }
                    }
                }
            },
            match: ctx => ctx.loggedIn && ctx.isPost && (ctx.store.get("inline_user_info.enabled", true) || ctx.store.get("relation.show_friend_btn", true) || ctx.store.get("relation.show_block_btn", true)),
            init(ctx) {
                const showOp = ctx.store.get("inline_user_info.show_op", true);
                const showCmt = ctx.store.get("inline_user_info.show_cmt", true);
                const simpleLvStyle = ctx.store.get("inline_user_info.simple_lv_style", false);
                const simpleLvColorCfg = (ctx.store.get("inline_user_info.simple_lv_color", "rgba(0, 206, 209, 1)") || "").trim();
                const cache = new Map();
                const fetching = new Map();
                let fetchQueue = Promise.resolve(); // 用于控制并发的队列列车

                addStyle("nsx-lv-colors", `.role-tag.user-level{color:#fafafa;font-weight:bold;}.user-lv0{background:#b71c1c;border-color:#b71c1c}.user-lv1{background:#e53935;border-color:#e53935}.user-lv2{background:#f57c00;border-color:#f57c00}.user-lv3{background:#ffca28;border-color:#ffca28;color:#333}.user-lv4{background:#cddc39;border-color:#cddc39;color:#333}.user-lv5{background:#7cb342;border-color:#7cb342}.user-lv6{background:#43a047;border-color:#43a047}.user-lv7{background:#00897b;border-color:#00897b}.user-lv8{background:#039be5;border-color:#039be5}.user-lv9{background:#1e88e5;border-color:#1e88e5}.user-lv10{background:#3949ab;border-color:#3949ab}.user-lv11{background:#5e35b1;border-color:#5e35b1}.user-lv12{background:#8e24aa;border-color:#8e24aa}.user-lv13{background:#d81b60;border-color:#d81b60}.user-lv14{background:#546e7a;border-color:#546e7a}.user-lv15{background:#212121;border-color:#212121;color:#ffca28}`);

                const calculateJoinDays = (createdAt) => {
                    if (!createdAt) return '未知';
                    const diffTime = Math.abs(new Date() - new Date(createdAt));
                    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                };

                const display = async (el) => {
                    const isCmt = el.closest('.comment-item, .comments > li') !== null;
                    if (isCmt && !showCmt) return;
                    if (!isCmt && !showOp) return;

                    if (el.dataset.nsxInfoLoaded) return;
                    el.dataset.nsxInfoLoaded = "1";

                    const metaInfo = el.closest('.nsk-content-meta-info');
                    if (!metaInfo) return;

                    const match = el.href.match(/\/space\/(\d+)/);
                    const userId = match ? match[1] : null;
                    const username = el.textContent.trim();

                    // --- A. 帖内信息扩展逻辑 ---
                    const showInfo = ctx.store.get("inline_user_info.enabled", true);
                    if (showInfo && userId) {
                        let userData = cache.get(userId);
                        if (!userData) {
                            if (!fetching.has(userId)) {
                                const p = fetchQueue.then(() => new Promise((resolve) => {
                                    setTimeout(async () => {
                                        try {
                                            const r = await ctx.net.get(`/api/account/getInfo/${userId}`);
                                            resolve(r?.success ? r.detail : null);
                                        } catch (e) { resolve(null); }
                                    }, 300);
                                }));
                                fetching.set(userId, p);
                                fetchQueue = p;
                            }
                            userData = await fetching.get(userId);
                            if (userData) cache.set(userId, userData);
                        }

                        if (userData && !metaInfo.querySelector('.nsx-user-info-display')) {
                            const createdAt = userData.created_at;
                            const joinDays = calculateJoinDays(createdAt);
                            const coins = userData.coin || 0;
                            const nPost = userData.nPost || 0;
                            const nComment = userData.nComment || 0;
                            const totalAct = nPost + nComment;
                            const dailyAct = totalAct / (joinDays || 1);
                            const coinPerDay = coins / (joinDays || 1);
                            const coinPerAct = totalAct > 0 ? (coins / totalAct) : 0;
                            const rank = Math.min(6, Math.floor(Math.sqrt(coins || 0) / 10));

                            // 🎯 核心算法 V2.0 - 精准建模与反干扰
                            // 30 天成熟基线：仅按注册天数计算，不依赖鸡腿数量
                            const MATURE_DAYS = 30;

                            // 1. 资历分平滑处理 (Smooth Seniority)
                            const alpha = Math.min(joinDays / MATURE_DAYS, 1); // 0-1 之间的权重系数
                            const baseSeniority = Math.min(25, joinDays / 25);
                            const lowSeniority = Math.min(5, joinDays / 100);
                            const seniorityScore = baseSeniority * alpha + lowSeniority * (1 - alpha);

                            // 2. 活跃分与灌水惩罚 (Spam Penalty)
                            const actVal = Math.max(Math.min(25, dailyAct * 15), Math.min(25, totalAct / 15));
                            const spamPenalty = dailyAct > 24 ? Math.max(0.5, 1 - (dailyAct - 24) / 40) : 1;
                            const actScore = actVal * spamPenalty;

                            // 3. 财富分 (Wealth)
                            const wealthScore = Math.max(Math.min(20, coinPerDay * 5), Math.min(20, coins / 80));

                            // 4. 内容质量分受控模型 (Confidence Control)
                            // 先估算系统可解释鸡腿，再用额外鸡腿衡量社区认可度，避免误伤高活跃用户
                            const baseSignupCoins = 90;
                            const baseReplyCoins = Math.min(nComment, joinDays * 20) * 1;
                            const basePostCoins = Math.min(nPost, joinDays * 4) * 5;
                            const baseSigninCoins = joinDays * 5;
                            const estimatedBaseCoins = baseSignupCoins + baseReplyCoins + basePostCoins + baseSigninCoins;
                            const extraCoins = Math.max(0, coins - estimatedBaseCoins);
                            const extraPerAct = extraCoins / Math.max(totalAct, 1);

                            // 引入[质量置信度]，发言数过少时，质量分影响力按比例压缩
                            const qualityConfidence = Math.min(totalAct / 10, 1);
                            const rawQualityScore = extraPerAct * 18;
                            const qualityScore = Math.min(30, rawQualityScore) * qualityConfidence;

                            // 5. 传奇贡献加成
                            const isLegend = rank >= 6 && nPost >= 500 && nComment >= 5000;
                            const isFamous = rank >= 6 && nPost >= 200 && nComment >= 2000;

                            let trustScore = seniorityScore + actScore + wealthScore + qualityScore;
                            if (isLegend) trustScore += 15;

                            let trustLevel = "正常用户", trustColor = "#8bc34a";

                            // --- V5.1 绝对门槛名望诊断矩阵 ---
                            const isAbandoned = joinDays > 100 && coinPerDay < (5 / 3);
                            const isNewbie = joinDays < MATURE_DAYS;

                            if (isAbandoned) {
                                trustScore *= 0.2;
                                trustLevel = "疑似小号";
                                trustColor = "#ff5252";
                            } else if (isNewbie) {
                                trustLevel = "新手上路";
                                trustColor = "linear-gradient(135deg, #89f7fe, #66a6ff)";
                                trustScore = Math.min(trustScore, 70);
                            } else {
                                // 灌水硬指标：
                                // tavgReplyPerDay = totalAct / joinDays
                                // 最终判定：tavgReplyPerDay >= 40 且额外鸡腿质量偏低
                                const tavgReplyPerDay = totalAct / Math.max(joinDays, 1);
                                const lowQuality = extraPerAct < 1.05;
                                const spamLikely = tavgReplyPerDay >= 40 && lowQuality;

                                if (spamLikely) {
                                    trustLevel = "灌水机器";
                                    trustColor = "#ff6d00";
                                    // 仅按额外质量分段惩罚
                                    if (extraPerAct < 0.35) trustScore *= 0.65;
                                    else if (extraPerAct < 0.7) trustScore *= 0.75;
                                    else trustScore *= 0.85;
                                } else if (totalAct < 5) {
                                    trustLevel = "潜水员";
                                    trustColor = "#90a4ae";
                                } else {
                                    // 判级优先级：硬指标优先
                                    if (trustScore >= 90 && isLegend) {
                                        trustLevel = "名震天下";
                                        trustColor = "linear-gradient(135deg, #FFF5C3, #FFD700, #B8860B)";
                                    } else if (trustScore >= 75 && isFamous) {
                                        trustLevel = "声名大噪";
                                        trustColor = "linear-gradient(135deg, #f093fb, #f5576c)";
                                    } else if (trustScore >= 60) {
                                        trustLevel = "活跃精英";
                                        trustColor = "linear-gradient(135deg, #00D2FF, #3A7BD5)";
                                    } else if (trustScore >= 40) {
                                        trustLevel = "初露锋芒";
                                        trustColor = "linear-gradient(135deg, #96C93D, #00B09B)";
                                    } else if (trustScore >= 20) {
                                        trustLevel = "籍籍无名";
                                        trustColor = "linear-gradient(135deg, #FAD0C4, #FF9A9E)";
                                    } else {
                                        trustLevel = "深度隐匿";
                                        trustColor = "linear-gradient(135deg, #BDC3C7, #2C3E50)";
                                    }
                                }
                            }

                            trustScore = Math.floor(Math.min(100, Math.max(0, trustScore)));

                            const infoSpanDiv = document.createElement('span');
                            infoSpanDiv.className = 'nsx-user-info-display';
                            infoSpanDiv.style.cssText = `display:inline-flex;align-items:center;opacity:0.95;user-select:text;margin-left:4px;cursor:help;`;

                            let lvGradient = "linear-gradient(135deg, #e53935, #b71c1c)"; // Lv1: 红色 (用户要求)
                            let lvColor = "#e53935";
                            if (Number(rank) === 2) { lvGradient = "linear-gradient(135deg, #fd9346, #fd512c)"; lvColor = "#fd6f3a"; } // Lv2: 活力橙
                            else if (Number(rank) === 3) { lvGradient = "linear-gradient(135deg, #12eb92, #0ba360)"; lvColor = "#11c87d"; } // Lv3: 翡翠绿
                            else if (Number(rank) === 4) { lvGradient = "linear-gradient(135deg, #47abff, #1860ff)"; lvColor = "#2d86ff"; } // Lv4: 海洋蓝
                            else if (Number(rank) === 5) { lvGradient = "linear-gradient(135deg, #ffd700, #ff8c00)"; lvColor = "#ffb300"; } // Lv5: 暖金/黄金色
                            else if (Number(rank) >= 6) { lvGradient = "linear-gradient(135deg, #db24ff, #2524ff)"; lvColor = "#6f58ff"; } // Lv6: 赛博双拼


                            const lvSpan = document.createElement('span');
                            lvSpan.className = `nsk-badge role-tag nsx-lv-badge`;
                            const simpleLvColor = simpleLvColorCfg || lvColor;
                            lvSpan.style.cssText = simpleLvStyle
                                ? `font-size:11px;padding:2px 7px;border-radius:4px;background:transparent;border:1px solid ${simpleLvColor};color:${simpleLvColor}!important;vertical-align:middle;text-shadow:none;`
                                : `font-size:11px;padding:2px 7px;border-radius:4px;background:${lvGradient};color:#fff!important;vertical-align:middle;text-shadow:0 1px 1px rgba(0,0,0,0.3);`;
                            lvSpan.innerHTML = `Lv ${rank} | ${joinDays}天`;
                            infoSpanDiv.appendChild(lvSpan);

                            let hoverTimer;
                            infoSpanDiv.onmouseenter = () => {
                                clearTimeout(hoverTimer);
                                // 动态适配主题色（每次悬浮时重新检测）
                                // 修正：NodeSeek 的深色模式类通常在 body 上
                                const currentIsDark = document.body.classList.contains('dark-layout') || document.documentElement.classList.contains('dark');
                                const tipBg = currentIsDark ? '#2a2a2a' : '#fff';
                                const tipColor = currentIsDark ? '#e0e0e0' : '#1f1f1f';
                                const tipBorder = currentIsDark ? '#444' : '#e4e4e4';
                                const tipDiv = currentIsDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

                                const hoverContent = `
                                    <div style="padding:10px;min-width:180px;color:${tipColor};background:${tipBg};border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15); border:1px solid ${tipBorder};">
                                        <div style="font-weight:bold;margin-bottom:8px;border-bottom:1px solid ${tipDiv};padding-bottom:5px;display:flex;justify-content:space-between;align-items:center;">
                                            <span style="font-size:14px;">${username}</span>
                                            <span style="background:${lvGradient};-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:15px;font-weight:900;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.1));">Lv ${rank}</span>
                                        </div>
                                        <div style="text-align:center;margin-bottom:6px;font-size:13px;">注册 <span class="layui-badge layui-bg-blue" style="height:18px;line-height:18px;">${joinDays}</span> 天</div>
                                        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:4px 12px;align-items:center;font-size:12px;">
                                            <div style="text-align:right;">主题 <a href="/space/${userId}#/discussions" target="_blank" style="font-weight:bold;color:#4fc3f7;text-decoration:underline;">${userData.nPost || 0}</a></div>
                                            <div style="color:${tipDiv};font-size:11px;user-select:none;">|</div>
                                            <div style="text-align:left;">评论 <a href="/space/${userId}#/comments" target="_blank" style="font-weight:bold;color:#4fc3f7;text-decoration:underline;">${userData.nComment || 0}</a></div>

                                            <div style="text-align:right;">鸡腿 <b style="color:#ffb300;">${userData.coin || 0}</b></div>
                                            <div style="color:${tipDiv};font-size:11px;user-select:none;">|</div>
                                            <div style="text-align:left;">星尘 <b style="color:#e040fb;">${userData.stardust || 0}</b></div>

                                            <div style="text-align:right;">评分 <b style="background:${trustColor};-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:bold;filter:drop-shadow(0 0 1px rgba(0,0,0,0.3));">${trustScore}</b>/100</div>
                                            <div style="color:${tipDiv};font-size:11px;user-select:none;">|</div>
                                            <div style="text-align:left;">诊断 <b style="background:${trustColor};-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:bold;filter:drop-shadow(0 0 1px rgba(0,0,0,0.3));">${trustLevel}</b></div>
                                        </div>
                                    </div>
                                `;

                                ctx.ui.tips?.(hoverContent, infoSpanDiv, {
                                    tips: [3, tipBg],
                                    time: 0,
                                    success: (layero, index) => {
                                        if (layero && layero[0]) {
                                            // 移除 Layer 默认的外层背景、阴影和边框，只保留我们自定义的圆角容器
                                            layero.css({ 'background-color': 'transparent', 'box-shadow': 'none', 'border': 'none' });
                                            layero.find('.layui-layer-content').css({ 'padding': '0', 'overflow': 'visible' });
                                            layero.find('.layui-layer-TipsG').css('display', 'none'); // 隐藏那个小三角形，让界面更清爽

                                            layero[0].onmouseenter = () => clearTimeout(hoverTimer);
                                            layero[0].onmouseleave = () => hoverTimer = setTimeout(() => ctx.ui.layer?.close?.(index), 200);
                                        }
                                    }
                                });
                            };
                            infoSpanDiv.onmouseleave = () => {
                                hoverTimer = setTimeout(() => ctx.ui.layer?.closeAll?.('tips'), 250);
                            };
                            el.after(infoSpanDiv);
                        }
                    }

                    // --- B. 独立社交按钮逻辑 ---
                    const showFriend = ctx.store.get("relation.show_friend_btn", true);
                    const showBlock = ctx.store.get("relation.show_block_btn", true);
                    if (showFriend || showBlock) {
                        const blacklist = JSON.parse(localStorage.getItem('nsx_advanced_blacklist') || '{}');
                        const friends = JSON.parse(localStorage.getItem('nsx_advanced_friends') || '{}');
                        const isBlocked = !!blacklist[username];
                        const isFriend = !!friends[username];
                        const normalizeInlineBlacklistMode = (mode, fallback = "fold") => {
                            const val = mode === "hide" ? "official" : mode;
                            return ["fold", "official", "mark"].includes(val) ? val : fallback;
                        };

                        const bindInlineAction = (btn, isTrue, key, map, msgOn, msgOff, targetUserId) => {
                            btn.onclick = () => {
                                if (isTrue) {
                                    delete map[username];
                                    localStorage.setItem(key, JSON.stringify(map));
                                    ctx.ui.toast(msgOff);
                                    setTimeout(() => location.reload(), 800);
                                } else {
                                    if (key === 'nsx_advanced_blacklist' && ctx.ui?.layer) {
                                        const defaultMode = normalizeInlineBlacklistMode(ctx.store.get("relation.blacklist_mode", "fold"));
                                        const isMb = document.documentElement.classList.contains('nsx-mobile');
                                        const html = `
                                            <div class="layui-form nsx-block-form" style="padding:20px 20px 0;">
                                                <div class="layui-form-item">
                                                    <label class="layui-form-label" style="width:72px;padding-left:0;">备注</label>
                                                    <div class="layui-input-block" style="margin-left:${isMb ? '0' : '92px'};">
                                                        <input type="text" id="nsx-blacklist-remark" class="layui-input" placeholder="可选备注">
                                                    </div>
                                                </div>
                                                <div class="layui-form-item">
                                                    <label class="layui-form-label" style="width:72px;padding-left:0;">模式</label>
                                                    <div class="layui-input-block" style="margin-left:${isMb ? '0' : '92px'};">
                                                        <select id="nsx-blacklist-mode">
                                                            <option value="fold" ${defaultMode === 'fold' ? 'selected' : ''}>优雅折叠</option>
                                                            <option value="official" ${defaultMode === 'official' ? 'selected' : ''}>官方屏蔽</option>
                                                            <option value="mark" ${defaultMode === 'mark' ? 'selected' : ''}>标记模式</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>`;
                                        ctx.ui.layer.open({
                                            title: msgOn,
                                            content: html,
                                            area: ['min(460px,94vw)', 'auto'],
                                            skin: 'nsx-mode-layer',
                                            btn: ['确定', '取消'],
                                            success: (l) => {
                                                layui.use(['form'], function () {
                                                    layui.form.render('select');
                                                });
                                                l.find('#nsx-blacklist-remark').focus();
                                            },
                                            yes: async (pIndex, l) => {
                                                const val = l.find('#nsx-blacklist-remark').val().trim();
                                                const selectedMode = normalizeInlineBlacklistMode(l.find('#nsx-blacklist-mode').val(), defaultMode);
                                                if (selectedMode === 'official') {
                                                    try {
                                                        const r = await ctx.net.post("/api/block-list/add", { block_member_name: username });
                                                        if (!r?.success) {
                                                            ctx.ui.alert("同步失败", r?.message || "官方接口调用失败，仅保存本地备注");
                                                        }
                                                    } catch (e) {
                                                        env.error("Sync Official Block Failed", e);
                                                    }
                                                }
                                                map[username] = { remark: val, time: new Date().toLocaleString(), userId: targetUserId, mode: selectedMode };
                                                localStorage.setItem(key, JSON.stringify(map));
                                                ctx.ui.layer.close(pIndex);
                                                ctx.ui.toast("操作成功");
                                                setTimeout(() => location.reload(), 800);
                                            }
                                        });
                                        return;
                                    }
                                    ctx.ui.layer.prompt({ title: msgOn }, async (val, pIndex) => {
                                        map[username] = { remark: val, time: new Date().toLocaleString(), userId: targetUserId };
                                        localStorage.setItem(key, JSON.stringify(map));
                                        ctx.ui.layer.close(pIndex);
                                        ctx.ui.toast("操作成功");
                                        setTimeout(() => location.reload(), 800);
                                    });
                                }
                            };
                        };

                        const btnWrap = document.createElement('span');
                        btnWrap.className = 'nsx-relation-btn-wrap';
                        btnWrap.style.cssText = 'display:inline-flex;gap:4px;vertical-align:middle;margin-left:8px;';

                        if (showFriend) {
                            const frBtn = document.createElement('span');
                            frBtn.className = 'nsx-relation-btn nsx-btn-friend';
                            frBtn.innerHTML = document.documentElement.classList.contains('nsx-mobile')
                                ? (isFriend ? '✖' : '➕')
                                : (isFriend ? '✖ 好友' : '➕ 好友');
                            bindInlineAction(frBtn, isFriend, 'nsx_advanced_friends', friends, `添加 ${username} 为好友`, `已取消关注 ${username}`, userId);
                            btnWrap.appendChild(frBtn);
                        }
                        if (showBlock) {
                            const blBtn = document.createElement('span');
                            blBtn.className = 'nsx-relation-btn nsx-btn-block';
                            blBtn.innerHTML = document.documentElement.classList.contains('nsx-mobile')
                                ? (isBlocked ? '⭕' : '🚫')
                                : (isBlocked ? '⭕ 解除' : '🚫 屏蔽');
                            bindInlineAction(blBtn, isBlocked, 'nsx_advanced_blacklist', blacklist, `屏蔽 ${username}`, `已解除屏蔽 ${username}`, userId);
                            btnWrap.appendChild(blBtn);
                        }

                        const floorWrapper = metaInfo.querySelector('.floor-link-wrapper');
                        if (floorWrapper) floorWrapper.prepend(btnWrap);
                        else {
                            const anchor = metaInfo.querySelector('.floor-link, .post-info, .comment-info');
                            if (anchor) anchor.before(btnWrap);
                        }
                    }
                };

                const processUsers = () => ctx.$$('.nsk-content-meta-info .author-info > a[href*="/space/"]').forEach(display);
                processUsers();
                ctx.watch('.nsk-content-meta-info .author-info > a[href*="/space/"]', processUsers, { debounce: 200 });
            }
        };
        define(inlineUserInfo);

        /* ==========================================================================
           [ 🤝 社交关系 ] - 用户关系管理 (关注/好友)
           ========================================================================== */
        const userRelation = {
            id: "userRelation",
            deps: ["ui"],
            order: 390,
            cfg: {
                relation: {
                    show_friend_btn: true,
                    friend_btn_color: "#00b894",
                    show_block_btn: true,
                    block_btn_color: "#d63031",
                    blacklist_enabled: true,
                    blacklist_mode: "fold", // fold | official | mark
                    friends_enabled: true,
                    friends_highlight: "#ff9800"
                }
            },
            meta: {
                relation: {
                    label: "社交关系设置",
                    group: "🤝 社交关系",
                    fields: {
                        show_friend_btn: { type: "SWITCH", label: "显示添加好友按钮" },
                        friend_btn_color: { type: "COLOR", label: "好友按钮颜色" },
                        show_block_btn: { type: "SWITCH", label: "显示屏蔽用户按钮" },
                        block_btn_color: { type: "COLOR", label: "屏蔽按钮颜色" },
                        blacklist_enabled: { type: "SWITCH", label: "开启高级黑名单" },
                        blacklist_mode: { type: "SELECT", label: "黑名单显示模式", options: { fold: "优雅折叠", official: "官方屏蔽", mark: "标记模式" } },
                        friends_enabled: { type: "SWITCH", label: "开启本地好友高亮" },
                        friends_highlight: { type: "COLOR", label: "好友高亮色" }
                    }
                }
            },
            match: ctx => ctx.store.get("relation.blacklist_enabled", true) || ctx.store.get("relation.friends_enabled", true),
            init(ctx) {
                const blacklistKey = 'nsx_advanced_blacklist';
                const friendsKey = 'nsx_advanced_friends';
                const keywordsKey = 'nsx_advanced_keywords';
                const BLACKLIST_MODE_LABELS = { fold: "优雅折叠", official: "官方屏蔽", mark: "标记模式", hide: "官方屏蔽" };

                const getMap = (key) => {
                    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
                    catch { return {}; }
                };
                const saveMap = (key, map) => localStorage.setItem(key, JSON.stringify(map));
                const normalizeBlacklistMode = (mode, fallback = "fold") => {
                    const val = mode === "hide" ? "official" : mode;
                    return ["fold", "official", "mark"].includes(val) ? val : fallback;
                };

                const state = {
                    blacklist: getMap(blacklistKey),
                    friends: getMap(friendsKey),
                    keywords: getMap(keywordsKey),
                    cfg: {
                        blEnabled: ctx.store.get("relation.blacklist_enabled", true),
                        blMode: ctx.store.get("relation.blacklist_mode", "fold"),
                        frEnabled: ctx.store.get("relation.friends_enabled", true),
                        frColor: ctx.store.get("relation.friends_highlight", "#ff9800"),
                        friendBtnColor: ctx.store.get("relation.friend_btn_color", "#00b894"),
                        blockBtnColor: ctx.store.get("relation.block_btn_color", "#d63031")
                    }
                };
                const getUserBlacklistMode = (info) => normalizeBlacklistMode(info?.mode, state.cfg.blMode);
                const getBlacklistModeLabel = (mode) => BLACKLIST_MODE_LABELS[normalizeBlacklistMode(mode)] || BLACKLIST_MODE_LABELS.fold;

                let processAll = () => { };
                let processList = () => { };

                // 添加全局样式
                addStyle("nsx-user-relation", `
                /* 屏蔽与好友按钮 */
                .nsx-relation-btn {
                    font-size: 10px; padding: 2px 8px; border-radius: 5px; border: 1px solid currentColor;
                    background: transparent; color: currentColor !important; cursor: pointer; margin-left: 4px; opacity: 0.9;
                    transition: all 0.2s; user-select: none; display: inline-block; line-height: 1.6;
                    font-weight: 600; text-shadow: none; box-shadow: none;
                }
                .nsx-relation-btn:hover { opacity: 1; transform: translateY(-1px); }
                .nsx-relation-btn:active { transform: translateY(0); }
                .nsx-btn-block { color: ${state.cfg.blockBtnColor}; border-color: ${state.cfg.blockBtnColor}; background: ${state.cfg.blockBtnColor}12; }
                .nsx-btn-friend { color: ${state.cfg.friendBtnColor}; border-color: ${state.cfg.friendBtnColor}; background: ${state.cfg.friendBtnColor}12; }
                .nsx-mobile .nsx-relation-btn-wrap { gap: 3px !important; margin-left: 4px !important; }
                .nsx-mobile .nsx-relation-btn {
                    min-width: 18px; height: 18px; padding: 0 4px; font-size: 11px; line-height: 18px;
                    display: inline-flex; align-items: center; justify-content: center;
                }

                /* 折叠模式 */
                .nsx-post-folded > *:not(.nsx-fold-notice) { display: none !important; }
                .nsx-post-folded { background-color: rgba(244, 67, 54, 0.05) !important; padding: 0 !important; }
                .nsx-fold-notice {
                    font-size: 12px; color: #f44336; padding: 10px; opacity: 0.8;
                    display: flex; justify-content: space-between; align-items: center;
                }
                .nsx-unfold-btn { cursor: pointer; text-decoration: underline; }

                /* 彻底隐藏模式 */
                .nsx-post-hidden { display: none !important; }

                /* 好友高亮 */
                .nsx-friend-badge {
                    font-size: 11px; padding: 1px 5px; border-radius: 4px; margin-left: 4px;
                    background-color: ${state.cfg.frColor}22; border: 1px solid ${state.cfg.frColor};
                    color: ${state.cfg.frColor}; font-weight: bold; cursor: help;
                }
                .nsx-blacklist-badge {
                    font-size: 11px; padding: 1px 5px; border-radius: 4px; margin-left: 4px;
                    background-color: rgba(244, 67, 54, 0.12); border: 1px solid #f44336;
                    color: #f44336; font-weight: bold; cursor: help;
                }
            `);

                // 帖子页处理逻辑
                if (ctx.isPost) {
                    const processPostItem = (authorLink) => {
                        const postEl = authorLink.closest('.nsk-post, .comments > li, li.comment-item, .comment-item, li');
                        if (!postEl) return;
                        if (postEl.dataset.nsxRelationProcessed) return;

                        const username = authorLink.textContent.trim();
                        if (!username) return;

                        postEl.dataset.nsxRelationProcessed = "1";

                        // --- 黑名单逻辑 ---
                        if (state.cfg.blEnabled && state.blacklist[username]) {
                            const blInfo = state.blacklist[username];
                            const effectiveBlMode = getUserBlacklistMode(blInfo);
                            if (effectiveBlMode === 'official') {
                                postEl.classList.add('nsx-post-hidden');
                            } else if (effectiveBlMode === 'mark') {
                                const blBadge = document.createElement('span');
                                blBadge.className = 'nsx-blacklist-badge';
                                blBadge.title = `黑名单模式: ${getBlacklistModeLabel(effectiveBlMode)}\n黑名单备注: ${blInfo.remark || '无'}\n添加时间: ${blInfo.time || '未知'}`;
                                blBadge.innerHTML = '黑名单';
                                authorLink.after(blBadge);
                            } else {
                                // Fold mode
                                postEl.classList.add('nsx-post-folded');
                                const notice = document.createElement('div');
                                notice.className = 'nsx-fold-notice';
                                const _esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
                                notice.innerHTML = `
                                <span> 已折叠来自黑名单用户 [<b>${_esc(username)}</b>] 的言论。备注: ${_esc(blInfo.remark || '无')}</span>
                                <span class="nsx-unfold-btn">临时展开</span>
                            `;
                                notice.querySelector('.nsx-unfold-btn').onclick = (e) => {
                                    postEl.classList.remove('nsx-post-folded');
                                    notice.style.display = 'none';
                                };
                                postEl.prepend(notice);
                            }
                        }

                        // --- 好友逻辑 ---
                        if (state.cfg.frEnabled && state.friends[username]) {
                            const frInfo = state.friends[username];
                            const frBadge = document.createElement('span');
                            frBadge.className = 'nsx-friend-badge';
                            frBadge.title = `好友备注: ${frInfo.remark || '无'}\n添加时间: ${frInfo.time}`;
                            frBadge.innerHTML = '好友';
                            authorLink.after(frBadge);
                        }

                    };

                    processAll = () => ctx.$$('.nsk-content-meta-info .author-info > a[href^="/space/"]').forEach(processPostItem);
                    processAll();
                    ctx.watch('.nsk-content-meta-info', processAll, { debounce: 200 });
                }

                // 列表页处理逻辑 (讨论列表)
                if (ctx.isList || location.pathname === '/' || location.pathname.startsWith('/categories') || location.pathname.startsWith('/board')) {
                    const processListItem = (itemEl) => {
                        if (itemEl.dataset.nsxRelationListProcessed) return;
                        itemEl.dataset.nsxRelationListProcessed = "1";

                        const authorEl = itemEl.querySelector('.info-author, .post-author');
                        if (!authorEl) return;
                        const username = authorEl.textContent.trim();

                        if (state.cfg.blEnabled && state.blacklist[username]) {
                            const blInfo = state.blacklist[username];
                            const effectiveBlMode = getUserBlacklistMode(blInfo);
                            if (effectiveBlMode === 'official') {
                                itemEl.style.display = 'none';
                            } else if (effectiveBlMode === 'mark') {
                                authorEl.style.color = '#f44336';
                                authorEl.style.fontWeight = 'bold';
                                const badge = document.createElement('span');
                                badge.className = 'nsx-blacklist-badge';
                                badge.style.cssText = 'font-size:10px;padding:1px 4px;border-radius:3px;margin-left:4px;background-color:rgba(244,67,54,0.12);border:1px solid #f44336;color:#f44336;vertical-align:middle;line-height:1;font-weight:normal;';
                                badge.title = `黑名单模式: ${getBlacklistModeLabel(effectiveBlMode)}\n黑名单备注: ${blInfo.remark || '无'}`;
                                badge.textContent = '黑名单';
                                authorEl.after(badge);
                            } else {
                                itemEl.classList.add('nsx-post-folded');
                                const notice = document.createElement('div');
                                notice.className = 'nsx-fold-notice';
                                notice.style.padding = '12px 15px';
                                const _esc2 = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
                                notice.innerHTML = `
                                <span> 已折叠来自黑名单用户 [<b>${_esc2(username)}</b>] 的主题。备注: ${_esc2(blInfo.remark || '无')}</span>
                                <span class="nsx-unfold-btn">临时展开</span>
                            `;
                                notice.querySelector('.nsx-unfold-btn').onclick = (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    itemEl.classList.remove('nsx-post-folded');
                                    notice.style.display = 'none';
                                };
                                itemEl.prepend(notice);
                            }
                        }
                        if (state.cfg.frEnabled && state.friends[username]) {
                            const frInfo = state.friends[username];
                            authorEl.style.color = state.cfg.frColor;
                            authorEl.style.fontWeight = 'bold';
                            const badge = document.createElement('span');
                            badge.className = 'nsx-friend-badge';
                            badge.style.cssText = `font-size:10px;padding:1px 4px;border-radius:3px;margin-left:4px;background-color:${state.cfg.frColor}22;border:1px solid ${state.cfg.frColor};color:${state.cfg.frColor};vertical-align:middle;line-height:1;font-weight:normal;`;
                            badge.title = `好友备注: ${frInfo.remark || '无'}`;
                            badge.textContent = '好友';
                            authorEl.after(badge);
                        }
                    };

                    processList = () => ctx.$$('.post-list-item, .post-list .list-item').forEach(processListItem);
                    processList();
                    ctx.watch('.post-list, .post-list-item', processList, { debounce: 200 });
                }

                // === 构建社交关系管理大面板 (仿历史记录风格) ===
                const panelCss = `.nsx-rel-header{display:flex;align-items:center;justify-content:space-between;padding:12px 12px 6px}.nsx-rel-title{font-size:15px;font-weight:600}.nsx-rel-action{border:0;background:0;color:#666;cursor:pointer;font-size:12px;padding:4px 8px;border-radius:6px}.nsx-rel-action:hover{background:#f2f3f5}.nsx-rel-search{display:flex;align-items:center;gap:6px;margin:0 12px 8px;border:1px solid #e1e1e1;border-radius:8px;padding:6px 8px}.nsx-rel-search input{border:0;background:0;outline:0;width:100%;font-size:13px}.nsx-rel-tabs{display:flex;gap:16px;padding:0 12px 6px;border-bottom:1px solid #f0f0f0}.nsx-rel-tab{border:0;background:0;cursor:pointer;color:#6b6b6b;font-size:12px;padding:6px 0;font-weight:600;border-bottom:2px solid transparent}.nsx-rel-tab.is-active{color:#0a62ff;border-bottom-color:#0a62ff}.nsx-rel-list{flex:1;overflow-y:auto;padding:6px 8px 12px}.nsx-rel-item{display:flex;align-items:center;gap:8px;padding:8px 6px;border-radius:8px}.nsx-rel-item:hover{background:#f5f7fb}.nsx-rel-link{display:flex;align-items:center;gap:10px;flex:1;min-width:0;text-decoration:none;color:inherit}.nsx-rel-icon{width:36px;height:36px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;color:#999;font-weight:bold;font-size:18px}.nsx-rel-info{display:flex;flex-direction:column;gap:2px;overflow:hidden;flex:1;}.nsx-rel-item-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:bold;font-size:14px;}.nsx-rel-remark{color:#888;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.nsx-rel-time{color:#aaa;font-size:11px;}.nsx-rel-empty{padding:20px 6px;color:#999;font-size:13px;text-align:center;}.nsx-rel-close{border:0;background:0;cursor:pointer;font-size:12px;padding:4px 8px;border-radius:6px;color:#999;display:none}.nsx-rel-item:hover .nsx-rel-close{display:block}.nsx-rel-close:hover{color:#f44336;background:#fee}.dark-layout .nsx-rel-action{color:#999}.dark-layout .nsx-rel-action:hover{background:#2a2a2a}.dark-layout .nsx-rel-search{border-color:#3a3a3a}.dark-layout .nsx-rel-search input{color:#e0e0e0}.dark-layout .nsx-rel-tabs{border-bottom-color:#3a3a3a}.dark-layout .nsx-rel-tab{color:#999}.dark-layout .nsx-rel-item:hover{background:#2a2a2a}.dark-layout .nsx-rel-icon{background:#3a3a3a}`;
                addStyle("nsx-rel-panel-style", panelCss);

                let relPanel = null, relTrigger = null, pState = { open: false, tab: "bl", kw: "" };

                // 寻找吸顶栏作为挂靠点
                const head = ctx.$("#nsk-head");
                if (head) {
                    const grp = ensureIconGroup();
                    if (!grp) return;
                    relTrigger = document.createElement("div");
                    relTrigger.className = "relation-dropdown-on";
                    relTrigger.style.cssText = "";
                    relTrigger.title = "关系管理(黑名单/好友)";
                    relTrigger.innerHTML = `<svg viewBox="0 0 48 48" fill="none" class="iconpark-icon" style="width:17px;height:17px;color:currentColor;"><path d="M24 20C28.4183 20 32 16.4183 32 12C32 7.58172 28.4183 4 24 4C19.5817 4 16 7.58172 16 12C16 16.4183 19.5817 20 24 20Z" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M42 44C42 34.0589 33.9411 26 24 26C14.0589 26 6 34.0589 6 44" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                    grp.appendChild(relTrigger);

                    const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

                    const openRel = () => {
                        if (!relPanel) {
                            relPanel = document.createElement("div");
                            relPanel.id = "nsx-rel-panel";
                            relPanel.innerHTML = `<div class="nsx-rel-header"><div class="nsx-rel-title">社交关系名单</div><button class="nsx-rel-action" data-a="clear">清空列表</button></div><div class="nsx-rel-search">🔍<input placeholder="搜索用户名或备注..."/></div><div class="nsx-rel-tabs"><button class="nsx-rel-tab is-active" data-t="bl">🚫 屏蔽黑名单</button><button class="nsx-rel-tab" data-t="fr">🌟 本地好友</button></div><div class="nsx-rel-list"></div>`;
                            document.body.appendChild(relPanel);

                            relPanel.querySelector("input").oninput = e => { pState.kw = e.target.value.toLowerCase(); renderRel(); };
                            relPanel.onclick = e => {
                                e.stopPropagation();
                                const modeBtn = e.target.closest("[data-a='edit-mode']");
                                if (modeBtn) {
                                    e.preventDefault();
                                    const un = modeBtn.dataset.un;
                                    const item = state.blacklist[un];
                                    if (!un || !item) return;
                                    const currentMode = getUserBlacklistMode(item);
                                    const html = `
                                        <div class="layui-form" style="padding:20px 20px 0;">
                                            <div class="layui-form-item">
                                                <label class="layui-form-label" style="width:72px;padding-left:0;">模式</label>
                                                <div class="layui-input-block" style="margin-left:92px;">
                                                    <select id="nsx-rel-blacklist-mode">
                                                        <option value="fold" ${currentMode === 'fold' ? 'selected' : ''}>优雅折叠</option>
                                                        <option value="official" ${currentMode === 'official' ? 'selected' : ''}>官方屏蔽</option>
                                                        <option value="mark" ${currentMode === 'mark' ? 'selected' : ''}>标记模式</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>`;
                                    ctx.ui.layer.open({
                                        title: `设置 ${un} 的屏蔽模式`,
                                        content: html,
                                        area: ['min(420px,94vw)', 'auto'],
                                        skin: 'nsx-mode-layer',
                                        btn: ['保存', '取消'],
                                        success: () => {
                                            layui.use(['form'], function () {
                                                layui.form.render('select');
                                            });
                                        },
                                        yes: async (idx, l) => {
                                            const nextMode = normalizeBlacklistMode(l.find('#nsx-rel-blacklist-mode').val(), currentMode);
                                            item.mode = nextMode;
                                            saveMap(blacklistKey, state.blacklist);
                                            if (nextMode === 'official') {
                                                try {
                                                    const r = await ctx.net.post("/api/block-list/add", { block_member_name: un });
                                                    if (!r?.success) ctx.ui.alert("同步失败", r?.message || "官方接口调用失败，仅保存本地模式");
                                                } catch (err) {
                                                    env.error("Sync Official Block Failed", err);
                                                }
                                            }
                                            ctx.ui.layer.close(idx);
                                            renderRel();
                                            ctx.ui.toast("黑名单模式已更新，刷新贴子生效");
                                        }
                                    });
                                    return;
                                }
                                if (e.target.closest('.nsx-rel-remark')) {
                                    if (e.target.tagName !== 'INPUT') e.preventDefault();
                                    return;
                                }
                                const t = e.target.closest("[data-t]");
                                if (t) { pState.tab = t.dataset.t; renderRel(); return; }
                                const a = e.target.closest("[data-a]");
                                if (!a) return;
                                const act = a.dataset.a, un = a.dataset.un;
                                if (act === "clear") {
                                    const names = { bl: "黑名单", fr: "好友" };
                                    ctx.ui.confirm("确认清空?", `确定要清空所有${names[pState.tab]}吗？`, () => {
                                        if (pState.tab === 'bl') state.blacklist = {}; else state.friends = {};
                                        saveMap(pState.tab === 'bl' ? blacklistKey : friendsKey, pState.tab === 'bl' ? state.blacklist : state.friends);
                                        renderRel();
                                        ctx.ui.toast("已清空");
                                    });
                                }
                                if (act === "del") {
                                    if (pState.tab === 'bl') {
                                        const targetUserId = state.blacklist[un]?.userId;
                                        delete state.blacklist[un];
                                        if (targetUserId) {
                                            fetch('/api/block-list/del', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ block_member_id: Number(targetUserId) }) }).catch(() => { });
                                        }
                                    } else {
                                        delete state.friends[un];
                                    }
                                    saveMap(pState.tab === 'bl' ? blacklistKey : friendsKey, pState.tab === 'bl' ? state.blacklist : state.friends);
                                    renderRel();
                                    ctx.ui.toast("已移除");
                                }
                            };
                            relPanel.ondblclick = e => {
                                const remarkSpan = e.target.closest('.nsx-rel-remark');
                                if (remarkSpan) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const un = remarkSpan.dataset.un;
                                    if (!un) return;
                                    let mapObj = pState.tab === "bl" ? state.blacklist : state.friends;
                                    const currentRemark = mapObj[un]?.remark || "";

                                    const input = document.createElement('input');
                                    input.type = 'text';
                                    input.value = currentRemark;
                                    input.style.cssText = "width:100%;font-size:12px;border:1px solid #0a62ff;border-radius:4px;padding:2px 4px;outline:none;background:#fff;color:#333;";

                                    input.onkeydown = (ke) => {
                                        if (ke.key === 'Enter') input.blur();
                                        if (ke.key === 'Escape') { input.value = currentRemark; input.blur(); }
                                    };
                                    input.onblur = () => {
                                        const newRemark = input.value.trim();
                                        if (mapObj[un]) {
                                            mapObj[un].remark = newRemark;
                                            saveMap(pState.tab === "bl" ? blacklistKey : friendsKey, mapObj);
                                        }
                                        renderRel();
                                        if (newRemark !== currentRemark) ctx.ui.toast("备注已更新，刷新贴子生效");
                                    };

                                    remarkSpan.innerHTML = '';
                                    remarkSpan.appendChild(input);
                                    input.focus();
                                    // 光标移到最后
                                    input.setSelectionRange(input.value.length, input.value.length);
                                }
                            };
                            document.addEventListener("click", e => {
                                const inLayer = !!e.target.closest('.layui-layer,.layui-layer-page,.layui-layer-dialog,.layui-layer-content,.layui-layer-btn,.layui-layer-shade,.layui-colorpicker,.layui-form-select');
                                if (inLayer) return;
                                const hasTopLayer = !!document.querySelector('.layui-layer[style*="z-index"]');
                                if (hasTopLayer) return;
                                if (pState.open && !relPanel.contains(e.target) && !relTrigger.contains(e.target)) closeRel();
                            });
                            document.addEventListener("keydown", e => { if (pState.open && e.key === "Escape") closeRel(); });
                        }
                        const r = relTrigger.getBoundingClientRect();
                        relPanel.style.top = `${r.bottom + 8}px`;
                        relPanel.style.height = `${innerHeight - r.bottom - 16}px`;
                        relPanel.style.right = ``;
                        renderRel();
                        relPanel.classList.add("show");
                        pState.open = true;
                    };

                    const closeRel = () => { relPanel?.classList.remove("show"); pState.open = false; };
                    window.__nsxPanelCtrl ||= {};
                    window.__nsxPanelCtrl.relation = { close: closeRel, isOpen: () => pState.open };
                    const toggleRel = () => pState.open ? closeRel() : openRel();

                    const renderRel = () => {
                        let mapObj = pState.tab === "bl" ? state.blacklist : state.friends;
                        let list = Object.entries(mapObj).map(([un, info]) => ({ username: un, remark: info.remark || "", time: info.time || "", userId: info.userId || "", mode: info.mode || "" }));

                        if (pState.kw) list = list.filter(i => i.username.toLowerCase().includes(pState.kw) || i.remark.toLowerCase().includes(pState.kw));
                        list.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

                        relPanel.querySelectorAll(".nsx-rel-tab").forEach(b => b.classList.toggle("is-active", b.dataset.t === pState.tab));

                        const lEl = relPanel.querySelector(".nsx-rel-list");
                        if (!list.length) { lEl.innerHTML = `<div class="nsx-rel-empty">该列表空空如也</div>`; return; }

                        lEl.innerHTML = list.map(i => {
                            const url = i.userId ? `/space/${i.userId}#/general` : `/space/${encodeURIComponent(i.username)}`;
                            const avatarLetter = i.username.charAt(0).toUpperCase();
                            const iconColor = pState.tab === "bl" ? "#f44336" : "#4caf50";

                            const avatarImgHtml = i.userId
                                ? `<img src="/avatar/${i.userId}.png" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='inline';">`
                                : "";
                            const letterHtml = `<span style="${i.userId ? 'display:none;' : 'display:inline;'}">${avatarLetter}</span>`;

                            return `<div class="nsx-rel-item">
                                <a class="nsx-rel-link" href="${url}" target="_blank">
                                    <span class="nsx-rel-icon" style="color:white;background:${iconColor};opacity:0.8">${avatarImgHtml}${letterHtml}</span>
                                    <div class="nsx-rel-info">
                                        <span class="nsx-rel-item-title">${esc(i.username)}</span>
                                        <span class="nsx-rel-remark" data-un="${esc(i.username)}" title="双击可直接修改备注">${esc(i.remark ? '备注: ' + i.remark : '无备注 (双击添加)')}</span>
                                        ${pState.tab === "bl" ? `<span class="nsx-rel-remark"><button class="nsx-rel-action" data-a="edit-mode" data-un="${esc(i.username)}" style="padding:0 6px;font-size:11px;">模式: ${esc(getBlacklistModeLabel(i.mode || state.cfg.blMode))}</button></span>` : ``}
                                    </div>
                                </a>
                                <span class="nsx-rel-time">${i.time ? i.time.split(' ')[0] : ''}</span>
                                <button class="nsx-rel-close" data-a="del" data-un="${esc(i.username)}" title="移出列表">移除</button>
                            </div>`;
                        }).join("");
                    };

                    relTrigger.onclick = e => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!pState.open) {
                            window.__nsxPanelCtrl.filter?.close?.();
                            window.__nsxPanelCtrl.history?.close?.();
                        }
                        toggleRel();
                    };
                }

                window.__nsxRuntime ||= {};
                window.__nsxRuntime.reapplyRelation = () => {
                    state.blacklist = getMap(blacklistKey);
                    state.friends = getMap(friendsKey);
                    state.cfg.blEnabled = ctx.store.get("relation.blacklist_enabled", true);
                    state.cfg.blMode = ctx.store.get("relation.blacklist_mode", "fold");
                    state.cfg.frEnabled = ctx.store.get("relation.friends_enabled", true);
                    state.cfg.frColor = ctx.store.get("relation.friends_highlight", "#ff9800");
                    state.cfg.friendBtnColor = ctx.store.get("relation.friend_btn_color", "#00b894");
                    state.cfg.blockBtnColor = ctx.store.get("relation.block_btn_color", "#d63031");

                    ctx.$$(".nsx-relation-btn-wrap,.nsx-friend-badge,.nsx-blacklist-badge,.nsx-fold-notice").forEach(el => el.remove());
                    ctx.$$(".nsx-post-folded,.nsx-post-hidden").forEach(el => {
                        el.classList.remove("nsx-post-folded", "nsx-post-hidden");
                        el.style.display = "";
                    });
                    ctx.$$(".nsk-content-meta-info .author-info > a[href^='/space/'], .post-list-item .info-author, .post-list-item .post-author").forEach(el => {
                        el.style.color = "";
                        el.style.fontWeight = "";
                    });
                    ctx.$$('[data-nsx-relation-processed],[data-nsx-relation-list-processed]').forEach(el => {
                        delete el.dataset.nsxRelationProcessed;
                        delete el.dataset.nsxRelationListProcessed;
                    });

                    processAll();
                    processList();
                    if (typeof renderRel === "function" && pState.open) renderRel();
                };
            }
        };
        define(userRelation);
        // 🚫 过滤设置 (放在最后)
        define(blockPosts);
        define(blockViewLevel);

        boot(ctx);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

    /*
     * ==================== 积分惩戒详细中文公式（说明注释） ====================
     * 该逻辑用于 inlineUserInfo 的“信誉分（trustScore）”计算与惩戒，不参与运行，仅供维护阅读。
     *
     * 1) 基础变量
     * - joinDays: 注册天数
     * - coins: 当前鸡腿（积分）
     * - nPost: 发帖数
     * - nComment: 评论数
     * - totalAct = nPost + nComment
     * - dailyAct = totalAct / max(joinDays, 1)
     * - coinPerDay = coins / max(joinDays, 1)
     * - isLegend: 特殊标签用户
     * - MATURE_DAYS = 30（成熟基线按注册天数定义）
     *
     * 2) 四项基础分
     * - 资历分(25分):
     *   alpha = min(joinDays / MATURE_DAYS, 1)
     *   baseSeniority = min(25, joinDays / 25)
     *   lowSeniority = min(5, joinDays / 100)
     *   seniorityScore = baseSeniority * alpha + lowSeniority * (1 - alpha)
     *
     * - 活跃分(25分):
     *   actVal = max(min(25, dailyAct * 15), min(25, totalAct / 15))
     *   spamPenalty = (dailyAct > 24) ? max(0.5, 1 - (dailyAct - 24) / 40) : 1
     *   actScore = actVal * spamPenalty
     *   过分极端高频会被打折。
     * 
     * - 财富分(20分):
     *   wealthScore = max(min(20, coinPerDay * 5), min(20, coins / 80))
     *
     * - 质量分(30分):
     *   estimatedBaseCoins = 90 + min(nComment, joinDays * 20) * 1 + min(nPost, joinDays * 4) * 5 + joinDays * 5
     *   extraCoins = max(0, coins - estimatedBaseCoins)
     *   extraPerAct = extraCoins / max(totalAct, 1)
     *   qualityConfidence = min(totalAct / 10, 1)
     *   rawQualityScore = extraPerAct * 18
     *   qualityScore = min(30, rawQualityScore) * qualityConfidence
     *
     * 3) 初始总分
     * - trustScore = seniorityScore + actScore + wealthScore + qualityScore
     * - 若 isLegend 为真，则 trustScore += 15
     *
     * 4) 惩戒与上限规则
     * - 僵尸号重罚:
     *   条件: joinDays > 100 且 coinPerDay < 5/3
     *   处理: trustScore = trustScore * 0.2
     *
     * - 新号封顶:
     *   条件: joinDays < MATURE_DAYS
     *   处理: trustScore = min(trustScore, 70)
     *
     * - 灌水惩戒（共三档）:
     *   先满足触发门槛:
     *   tavgReplyPerDay = totalAct / max(joinDays, 1)
     *   lowQuality = extraPerAct < 1.05
     *   spamLikely = (tavgReplyPerDay >= 40) 且 lowQuality
     *
     *   当 spamLikely 为真时按 extraPerAct 分三档惩戒:
     *   A. 最重档: extraPerAct < 0.35      -> trustScore *= 0.65
     *   B. 中档:   0.35 <= extraPerAct < 0.7 -> trustScore *= 0.75
     *   C. 轻档:   extraPerAct >= 0.7        -> trustScore *= 0.85
     *
     * 5) 最终分
     * - trustScore = floor(trustScore)
     * - trustScore = max(0, min(100, trustScore))
     * ========================================================================
     */
})();