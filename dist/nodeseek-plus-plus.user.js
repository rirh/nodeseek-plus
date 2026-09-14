// ==UserScript==
// @name         NodeSeek++
// @namespace    nodeseek-plus-plus
// @version      26.914.1107
// @description  模块化论坛增强：阅读、过滤、回复、签到、交易与关键词监控，一个功能一套实现。
// @license      GPL-3.0-only
// @match        https://www.nodeseek.com/*
// @match        https://www.deepflood.com/*
// @connect      api.nodeimage.com
// @connect      rss.nodeseek.com
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-end
// @noframes
// ==/UserScript==

/*!
# Third-party notices

NodeSeek++ uses the following third-party libraries. Their respective license
terms apply to those components.

## date-fns 4.4.0

Source: https://github.com/date-fns/date-fns

MIT License

Copyright (c) 2021 Sasha Koss and Lesha Koss https://kossnocorp.mit-license.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## GSAP 3.15.0

Source: https://gsap.com/
License: Standard "no charge" license, https://gsap.com/standard-license
See the copyright and license notices retained in the bundled GSAP source.

## highlight.js 11.12.0

Source: https://github.com/highlightjs/highlight.js
License: BSD 3-Clause.
The full license is preserved in references/highlight.js.LICENSE and appended
to this notice in the generated userscript banner by vite.config.ts.

## Viewer.js 1.14.0

Source: https://github.com/fengyuanchen/viewerjs

The MIT License (MIT)

Copyright 2015-present Chen Fengyuan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.


BSD 3-Clause License

Copyright (c) 2006, Ivan Sagalaev.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its
contributors may be used to endorse or promote products derived from
this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/
(function() {
	"use strict";
	var s = new Set();
	var _css = async (t) => {
		if (s.has(t)) return;
		s.add(t);
		((c) => {
			if (typeof GM_addStyle === "function") GM_addStyle(c);
			else (document.head || document.documentElement).appendChild(document.createElement("style")).append(c);
		})(t);
	};
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
			key = keys[i];
			if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: ((k) => from[k]).bind(null, key),
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	var _GM_getValue = (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
	var _GM_notification = (() => typeof GM_notification != "undefined" ? GM_notification : void 0)();
	var _GM_registerMenuCommand = (() => typeof GM_registerMenuCommand != "undefined" ? GM_registerMenuCommand : void 0)();
	var _GM_setValue = (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
	var _GM_xmlhttpRequest = (() => typeof GM_xmlhttpRequest != "undefined" ? GM_xmlhttpRequest : void 0)();
	var _unsafeWindow = (() => typeof unsafeWindow != "undefined" ? unsafeWindow : void 0)();
	var _monkeyWindow = (() => window)();
	var memory = new Map();
	var getter = () => typeof _GM_getValue === "function" ? _GM_getValue : _monkeyWindow.GM_getValue;
	var setter = () => typeof _GM_setValue === "function" ? _GM_setValue : _monkeyWindow.GM_setValue;
	var unsafeWindow$1 = _unsafeWindow || _monkeyWindow.unsafeWindow || window;
	function hasStorage() {
		return typeof getter() === "function" && typeof setter() === "function";
	}
	function GM_getValue$1(key, fallback) {
		const get = getter();
		return typeof get === "function" ? get(key, fallback) : memory.has(key) ? structuredClone(memory.get(key)) : fallback;
	}
	function GM_setValue$1(key, value) {
		const set = setter();
		if (typeof set === "function") set(key, value);
		else memory.set(key, structuredClone(value));
	}
	function GM_registerMenuCommand$1(label, callback) {
		const register = typeof _GM_registerMenuCommand === "function" ? _GM_registerMenuCommand : _monkeyWindow.GM_registerMenuCommand;
		if (typeof register === "function") register(label, callback);
	}
	function systemNotify(text, url, tag, title = "新消息") {
		const notify = typeof _GM_notification === "function" ? _GM_notification : _monkeyWindow.GM_notification;
		if (typeof notify !== "function") return false;
		try {
			notify({
				title: `NodeSeek++ · ${title}`,
				text,
				url,
				tag,
				timeout: 1e4
			});
			return true;
		} catch {
			return false;
		}
	}
	var requestSettings$1 = {
		id: "request-settings",
		title: "接口请求并发与延迟",
		group: "网络",
		description: "用户资料缓存 24 小时，刷新和翻页优先复用，过期后按需更新。同页站内请求默认最多并发 4 个，相邻请求启动间隔 200ms，首个请求立即执行；排队时优先处理用户操作。保留站点限流冷却，各标签页独立调度，RSS 仍按监控周期检查。关闭后使用默认值。",
		defaults: {
			enabled: true,
			maxConcurrent: 4,
			requestInterval: 200
		},
		fields: {
			maxConcurrent: {
				label: "最大并发请求数（1–10）",
				type: "number"
			},
			requestInterval: {
				label: "请求间隔（毫秒，0–5000，默认 200）",
				type: "number"
			}
		},
		mount() {}
	};
	function requestConcurrency(value) {
		return typeof value === "number" && Number.isFinite(value) ? Math.max(1, Math.min(10, Math.floor(value))) : 4;
	}
	function requestInterval(value) {
		return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(5e3, Math.floor(value))) : 200;
	}
	function retryDelay(value, now = Date.now()) {
		if (!value) return 6e4;
		const seconds = Number(value);
		const delay = Number.isFinite(seconds) ? seconds * 1e3 : Date.parse(value) - now;
		return Number.isFinite(delay) ? Math.max(6e4, delay) : 6e4;
	}
	function createRequestQueue(limit = () => 1, interval = () => 0) {
		const pending = [];
		let active = 0;
		let lastStarted = -Infinity;
		let timer;
		const drain = () => {
			clearTimeout(timer);
			while (pending.length && active < requestConcurrency(limit())) {
				const delay = lastStarted + requestInterval(interval()) - Date.now();
				if (delay > 0) {
					timer = setTimeout(drain, delay);
					return;
				}
				pending.sort((a, b) => a.priority - b.priority);
				active++;
				lastStarted = Date.now();
				pending.shift().run().finally(() => {
					active--;
					drain();
				});
			}
		};
		return (task, priority = 0) => new Promise((resolve, reject) => {
			pending.push({
				priority,
				run: async () => {
					try {
						resolve(await task());
					} catch (error) {
						reject(error);
					}
				}
			});
			drain();
		});
	}
	var requestSettings = () => {
		const settings = GM_getValue$1(`nspp:settings:${location.hostname}`, {})?.["request-settings"];
		return settings?.enabled === false ? void 0 : settings;
	};
	var enqueue = createRequestQueue(() => requestConcurrency(requestSettings()?.maxConcurrent), () => requestInterval(requestSettings()?.requestInterval));
	async function request(url, options = {}) {
		const target = new URL(url, location.origin);
		if (!/^https?:$/.test(target.protocol)) throw new Error("不支持的请求地址");
		const profile = target.pathname.startsWith("/api/account/getInfo/");
		const { responseType = "json", ...init } = options;
		const execute = async () => {
			init.signal?.throwIfAborted();
			const timeout = AbortSignal.timeout(2e4);
			const response = await fetch(target, {
				...init,
				credentials: target.origin === location.origin ? "same-origin" : "omit",
				signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout
			});
			if (target.origin === location.origin && [
				403,
				429,
				503
			].includes(response.status)) GM_setValue$1(`nspp:request-cooldown:${location.host}`, Date.now() + retryDelay(response.headers.get("Retry-After")));
			if (!response.ok) throw new Error(`请求失败（HTTP ${response.status}）`);
			if (responseType === "text") return await response.text();
			if (response.status === 204) return null;
			try {
				return await response.json();
			} catch {
				throw new Error("服务器未返回有效数据，请检查登录状态或站点验证页面");
			}
		};
		if (target.origin !== location.origin) return execute();
		return enqueue(async () => {
			init.signal?.throwIfAborted();
			if (GM_getValue$1(`nspp:request-cooldown:${location.host}`, 0) > Date.now()) throw new Error("站点请求冷却中，请稍后手动重试");
			return execute();
		}, profile ? 1 : 0);
	}
	var validObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
	function normalizeSettings(features, value) {
		const input = validObject(value) ? value : {};
		const result = {};
		for (const feature of features) {
			const source = Object.hasOwn(input, feature.id) && validObject(input[feature.id]) ? input[feature.id] : {};
			const options = {};
			for (const [key, fallback] of Object.entries(feature.defaults)) {
				const candidate = Object.hasOwn(source, key) ? source[key] : void 0;
				const choices = feature.fields?.[key]?.options;
				options[key] = typeof candidate === typeof fallback && (typeof candidate !== "number" || Number.isFinite(candidate)) && (typeof candidate !== "string" || candidate.length <= 1e5) && (!choices || choices.some((option) => option.value === candidate)) ? candidate : fallback;
			}
			result[feature.id] = options;
		}
		return result;
	}
	function parseSettings(features, text) {
		if (text.length > 1e6) throw new Error("配置文件不能超过 1 MB");
		const data = JSON.parse(text);
		if (!validObject(data) || data.format !== "nodeseek-plus-plus" || data.schema !== 1 || !validObject(data.settings)) throw new Error("请选择 NodeSeek++ 导出的配置文件（schema 1）");
		return normalizeSettings(features, data.settings);
	}
	function exportSettings(settings) {
		const safe = structuredClone(settings);
		for (const options of Object.values(safe)) for (const key of Object.keys(options)) if (/^(api[-_]?key|token|password|secret|access[-_]?token)$/i.test(key)) options[key] = "";
		return JSON.stringify({
			format: "nodeseek-plus-plus",
			schema: 1,
			settings: safe
		}, null, 2);
	}
	var SETTINGS_KEY = `nspp:settings:${location.hostname}`;
	function loadSettings(features) {
		return normalizeSettings(features, GM_getValue$1(SETTINGS_KEY, {}));
	}
	function saveSettings(features, settings) {
		if (!hasStorage()) throw new Error("油猴存储未就绪，请重新安装脚本后刷新");
		GM_setValue$1(SETTINGS_KEY, normalizeSettings(features, settings));
	}
	function clearCaches() {
		if (!hasStorage()) throw new Error("油猴存储未就绪，请重新安装脚本后刷新");
		for (const [id, matches] of [
			["user-level", (key) => key === "profiles"],
			["notification-categories", (key) => key.startsWith("counts:")],
			["footprints", (key) => key.startsWith("records:")]
		]) {
			const key = `nspp:state:${location.hostname}:${id}`;
			const state = GM_getValue$1(key, {});
			if (state && typeof state === "object" && !Array.isArray(state)) GM_setValue$1(key, Object.fromEntries(Object.entries(state).filter(([name]) => !matches(name))));
		}
	}
	function startFeatures(features, settings, notify) {
		const callbacks = new Set();
		const cleanups = [];
		let timer;
		const run = (callback) => {
			try {
				callback();
			} catch {
				notify("部分页面增强未能应用，可关闭对应模块后刷新重试");
			}
		};
		const observer = new MutationObserver((records) => {
			if (!records.some((record) => record.addedNodes.length || record.removedNodes.length)) return;
			if (timer) return;
			timer = setTimeout(() => {
				timer = void 0;
				callbacks.forEach(run);
			}, 100);
		});
		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
		for (const feature of features) {
			if (!settings[feature.id]?.enabled) continue;
			const controller = new AbortController();
			cleanups.push(() => controller.abort());
			const cacheKey = `nspp:state:${location.hostname}:${feature.id}`;
			const readState = () => {
				const cache = GM_getValue$1(cacheKey, {});
				return cache && typeof cache === "object" && !Array.isArray(cache) ? cache : {};
			};
			const ctx = {
				root: document,
				get: (key) => Object.hasOwn(settings[feature.id], key) ? settings[feature.id][key] : readState()[key],
				set: (key, value) => {
					if ([
						"__proto__",
						"constructor",
						"prototype"
					].includes(key)) return;
					if (Object.hasOwn(feature.defaults, key)) {
						settings[feature.id][key] = value;
						saveSettings(features, settings);
					} else {
						const state = readState();
						state[key] = value;
						GM_setValue$1(cacheKey, state);
					}
				},
				watch: (callback) => {
					callbacks.add(callback);
					run(callback);
					const stop = () => {
						callbacks.delete(callback);
					};
					cleanups.push(stop);
					return stop;
				},
				request: (url, options = {}) => request(url, {
					...options,
					signal: options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal
				}),
				notify,
				signal: controller.signal
			};
			try {
				const cleanup = feature.mount(ctx);
				if (cleanup) cleanups.push(cleanup);
			} catch {
				notify(`${feature.title}启动失败，其他模块可继续使用`);
			}
		}
		return () => {
			observer.disconnect();
			clearTimeout(timer);
			cleanups.reverse().forEach((cleanup) => {
				try {
					cleanup();
				} catch {}
			});
			callbacks.clear();
		};
	}
	function toolIcon(name) {
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", "0 0 24 24");
		svg.setAttribute("width", "18");
		svg.setAttribute("height", "18");
		svg.setAttribute("fill", "none");
		svg.setAttribute("stroke", "currentColor");
		svg.setAttribute("stroke-width", "1.8");
		svg.setAttribute("stroke-linecap", "round");
		svg.setAttribute("stroke-linejoin", "round");
		svg.setAttribute("aria-hidden", "true");
		const path = document.createElementNS(svg.namespaceURI, "path");
		path.setAttribute("d", name === "ai" ? "M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3M20 2v4M18 4h4" : name === "play" ? "M8 5l11 7-11 7V5" : name === "stop" ? "M6 6h12v12H6V6" : name === "close" ? "M6 6l12 12M18 6 6 18" : name === "refresh" ? "M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1" : name === "top" ? "M12 20V5M6 11l6-6 6 6M5 3h14" : name === "footprints" ? "M4 4h16v12H9l-5 4V4M8 8h8M8 12h5" : name === "monitor" ? "M3 12h4l3-8 4 16 3-8h4" : name === "messages" ? "M3 5h18v14H3V5m0 0 9 7 9-7" : name === "history" ? "M3 11a9 9 0 1 1 2.6 7M3 4v7h7M12 7v5l3 2" : name === "attendance" ? "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M8 16l3 3 5-6" : "M4 7h16M4 17h16M8 4v6M16 14v6");
		if (name === "monitor") {
			path.setAttribute("pathLength", "100");
			path.classList.add("nspp-ecg-trace");
		}
		svg.append(path);
		if (name === "monitor") {
			const shine = path.cloneNode(true);
			shine.classList.replace("nspp-ecg-trace", "nspp-ecg-shine");
			svg.append(shine);
		}
		return svg;
	}
	var style_default$1 = ":host{all:initial;--surface:#fff;--text:#1f2328;--muted:#59636e;--line:#d1d9e0;--accent:#1f883d;--link:#0969da;--soft:#f6f8fa;--lightningcss-light:initial;--lightningcss-dark: ;color-scheme:light;font:13px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,sans-serif}*,:before,:after{box-sizing:border-box}[hidden]{display:none!important}button,input,textarea,select{font:inherit;letter-spacing:normal;accent-color:var(--link)}button{cursor:pointer;border:1px solid var(--line);background:var(--soft);min-height:28px;color:var(--text);white-space:nowrap;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:500;line-height:20px;box-shadow:0 1px #1f23280a}button:hover{background:var(--line)}button:disabled{opacity:.6;cursor:wait}:focus-visible{outline:2px solid var(--link);outline-offset:2px}.launcher{z-index:2147483645;background:var(--surface);min-height:32px;font-weight:600;position:fixed;bottom:16px;right:16px;box-shadow:0 2px 6px #1f232826}dialog{width:min(760px,100vw - 32px);max-width:none;max-height:min(82dvh,760px);color:var(--text);background:var(--surface);border:1px solid var(--line);text-align:left;border-radius:8px;margin:auto;padding:0;font:13px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,sans-serif;overflow:hidden;box-shadow:0 8px 28px #1f232833}dialog[open]{flex-direction:column;display:flex}dialog::backdrop{background:#1f232866}header{border-bottom:1px solid var(--line);background:var(--soft);flex:none;justify-content:space-between;align-items:center;gap:8px;padding:8px 12px;display:flex}.heading{white-space:nowrap;align-items:baseline;gap:6px;display:flex}h2{margin:0;font-size:14px;font-weight:600;line-height:22px}header p{font-size:12px}p{color:var(--muted);overflow-wrap:anywhere;margin:3px 0 0}.search-bar{border-bottom:1px solid var(--line);flex:none;padding:6px 12px}form{flex-direction:column;min-height:0;margin:0;display:flex}.content{overscroll-behavior:contain;scrollbar-gutter:stable;padding:0 16px 8px;overflow-y:auto}section{margin:0}h3{z-index:1;background:var(--surface);border-bottom:1px solid var(--line);color:var(--muted);margin:0;padding:8px 0;font-size:12px;font-weight:600;line-height:18px;position:sticky;top:0}section+section{margin-top:6px}article{border-bottom:1px solid var(--line);padding:9px 0;position:relative}article:last-child{border-bottom:0}.feature-heading{cursor:pointer;justify-content:space-between;align-items:center;gap:12px;min-height:20px;display:flex}article>p{padding-right:28px;font-size:12px;line-height:18px}input[type=checkbox]{cursor:pointer;flex-shrink:0;width:15px;height:15px;margin:0}.feature-options{border-left:2px solid var(--line);margin-top:6px;padding:0 8px}.field{grid-template-columns:minmax(120px,1fr) minmax(0,2fr);align-items:start;gap:4px 10px;margin-top:5px;font-size:12px;display:grid}.field>span{overflow-wrap:anywhere;padding-top:5px}.field input[type=checkbox]{margin-top:7px}input:not([type=checkbox]),textarea,select{border:1px solid var(--line);background:var(--surface);width:100%;min-width:0;color:var(--text);border-radius:6px;margin:0;padding:2px 8px;font-size:12px;line-height:20px;box-shadow:inset 0 1px #1f23280a}textarea{resize:vertical;min-height:80px}.status{border-bottom:1px solid var(--line);flex:none;margin:0;padding:4px 12px;font-size:11px;line-height:18px}.actions{align-items:center;gap:4px;margin-left:auto;display:flex}.actions button{min-height:26px;padding:2px 8px;font-size:11px}.primary{background:var(--accent);color:#fff;border-color:#1f232826;min-width:92px}.primary:hover{background:var(--accent);filter:brightness(.94)}small{opacity:.6;color:var(--text);font-size:10px;line-height:16px}.toast{inset:max(16px, env(safe-area-inset-top)) 16px auto auto;color:#1e40af;z-index:2147483646;overflow-wrap:anywhere;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;align-items:center;gap:10px;width:max-content;max-width:min(380px,100vw - 32px);margin:0;padding:12px 14px;font:13px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,sans-serif;display:flex;position:fixed;box-shadow:0 8px 24px #1f232826}.toast[data-type=success]{color:#166534;background:#f0fdf4;border-color:#bbf7d0}.toast[data-type=error]{color:#991b1b;background:#fef2f2;border-color:#fecaca}.toast-icon{border:1.5px solid;border-radius:50%;flex:none;place-items:center;width:18px;height:18px;font-size:12px;font-weight:700;display:grid}.toast-message{flex:1;min-width:0}.toast-close{width:24px;min-height:24px;color:inherit;box-shadow:none;background:0 0;border:0;flex:none;padding:0;font-size:18px}.toast-close:hover{background:#818b9826}:host([data-dark]) .toast{color:#bfdbfe;background:#172554;border-color:#1e40af}:host([data-dark]) .toast[data-type=success]{color:#bbf7d0;background:#052e16;border-color:#166534}:host([data-dark]) .toast[data-type=error]{color:#fecaca;background:#450a0a;border-color:#991b1b}:host([data-dark]){--surface:#0d1117;--text:#f0f6fc;--muted:#9198a1;--line:#3d444d;--accent:#238636;--link:#4493f8;--soft:#151b23;--lightningcss-light: ;--lightningcss-dark:initial;color-scheme:dark}@media (width<=600px){dialog{width:100%;max-height:92dvh;padding-bottom:env(safe-area-inset-bottom);border-radius:8px 8px 0 0;margin:auto 0 0}header{flex-wrap:wrap;padding:8px}.search-bar{padding:8px 12px}.content{padding:0 12px 6px}.field{grid-template-columns:1fr;gap:4px}.actions{flex-wrap:wrap}.primary{margin:0}}@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important}}.settings-workspace{grid-template-columns:104px minmax(0,1fr);height:min(65dvh,560px);min-height:0;display:grid}.categories{border-right:1px solid var(--line);background:var(--soft);padding:8px;overflow:auto}.categories a{color:var(--text);border-radius:5px;margin-bottom:2px;padding:4px 8px;font-size:12px;text-decoration:none;display:block;position:relative}.categories a:hover{background:var(--line)}.categories a[aria-current]{color:var(--text);background:#818b981f;font-weight:600}.categories a[aria-current]:before{content:\"\";background:var(--link);border-radius:2px;width:3px;position:absolute;top:5px;bottom:5px;left:-5px}.settings-workspace .content{min-width:0;padding:0 12px 8px}.settings-workspace article{padding:7px 0}.status:empty{display:none}@media (width<=600px){.settings-workspace{grid-template-columns:72px minmax(0,1fr);height:58dvh}.categories{padding:6px 4px}.categories a{padding:7px 6px}}dialog{border-radius:6px;width:min(640px,100vw - 24px);box-shadow:0 12px 40px #0003}header{background:var(--surface);flex-wrap:nowrap;padding:8px 12px}.heading h2{font-size:15px}.search-bar{background:var(--surface);flex:0 220px;min-width:0;margin-left:auto;padding:0}.search-bar input{background:var(--soft);box-shadow:none;border-color:#0000;padding:5px 10px}.settings-workspace{grid-template-columns:76px minmax(0,1fr);height:min(56dvh,420px)}.categories{background:var(--soft);padding:8px 6px}.categories a{color:var(--muted);margin-bottom:3px;padding:6px 8px}.categories a[aria-current]{background:var(--surface);color:var(--link);box-shadow:0 1px 3px #0000000a}.categories a[aria-current]:before{display:none}.settings-workspace .content{padding:0 12px 8px}h3{border-bottom:0;padding:8px 0 3px;font-size:11px;font-weight:600}.settings-workspace article{border-bottom-color:color-mix(in srgb, var(--line) 55%, transparent);padding:7px 0}.feature-heading strong{font-size:12px;font-weight:500}.feature-heading input{width:14px;height:14px}.feature-options{background:var(--soft);border:0;border-radius:5px;margin-top:6px;padding:2px 10px 8px}.field{grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center;margin-top:8px}.field:has(input[type=checkbox]){grid-template-columns:1fr auto}.field>span{color:var(--muted);padding-top:0}.field input[type=checkbox]{margin:0}.settings-footer{border-top:1px solid var(--line);background:var(--surface);flex:none;padding:7px 12px}.settings-footer .actions{gap:6px;width:100%}.settings-footer button{box-shadow:none;border-radius:4px;padding:4px 9px}.settings-footer button:not(.primary){color:var(--muted);background:0 0;border-color:#0000}.settings-footer .settings-close{margin-left:auto}.settings-footer .primary{background:var(--text);color:var(--surface)}@media (width<=600px){dialog{border-radius:12px 12px 0 0;width:100%;max-height:92dvh}.settings-workspace{grid-template-rows:auto minmax(0,1fr);grid-template-columns:1fr;height:60dvh}.categories{border-right:0;border-bottom:1px solid var(--line);gap:4px;padding:6px 12px;display:flex;overflow-x:auto}.categories a{white-space:nowrap;flex:none;margin:0}.settings-footer{padding:8px 12px}.settings-footer .actions{flex-wrap:wrap;gap:2px}.settings-footer button{padding:5px 6px}}.launcher{justify-content:center;align-items:center;width:34px;height:34px;padding:0;display:inline-flex}header,.search-bar,.categories,.settings-footer,.settings-workspace article{border:0}.settings-workspace article{border-radius:5px}.settings-workspace article+article{margin-top:3px}.settings-workspace article:hover{background:color-mix(in srgb, var(--soft) 45%, transparent)}.settings-footer{background:var(--soft)}";
	var loading_default = "[aria-busy=true],.nspp-sweep-shine{-webkit-text-fill-color:currentColor;cursor:progress;background-image:linear-gradient(110deg,#0000 35%,#ffffff80 50%,#0000 65%);background-repeat:no-repeat;background-size:250% 100%;animation:1.8s linear infinite nspp-busy-feedback;opacity:1!important}@keyframes nspp-busy-feedback{0%{background-position:150% 0}to{background-position:-150% 0}}.nspp-user-badges[aria-busy=true]{-webkit-text-fill-color:transparent;background-image:linear-gradient(110deg,currentColor 35%,#ffffff80 50%,currentColor 65%);-webkit-background-clip:text;background-clip:text}.nspp-action[aria-busy=true]>svg{transform-origin:50%;animation:.7s ease-in-out infinite nspp-attendance-working}@keyframes nspp-attendance-working{0%,to{transform:translateY(0)rotate(-8deg)}50%{transform:translateY(-3px)rotate(8deg)}}@media (prefers-reduced-motion:reduce){[aria-busy=true],.nspp-sweep-shine,.nspp-action[aria-busy=true]>svg{background-image:none;animation:none}.nspp-user-badges[aria-busy=true]{-webkit-text-fill-color:currentColor;background-image:none}}";
	var element = (tag, text) => {
		const node = document.createElement(tag);
		if (text) node.textContent = text;
		return node;
	};
	function mountSettings(features) {
		const host = element("div");
		host.id = "nspp-settings";
		host.toggleAttribute("data-dark", document.body.classList.contains("dark-layout"));
		const shadow = host.attachShadow({ mode: "open" });
		const style = element("style", style_default$1 + loading_default);
		const launch = element("button");
		launch.type = "button";
		launch.append(toolIcon("settings"));
		launch.className = "launcher";
		launch.title = "打开 NodeSeek++ 设置";
		launch.setAttribute("aria-label", launch.title);
		const dialog = element("dialog");
		dialog.setAttribute("aria-labelledby", "nspp-title");
		const header = element("header");
		const heading = element("div");
		const title = element("h2", "NodeSeek++");
		title.id = "nspp-title";
		heading.className = "heading";
		heading.append(title, element("small", `v26.914.1107`));
		const close = element("button", "关闭");
		close.type = "button";
		close.className = "settings-close";
		header.append(heading);
		const search = element("input");
		search.type = "search";
		search.placeholder = "搜索功能…";
		search.setAttribute("aria-label", "搜索功能");
		const searchBar = element("div");
		searchBar.className = "search-bar";
		searchBar.append(search);
		header.append(searchBar);
		const content = element("div");
		content.className = "content";
		const navigation = element("nav");
		navigation.className = "categories";
		navigation.setAttribute("aria-label", "设置分类");
		const workspace = element("div");
		workspace.className = "settings-workspace";
		workspace.append(navigation, content);
		const form = element("form");
		const status = element("p");
		status.className = "status";
		status.setAttribute("role", "status");
		const actions = element("div");
		actions.className = "actions";
		const save = element("button", "保存并刷新");
		save.type = "submit";
		save.className = "primary";
		const reset = element("button", "恢复默认");
		const clearCache = element("button", "清空缓存");
		clearCache.title = "清除当前站点的插件用户资料、通知计数和回帖足迹缓存并刷新页面；保留配置、阅读历史和监控记录，未保存的设置不会保存。";
		const exportButton = element("button", "导出配置");
		const importButton = element("button", "导入配置");
		[
			reset,
			clearCache,
			exportButton,
			importButton
		].forEach((button) => button.type = "button");
		const file = element("input");
		file.type = "file";
		file.accept = ".json,application/json";
		file.hidden = true;
		actions.append(exportButton, importButton, clearCache, reset, close, save, file);
		const footer = element("footer");
		footer.className = "settings-footer";
		footer.append(actions);
		form.append(header, status, workspace, footer);
		dialog.append(form);
		const toast = element("div");
		toast.className = "toast";
		toast.hidden = true;
		toast.setAttribute("role", "status");
		toast.setAttribute("aria-live", "polite");
		toast.setAttribute("aria-atomic", "true");
		toast.setAttribute("popover", "manual");
		const toastIcon = element("span");
		toastIcon.className = "toast-icon";
		toastIcon.setAttribute("aria-hidden", "true");
		const toastMessage = element("span");
		toastMessage.className = "toast-message";
		const toastClose = element("button", "×");
		toastClose.type = "button";
		toastClose.className = "toast-close";
		toastClose.setAttribute("aria-label", "关闭提示");
		toast.append(toastIcon, toastMessage, toastClose);
		shadow.append(style, launch, dialog, toast);
		document.body.append(host);
		let draft = loadSettings(features);
		let toastTimer;
		const dismissToast = () => {
			clearTimeout(toastTimer);
			toast.hidePopover?.();
			toast.hidden = true;
		};
		toastClose.addEventListener("click", dismissToast);
		const notify = (message, type = "info") => {
			host.toggleAttribute("data-dark", document.body.classList.contains("dark-layout"));
			toast.dataset.type = type;
			toastIcon.textContent = {
				info: "i",
				success: "✓",
				error: "!"
			}[type];
			toastMessage.textContent = message;
			toast.hidden = false;
			toast.hidePopover?.();
			toast.showPopover?.();
			clearTimeout(toastTimer);
			toastTimer = setTimeout(dismissToast, 6e3);
		};
		let sections = [];
		let links = [];
		function activate(index) {
			links.forEach((link, i) => {
				if (i === index) link.setAttribute("aria-current", "location");
				else link.removeAttribute("aria-current");
			});
		}
		function syncCategory() {
			if (!sections.length) return;
			const top = content.getBoundingClientRect().top;
			let current = 0;
			sections.forEach((section, index) => {
				if (section.getBoundingClientRect().top <= top + 24) current = index;
			});
			if (content.scrollTop > 0 && content.scrollTop + content.clientHeight >= content.scrollHeight - 2) current = sections.length - 1;
			activate(current);
		}
		content.addEventListener("scroll", syncCategory, { passive: true });
		function render() {
			content.replaceChildren();
			navigation.replaceChildren();
			sections = [];
			links = [];
			const query = search.value.toLocaleLowerCase().trim();
			const groups = new Map();
			const categories = {
				阅读: "浏览",
				外观: "界面",
				导航: "界面",
				过滤: "用户",
				用户: "用户",
				操作辅助: "工具",
				监控: "工具",
				编辑: "工具"
			};
			for (const feature of features) {
				const category = categories[feature.group] || feature.group;
				if (query && !`${feature.title} ${feature.description} ${feature.group} ${category} ${Object.values(feature.fields || {}).map((field) => field.label).join(" ")}`.toLocaleLowerCase().includes(query)) continue;
				let group = groups.get(category);
				if (!group) {
					group = element("section");
					const index = sections.length;
					group.id = `nspp-category-${index}`;
					const link = element("a", category);
					link.href = `#${group.id}`;
					link.addEventListener("click", (event) => {
						event.preventDefault();
						const section = sections[index];
						content.scrollTo({
							top: content.scrollTop + section.getBoundingClientRect().top - content.getBoundingClientRect().top,
							behavior: "instant"
						});
						activate(index);
					});
					sections.push(group);
					links.push(link);
					navigation.append(link);
					group.append(element("h3", category));
					groups.set(category, group);
					content.append(group);
				}
				const row = element("article");
				const label = element("label");
				label.className = "feature-heading";
				const toggle = element("input");
				toggle.type = "checkbox";
				toggle.checked = draft[feature.id].enabled === true;
				toggle.addEventListener("change", () => {
					draft[feature.id].enabled = toggle.checked;
				});
				label.append(element("strong", feature.title), toggle);
				row.append(label);
				if (feature.id === "request-settings") row.append(element("p", feature.description));
				if ([
					"ai-polish",
					"official-blocklist",
					"infinite-scroll"
				].includes(feature.id)) row.append(element("p", {
					"ai-polish": "手动发送编辑器文本，预览后采用。",
					"official-blocklist": "添加或解除会修改站点黑名单。",
					"infinite-scroll": "新增评论的回复、评分需打开原页。"
				}[feature.id]));
				const options = Object.keys(feature.defaults).filter((key) => key !== "enabled");
				if (options.length) {
					const details = element("div");
					details.className = "feature-options";
					for (const key of options) {
						const metadata = feature.fields?.[key];
						const value = draft[feature.id][key];
						const field = element("label");
						field.className = "field";
						field.append(element("span", metadata?.label || key));
						let control;
						if (metadata?.type === "select") {
							control = element("select");
							for (const option of metadata.options || []) {
								const item = element("option", option.label);
								item.value = option.value;
								control.append(item);
							}
						} else if (metadata?.type === "textarea") {
							control = element("textarea");
							control.rows = 4;
						} else {
							control = element("input");
							control.type = metadata?.type === "color" ? "color" : typeof value === "boolean" ? "checkbox" : typeof value === "number" ? "number" : /^(api[-_]?key|token|password|secret|access[-_]?token)$/i.test(key) ? "password" : "text";
						}
						if (typeof value === "boolean" && control instanceof HTMLInputElement) control.checked = value;
						else if (feature.id === "request-settings" && control instanceof HTMLInputElement) {
							control.min = key === "maxConcurrent" ? "1" : "0";
							control.max = key === "maxConcurrent" ? "10" : "5000";
							control.step = "1";
							control.value = String(value);
						} else control.value = String(value);
						control.addEventListener("input", () => {
							draft[feature.id][key] = typeof value === "boolean" ? control.checked : typeof value === "number" ? Number(control.value) : control.value;
						});
						field.append(control);
						details.append(field);
					}
					row.append(details);
				}
				group.append(row);
			}
			if (!groups.size) content.append(element("p", "没有匹配的功能"));
			content.scrollTop = 0;
			activate(0);
		}
		const open = () => {
			host.toggleAttribute("data-dark", document.body.classList.contains("dark-layout"));
			draft = loadSettings(features);
			status.textContent = hasStorage() ? "" : "油猴存储未就绪，请重新安装脚本后刷新。";
			save.disabled = !hasStorage();
			clearCache.disabled = !hasStorage();
			render();
			if (!dialog.open) dialog.showModal();
			close.focus();
		};
		launch.addEventListener("click", open);
		close.addEventListener("click", () => dialog.close());
		dialog.addEventListener("click", (event) => {
			if (event.target === dialog) {
				const box = dialog.getBoundingClientRect();
				if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
			}
		});
		dialog.addEventListener("close", () => launch.focus());
		search.addEventListener("input", render);
		form.addEventListener("submit", (event) => {
			event.preventDefault();
			save.disabled = true;
			save.setAttribute("aria-busy", "true");
			save.textContent = "正在保存…";
			try {
				saveSettings(features, draft);
				location.reload();
			} catch {
				save.disabled = false;
				save.removeAttribute("aria-busy");
				save.textContent = "保存并刷新";
				notify("保存失败，请检查油猴存储权限后重试。", "error");
			}
		});
		reset.addEventListener("click", () => {
			draft = normalizeSettings(features, {});
			render();
			notify("已恢复默认，保存后生效。", "success");
		});
		clearCache.addEventListener("click", () => {
			clearCache.disabled = true;
			clearCache.setAttribute("aria-busy", "true");
			clearCache.textContent = "正在清空…";
			try {
				clearCaches();
				location.reload();
			} catch {
				clearCache.disabled = false;
				clearCache.removeAttribute("aria-busy");
				clearCache.textContent = "清空缓存";
				notify("清空缓存失败，请检查油猴存储权限后重试。", "error");
			}
		});
		exportButton.addEventListener("click", () => {
			const blob = new Blob([exportSettings(draft)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const link = element("a");
			link.href = url;
			link.download = "nodeseek-plus-plus-settings.json";
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1e3);
			notify("已导出配置（不含密钥和历史）。", "success");
		});
		importButton.addEventListener("click", () => file.click());
		file.addEventListener("change", async () => {
			const selected = file.files?.[0];
			if (!selected) return;
			importButton.disabled = true;
			importButton.setAttribute("aria-busy", "true");
			importButton.textContent = "正在导入…";
			try {
				if (selected.size > 1e6) throw new Error("配置文件不能超过 1 MB");
				draft = parseSettings(features, await selected.text());
				render();
				notify("已导入，保存后生效。", "success");
			} catch (error) {
				notify(error instanceof Error ? error.message : "导入失败", "error");
			} finally {
				file.value = "";
				importButton.disabled = false;
				importButton.removeAttribute("aria-busy");
				importButton.textContent = "导入配置";
			}
		});
		return {
			open,
			notify
		};
	}
	function copyButton(ctx, value, label = "复制", iconOnly = false) {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "nspp-copy-button";
		let timer;
		const show = (copied) => {
			const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			icon.setAttribute("viewBox", "0 0 24 24");
			icon.setAttribute("width", "14");
			icon.setAttribute("height", "14");
			icon.setAttribute("fill", "none");
			icon.setAttribute("stroke", "currentColor");
			icon.setAttribute("stroke-width", "1.8");
			icon.setAttribute("stroke-linecap", "round");
			icon.setAttribute("stroke-linejoin", "round");
			icon.setAttribute("aria-hidden", "true");
			const path = document.createElementNS(icon.namespaceURI, "path");
			path.setAttribute("d", copied ? "M5 12l4 4L19 6" : "M9 9h12v12H9zM15 9V3H3v12h6");
			icon.append(path);
			button.replaceChildren(icon);
			if (!iconOnly) button.append(document.createTextNode(copied ? "已复制" : label));
			button.dataset.copied = String(copied);
			button.setAttribute("aria-label", copied ? "已复制" : label);
		};
		show(false);
		ctx.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
		button.title = label;
		button.setAttribute("aria-label", label);
		button.addEventListener("click", async () => {
			if (button.disabled) return;
			button.disabled = true;
			button.setAttribute("aria-busy", "true");
			try {
				await navigator.clipboard.writeText(value());
				if (!ctx.signal.aborted) {
					clearTimeout(timer);
					show(true);
					ctx.notify("复制成功");
					timer = setTimeout(() => show(false), 1600);
				}
			} catch {
				if (!ctx.signal.aborted) ctx.notify("复制失败，请手动选择文本复制");
			} finally {
				button.disabled = false;
				button.removeAttribute("aria-busy");
			}
		}, { signal: ctx.signal });
		return button;
	}
	var daysInYear = 365.2425;
	-(Math.pow(10, 8) * 24 * 60 * 60 * 1e3);
	var millisecondsInWeek = 6048e5;
	var millisecondsInDay = 864e5;
	var millisecondsInMinute = 6e4;
	var millisecondsInHour = 36e5;
	var minutesInYear = 525600;
	var minutesInMonth = 43200;
	var minutesInDay = 1440;
	var secondsInDay = 86400;
	secondsInDay * 7;
	secondsInDay * daysInYear / 12 * 3;
	var constructFromSymbol = Symbol.for("constructDateFrom");
	function constructFrom(date, value) {
		if (typeof date === "function") return date(value);
		if (date && typeof date === "object" && constructFromSymbol in date) return date[constructFromSymbol](value);
		if (date instanceof Date) return new date.constructor(value);
		return new Date(value);
	}
	function toDate(argument, context) {
		return constructFrom(context || argument, argument);
	}
	var defaultOptions = {};
	function getDefaultOptions() {
		return defaultOptions;
	}
	function startOfWeek(date, options) {
		const defaultOptions = getDefaultOptions();
		const weekStartsOn = options?.weekStartsOn ?? options?.locale?.options?.weekStartsOn ?? defaultOptions.weekStartsOn ?? defaultOptions.locale?.options?.weekStartsOn ?? 0;
		const _date = toDate(date, options?.in);
		const day = _date.getDay();
		const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
		_date.setDate(_date.getDate() - diff);
		_date.setHours(0, 0, 0, 0);
		return _date;
	}
	function startOfISOWeek(date, options) {
		return startOfWeek(date, {
			...options,
			weekStartsOn: 1
		});
	}
	function getISOWeekYear(date, options) {
		const _date = toDate(date, options?.in);
		const year = _date.getFullYear();
		const fourthOfJanuaryOfNextYear = constructFrom(_date, 0);
		fourthOfJanuaryOfNextYear.setFullYear(year + 1, 0, 4);
		fourthOfJanuaryOfNextYear.setHours(0, 0, 0, 0);
		const startOfNextYear = startOfISOWeek(fourthOfJanuaryOfNextYear);
		const fourthOfJanuaryOfThisYear = constructFrom(_date, 0);
		fourthOfJanuaryOfThisYear.setFullYear(year, 0, 4);
		fourthOfJanuaryOfThisYear.setHours(0, 0, 0, 0);
		const startOfThisYear = startOfISOWeek(fourthOfJanuaryOfThisYear);
		if (_date.getTime() >= startOfNextYear.getTime()) return year + 1;
		else if (_date.getTime() >= startOfThisYear.getTime()) return year;
		else return year - 1;
	}
	function getTimezoneOffsetInMilliseconds(date) {
		const _date = toDate(date);
		const utcDate = new Date(Date.UTC(_date.getFullYear(), _date.getMonth(), _date.getDate(), _date.getHours(), _date.getMinutes(), _date.getSeconds(), _date.getMilliseconds()));
		utcDate.setUTCFullYear(_date.getFullYear());
		return +date - +utcDate;
	}
	function normalizeDates(context, ...dates) {
		const normalize = constructFrom.bind(null, context || dates.find((date) => typeof date === "object"));
		return dates.map(normalize);
	}
	function startOfDay(date, options) {
		const _date = toDate(date, options?.in);
		_date.setHours(0, 0, 0, 0);
		return _date;
	}
	function differenceInCalendarDays(laterDate, earlierDate, options) {
		const [laterDate_, earlierDate_] = normalizeDates(options?.in, laterDate, earlierDate);
		const laterStartOfDay = startOfDay(laterDate_);
		const earlierStartOfDay = startOfDay(earlierDate_);
		const laterTimestamp = +laterStartOfDay - getTimezoneOffsetInMilliseconds(laterStartOfDay);
		const earlierTimestamp = +earlierStartOfDay - getTimezoneOffsetInMilliseconds(earlierStartOfDay);
		return Math.round((laterTimestamp - earlierTimestamp) / millisecondsInDay);
	}
	function startOfISOWeekYear(date, options) {
		const year = getISOWeekYear(date, options);
		const fourthOfJanuary = constructFrom(options?.in || date, 0);
		fourthOfJanuary.setFullYear(year, 0, 4);
		fourthOfJanuary.setHours(0, 0, 0, 0);
		return startOfISOWeek(fourthOfJanuary);
	}
	function compareAsc(dateLeft, dateRight) {
		const diff = +toDate(dateLeft) - +toDate(dateRight);
		if (diff < 0) return -1;
		else if (diff > 0) return 1;
		return diff;
	}
	function isDate(value) {
		return value instanceof Date || typeof value === "object" && Object.prototype.toString.call(value) === "[object Date]";
	}
	function isValid(date) {
		return !(!isDate(date) && typeof date !== "number" || isNaN(+toDate(date)));
	}
	function getRoundingMethod(method) {
		return (number) => {
			const result = (method ? Math[method] : Math.trunc)(number);
			return result === 0 ? 0 : result;
		};
	}
	function differenceInMilliseconds(laterDate, earlierDate) {
		return +toDate(laterDate) - +toDate(earlierDate);
	}
	function startOfYear(date, options) {
		const date_ = toDate(date, options?.in);
		date_.setFullYear(date_.getFullYear(), 0, 1);
		date_.setHours(0, 0, 0, 0);
		return date_;
	}
	var formatDistanceLocale$1 = {
		lessThanXSeconds: {
			one: "less than a second",
			other: "less than {{count}} seconds"
		},
		xSeconds: {
			one: "1 second",
			other: "{{count}} seconds"
		},
		halfAMinute: "half a minute",
		lessThanXMinutes: {
			one: "less than a minute",
			other: "less than {{count}} minutes"
		},
		xMinutes: {
			one: "1 minute",
			other: "{{count}} minutes"
		},
		aboutXHours: {
			one: "about 1 hour",
			other: "about {{count}} hours"
		},
		xHours: {
			one: "1 hour",
			other: "{{count}} hours"
		},
		xDays: {
			one: "1 day",
			other: "{{count}} days"
		},
		aboutXWeeks: {
			one: "about 1 week",
			other: "about {{count}} weeks"
		},
		xWeeks: {
			one: "1 week",
			other: "{{count}} weeks"
		},
		aboutXMonths: {
			one: "about 1 month",
			other: "about {{count}} months"
		},
		xMonths: {
			one: "1 month",
			other: "{{count}} months"
		},
		aboutXYears: {
			one: "about 1 year",
			other: "about {{count}} years"
		},
		xYears: {
			one: "1 year",
			other: "{{count}} years"
		},
		overXYears: {
			one: "over 1 year",
			other: "over {{count}} years"
		},
		almostXYears: {
			one: "almost 1 year",
			other: "almost {{count}} years"
		}
	};
	var formatDistance$1 = (token, count, options) => {
		let result;
		const tokenValue = formatDistanceLocale$1[token];
		if (typeof tokenValue === "string") result = tokenValue;
		else if (count === 1) result = tokenValue.one;
		else result = tokenValue.other.replace("{{count}}", count.toString());
		if (options?.addSuffix) {
			if (options.comparison && options.comparison > 0) return "in " + result;
			else return result + " ago";
		}
		return result;
	};
	function buildFormatLongFn(args) {
		return (options = {}) => {
			const width = options.width ? String(options.width) : args.defaultWidth;
			return args.formats[width] || args.formats[args.defaultWidth];
		};
	}
	var formatLong$1 = {
		date: buildFormatLongFn({
			formats: {
				full: "EEEE, MMMM do, y",
				long: "MMMM do, y",
				medium: "MMM d, y",
				short: "MM/dd/yyyy"
			},
			defaultWidth: "full"
		}),
		time: buildFormatLongFn({
			formats: {
				full: "h:mm:ss a zzzz",
				long: "h:mm:ss a z",
				medium: "h:mm:ss a",
				short: "h:mm a"
			},
			defaultWidth: "full"
		}),
		dateTime: buildFormatLongFn({
			formats: {
				full: "{{date}} 'at' {{time}}",
				long: "{{date}} 'at' {{time}}",
				medium: "{{date}}, {{time}}",
				short: "{{date}}, {{time}}"
			},
			defaultWidth: "full"
		})
	};
	var formatRelativeLocale$1 = {
		lastWeek: "'last' eeee 'at' p",
		yesterday: "'yesterday at' p",
		today: "'today at' p",
		tomorrow: "'tomorrow at' p",
		nextWeek: "eeee 'at' p",
		other: "P"
	};
	var formatRelative$1 = (token, _date, _baseDate, _options) => formatRelativeLocale$1[token];
	function buildLocalizeFn(args) {
		return (value, options) => {
			const context = options?.context ? String(options.context) : "standalone";
			let valuesArray;
			if (context === "formatting" && args.formattingValues) {
				const defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
				const width = options?.width ? String(options.width) : defaultWidth;
				valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
			} else {
				const defaultWidth = args.defaultWidth;
				const width = options?.width ? String(options.width) : args.defaultWidth;
				valuesArray = args.values[width] || args.values[defaultWidth];
			}
			const index = args.argumentCallback ? args.argumentCallback(value) : value;
			return valuesArray[index];
		};
	}
	var eraValues$1 = {
		narrow: ["B", "A"],
		abbreviated: ["BC", "AD"],
		wide: ["Before Christ", "Anno Domini"]
	};
	var quarterValues$1 = {
		narrow: [
			"1",
			"2",
			"3",
			"4"
		],
		abbreviated: [
			"Q1",
			"Q2",
			"Q3",
			"Q4"
		],
		wide: [
			"1st quarter",
			"2nd quarter",
			"3rd quarter",
			"4th quarter"
		]
	};
	var monthValues$1 = {
		narrow: [
			"J",
			"F",
			"M",
			"A",
			"M",
			"J",
			"J",
			"A",
			"S",
			"O",
			"N",
			"D"
		],
		abbreviated: [
			"Jan",
			"Feb",
			"Mar",
			"Apr",
			"May",
			"Jun",
			"Jul",
			"Aug",
			"Sep",
			"Oct",
			"Nov",
			"Dec"
		],
		wide: [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December"
		]
	};
	var dayValues$1 = {
		narrow: [
			"S",
			"M",
			"T",
			"W",
			"T",
			"F",
			"S"
		],
		short: [
			"Su",
			"Mo",
			"Tu",
			"We",
			"Th",
			"Fr",
			"Sa"
		],
		abbreviated: [
			"Sun",
			"Mon",
			"Tue",
			"Wed",
			"Thu",
			"Fri",
			"Sat"
		],
		wide: [
			"Sunday",
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday"
		]
	};
	var dayPeriodValues$1 = {
		narrow: {
			am: "a",
			pm: "p",
			midnight: "mi",
			noon: "n",
			morning: "morning",
			afternoon: "afternoon",
			evening: "evening",
			night: "night"
		},
		abbreviated: {
			am: "AM",
			pm: "PM",
			midnight: "midnight",
			noon: "noon",
			morning: "morning",
			afternoon: "afternoon",
			evening: "evening",
			night: "night"
		},
		wide: {
			am: "a.m.",
			pm: "p.m.",
			midnight: "midnight",
			noon: "noon",
			morning: "morning",
			afternoon: "afternoon",
			evening: "evening",
			night: "night"
		}
	};
	var formattingDayPeriodValues$1 = {
		narrow: {
			am: "a",
			pm: "p",
			midnight: "mi",
			noon: "n",
			morning: "in the morning",
			afternoon: "in the afternoon",
			evening: "in the evening",
			night: "at night"
		},
		abbreviated: {
			am: "AM",
			pm: "PM",
			midnight: "midnight",
			noon: "noon",
			morning: "in the morning",
			afternoon: "in the afternoon",
			evening: "in the evening",
			night: "at night"
		},
		wide: {
			am: "a.m.",
			pm: "p.m.",
			midnight: "midnight",
			noon: "noon",
			morning: "in the morning",
			afternoon: "in the afternoon",
			evening: "in the evening",
			night: "at night"
		}
	};
	var ordinalNumber$1 = (dirtyNumber, _options) => {
		const number = Number(dirtyNumber);
		const rem100 = number % 100;
		if (rem100 > 20 || rem100 < 10) switch (rem100 % 10) {
			case 1: return number + "st";
			case 2: return number + "nd";
			case 3: return number + "rd";
		}
		return number + "th";
	};
	var localize$1 = {
		ordinalNumber: ordinalNumber$1,
		era: buildLocalizeFn({
			values: eraValues$1,
			defaultWidth: "wide"
		}),
		quarter: buildLocalizeFn({
			values: quarterValues$1,
			defaultWidth: "wide",
			argumentCallback: (quarter) => quarter - 1
		}),
		month: buildLocalizeFn({
			values: monthValues$1,
			defaultWidth: "wide"
		}),
		day: buildLocalizeFn({
			values: dayValues$1,
			defaultWidth: "wide"
		}),
		dayPeriod: buildLocalizeFn({
			values: dayPeriodValues$1,
			defaultWidth: "wide",
			formattingValues: formattingDayPeriodValues$1,
			defaultFormattingWidth: "wide"
		})
	};
	function buildMatchFn(args) {
		return (string, options = {}) => {
			const width = options.width;
			const matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
			const matchResult = string.match(matchPattern);
			if (!matchResult) return null;
			const matchedString = matchResult[0];
			const parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
			const key = Array.isArray(parsePatterns) ? findIndex(parsePatterns, (pattern) => pattern.test(matchedString)) : findKey(parsePatterns, (pattern) => pattern.test(matchedString));
			let value;
			value = args.valueCallback ? args.valueCallback(key) : key;
			value = options.valueCallback ? options.valueCallback(value) : value;
			const rest = string.slice(matchedString.length);
			return {
				value,
				rest
			};
		};
	}
	function findKey(object, predicate) {
		for (const key in object) if (Object.prototype.hasOwnProperty.call(object, key) && predicate(object[key])) return key;
	}
	function findIndex(array, predicate) {
		for (let key = 0; key < array.length; key++) if (predicate(array[key])) return key;
	}
	function buildMatchPatternFn(args) {
		return (string, options = {}) => {
			const matchResult = string.match(args.matchPattern);
			if (!matchResult) return null;
			const matchedString = matchResult[0];
			const parseResult = string.match(args.parsePattern);
			if (!parseResult) return null;
			let value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
			value = options.valueCallback ? options.valueCallback(value) : value;
			const rest = string.slice(matchedString.length);
			return {
				value,
				rest
			};
		};
	}
	var enUS = {
		code: "en-US",
		formatDistance: formatDistance$1,
		formatLong: formatLong$1,
		formatRelative: formatRelative$1,
		localize: localize$1,
		match: {
			ordinalNumber: buildMatchPatternFn({
				matchPattern: /^(\d+)(th|st|nd|rd)?/i,
				parsePattern: /\d+/i,
				valueCallback: (value) => parseInt(value, 10)
			}),
			era: buildMatchFn({
				matchPatterns: {
					narrow: /^(b|a)/i,
					abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
					wide: /^(before christ|before common era|anno domini|common era)/i
				},
				defaultMatchWidth: "wide",
				parsePatterns: { any: [/^b/i, /^(a|c)/i] },
				defaultParseWidth: "any"
			}),
			quarter: buildMatchFn({
				matchPatterns: {
					narrow: /^[1234]/i,
					abbreviated: /^q[1234]/i,
					wide: /^[1234](th|st|nd|rd)? quarter/i
				},
				defaultMatchWidth: "wide",
				parsePatterns: { any: [
					/1/i,
					/2/i,
					/3/i,
					/4/i
				] },
				defaultParseWidth: "any",
				valueCallback: (index) => index + 1
			}),
			month: buildMatchFn({
				matchPatterns: {
					narrow: /^[jfmasond]/i,
					abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
					wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
				},
				defaultMatchWidth: "wide",
				parsePatterns: {
					narrow: [
						/^j/i,
						/^f/i,
						/^m/i,
						/^a/i,
						/^m/i,
						/^j/i,
						/^j/i,
						/^a/i,
						/^s/i,
						/^o/i,
						/^n/i,
						/^d/i
					],
					any: [
						/^ja/i,
						/^f/i,
						/^mar/i,
						/^ap/i,
						/^may/i,
						/^jun/i,
						/^jul/i,
						/^au/i,
						/^s/i,
						/^o/i,
						/^n/i,
						/^d/i
					]
				},
				defaultParseWidth: "any"
			}),
			day: buildMatchFn({
				matchPatterns: {
					narrow: /^[smtwf]/i,
					short: /^(su|mo|tu|we|th|fr|sa)/i,
					abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
					wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
				},
				defaultMatchWidth: "wide",
				parsePatterns: {
					narrow: [
						/^s/i,
						/^m/i,
						/^t/i,
						/^w/i,
						/^t/i,
						/^f/i,
						/^s/i
					],
					any: [
						/^su/i,
						/^m/i,
						/^tu/i,
						/^w/i,
						/^th/i,
						/^f/i,
						/^sa/i
					]
				},
				defaultParseWidth: "any"
			}),
			dayPeriod: buildMatchFn({
				matchPatterns: {
					narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
					any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
				},
				defaultMatchWidth: "any",
				parsePatterns: { any: {
					am: /^a/i,
					pm: /^p/i,
					midnight: /^mi/i,
					noon: /^no/i,
					morning: /morning/i,
					afternoon: /afternoon/i,
					evening: /evening/i,
					night: /night/i
				} },
				defaultParseWidth: "any"
			})
		},
		options: {
			weekStartsOn: 0,
			firstWeekContainsDate: 1
		}
	};
	function getDayOfYear(date, options) {
		const _date = toDate(date, options?.in);
		return differenceInCalendarDays(_date, startOfYear(_date)) + 1;
	}
	function getISOWeek(date, options) {
		const _date = toDate(date, options?.in);
		const diff = +startOfISOWeek(_date) - +startOfISOWeekYear(_date);
		return Math.round(diff / millisecondsInWeek) + 1;
	}
	function getWeekYear(date, options) {
		const _date = toDate(date, options?.in);
		const year = _date.getFullYear();
		const defaultOptions = getDefaultOptions();
		const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions.firstWeekContainsDate ?? defaultOptions.locale?.options?.firstWeekContainsDate ?? 1;
		const firstWeekOfNextYear = constructFrom(options?.in || date, 0);
		firstWeekOfNextYear.setFullYear(year + 1, 0, firstWeekContainsDate);
		firstWeekOfNextYear.setHours(0, 0, 0, 0);
		const startOfNextYear = startOfWeek(firstWeekOfNextYear, options);
		const firstWeekOfThisYear = constructFrom(options?.in || date, 0);
		firstWeekOfThisYear.setFullYear(year, 0, firstWeekContainsDate);
		firstWeekOfThisYear.setHours(0, 0, 0, 0);
		const startOfThisYear = startOfWeek(firstWeekOfThisYear, options);
		if (+_date >= +startOfNextYear) return year + 1;
		else if (+_date >= +startOfThisYear) return year;
		else return year - 1;
	}
	function startOfWeekYear(date, options) {
		const defaultOptions = getDefaultOptions();
		const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions.firstWeekContainsDate ?? defaultOptions.locale?.options?.firstWeekContainsDate ?? 1;
		const year = getWeekYear(date, options);
		const firstWeek = constructFrom(options?.in || date, 0);
		firstWeek.setFullYear(year, 0, firstWeekContainsDate);
		firstWeek.setHours(0, 0, 0, 0);
		return startOfWeek(firstWeek, options);
	}
	function getWeek(date, options) {
		const _date = toDate(date, options?.in);
		const diff = +startOfWeek(_date, options) - +startOfWeekYear(_date, options);
		return Math.round(diff / millisecondsInWeek) + 1;
	}
	function addLeadingZeros(number, targetLength) {
		return (number < 0 ? "-" : "") + Math.abs(number).toString().padStart(targetLength, "0");
	}
	var lightFormatters = {
		y(date, token) {
			const signedYear = date.getFullYear();
			const year = signedYear > 0 ? signedYear : 1 - signedYear;
			return addLeadingZeros(token === "yy" ? year % 100 : year, token.length);
		},
		M(date, token) {
			const month = date.getMonth();
			return token === "M" ? String(month + 1) : addLeadingZeros(month + 1, 2);
		},
		d(date, token) {
			return addLeadingZeros(date.getDate(), token.length);
		},
		a(date, token) {
			const dayPeriodEnumValue = date.getHours() / 12 >= 1 ? "pm" : "am";
			switch (token) {
				case "a":
				case "aa": return dayPeriodEnumValue.toUpperCase();
				case "aaa": return dayPeriodEnumValue;
				case "aaaaa": return dayPeriodEnumValue[0];
				default: return dayPeriodEnumValue === "am" ? "a.m." : "p.m.";
			}
		},
		h(date, token) {
			return addLeadingZeros(date.getHours() % 12 || 12, token.length);
		},
		H(date, token) {
			return addLeadingZeros(date.getHours(), token.length);
		},
		m(date, token) {
			return addLeadingZeros(date.getMinutes(), token.length);
		},
		s(date, token) {
			return addLeadingZeros(date.getSeconds(), token.length);
		},
		S(date, token) {
			const numberOfDigits = token.length;
			const milliseconds = date.getMilliseconds();
			return addLeadingZeros(Math.trunc(milliseconds * Math.pow(10, numberOfDigits - 3)), token.length);
		}
	};
	var dayPeriodEnum = {
		am: "am",
		pm: "pm",
		midnight: "midnight",
		noon: "noon",
		morning: "morning",
		afternoon: "afternoon",
		evening: "evening",
		night: "night"
	};
	var formatters = {
		G: function(date, token, localize) {
			const era = date.getFullYear() > 0 ? 1 : 0;
			switch (token) {
				case "G":
				case "GG":
				case "GGG": return localize.era(era, { width: "abbreviated" });
				case "GGGGG": return localize.era(era, { width: "narrow" });
				default: return localize.era(era, { width: "wide" });
			}
		},
		y: function(date, token, localize) {
			if (token === "yo") {
				const signedYear = date.getFullYear();
				const year = signedYear > 0 ? signedYear : 1 - signedYear;
				return localize.ordinalNumber(year, { unit: "year" });
			}
			return lightFormatters.y(date, token);
		},
		Y: function(date, token, localize, options) {
			const signedWeekYear = getWeekYear(date, options);
			const weekYear = signedWeekYear > 0 ? signedWeekYear : 1 - signedWeekYear;
			if (token === "YY") return addLeadingZeros(weekYear % 100, 2);
			if (token === "Yo") return localize.ordinalNumber(weekYear, { unit: "year" });
			return addLeadingZeros(weekYear, token.length);
		},
		R: function(date, token) {
			return addLeadingZeros(getISOWeekYear(date), token.length);
		},
		u: function(date, token) {
			return addLeadingZeros(date.getFullYear(), token.length);
		},
		Q: function(date, token, localize) {
			const quarter = Math.ceil((date.getMonth() + 1) / 3);
			switch (token) {
				case "Q": return String(quarter);
				case "QQ": return addLeadingZeros(quarter, 2);
				case "Qo": return localize.ordinalNumber(quarter, { unit: "quarter" });
				case "QQQ": return localize.quarter(quarter, {
					width: "abbreviated",
					context: "formatting"
				});
				case "QQQQQ": return localize.quarter(quarter, {
					width: "narrow",
					context: "formatting"
				});
				default: return localize.quarter(quarter, {
					width: "wide",
					context: "formatting"
				});
			}
		},
		q: function(date, token, localize) {
			const quarter = Math.ceil((date.getMonth() + 1) / 3);
			switch (token) {
				case "q": return String(quarter);
				case "qq": return addLeadingZeros(quarter, 2);
				case "qo": return localize.ordinalNumber(quarter, { unit: "quarter" });
				case "qqq": return localize.quarter(quarter, {
					width: "abbreviated",
					context: "standalone"
				});
				case "qqqqq": return localize.quarter(quarter, {
					width: "narrow",
					context: "standalone"
				});
				default: return localize.quarter(quarter, {
					width: "wide",
					context: "standalone"
				});
			}
		},
		M: function(date, token, localize) {
			const month = date.getMonth();
			switch (token) {
				case "M":
				case "MM": return lightFormatters.M(date, token);
				case "Mo": return localize.ordinalNumber(month + 1, { unit: "month" });
				case "MMM": return localize.month(month, {
					width: "abbreviated",
					context: "formatting"
				});
				case "MMMMM": return localize.month(month, {
					width: "narrow",
					context: "formatting"
				});
				default: return localize.month(month, {
					width: "wide",
					context: "formatting"
				});
			}
		},
		L: function(date, token, localize) {
			const month = date.getMonth();
			switch (token) {
				case "L": return String(month + 1);
				case "LL": return addLeadingZeros(month + 1, 2);
				case "Lo": return localize.ordinalNumber(month + 1, { unit: "month" });
				case "LLL": return localize.month(month, {
					width: "abbreviated",
					context: "standalone"
				});
				case "LLLLL": return localize.month(month, {
					width: "narrow",
					context: "standalone"
				});
				default: return localize.month(month, {
					width: "wide",
					context: "standalone"
				});
			}
		},
		w: function(date, token, localize, options) {
			const week = getWeek(date, options);
			if (token === "wo") return localize.ordinalNumber(week, { unit: "week" });
			return addLeadingZeros(week, token.length);
		},
		I: function(date, token, localize) {
			const isoWeek = getISOWeek(date);
			if (token === "Io") return localize.ordinalNumber(isoWeek, { unit: "week" });
			return addLeadingZeros(isoWeek, token.length);
		},
		d: function(date, token, localize) {
			if (token === "do") return localize.ordinalNumber(date.getDate(), { unit: "date" });
			return lightFormatters.d(date, token);
		},
		D: function(date, token, localize) {
			const dayOfYear = getDayOfYear(date);
			if (token === "Do") return localize.ordinalNumber(dayOfYear, { unit: "dayOfYear" });
			return addLeadingZeros(dayOfYear, token.length);
		},
		E: function(date, token, localize) {
			const dayOfWeek = date.getDay();
			switch (token) {
				case "E":
				case "EE":
				case "EEE": return localize.day(dayOfWeek, {
					width: "abbreviated",
					context: "formatting"
				});
				case "EEEEE": return localize.day(dayOfWeek, {
					width: "narrow",
					context: "formatting"
				});
				case "EEEEEE": return localize.day(dayOfWeek, {
					width: "short",
					context: "formatting"
				});
				default: return localize.day(dayOfWeek, {
					width: "wide",
					context: "formatting"
				});
			}
		},
		e: function(date, token, localize, options) {
			const dayOfWeek = date.getDay();
			const localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
			switch (token) {
				case "e": return String(localDayOfWeek);
				case "ee": return addLeadingZeros(localDayOfWeek, 2);
				case "eo": return localize.ordinalNumber(localDayOfWeek, { unit: "day" });
				case "eee": return localize.day(dayOfWeek, {
					width: "abbreviated",
					context: "formatting"
				});
				case "eeeee": return localize.day(dayOfWeek, {
					width: "narrow",
					context: "formatting"
				});
				case "eeeeee": return localize.day(dayOfWeek, {
					width: "short",
					context: "formatting"
				});
				default: return localize.day(dayOfWeek, {
					width: "wide",
					context: "formatting"
				});
			}
		},
		c: function(date, token, localize, options) {
			const dayOfWeek = date.getDay();
			const localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
			switch (token) {
				case "c": return String(localDayOfWeek);
				case "cc": return addLeadingZeros(localDayOfWeek, token.length);
				case "co": return localize.ordinalNumber(localDayOfWeek, { unit: "day" });
				case "ccc": return localize.day(dayOfWeek, {
					width: "abbreviated",
					context: "standalone"
				});
				case "ccccc": return localize.day(dayOfWeek, {
					width: "narrow",
					context: "standalone"
				});
				case "cccccc": return localize.day(dayOfWeek, {
					width: "short",
					context: "standalone"
				});
				default: return localize.day(dayOfWeek, {
					width: "wide",
					context: "standalone"
				});
			}
		},
		i: function(date, token, localize) {
			const dayOfWeek = date.getDay();
			const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
			switch (token) {
				case "i": return String(isoDayOfWeek);
				case "ii": return addLeadingZeros(isoDayOfWeek, token.length);
				case "io": return localize.ordinalNumber(isoDayOfWeek, { unit: "day" });
				case "iii": return localize.day(dayOfWeek, {
					width: "abbreviated",
					context: "formatting"
				});
				case "iiiii": return localize.day(dayOfWeek, {
					width: "narrow",
					context: "formatting"
				});
				case "iiiiii": return localize.day(dayOfWeek, {
					width: "short",
					context: "formatting"
				});
				default: return localize.day(dayOfWeek, {
					width: "wide",
					context: "formatting"
				});
			}
		},
		a: function(date, token, localize) {
			const dayPeriodEnumValue = date.getHours() / 12 >= 1 ? "pm" : "am";
			switch (token) {
				case "a":
				case "aa": return localize.dayPeriod(dayPeriodEnumValue, {
					width: "abbreviated",
					context: "formatting"
				});
				case "aaa": return localize.dayPeriod(dayPeriodEnumValue, {
					width: "abbreviated",
					context: "formatting"
				}).toLowerCase();
				case "aaaaa": return localize.dayPeriod(dayPeriodEnumValue, {
					width: "narrow",
					context: "formatting"
				});
				default: return localize.dayPeriod(dayPeriodEnumValue, {
					width: "wide",
					context: "formatting"
				});
			}
		},
		b: function(date, token, localize) {
			const hours = date.getHours();
			let dayPeriodEnumValue;
			if (hours === 12) dayPeriodEnumValue = dayPeriodEnum.noon;
			else if (hours === 0) dayPeriodEnumValue = dayPeriodEnum.midnight;
			else dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
			switch (token) {
				case "b":
				case "bb": return localize.dayPeriod(dayPeriodEnumValue, {
					width: "abbreviated",
					context: "formatting"
				});
				case "bbb": return localize.dayPeriod(dayPeriodEnumValue, {
					width: "abbreviated",
					context: "formatting"
				}).toLowerCase();
				case "bbbbb": return localize.dayPeriod(dayPeriodEnumValue, {
					width: "narrow",
					context: "formatting"
				});
				default: return localize.dayPeriod(dayPeriodEnumValue, {
					width: "wide",
					context: "formatting"
				});
			}
		},
		B: function(date, token, localize) {
			const hours = date.getHours();
			let dayPeriodEnumValue;
			if (hours >= 17) dayPeriodEnumValue = dayPeriodEnum.evening;
			else if (hours >= 12) dayPeriodEnumValue = dayPeriodEnum.afternoon;
			else if (hours >= 4) dayPeriodEnumValue = dayPeriodEnum.morning;
			else dayPeriodEnumValue = dayPeriodEnum.night;
			switch (token) {
				case "B":
				case "BB":
				case "BBB": return localize.dayPeriod(dayPeriodEnumValue, {
					width: "abbreviated",
					context: "formatting"
				});
				case "BBBBB": return localize.dayPeriod(dayPeriodEnumValue, {
					width: "narrow",
					context: "formatting"
				});
				default: return localize.dayPeriod(dayPeriodEnumValue, {
					width: "wide",
					context: "formatting"
				});
			}
		},
		h: function(date, token, localize) {
			if (token === "ho") {
				let hours = date.getHours() % 12;
				if (hours === 0) hours = 12;
				return localize.ordinalNumber(hours, { unit: "hour" });
			}
			return lightFormatters.h(date, token);
		},
		H: function(date, token, localize) {
			if (token === "Ho") return localize.ordinalNumber(date.getHours(), { unit: "hour" });
			return lightFormatters.H(date, token);
		},
		K: function(date, token, localize) {
			const hours = date.getHours() % 12;
			if (token === "Ko") return localize.ordinalNumber(hours, { unit: "hour" });
			return addLeadingZeros(hours, token.length);
		},
		k: function(date, token, localize) {
			let hours = date.getHours();
			if (hours === 0) hours = 24;
			if (token === "ko") return localize.ordinalNumber(hours, { unit: "hour" });
			return addLeadingZeros(hours, token.length);
		},
		m: function(date, token, localize) {
			if (token === "mo") return localize.ordinalNumber(date.getMinutes(), { unit: "minute" });
			return lightFormatters.m(date, token);
		},
		s: function(date, token, localize) {
			if (token === "so") return localize.ordinalNumber(date.getSeconds(), { unit: "second" });
			return lightFormatters.s(date, token);
		},
		S: function(date, token) {
			return lightFormatters.S(date, token);
		},
		X: function(date, token, _localize) {
			const timezoneOffset = date.getTimezoneOffset();
			if (timezoneOffset === 0) return "Z";
			switch (token) {
				case "X": return formatTimezoneWithOptionalMinutes(timezoneOffset);
				case "XXXX":
				case "XX": return formatTimezone(timezoneOffset);
				default: return formatTimezone(timezoneOffset, ":");
			}
		},
		x: function(date, token, _localize) {
			const timezoneOffset = date.getTimezoneOffset();
			switch (token) {
				case "x": return formatTimezoneWithOptionalMinutes(timezoneOffset);
				case "xxxx":
				case "xx": return formatTimezone(timezoneOffset);
				default: return formatTimezone(timezoneOffset, ":");
			}
		},
		O: function(date, token, _localize) {
			const timezoneOffset = date.getTimezoneOffset();
			switch (token) {
				case "O":
				case "OO":
				case "OOO": return "GMT" + formatTimezoneShort(timezoneOffset, ":");
				default: return "GMT" + formatTimezone(timezoneOffset, ":");
			}
		},
		z: function(date, token, _localize) {
			const timezoneOffset = date.getTimezoneOffset();
			switch (token) {
				case "z":
				case "zz":
				case "zzz": return "GMT" + formatTimezoneShort(timezoneOffset, ":");
				default: return "GMT" + formatTimezone(timezoneOffset, ":");
			}
		},
		t: function(date, token, _localize) {
			return addLeadingZeros(Math.trunc(+date / 1e3), token.length);
		},
		T: function(date, token, _localize) {
			return addLeadingZeros(+date, token.length);
		}
	};
	function formatTimezoneShort(offset, delimiter = "") {
		const sign = offset > 0 ? "-" : "+";
		const absOffset = Math.abs(offset);
		const hours = Math.trunc(absOffset / 60);
		const minutes = absOffset % 60;
		if (minutes === 0) return sign + String(hours);
		return sign + String(hours) + delimiter + addLeadingZeros(minutes, 2);
	}
	function formatTimezoneWithOptionalMinutes(offset, delimiter) {
		if (offset % 60 === 0) return (offset > 0 ? "-" : "+") + addLeadingZeros(Math.abs(offset) / 60, 2);
		return formatTimezone(offset, delimiter);
	}
	function formatTimezone(offset, delimiter = "") {
		const sign = offset > 0 ? "-" : "+";
		const absOffset = Math.abs(offset);
		const hours = addLeadingZeros(Math.trunc(absOffset / 60), 2);
		const minutes = addLeadingZeros(absOffset % 60, 2);
		return sign + hours + delimiter + minutes;
	}
	var dateLongFormatter = (pattern, formatLong) => {
		switch (pattern) {
			case "P": return formatLong.date({ width: "short" });
			case "PP": return formatLong.date({ width: "medium" });
			case "PPP": return formatLong.date({ width: "long" });
			default: return formatLong.date({ width: "full" });
		}
	};
	var timeLongFormatter = (pattern, formatLong) => {
		switch (pattern) {
			case "p": return formatLong.time({ width: "short" });
			case "pp": return formatLong.time({ width: "medium" });
			case "ppp": return formatLong.time({ width: "long" });
			default: return formatLong.time({ width: "full" });
		}
	};
	var dateTimeLongFormatter = (pattern, formatLong) => {
		const matchResult = pattern.match(/(P+)(p+)?/) || [];
		const datePattern = matchResult[1];
		const timePattern = matchResult[2];
		if (!timePattern) return dateLongFormatter(pattern, formatLong);
		let dateTimeFormat;
		switch (datePattern) {
			case "P":
				dateTimeFormat = formatLong.dateTime({ width: "short" });
				break;
			case "PP":
				dateTimeFormat = formatLong.dateTime({ width: "medium" });
				break;
			case "PPP":
				dateTimeFormat = formatLong.dateTime({ width: "long" });
				break;
			default: dateTimeFormat = formatLong.dateTime({ width: "full" });
		}
		return dateTimeFormat.replace("{{date}}", dateLongFormatter(datePattern, formatLong)).replace("{{time}}", timeLongFormatter(timePattern, formatLong));
	};
	var longFormatters = {
		p: timeLongFormatter,
		P: dateTimeLongFormatter
	};
	var dayOfYearTokenRE = /^D+$/;
	var weekYearTokenRE = /^Y+$/;
	var throwTokens = [
		"D",
		"DD",
		"YY",
		"YYYY"
	];
	function isProtectedDayOfYearToken(token) {
		return dayOfYearTokenRE.test(token);
	}
	function isProtectedWeekYearToken(token) {
		return weekYearTokenRE.test(token);
	}
	function warnOrThrowProtectedError(token, format, input) {
		const _message = message(token, format, input);
		console.warn(_message);
		if (throwTokens.includes(token)) throw new RangeError(_message);
	}
	function message(token, format, input) {
		const subject = token[0] === "Y" ? "years" : "days of the month";
		return `Use \`${token.toLowerCase()}\` instead of \`${token}\` (in \`${format}\`) for formatting ${subject} to the input \`${input}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`;
	}
	var formattingTokensRegExp = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g;
	var longFormattingTokensRegExp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
	var escapedStringRegExp = /^'([^]*?)'?$/;
	var doubleQuoteRegExp = /''/g;
	var unescapedLatinCharacterRegExp = /[a-zA-Z]/;
	function format(date, formatStr, options) {
		const defaultOptions = getDefaultOptions();
		const locale = options?.locale ?? defaultOptions.locale ?? enUS;
		const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions.firstWeekContainsDate ?? defaultOptions.locale?.options?.firstWeekContainsDate ?? 1;
		const weekStartsOn = options?.weekStartsOn ?? options?.locale?.options?.weekStartsOn ?? defaultOptions.weekStartsOn ?? defaultOptions.locale?.options?.weekStartsOn ?? 0;
		const originalDate = toDate(date, options?.in);
		if (!isValid(originalDate)) throw new RangeError("Invalid time value");
		let parts = formatStr.match(longFormattingTokensRegExp).map((substring) => {
			const firstCharacter = substring[0];
			if (firstCharacter === "p" || firstCharacter === "P") {
				const longFormatter = longFormatters[firstCharacter];
				return longFormatter(substring, locale.formatLong);
			}
			return substring;
		}).join("").match(formattingTokensRegExp).map((substring) => {
			if (substring === "''") return {
				isToken: false,
				value: "'"
			};
			const firstCharacter = substring[0];
			if (firstCharacter === "'") return {
				isToken: false,
				value: cleanEscapedString(substring)
			};
			if (formatters[firstCharacter]) return {
				isToken: true,
				value: substring
			};
			if (firstCharacter.match(unescapedLatinCharacterRegExp)) throw new RangeError("Format string contains an unescaped latin alphabet character `" + firstCharacter + "`");
			return {
				isToken: false,
				value: substring
			};
		});
		if (locale.localize.preprocessor) parts = locale.localize.preprocessor(originalDate, parts);
		const formatterOptions = {
			firstWeekContainsDate,
			weekStartsOn,
			locale
		};
		return parts.map((part) => {
			if (!part.isToken) return part.value;
			const token = part.value;
			if (!options?.useAdditionalWeekYearTokens && isProtectedWeekYearToken(token) || !options?.useAdditionalDayOfYearTokens && isProtectedDayOfYearToken(token)) warnOrThrowProtectedError(token, formatStr, String(date));
			const formatter = formatters[token[0]];
			return formatter(originalDate, token, locale.localize, formatterOptions);
		}).join("");
	}
	function cleanEscapedString(input) {
		const matched = input.match(escapedStringRegExp);
		if (!matched) return input;
		return matched[1].replace(doubleQuoteRegExp, "'");
	}
	function formatDistanceStrict(laterDate, earlierDate, options) {
		const defaultOptions = getDefaultOptions();
		const locale = options?.locale ?? defaultOptions.locale ?? enUS;
		const comparison = compareAsc(laterDate, earlierDate);
		if (isNaN(comparison)) throw new RangeError("Invalid time value");
		const localizeOptions = Object.assign({}, options, {
			addSuffix: options?.addSuffix,
			comparison
		});
		const [laterDate_, earlierDate_] = normalizeDates(options?.in, ...comparison > 0 ? [earlierDate, laterDate] : [laterDate, earlierDate]);
		const roundingMethod = getRoundingMethod(options?.roundingMethod ?? "round");
		const milliseconds = earlierDate_.getTime() - laterDate_.getTime();
		const minutes = milliseconds / millisecondsInMinute;
		const dstNormalizedMinutes = (milliseconds - (getTimezoneOffsetInMilliseconds(earlierDate_) - getTimezoneOffsetInMilliseconds(laterDate_))) / millisecondsInMinute;
		const defaultUnit = options?.unit;
		let unit;
		if (!defaultUnit) {
			if (minutes < 1) unit = "second";
			else if (minutes < 60) unit = "minute";
			else if (minutes < 1440) unit = "hour";
			else if (dstNormalizedMinutes < 43200) unit = "day";
			else if (dstNormalizedMinutes < 525600) unit = "month";
			else unit = "year";
		} else unit = defaultUnit;
		if (unit === "second") {
			const seconds = roundingMethod(milliseconds / 1e3);
			return locale.formatDistance("xSeconds", seconds, localizeOptions);
		} else if (unit === "minute") {
			const roundedMinutes = roundingMethod(minutes);
			return locale.formatDistance("xMinutes", roundedMinutes, localizeOptions);
		} else if (unit === "hour") {
			const hours = roundingMethod(minutes / 60);
			return locale.formatDistance("xHours", hours, localizeOptions);
		} else if (unit === "day") {
			const days = roundingMethod(dstNormalizedMinutes / minutesInDay);
			return locale.formatDistance("xDays", days, localizeOptions);
		} else if (unit === "month") {
			const months = roundingMethod(dstNormalizedMinutes / minutesInMonth);
			return months === 12 && defaultUnit !== "month" ? locale.formatDistance("xYears", 1, localizeOptions) : locale.formatDistance("xMonths", months, localizeOptions);
		} else {
			const years = roundingMethod(dstNormalizedMinutes / minutesInYear);
			return locale.formatDistance("xYears", years, localizeOptions);
		}
	}
	function isSameWeek(laterDate, earlierDate, options) {
		const [laterDate_, earlierDate_] = normalizeDates(options?.in, laterDate, earlierDate);
		return +startOfWeek(laterDate_, options) === +startOfWeek(earlierDate_, options);
	}
	function parseISO(argument, options) {
		const invalidDate = () => constructFrom(options?.in, NaN);
		const additionalDigits = options?.additionalDigits ?? 2;
		const dateStrings = splitDateString(argument);
		let date;
		if (dateStrings.date) {
			const parseYearResult = parseYear(dateStrings.date, additionalDigits);
			date = parseDate(parseYearResult.restDateString, parseYearResult.year);
		}
		if (!date || isNaN(+date)) return invalidDate();
		const timestamp = +date;
		let time = 0;
		let offset;
		if (dateStrings.time) {
			time = parseTime(dateStrings.time);
			if (isNaN(time)) return invalidDate();
		}
		if (dateStrings.timezone) {
			offset = parseTimezone(dateStrings.timezone);
			if (isNaN(offset)) return invalidDate();
		} else {
			const tmpDate = new Date(timestamp + time);
			const result = toDate(0, options?.in);
			result.setFullYear(tmpDate.getUTCFullYear(), tmpDate.getUTCMonth(), tmpDate.getUTCDate());
			result.setHours(tmpDate.getUTCHours(), tmpDate.getUTCMinutes(), tmpDate.getUTCSeconds(), tmpDate.getUTCMilliseconds());
			return result;
		}
		return toDate(timestamp + time + offset, options?.in);
	}
	var patterns = {
		dateTimeDelimiter: /[T ]/,
		timeZoneDelimiter: /[Z ]/i,
		timezone: /([Z+-].*)$/
	};
	var dateRegex = /^-?(?:(\d{3})|(\d{2})(?:-?(\d{2}))?|W(\d{2})(?:-?(\d{1}))?|)$/;
	var timeRegex = /^(\d{2}(?:[.,]\d*)?)(?::?(\d{2}(?:[.,]\d*)?))?(?::?(\d{2}(?:[.,]\d*)?))?$/;
	var timezoneRegex = /^([+-])(\d{2})(?::?(\d{2}))?$/;
	function splitDateString(dateString) {
		const dateStrings = {};
		const array = dateString.split(patterns.dateTimeDelimiter);
		let timeString;
		if (array.length > 2) return dateStrings;
		if (/:/.test(array[0])) timeString = array[0];
		else {
			dateStrings.date = array[0];
			timeString = array[1];
			if (patterns.timeZoneDelimiter.test(dateStrings.date)) {
				dateStrings.date = dateString.split(patterns.timeZoneDelimiter)[0];
				timeString = dateString.substr(dateStrings.date.length, dateString.length);
			}
		}
		if (timeString) {
			const token = patterns.timezone.exec(timeString);
			if (token) {
				dateStrings.time = timeString.replace(token[1], "");
				dateStrings.timezone = token[1];
			} else dateStrings.time = timeString;
		}
		return dateStrings;
	}
	function parseYear(dateString, additionalDigits) {
		const regex = new RegExp("^(?:(\\d{4}|[+-]\\d{" + (4 + additionalDigits) + "})|(\\d{2}|[+-]\\d{" + (2 + additionalDigits) + "})$)");
		const captures = dateString.match(regex);
		if (!captures) return {
			year: NaN,
			restDateString: ""
		};
		const year = captures[1] ? parseInt(captures[1]) : null;
		const century = captures[2] ? parseInt(captures[2]) : null;
		return {
			year: century === null ? year : century * 100,
			restDateString: dateString.slice((captures[1] || captures[2]).length)
		};
	}
	function parseDate(dateString, year) {
		if (year === null) return new Date(NaN);
		const captures = dateString.match(dateRegex);
		if (!captures) return new Date(NaN);
		const isWeekDate = !!captures[4];
		const dayOfYear = parseDateUnit(captures[1]);
		const month = parseDateUnit(captures[2]) - 1;
		const day = parseDateUnit(captures[3]);
		const week = parseDateUnit(captures[4]);
		const dayOfWeek = parseDateUnit(captures[5]) - 1;
		if (isWeekDate) {
			if (!validateWeekDate(year, week, dayOfWeek)) return new Date(NaN);
			return dayOfISOWeekYear(year, week, dayOfWeek);
		} else {
			const date = new Date(0);
			if (!validateDate(year, month, day) || !validateDayOfYearDate(year, dayOfYear)) return new Date(NaN);
			date.setUTCFullYear(year, month, Math.max(dayOfYear, day));
			return date;
		}
	}
	function parseDateUnit(value) {
		return value ? parseInt(value) : 1;
	}
	function parseTime(timeString) {
		const captures = timeString.match(timeRegex);
		if (!captures) return NaN;
		const hours = parseTimeUnit(captures[1]);
		const minutes = parseTimeUnit(captures[2]);
		const seconds = parseTimeUnit(captures[3]);
		if (!validateTime(hours, minutes, seconds)) return NaN;
		return hours * millisecondsInHour + minutes * millisecondsInMinute + seconds * 1e3;
	}
	function parseTimeUnit(value) {
		return value && parseFloat(value.replace(",", ".")) || 0;
	}
	function parseTimezone(timezoneString) {
		if (timezoneString === "Z") return 0;
		const captures = timezoneString.match(timezoneRegex);
		if (!captures) return 0;
		const sign = captures[1] === "+" ? -1 : 1;
		const hours = parseInt(captures[2]);
		const minutes = captures[3] && parseInt(captures[3]) || 0;
		if (!validateTimezone(hours, minutes)) return NaN;
		return sign * (hours * millisecondsInHour + minutes * millisecondsInMinute);
	}
	function dayOfISOWeekYear(isoWeekYear, week, day) {
		const date = new Date(0);
		date.setUTCFullYear(isoWeekYear, 0, 4);
		const fourthOfJanuaryDay = date.getUTCDay() || 7;
		const diff = (week - 1) * 7 + day + 1 - fourthOfJanuaryDay;
		date.setUTCDate(date.getUTCDate() + diff);
		return date;
	}
	var daysInMonths = [
		31,
		null,
		31,
		30,
		31,
		30,
		31,
		31,
		30,
		31,
		30,
		31
	];
	function isLeapYearIndex(year) {
		return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0;
	}
	function validateDate(year, month, date) {
		return month >= 0 && month <= 11 && date >= 1 && date <= (daysInMonths[month] || (isLeapYearIndex(year) ? 29 : 28));
	}
	function validateDayOfYearDate(year, dayOfYear) {
		return dayOfYear >= 1 && dayOfYear <= (isLeapYearIndex(year) ? 366 : 365);
	}
	function validateWeekDate(_year, week, day) {
		return week >= 1 && week <= 53 && day >= 0 && day <= 6;
	}
	function validateTime(hours, minutes, seconds) {
		if (hours === 24) return minutes === 0 && seconds === 0;
		return seconds >= 0 && seconds < 60 && minutes >= 0 && minutes < 60 && hours >= 0 && hours < 25;
	}
	function validateTimezone(_hours, minutes) {
		return minutes >= 0 && minutes <= 59;
	}
	var formatDistanceLocale = {
		lessThanXSeconds: {
			one: "不到 1 秒",
			other: "不到 {{count}} 秒"
		},
		xSeconds: {
			one: "1 秒",
			other: "{{count}} 秒"
		},
		halfAMinute: "半分钟",
		lessThanXMinutes: {
			one: "不到 1 分钟",
			other: "不到 {{count}} 分钟"
		},
		xMinutes: {
			one: "1 分钟",
			other: "{{count}} 分钟"
		},
		xHours: {
			one: "1 小时",
			other: "{{count}} 小时"
		},
		aboutXHours: {
			one: "大约 1 小时",
			other: "大约 {{count}} 小时"
		},
		xDays: {
			one: "1 天",
			other: "{{count}} 天"
		},
		aboutXWeeks: {
			one: "大约 1 个星期",
			other: "大约 {{count}} 个星期"
		},
		xWeeks: {
			one: "1 个星期",
			other: "{{count}} 个星期"
		},
		aboutXMonths: {
			one: "大约 1 个月",
			other: "大约 {{count}} 个月"
		},
		xMonths: {
			one: "1 个月",
			other: "{{count}} 个月"
		},
		aboutXYears: {
			one: "大约 1 年",
			other: "大约 {{count}} 年"
		},
		xYears: {
			one: "1 年",
			other: "{{count}} 年"
		},
		overXYears: {
			one: "超过 1 年",
			other: "超过 {{count}} 年"
		},
		almostXYears: {
			one: "将近 1 年",
			other: "将近 {{count}} 年"
		}
	};
	var formatDistance = (token, count, options) => {
		let result;
		const tokenValue = formatDistanceLocale[token];
		if (typeof tokenValue === "string") result = tokenValue;
		else if (count === 1) result = tokenValue.one;
		else result = tokenValue.other.replace("{{count}}", String(count));
		if (options?.addSuffix) {
			if (options.comparison && options.comparison > 0) return result + "内";
			else return result + "前";
		}
		return result;
	};
	var formatLong = {
		date: buildFormatLongFn({
			formats: {
				full: "y'年'M'月'd'日' EEEE",
				long: "y'年'M'月'd'日'",
				medium: "yyyy-MM-dd",
				short: "yy-MM-dd"
			},
			defaultWidth: "full"
		}),
		time: buildFormatLongFn({
			formats: {
				full: "zzzz a h:mm:ss",
				long: "z a h:mm:ss",
				medium: "a h:mm:ss",
				short: "a h:mm"
			},
			defaultWidth: "full"
		}),
		dateTime: buildFormatLongFn({
			formats: {
				full: "{{date}} {{time}}",
				long: "{{date}} {{time}}",
				medium: "{{date}} {{time}}",
				short: "{{date}} {{time}}"
			},
			defaultWidth: "full"
		})
	};
	function checkWeek(date, baseDate, options) {
		const baseFormat = "eeee p";
		if (isSameWeek(date, baseDate, options)) return baseFormat;
		else if (date.getTime() > baseDate.getTime()) return "'下个'eeee p";
		return "'上个'eeee p";
	}
	var formatRelativeLocale = {
		lastWeek: checkWeek,
		yesterday: "'昨天' p",
		today: "'今天' p",
		tomorrow: "'明天' p",
		nextWeek: checkWeek,
		other: "PP p"
	};
	var formatRelative = (token, date, baseDate, options) => {
		const format = formatRelativeLocale[token];
		if (typeof format === "function") return format(date, baseDate, options);
		return format;
	};
	var eraValues = {
		narrow: ["前", "公元"],
		abbreviated: ["前", "公元"],
		wide: ["公元前", "公元"]
	};
	var quarterValues = {
		narrow: [
			"1",
			"2",
			"3",
			"4"
		],
		abbreviated: [
			"第一季",
			"第二季",
			"第三季",
			"第四季"
		],
		wide: [
			"第一季度",
			"第二季度",
			"第三季度",
			"第四季度"
		]
	};
	var monthValues = {
		narrow: [
			"一",
			"二",
			"三",
			"四",
			"五",
			"六",
			"七",
			"八",
			"九",
			"十",
			"十一",
			"十二"
		],
		abbreviated: [
			"1月",
			"2月",
			"3月",
			"4月",
			"5月",
			"6月",
			"7月",
			"8月",
			"9月",
			"10月",
			"11月",
			"12月"
		],
		wide: [
			"一月",
			"二月",
			"三月",
			"四月",
			"五月",
			"六月",
			"七月",
			"八月",
			"九月",
			"十月",
			"十一月",
			"十二月"
		]
	};
	var dayValues = {
		narrow: [
			"日",
			"一",
			"二",
			"三",
			"四",
			"五",
			"六"
		],
		short: [
			"日",
			"一",
			"二",
			"三",
			"四",
			"五",
			"六"
		],
		abbreviated: [
			"周日",
			"周一",
			"周二",
			"周三",
			"周四",
			"周五",
			"周六"
		],
		wide: [
			"星期日",
			"星期一",
			"星期二",
			"星期三",
			"星期四",
			"星期五",
			"星期六"
		]
	};
	var dayPeriodValues = {
		narrow: {
			am: "上",
			pm: "下",
			midnight: "凌晨",
			noon: "午",
			morning: "早",
			afternoon: "下午",
			evening: "晚",
			night: "夜"
		},
		abbreviated: {
			am: "上午",
			pm: "下午",
			midnight: "凌晨",
			noon: "中午",
			morning: "早晨",
			afternoon: "中午",
			evening: "晚上",
			night: "夜间"
		},
		wide: {
			am: "上午",
			pm: "下午",
			midnight: "凌晨",
			noon: "中午",
			morning: "早晨",
			afternoon: "中午",
			evening: "晚上",
			night: "夜间"
		}
	};
	var formattingDayPeriodValues = {
		narrow: {
			am: "上",
			pm: "下",
			midnight: "凌晨",
			noon: "午",
			morning: "早",
			afternoon: "下午",
			evening: "晚",
			night: "夜"
		},
		abbreviated: {
			am: "上午",
			pm: "下午",
			midnight: "凌晨",
			noon: "中午",
			morning: "早晨",
			afternoon: "中午",
			evening: "晚上",
			night: "夜间"
		},
		wide: {
			am: "上午",
			pm: "下午",
			midnight: "凌晨",
			noon: "中午",
			morning: "早晨",
			afternoon: "中午",
			evening: "晚上",
			night: "夜间"
		}
	};
	var ordinalNumber = (dirtyNumber, options) => {
		const number = Number(dirtyNumber);
		switch (options?.unit) {
			case "date": return number.toString() + "日";
			case "hour": return number.toString() + "时";
			case "minute": return number.toString() + "分";
			case "second": return number.toString() + "秒";
			default: return "第 " + number.toString();
		}
	};
	var zhCN = {
		code: "zh-CN",
		formatDistance,
		formatLong,
		formatRelative,
		localize: {
			ordinalNumber,
			era: buildLocalizeFn({
				values: eraValues,
				defaultWidth: "wide"
			}),
			quarter: buildLocalizeFn({
				values: quarterValues,
				defaultWidth: "wide",
				argumentCallback: (quarter) => quarter - 1
			}),
			month: buildLocalizeFn({
				values: monthValues,
				defaultWidth: "wide"
			}),
			day: buildLocalizeFn({
				values: dayValues,
				defaultWidth: "wide"
			}),
			dayPeriod: buildLocalizeFn({
				values: dayPeriodValues,
				defaultWidth: "wide",
				formattingValues: formattingDayPeriodValues,
				defaultFormattingWidth: "wide"
			})
		},
		match: {
			ordinalNumber: buildMatchPatternFn({
				matchPattern: /^(第\s*)?\d+(日|时|分|秒)?/i,
				parsePattern: /\d+/i,
				valueCallback: (value) => parseInt(value, 10)
			}),
			era: buildMatchFn({
				matchPatterns: {
					narrow: /^(前)/i,
					abbreviated: /^(前)/i,
					wide: /^(公元前|公元)/i
				},
				defaultMatchWidth: "wide",
				parsePatterns: { any: [/^(前)/i, /^(公元)/i] },
				defaultParseWidth: "any"
			}),
			quarter: buildMatchFn({
				matchPatterns: {
					narrow: /^[1234]/i,
					abbreviated: /^第[一二三四]刻/i,
					wide: /^第[一二三四]刻钟/i
				},
				defaultMatchWidth: "wide",
				parsePatterns: { any: [
					/(1|一)/i,
					/(2|二)/i,
					/(3|三)/i,
					/(4|四)/i
				] },
				defaultParseWidth: "any",
				valueCallback: (index) => index + 1
			}),
			month: buildMatchFn({
				matchPatterns: {
					narrow: /^(一|二|三|四|五|六|七|八|九|十[二一]?)/i,
					abbreviated: /^(一|二|三|四|五|六|七|八|九|十[二一]?|\d|1[0-2])月/i,
					wide: /^(一|二|三|四|五|六|七|八|九|十[二一]?)月/i
				},
				defaultMatchWidth: "wide",
				parsePatterns: {
					narrow: [
						/^一/i,
						/^二/i,
						/^三/i,
						/^四/i,
						/^五/i,
						/^六/i,
						/^七/i,
						/^八/i,
						/^九/i,
						/^十(?!(一|二))/i,
						/^十一/i,
						/^十二/i
					],
					any: [
						/^(一|1(?!\d))/i,
						/^(二|2)/i,
						/^(三|3)/i,
						/^(四|4)/i,
						/^(五|5)/i,
						/^(六|6)/i,
						/^(七|7)/i,
						/^(八|8)/i,
						/^(九|9)/i,
						/^(十(?!(一|二))|10)/i,
						/^(十一|11)/i,
						/^(十二|12)/i
					]
				},
				defaultParseWidth: "any"
			}),
			day: buildMatchFn({
				matchPatterns: {
					narrow: /^[一二三四五六日]/i,
					short: /^[一二三四五六日]/i,
					abbreviated: /^周[一二三四五六日]/i,
					wide: /^星期[一二三四五六日]/i
				},
				defaultMatchWidth: "wide",
				parsePatterns: { any: [
					/日/i,
					/一/i,
					/二/i,
					/三/i,
					/四/i,
					/五/i,
					/六/i
				] },
				defaultParseWidth: "any"
			}),
			dayPeriod: buildMatchFn({
				matchPatterns: { any: /^(上午?|下午?|午夜|[中正]午|早上?|下午|晚上?|凌晨|)/i },
				defaultMatchWidth: "any",
				parsePatterns: { any: {
					am: /^上午?/i,
					pm: /^下午?/i,
					midnight: /^午夜/i,
					noon: /^[中正]午/i,
					morning: /^早上/i,
					afternoon: /^下午/i,
					evening: /^晚上?/i,
					night: /^凌晨/i
				} },
				defaultParseWidth: "any"
			})
		},
		options: {
			weekStartsOn: 1,
			firstWeekContainsDate: 4
		}
	};
	function forumTime(value, now = new Date()) {
		const date = parseISO(value.trim().replace(/\//g, "-").replace(" ", "T"));
		if (!isValid(date)) return null;
		const elapsed = differenceInMilliseconds(now, date);
		const full = format(date, "yyyy-MM-dd HH:mm:ss");
		return {
			text: elapsed < 0 || elapsed > 2592e6 ? full : elapsed < 6e4 ? "刚刚" : formatDistanceStrict(date, now, {
				addSuffix: true,
				locale: zhCN,
				roundingMethod: "floor",
				...elapsed >= 864e5 ? { unit: "day" } : {}
			}),
			full
		};
	}
	function postPath(href, base) {
		try {
			const url = new URL(href, base);
			if (url.origin !== new URL(base).origin) return;
			const id = url.pathname.match(/^\/post-(\d+)(?:-\d+)?(?:\.html)?\/?$/)?.[1];
			return id ? `/post-${id}-1` : void 0;
		} catch {
			return;
		}
	}
	function directLink(href, base) {
		try {
			let url = new URL(href, base);
			for (let i = 0; i < 3 && url.origin === new URL(base).origin && url.pathname === "/jump" && url.searchParams.has("to"); i++) url = new URL(url.searchParams.get("to"), base);
			return /^https?:$/.test(url.protocol) ? url.href : void 0;
		} catch {
			return;
		}
	}
	var filterLines = (value) => String(value || "").split(/\n|,/).map((s) => s.trim()).filter(Boolean);
	function shouldFilter(title, author, keywords, users, level, required) {
		return keywords.some((k) => title.toLowerCase().includes(k.toLowerCase())) || users.includes(author) || level >= 0 && Number.isFinite(required) && required > level;
	}
	var contentSelector = ":is(.post-content,.comment-content,.nsk-content,.markdown-body)";
	function style(css) {
		const el = document.createElement("style");
		el.textContent = css;
		document.head.append(el);
		return () => el.remove();
	}
	function infinite(ctx) {
		const comments = /^\/post-/.test(location.pathname);
		if (!ctx.get(comments ? "comments" : "posts")) return;
		const selector = comments ? "ul.comments" : "ul.post-list:not(.topic-carousel-panel)";
		const list = document.querySelector(selector);
		if (!list) return;
		let next = document.querySelector(".nsk-pager a.pager-next")?.href;
		let busy = false, failed = false, paused = false;
		let loading;
		const visited = new Set([location.href]);
		const button = document.createElement("button");
		button.type = "button";
		button.className = "nspp-action";
		button.textContent = "加载下一页";
		list.after(button);
		const pause = document.createElement("button");
		pause.type = "button";
		pause.className = "nspp-tool-icon";
		const renderPause = () => {
			pause.replaceChildren(toolIcon(paused ? "play" : "stop"));
			pause.title = paused ? "继续自动翻页" : "暂停自动翻页";
			pause.setAttribute("aria-label", pause.title);
			pause.setAttribute("aria-pressed", String(paused));
		};
		renderPause();
		if (next) (document.querySelector("#nspp-tools") || document.body).append(pause);
		pause.addEventListener("click", () => {
			paused = !paused;
			renderPause();
			if (paused) {
				observer.disconnect();
				loading?.abort();
			} else if (next) observer.observe(button);
		}, { signal: ctx.signal });
		const load = async (manual = false) => {
			if (busy || !next || visited.has(next) || ctx.signal.aborted) return;
			const url = new URL(next, location.href);
			if (url.origin !== location.origin) return;
			busy = true;
			loading = new AbortController();
			button.disabled = true;
			button.setAttribute("aria-busy", "true");
			button.textContent = "正在加载…";
			try {
				const html = await ctx.request(url.href, {
					responseType: "text",
					signal: AbortSignal.any([ctx.signal, loading.signal])
				});
				if (ctx.signal.aborted || paused && !manual) return;
				const page = new DOMParser().parseFromString(html, "text/html");
				const source = page.querySelector(selector);
				if (!source || !source.children.length) throw new Error("页面内容不可用");
				source.querySelectorAll("script, iframe, object, embed, base, link, style").forEach((el) => el.remove());
				source.querySelectorAll("*").forEach((el) => {
					for (const attr of Array.from(el.attributes)) if (/^on/i.test(attr.name) || attr.name === "srcdoc") el.removeAttribute(attr.name);
					else if (/^(href|src|action|formaction|xlink:href)$/i.test(attr.name)) try {
						const resolved = new URL(attr.value, url);
						if (![
							"http:",
							"https:",
							"mailto:",
							"tel:"
						].includes(resolved.protocol)) el.removeAttribute(attr.name);
						else if (!attr.value.startsWith("#")) el.setAttribute(attr.name, resolved.href);
					} catch {
						el.removeAttribute(attr.name);
					}
				});
				for (const child of Array.from(source.children)) {
					const id = child.id;
					if (id && document.getElementById(id)) continue;
					if (!comments) {
						const href = child.querySelector(".post-title a")?.getAttribute("href");
						if (href && Array.from(list.querySelectorAll(".post-title a")).some((a) => postPath(a.href, location.href) === postPath(href, url.href))) continue;
					}
					list.append(document.importNode(child, true));
				}
				visited.add(url.href);
				failed = false;
				const href = page.querySelector(".nsk-pager a.pager-next")?.getAttribute("href");
				next = href ? new URL(href, url).href : void 0;
				if (next && visited.has(next)) next = void 0;
				button.textContent = next ? "加载下一页" : "已加载全部内容";
				pause.hidden = !next;
			} catch {
				if (loading.signal.aborted) return;
				failed = true;
				button.textContent = "加载失败，点击重试";
			} finally {
				busy = false;
				button.disabled = !next;
				button.removeAttribute("aria-busy");
				if (paused && next) button.textContent = "已暂停，点击加载下一页";
				if (loading.signal.aborted && !ctx.signal.aborted && !paused && next) {
					observer.unobserve(button);
					observer.observe(button);
				}
			}
		};
		button.addEventListener("click", () => {
			load(true);
		}, { signal: ctx.signal });
		const observer = new IntersectionObserver((entries) => {
			if (entries.some((e) => e.isIntersecting) && !failed && !paused && !document.hidden) load();
		}, { rootMargin: "150px" });
		if (next) observer.observe(button);
		else button.hidden = true;
		return () => {
			observer.disconnect();
			loading?.abort();
			button.remove();
			pause.remove();
		};
	}
	var readingFeatures = [
		{
			id: "infinite-scroll",
			title: "自动翻页",
			description: "合并下一页帖子或评论；失败时手动重试。新增评论的互动请通过原始页面链接操作。",
			group: "阅读",
			defaults: {
				enabled: true,
				posts: true,
				comments: false
			},
			fields: {
				posts: {
					label: "帖子自动翻页",
					type: "text"
				},
				comments: {
					label: "评论自动翻页（仅阅读）",
					type: "text"
				}
			},
			mount: infinite
		},
		{
			id: "reading-history",
			title: "阅读历史与已读标记",
			description: "本地保存实际浏览与最近关闭的帖子，默认 100 条、7 天，按天分组；不上传记录。",
			group: "阅读",
			defaults: {
				enabled: true,
				limit: 100,
				days: 7
			},
			fields: {
				limit: {
					label: "保存上限",
					type: "number"
				},
				days: {
					label: "保存天数",
					type: "number"
				}
			},
			mount(ctx) {
				const limit = Math.max(1, Math.floor(Number(ctx.get("limit")) || 100));
				const maxAge = Math.max(1, Number(ctx.get("days")) || 7) * 864e5;
				const key = (href) => postPath(href, location.href);
				const load = (name) => {
					const stored = ctx.get(name);
					const clean = (Array.isArray(stored) ? stored : []).flatMap((entry) => {
						const path = entry && typeof entry.path === "string" ? key(entry.path) : void 0;
						return path && typeof entry.title === "string" && Number.isFinite(entry.time) && Date.now() - entry.time < maxAge ? [{
							...entry,
							path
						}] : [];
					}).sort((a, b) => b.time - a.time);
					const seen = new Set();
					const entries = clean.filter((entry) => {
						if (seen.has(entry.path)) return false;
						seen.add(entry.path);
						return true;
					}).slice(0, limit);
					ctx.set(name, entries);
					return entries;
				};
				const record = (name) => {
					const pd = unsafeWindow$1.__config__?.postData;
					const path = pd?.postId ? key(`/post-${pd.postId}-1`) : key(location.href);
					if (!path) return;
					ctx.set(name, [{
						path,
						title: pd?.title || document.title,
						time: Date.now(),
						uid: pd?.op?.uid,
						author: pd?.op?.name
					}, ...load(name).filter((entry) => entry.path !== path)].slice(0, limit));
				};
				record("entries");
				load("recent");
				const markRead = () => {
					const entries = load("entries");
					document.querySelectorAll(".post-title a").forEach((a) => a.classList.toggle("nspp-read", entries.some((entry) => entry.path === key(a.href))));
				};
				const stop = ctx.watch(markRead);
				window.addEventListener("beforeunload", () => record("recent"), {
					capture: true,
					signal: ctx.signal
				});
				const historyButton = document.createElement("button");
				historyButton.type = "button";
				historyButton.className = "nspp-tool-icon";
				historyButton.title = "阅读历史";
				historyButton.setAttribute("aria-label", "阅读历史");
				historyButton.append(toolIcon("history"));
				document.querySelector("#nspp-tools")?.append(historyButton);
				let historyDialog;
				historyButton.addEventListener("click", () => {
					historyDialog?.remove();
					historyDialog = document.createElement("dialog");
					historyDialog.className = "nspp-history";
					historyDialog.setAttribute("aria-label", "阅读历史");
					const close = document.createElement("button");
					close.textContent = "关闭";
					close.type = "button";
					close.addEventListener("click", () => historyDialog?.close(), { signal: ctx.signal });
					const heading = document.createElement("h2");
					heading.textContent = "阅读历史";
					const search = document.createElement("input");
					search.type = "search";
					search.placeholder = "搜索历史标题";
					search.setAttribute("aria-label", "搜索阅读历史");
					const clear = document.createElement("button");
					clear.type = "button";
					clear.textContent = "清空历史";
					const undoButton = document.createElement("button");
					undoButton.type = "button";
					undoButton.textContent = "撤销删除";
					undoButton.hidden = true;
					let previous;
					let tab = "entries";
					let entries = load(tab);
					const tabs = document.createElement("div");
					tabs.className = "nspp-history-toolbar";
					for (const [name, label] of [["entries", "全部"], ["recent", "最近关闭"]]) {
						const button = document.createElement("button");
						button.type = "button";
						button.textContent = label;
						button.dataset.tab = name;
						button.addEventListener("click", () => {
							tab = name;
							previous = void 0;
							undoButton.hidden = true;
							render();
						});
						tabs.append(button);
					}
					const list = document.createElement("ol");
					const save = () => {
						ctx.set(tab, entries);
						markRead();
					};
					const render = () => {
						list.replaceChildren();
						entries = load(tab);
						tabs.querySelectorAll("button").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.tab === tab)));
						let lastDay = "";
						const query = search.value.trim().toLowerCase();
						const matches = entries.filter((entry) => entry.title.toLowerCase().includes(query));
						for (const entry of matches) {
							if (!/^\/post-\d+-1$/.test(entry.path)) continue;
							const day = format(new Date(entry.time), "yyyy-MM-dd");
							if (day !== lastDay) {
								lastDay = day;
								const group = document.createElement("li");
								group.className = "nspp-history-day";
								const label = document.createElement("span");
								label.textContent = `${day === format(new Date(), "yyyy-MM-dd") ? "今天 - " : ""}${format(new Date(entry.time), "yyyy年M月d日 EEEE", { locale: zhCN })}`;
								const clearDay = document.createElement("button");
								clearDay.type = "button";
								clearDay.textContent = "清除当天";
								clearDay.addEventListener("click", () => {
									previous = load(tab);
									entries = previous.filter((item) => format(new Date(item.time), "yyyy-MM-dd") !== day);
									undoButton.hidden = false;
									save();
									render();
								});
								group.append(label, clearDay);
								list.append(group);
							}
							const li = document.createElement("li");
							const link = document.createElement("a");
							link.href = entry.path;
							link.textContent = entry.title;
							if (entry.uid && /^\d+$/.test(String(entry.uid))) {
								const avatar = document.createElement("img");
								avatar.className = "nspp-history-avatar";
								avatar.src = `/avatar/${entry.uid}.png`;
								avatar.alt = "";
								avatar.title = entry.author ? `@${entry.author}` : "";
								avatar.addEventListener("error", () => avatar.remove(), { once: true });
								link.prepend(avatar);
							}
							const remove = document.createElement("button");
							remove.type = "button";
							remove.textContent = "删除";
							remove.setAttribute("aria-label", `删除历史：${entry.title}`);
							remove.addEventListener("click", () => {
								previous = load(tab);
								entries = previous.filter((item) => item.path !== entry.path);
								undoButton.hidden = false;
								save();
								render();
							}, { signal: ctx.signal });
							const date = document.createElement("time");
							const visitedAt = new Date(entry.time);
							date.textContent = format(visitedAt, "HH:mm");
							date.title = format(visitedAt, "yyyy-MM-dd HH:mm:ss");
							link.title = entry.title;
							li.append(link, date);
							if (tab === "recent") {
								const restore = document.createElement("button");
								restore.type = "button";
								restore.textContent = "恢复";
								restore.addEventListener("click", () => window.open(entry.path, "_blank", "noopener"));
								li.append(restore);
							}
							li.append(remove);
							list.append(li);
						}
						if (!matches.length) {
							const empty = document.createElement("li");
							empty.textContent = query ? "没有匹配的记录" : "尚无阅读记录";
							list.append(empty);
						}
					};
					clear.addEventListener("click", () => {
						previous = load(tab);
						entries = [];
						undoButton.hidden = false;
						save();
						render();
					}, { signal: ctx.signal });
					undoButton.addEventListener("click", () => {
						if (previous) entries = previous;
						previous = void 0;
						undoButton.hidden = true;
						save();
						render();
					}, { signal: ctx.signal });
					search.addEventListener("input", render, { signal: ctx.signal });
					const header = document.createElement("header");
					header.append(heading, close);
					const toolbar = document.createElement("div");
					toolbar.className = "nspp-history-toolbar";
					toolbar.append(search, clear, undoButton);
					historyDialog.append(header, toolbar, tabs, list);
					render();
					document.body.append(historyDialog);
					historyDialog.showModal();
				}, { signal: ctx.signal });
				const remove = style(".post-title a.nspp-read{opacity:.6;text-decoration:underline dotted}");
				return () => {
					stop();
					remove();
					historyButton.remove();
					historyDialog?.remove();
					document.querySelectorAll(".nspp-read").forEach((a) => a.classList.remove("nspp-read"));
				};
			}
		},
		{
			id: "reading-content",
			title: "内容增强",
			description: "外链直达、新标签、图片预览、代码复制、Callout 和中文时间。",
			group: "阅读",
			defaults: {
				enabled: true,
				cleanLinks: true,
				newTab: true,
				images: true,
				copyCode: true,
				callouts: true,
				chineseTime: true
			},
			fields: {
				cleanLinks: {
					label: "外链直达",
					type: "text"
				},
				newTab: {
					label: "链接在新标签页打开",
					type: "text"
				},
				images: {
					label: "图片预览",
					type: "text"
				},
				copyCode: {
					label: "代码复制",
					type: "text"
				},
				callouts: {
					label: "Callout 渲染",
					type: "text"
				},
				chineseTime: {
					label: "中文时间",
					type: "text"
				}
			},
			mount(ctx) {
				if (ctx.get("cleanLinks") && location.pathname === "/jump") {
					const target = directLink(location.href, location.href);
					if (target && target !== location.href && new URL(target).pathname !== "/jump") location.replace(target);
				}
				const processed = new WeakSet();
				const undo = [];
				const stop = ctx.watch(() => {
					document.querySelectorAll(`${contentSelector} a, .post-title a, a[href*="/jump?to="]`).forEach((a) => {
						if (processed.has(a)) return;
						processed.add(a);
						const old = [
							a.getAttribute("href"),
							a.getAttribute("target"),
							a.getAttribute("rel")
						];
						try {
							let url = new URL(a.href);
							if (ctx.get("cleanLinks")) {
								const resolved = directLink(a.href, location.href);
								if (!resolved) return;
								url = new URL(resolved);
							}
							if (!/^https?:$/.test(url.protocol)) return;
							if (ctx.get("cleanLinks")) a.href = url.href;
							if (ctx.get("newTab") && !url.hash) {
								a.target = "_blank";
								a.rel = "noopener noreferrer";
							}
							undo.push(() => [
								"href",
								"target",
								"rel"
							].forEach((key, i) => old[i] === null ? a.removeAttribute(key) : a.setAttribute(key, old[i])));
						} catch {}
					});
					if (ctx.get("copyCode")) document.querySelectorAll(`${contentSelector} pre`).forEach((pre) => {
						if (processed.has(pre)) return;
						processed.add(pre);
						const button = copyButton(ctx, () => pre.querySelector("code")?.textContent || pre.textContent || "", "复制代码");
						button.dataset.nsppCopy = "true";
						pre.before(button);
						undo.push(() => button.remove());
					});
					if (ctx.get("chineseTime")) document.querySelectorAll("time, .date-created, .date-updated").forEach((el) => {
						if (processed.has(el) || el.children.length) return;
						processed.add(el);
						const old = el.textContent;
						const units = {
							y: "年",
							mo: "月",
							d: "天",
							h: "小时",
							min: "分钟",
							s: "秒"
						};
						const translated = (old || "").replace(/just now/gi, "刚刚").replace(/^edited\s*/i, "编辑于 ").replace(/(\d+)\s*(mo(?:nths?)?|min(?:utes?)?|y(?:ears?)?|d(?:ays?)?|h(?:ours?)?|s(?:econds?)?)\b/gi, (_, n, unit) => `${n}${units[unit.toLowerCase().startsWith("mo") ? "mo" : unit.toLowerCase().startsWith("min") ? "min" : unit[0].toLowerCase()]}`).replace(/\s*ago/gi, "前");
						const value = forumTime(el.getAttribute("datetime") || old || "")?.text || translated;
						if (old !== value) {
							el.textContent = value;
							undo.push(() => {
								el.textContent = old;
							});
						}
					});
					if (ctx.get("callouts")) document.querySelectorAll(`${contentSelector} blockquote`).forEach((el) => {
						if (processed.has(el)) return;
						processed.add(el);
						const p = el.querySelector("p");
						const match = p?.textContent?.match(/^\[!([a-z]+)\]([+-])?\s*([^\n]*)/i);
						if (!p || !match) return;
						const details = document.createElement("details");
						details.className = "nspp-callout";
						details.open = match[2] !== "-";
						const title = document.createElement("summary");
						title.textContent = match[3] || match[1].toUpperCase();
						details.append(title);
						const clone = el.cloneNode(true);
						clone.querySelectorAll("[data-nspp-copy]").forEach((button) => button.remove());
						const first = clone.querySelector("p");
						if (first) first.textContent = (first.textContent || "").slice(match[0].length);
						details.append(...Array.from(clone.childNodes));
						el.replaceWith(details);
						undo.push(() => details.replaceWith(el));
					});
				});
				const remove = style(".nspp-callout{border-inline-start:3px solid currentColor;padding:10px 16px;margin:1em 0}.nspp-callout summary{cursor:pointer;font-weight:600}.nspp-image-viewer{max-width:95vw;max-height:95vh;padding:12px}.nspp-image-viewer img{max-width:90vw;max-height:82vh;object-fit:contain}.nspp-image-viewer::backdrop{background:rgb(0 0 0 / .8)}");
				let dialog;
				if (ctx.get("images")) document.addEventListener("click", (e) => {
					const img = e.target.closest(`${contentSelector} img`);
					if (!img) return;
					e.preventDefault();
					dialog?.remove();
					dialog = document.createElement("dialog");
					dialog.className = "nspp-image-viewer";
					const close = document.createElement("button");
					close.textContent = "关闭预览";
					close.type = "button";
					close.addEventListener("click", () => dialog?.close(), { signal: ctx.signal });
					const large = document.createElement("img");
					const gallery = Array.from(document.querySelectorAll(`${contentSelector} img`));
					let index = Math.max(0, gallery.indexOf(img));
					const count = document.createElement("span");
					const previous = document.createElement("button");
					previous.type = "button";
					previous.textContent = "上一张";
					const next = document.createElement("button");
					next.type = "button";
					next.textContent = "下一张";
					const display = () => {
						const selected = gallery[index];
						large.src = selected.currentSrc || selected.src;
						large.alt = selected.alt;
						count.textContent = `${index + 1} / ${gallery.length}`;
						previous.disabled = index === 0;
						next.disabled = index === gallery.length - 1;
					};
					previous.addEventListener("click", () => {
						index--;
						display();
					}, { signal: ctx.signal });
					next.addEventListener("click", () => {
						index++;
						display();
					}, { signal: ctx.signal });
					dialog.addEventListener("keydown", (event) => {
						if (event.key === "ArrowLeft" && index > 0) {
							event.preventDefault();
							index--;
							display();
						}
						if (event.key === "ArrowRight" && index < gallery.length - 1) {
							event.preventDefault();
							index++;
							display();
						}
					}, { signal: ctx.signal });
					display();
					dialog.append(close, previous, count, next, large);
					document.body.append(dialog);
					dialog.showModal();
				}, { signal: ctx.signal });
				return () => {
					stop();
					remove();
					dialog?.remove();
					undo.reverse().forEach((fn) => fn());
				};
			}
		},
		{
			id: "reading-navigation",
			title: "夜间模式与阅读导航",
			description: "返回顶部；Alt + ↑ / ↓ 跳转页首或页尾，不占用编辑器按键。",
			group: "外观",
			defaults: {
				enabled: true,
				dark: false,
				keyboard: true
			},
			fields: {
				dark: {
					label: "启用夜间模式",
					type: "text"
				},
				keyboard: {
					label: "启用阅读快捷键",
					type: "text"
				}
			},
			mount(ctx) {
				const previous = document.body.classList.contains("dark-layout");
				if (ctx.get("dark")) document.body.classList.add("dark-layout");
				const button = document.createElement("button");
				button.type = "button";
				button.className = "nspp-tool-icon";
				button.title = "返回顶部";
				button.setAttribute("aria-label", button.title);
				button.append(toolIcon("top"));
				const syncTop = () => {
					button.hidden = window.scrollY <= 32;
				};
				syncTop();
				window.addEventListener("scroll", syncTop, {
					passive: true,
					signal: ctx.signal
				});
				document.querySelector("#nspp-tools")?.append(button);
				button.addEventListener("click", () => window.scrollTo({
					top: 0,
					behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"
				}), { signal: ctx.signal });
				if (ctx.get("keyboard")) document.addEventListener("keydown", (e) => {
					if (!e.altKey || !["ArrowUp", "ArrowDown"].includes(e.key) || e.target.closest("input,textarea,select,[contenteditable=\"true\"]")) return;
					e.preventDefault();
					window.scrollTo(0, e.key === "ArrowUp" ? 0 : document.documentElement.scrollHeight);
				}, { signal: ctx.signal });
				return () => {
					button.remove();
					document.body.classList.toggle("dark-layout", previous);
				};
			}
		}
	];
	readingFeatures.push({
		id: "reading-focus",
		title: "只看楼主与长文折叠",
		description: "可选只看楼主回复，长内容提供展开按钮；默认关闭。",
		group: "阅读",
		defaults: {
			enabled: false,
			authorOnly: false,
			collapse: true,
			height: 600
		},
		fields: {
			authorOnly: {
				label: "只看楼主回复",
				type: "text"
			},
			collapse: {
				label: "折叠长内容",
				type: "text"
			},
			height: {
				label: "折叠高度（像素，最小 200）",
				type: "number"
			}
		},
		mount(ctx) {
			const owner = document.querySelector(".nsk-content-meta-info .author-info > a[href*=\"/space/\"]")?.getAttribute("href")?.match(/\/space\/(\d+)/)?.[1];
			const hidden = new Map(), folded = new WeakSet(), cleanups = [];
			const stop = ctx.watch(() => {
				if (ctx.get("authorOnly") && owner) document.querySelectorAll("ul.comments > li").forEach((item) => {
					const uid = item.querySelector(".author-info > a[href*=\"/space/\"]")?.getAttribute("href")?.match(/\/space\/(\d+)/)?.[1];
					if (uid && uid !== owner && !hidden.has(item)) {
						hidden.set(item, item.hidden);
						item.hidden = true;
					}
				});
				if (ctx.get("collapse")) document.querySelectorAll(contentSelector).forEach((el) => {
					if (folded.has(el) || el.parentElement?.closest(contentSelector)) return;
					const height = Math.max(200, Number(ctx.get("height")) || 600);
					if (el.scrollHeight <= height) return;
					folded.add(el);
					const previousHeight = el.style.maxHeight, previousOverflow = el.style.overflow;
					el.style.maxHeight = `${height}px`;
					el.style.overflow = "hidden";
					const button = document.createElement("button");
					button.type = "button";
					button.textContent = "展开长内容";
					button.setAttribute("aria-expanded", "false");
					el.after(button);
					button.addEventListener("click", () => {
						const open = button.getAttribute("aria-expanded") !== "true";
						el.style.maxHeight = open ? previousHeight : `${height}px`;
						el.style.overflow = open ? previousOverflow : "hidden";
						button.setAttribute("aria-expanded", String(open));
						button.textContent = open ? "收起长内容" : "展开长内容";
					}, { signal: ctx.signal });
					cleanups.push(() => {
						el.style.maxHeight = previousHeight;
						el.style.overflow = previousOverflow;
						button.remove();
					});
				});
			});
			return () => {
				stop();
				hidden.forEach((value, el) => {
					el.hidden = value;
				});
				cleanups.forEach((fn) => fn());
			};
		}
	});
	readingFeatures.push({
		id: "post-status-style",
		title: "紧凑帖子状态",
		description: "统一只读与置顶标记的尺寸、颜色和间距。",
		group: "外观",
		defaults: { enabled: true },
		mount(ctx) {
			const marked = new Set();
			const stop = ctx.watch(() => {
				document.querySelectorAll(".post-title span, .post-title small, .post-title em").forEach((node) => {
					if (node.children.length || node.textContent?.trim() !== "只读" || node.closest("a[href*=\"/post-\"]")) return;
					node.classList.add("nspp-readonly");
					marked.add(node);
				});
				document.querySelectorAll(".post-title use").forEach((use) => {
					const href = use.getAttribute("href") || use.getAttribute("xlink:href") || "";
					if (!/^#(?:pin|pushpin|push-pin|top)(?:-|$)/i.test(href)) return;
					const svg = use.closest("svg");
					if (!svg) return;
					svg.classList.add("nspp-pinned");
					marked.add(svg);
					const parent = svg.parentElement;
					if (parent && parent.children.length === 1 && !parent.textContent?.trim() && !parent.matches("a, .post-title")) {
						parent.classList.add("nspp-pin-wrap");
						marked.add(parent);
					}
				});
			});
			return () => {
				stop();
				marked.forEach((node) => node.classList.remove("nspp-readonly", "nspp-pinned", "nspp-pin-wrap"));
			};
		}
	});
	var controls = new Set();
	var followed = new Set();
	var viewer;
	var checked = 0;
	var loading;
	var pending = new Set();
	var ownId = () => unsafeWindow$1.__config__?.user?.member_id;
	var render = () => controls.forEach(({ id, button }) => {
		button.disabled = !!loading || pending.has(id);
		button.textContent = followed.has(id) ? "取消关注" : "关注";
		button.setAttribute("aria-label", checked ? button.textContent : "查询关注状态");
		if (button.disabled) button.setAttribute("aria-busy", "true");
		else button.removeAttribute("aria-busy");
	});
	async function refreshFollowing() {
		const account = ownId();
		if (!account) throw new Error("请先登录");
		if (viewer !== account) {
			viewer = account;
			checked = 0;
			followed.clear();
		}
		if (loading) return loading;
		loading = request("/api/fans/follow").then((result) => {
			if (result?.success !== true || !Array.isArray(result.memberList) || result.memberList.some((row) => !Number.isSafeInteger(row.member_id) || row.member_id <= 0)) throw new Error("关注状态读取失败");
			if (ownId() !== account) throw new Error("登录状态已变化");
			followed = new Set(result.memberList.map((row) => String(row.member_id)));
			checked = Date.now();
		}).finally(() => {
			loading = void 0;
			render();
		});
		render();
		return loading;
	}
	function userCardActions(id, name, notify, signal) {
		const element = document.createElement("div");
		element.className = "nspp-user-hover-actions";
		const transfer = document.createElement("button");
		transfer.type = "button";
		transfer.dataset.action = "transfer";
		transfer.textContent = "转账";
		const follow = document.createElement("button");
		follow.type = "button";
		follow.dataset.action = "follow";
		follow.textContent = "关注";
		const message = document.createElement("a");
		message.dataset.action = "message";
		message.textContent = "私信";
		message.href = `/notification#/message?mode=talk&to=${id}`;
		element.append(transfer, follow, message);
		const control = {
			id,
			button: follow
		};
		controls.add(control);
		let dialog;
		signal.addEventListener("abort", () => {
			controls.delete(control);
			dialog?.remove();
		}, { once: true });
		const refresh = () => {
			element.hidden = String(ownId()) === id;
			if (ownId() && !element.hidden && (viewer !== ownId() || Date.now() - checked > 6e4)) refreshFollowing().catch(() => {});
		};
		render();
		element.hidden = String(ownId()) === id;
		follow.addEventListener("click", async () => {
			if (pending.has(id)) return;
			const account = ownId();
			try {
				if (!account) throw new Error("请先登录");
				const remove = viewer === account && !!checked && followed.has(id);
				pending.add(id);
				render();
				if (viewer !== account || Date.now() - checked > 3e4) {
					await refreshFollowing();
					if (followed.has(id) !== remove) {
						notify(followed.has(id) ? "已关注" : "已取消关注");
						return;
					}
				}
				const result = await request(`/api/fans/${remove ? "del" : "add"}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ followed_member_id: Number(id) }),
					signal
				});
				if (result?.success !== true) throw new Error(result?.message || "操作未确认，请重试查询");
				if (ownId() !== account) {
					checked = 0;
					return;
				}
				if (remove) followed.delete(id);
				else followed.add(id);
				checked = Date.now();
				notify(remove ? "已取消关注" : "已关注");
			} catch (error) {
				checked = 0;
				notify(error instanceof Error ? error.message : "关注操作失败");
			} finally {
				pending.delete(id);
				render();
			}
		}, { signal });
		transfer.addEventListener("click", async () => {
			const account = ownId();
			if (!account) {
				notify("请先登录");
				return;
			}
			dialog?.remove();
			const panel = document.createElement("dialog");
			dialog = panel;
			panel.className = "nspp-history nspp-user-transfer";
			panel.setAttribute("aria-label", "星辰转账");
			const title = document.createElement("h2");
			title.textContent = "星辰转账";
			const recipient = document.createElement("p");
			recipient.textContent = `${name()} · UID ${id}`;
			const form = document.createElement("form");
			const label = document.createElement("label");
			label.textContent = "星辰数量";
			const amount = document.createElement("input");
			amount.type = "number";
			amount.min = "1";
			amount.step = "1";
			amount.required = true;
			amount.inputMode = "numeric";
			label.append(amount);
			const status = document.createElement("p");
			status.setAttribute("role", "status");
			status.textContent = "正在确认收款人…";
			const actions = document.createElement("div");
			actions.className = "nspp-transfer-actions";
			const cancel = document.createElement("button");
			cancel.type = "button";
			cancel.textContent = "取消";
			cancel.addEventListener("click", () => panel.close(), { signal });
			const submit = document.createElement("button");
			submit.type = "submit";
			submit.textContent = "确认转账";
			submit.disabled = true;
			actions.append(cancel, submit);
			form.append(label, status, actions);
			panel.append(title, recipient, form);
			document.body.append(panel);
			panel.showModal();
			const ref = 100 + Math.floor(Math.random() * 1e8);
			let ready = false, sending = false;
			form.addEventListener("submit", async (event) => {
				event.preventDefault();
				const value = Number(amount.value);
				if (!ready || sending || !Number.isSafeInteger(value) || value <= 0 || !form.reportValidity()) return;
				if (ownId() !== account) {
					status.textContent = "登录状态已变化，请重新打开转账";
					submit.disabled = true;
					return;
				}
				sending = true;
				submit.disabled = true;
				amount.disabled = true;
				status.textContent = "转账中…";
				try {
					const result = await request("/api/stardust/send", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							member_id: Number(id),
							diff: value,
							ref_id: ref,
							onetime: true
						}),
						signal
					});
					if (result?.success === true) {
						panel.close();
						notify(`已转账 ${value} 星辰`);
					} else if (result?.success === false) {
						status.textContent = result.message || "转账未成功";
						sending = false;
						submit.disabled = false;
						amount.disabled = false;
					} else throw new Error("结果未确认");
				} catch {
					status.textContent = "结果未确认，请先核对星辰明细，勿重复转账。";
					const ledger = document.createElement("a");
					ledger.href = `/stardust/list?member_id=${account}`;
					ledger.textContent = "查看明细";
					ledger.target = "_blank";
					ledger.rel = "noopener";
					status.append(" ", ledger);
				}
			}, { signal });
			try {
				const result = await request("/api/stardust/payment-prepare", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						receiver_id: Number(id),
						origin: location.origin
					}),
					signal
				});
				if (result?.success !== true || !result.receiver_name) throw new Error(result?.message || "无法确认收款人");
				if (!panel.open || signal.aborted) return;
				recipient.textContent = `${result.receiver_name} · UID ${id}`;
				status.textContent = "";
				ready = true;
				submit.disabled = false;
				amount.focus();
			} catch (error) {
				status.textContent = error instanceof Error ? error.message : "无法确认收款人";
			}
		}, { signal });
		return {
			element,
			refresh
		};
	}
	function forumAge(now = Date.now()) {
		return Math.max(1, 1388 + Math.floor((now - Date.parse("2026-09-12T00:00:00+08:00")) / 864e5));
	}
	function registration(user, now = Date.now()) {
		const raw = user.created_at;
		const timestamp = typeof raw === "number" ? raw < 0xe8d4a51000 ? raw * 1e3 : raw : typeof raw === "string" && raw.trim() ? Date.parse(raw) : NaN;
		const days = Number.isFinite(timestamp) && timestamp <= now ? Math.floor((now - timestamp) / 864e5) : null;
		const tone = days === null ? "unknown" : days < 7 ? "new" : days < 30 ? "recent" : days < 365 ? "member" : "longtime";
		const label = {
			unknown: "注册时间未知",
			new: "新加入",
			recent: "新成员",
			member: "成员",
			longtime: "长期成员"
		}[tone];
		const coin = user.coin === void 0 || user.coin === null ? NaN : Number(user.coin);
		return {
			days,
			tone,
			label,
			level: Number.isInteger(user.rank) && user.rank >= 0 && user.rank <= 6 ? user.rank : Number.isFinite(coin) ? Math.min(6, Math.floor(Math.sqrt(Math.max(0, coin)) / 10)) : null,
			timestamp
		};
	}
	function authorId(el, base) {
		const own = el.getAttribute("data-uid");
		if (own && /^\d+$/.test(own)) return own;
		const href = el.getAttribute("href");
		if (!href) return;
		try {
			const url = new URL(href, base);
			if (url.origin !== new URL(base).origin) return;
			return url.pathname.match(/^\/space\/(\d+)(?:\/|$)/)?.[1] || url.searchParams.get("uid")?.match(/^\d+$/)?.[0];
		} catch {
			return;
		}
	}
	function trustScore(user, now = Date.now()) {
		const days = registration(user, now).days;
		const validCount = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
		if (days === null || !validCount(user.nPost) || !validCount(user.nComment) || !validCount(user.fans) || !Number.isSafeInteger(user.coin) || !Number.isSafeInteger(user.stardust)) return null;
		const points = (value, cap, weight) => weight * Math.log1p(Math.min(value, cap)) / Math.log1p(cap);
		const age = 35 * Math.sqrt(Math.min(days, 730) / 730);
		const posts = points(user.nPost, 300, 20);
		const comments = points(user.nComment, 2e3, 20);
		const coin = points(Math.max(0, user.coin), 6e3, 10);
		const stardust = points(Math.max(0, user.stardust), 500, 10);
		const fans = points(user.fans, 50, 5);
		return {
			score: Math.round(age + posts + comments + coin + stardust + fans),
			age,
			posts,
			comments,
			coin,
			stardust,
			fans
		};
	}
	var userHoverSelector = "a:is(.info-author,.post-author), :is(.author-info,.info-author,.post-author,.info-last-commenter) > a[href*=\"/space/\"], a[href*=\"/space/\"]:has(img), a[data-uid]";
	var cards = new WeakMap();
	function isUserHoverAnchor(anchor) {
		if (anchor.closest(".hover-user-card")) return false;
		const url = new URL(anchor.href, location.href);
		return url.origin === location.origin && /^\/space\/\d+\/?$/.test(url.pathname) && !url.search && !url.hash;
	}
	function userHover(anchor, ctx) {
		let entry = cards.get(anchor);
		if (!entry) {
			const title = anchor.getAttribute("title");
			anchor.removeAttribute("title");
			const element = document.createElement("section");
			element.className = "nspp-user-hover";
			element.hidden = true;
			const heading = document.createElement("a");
			heading.href = anchor.href;
			heading.textContent = anchor.textContent?.trim() || anchor.querySelector("img")?.alt || "用户资料";
			heading.className = "nspp-user-hover-name";
			element.setAttribute("aria-label", `${heading.textContent} 的用户详情`);
			const header = document.createElement("div");
			header.className = "nspp-user-hover-header";
			const mark = document.createElement("span");
			mark.className = "nspp-user-hover-monogram";
			mark.textContent = heading.textContent.slice(0, 1);
			const identity = document.createElement("div");
			identity.append(heading);
			const controller = new AbortController();
			const options = { signal: controller.signal };
			const copy = copyButton({
				notify: ctx.notify,
				signal: controller.signal
			}, () => heading.textContent || "", "复制用户名", true);
			identity.append(copy);
			const tags = document.createElement("div");
			tags.className = "nspp-user-hover-tags";
			identity.append(tags);
			const syncTags = () => {
				tags.replaceChildren();
				(anchor.closest(".author-info, .info-author, .post-author, .info-last-commenter, .nsk-content-meta-info") || anchor.parentElement)?.querySelectorAll(".role-tag").forEach((tag) => {
					if (tag.closest(".nspp-user-hover")) return;
					const copy = tag.cloneNode(true);
					copy.removeAttribute("id");
					tags.append(copy);
				});
				tags.hidden = !tags.children.length;
			};
			syncTags();
			const avatar = document.createElement("img");
			avatar.className = "nspp-user-hover-avatar";
			avatar.alt = "";
			avatar.hidden = true;
			const id = authorId(anchor, location.origin);
			const actions = id ? userCardActions(id, () => heading.textContent || "", ctx.notify, controller.signal) : void 0;
			avatar.addEventListener("load", () => {
				avatar.hidden = false;
				mark.hidden = true;
			});
			avatar.addEventListener("error", () => {
				avatar.hidden = true;
				mark.hidden = false;
			});
			header.append(avatar, mark, identity);
			element.append(header);
			if (actions) element.append(actions.element);
			document.body.append(element);
			let timer;
			const close = () => {
				clearTimeout(timer);
				element.hidden = true;
			};
			const open = () => {
				clearTimeout(timer);
				if (!anchor.isConnected) return;
				syncTags();
				element.hidden = false;
				actions?.refresh();
				if (id && !avatar.getAttribute("src")) avatar.src = `/avatar/${id}.png`;
				const rect = anchor.getBoundingClientRect();
				element.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - element.offsetWidth - 8))}px`;
				element.style.top = `${Math.max(8, Math.min(rect.bottom + 6, innerHeight - element.offsetHeight - 8))}px`;
			};
			const leave = () => {
				clearTimeout(timer);
				timer = setTimeout(close, 180);
			};
			anchor.addEventListener("mouseenter", open, options);
			anchor.addEventListener("mouseleave", leave, options);
			anchor.addEventListener("focus", open, options);
			anchor.addEventListener("blur", leave, options);
			anchor.addEventListener("click", (event) => {
				if (matchMedia("(hover: none)").matches && element.hidden) {
					event.preventDefault();
					open();
				}
			}, options);
			element.addEventListener("mouseenter", () => clearTimeout(timer), options);
			element.addEventListener("mouseleave", leave, options);
			element.addEventListener("focusin", () => clearTimeout(timer), options);
			element.addEventListener("focusout", leave, options);
			document.addEventListener("keydown", (event) => {
				if (event.key === "Escape" && !element.hidden) {
					anchor.focus();
					close();
				}
			}, options);
			document.addEventListener("pointerdown", (event) => {
				if (!element.contains(event.target) && !anchor.contains(event.target)) close();
			}, options);
			window.addEventListener("resize", close, options);
			window.addEventListener("scroll", close, {
				...options,
				capture: true
			});
			entry = {
				element,
				users: 0,
				dispose: () => {
					close();
					controller.abort();
					element.remove();
					if (title !== null) anchor.setAttribute("title", title);
					cards.delete(anchor);
				}
			};
			cards.set(anchor, entry);
		}
		entry.users++;
		const shared = entry;
		let released = false;
		const release = () => {
			if (released) return;
			released = true;
			if (--shared.users === 0) shared.dispose();
		};
		ctx.signal.addEventListener("abort", release, { once: true });
		return {
			element: shared.element,
			release
		};
	}
	var reactions = [
		{
			title: "点赞",
			icon: "good-one"
		},
		{
			title: "加鸡腿",
			icon: "chicken-leg"
		},
		{
			title: "反对",
			icon: "bad-one"
		},
		{
			title: "收藏",
			icon: "star-6negdgdk"
		}
	];
	function postURL(href, base) {
		try {
			const url = new URL(href, base);
			const match = url.pathname.match(/^\/post-(\d+)(?:-\d+)?(?:\.html)?\/?$/);
			if (url.origin !== new URL(base).origin || !match) return null;
			return new URL(`/post-${match[1]}-1`, base);
		} catch {
			return null;
		}
	}
	function reactionCounts(root) {
		const menu = root.querySelector(".nsk-post .comment-menu, .comment-menu");
		return reactions.map(({ title }) => {
			const text = menu?.querySelector(`[title="${title}"] span`)?.textContent?.trim();
			return text && /^\d+$/.test(text) ? Number(text) : null;
		});
	}
	function siteIcon(name) {
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("class", "iconpark-icon");
		svg.setAttribute("aria-hidden", "true");
		const use = document.createElementNS(svg.namespaceURI, "use");
		use.setAttribute("href", `#${name}`);
		svg.append(use);
		return svg;
	}
	var userBadges = {
		id: "user-level",
		title: "等级、信任分与身份徽章",
		description: "显示等级、加入天数与可查看明细的本地信任参考分，并突出管理员、站点创建者与拥有者身份。",
		group: "用户",
		defaults: {
			enabled: true,
			colors: "original",
			levelColor: "#9198a1",
			trustColor: "#9198a1",
			roleColor: "#9198a1"
		},
		fields: {
			colors: {
				label: "徽章配色",
				type: "select",
				options: [
					{
						label: "原有彩色（默认）",
						value: "original"
					},
					{
						label: "自定义",
						value: "custom"
					},
					{
						label: "柔和单色",
						value: "muted"
					}
				]
			},
			levelColor: {
				label: "等级与加入天数颜色",
				type: "color"
			},
			trustColor: {
				label: "信任分颜色",
				type: "color"
			},
			roleColor: {
				label: "身份徽章颜色",
				type: "color"
			}
		},
		mount(ctx) {
			const colorStyle = document.createElement("style");
			if (ctx.get("colors") !== "original") {
				const color = (key) => ctx.get("colors") === "custom" && /^#[0-9a-f]{6}$/i.test(ctx.get(key)) ? ctx.get(key) : "var(--nspp-muted, #9198a1)";
				colorStyle.textContent = `.nspp-user-badges .nspp-level,.nspp-user-badges .nspp-age{color:${color("levelColor")}!important;background:transparent!important;box-shadow:none!important}.nspp-user-badges .nspp-trust{color:${color("trustColor")}!important;background:transparent!important;box-shadow:none!important}.role-tag[data-nspp-role]{color:${color("roleColor")}!important;background:transparent!important;box-shadow:none!important}`;
				document.head.append(colorStyle);
			}
			let scoreDialog;
			const roles = new Map();
			const fresh = (entry) => !!entry && entry.withSignature === true && Number.isFinite(entry.time) && Date.now() >= entry.time && Date.now() - entry.time < 864e5;
			const cache = new Map();
			const inflight = new Map();
			const nodes = new Map();
			const getProfile = (id) => {
				const cached = cache.get(id);
				if (fresh(cached)) return Promise.resolve(cached.user);
				cache.delete(id);
				if (inflight.has(id)) return inflight.get(id);
				const stored = ctx.get("profiles") || {};
				if (fresh(stored[id])) {
					cache.set(id, stored[id]);
					return Promise.resolve(stored[id].user);
				}
				const request = ctx.request(`/api/account/getInfo/${id}?signature=1`).then((result) => {
					if (!result?.success || !result.detail || typeof result.detail !== "object") throw new Error("资料不可用");
					const entry = {
						time: Date.now(),
						user: result.detail,
						withSignature: true
					};
					cache.set(id, entry);
					const latest = ctx.get("profiles") || {};
					latest[id] = entry;
					ctx.set("profiles", Object.fromEntries(Object.entries(latest).filter(([, value]) => fresh(value))));
					return result.detail;
				});
				inflight.set(id, request);
				request.then(() => inflight.delete(id), () => inflight.delete(id));
				return request;
			};
			const load = async (author, id, badge) => {
				badge.setAttribute("aria-busy", "true");
				badge.textContent = "加载中";
				try {
					const user = await getProfile(id);
					if (ctx.signal.aborted || !author.isConnected || nodes.get(author)?.badge !== badge) return;
					const info = registration(user);
					const profileDetails = nodes.get(author).details;
					profileDetails.replaceChildren();
					for (const [label, value, icon] of [
						[
							"等级",
							info.level === null ? "—" : `Lv ${info.level}`,
							"level"
						],
						[
							"主题帖",
							String(user.nPost ?? "—"),
							"write-6ncdp62p"
						],
						[
							"鸡腿",
							String(user.coin ?? "—"),
							"chicken-leg"
						],
						[
							"评论数",
							String(user.nComment ?? "—"),
							"comments-6ncdh3ka"
						],
						[
							"星辰",
							String(user.stardust ?? "—"),
							"wallet"
						],
						[
							"粉丝",
							String(user.fans ?? "—"),
							"concern"
						]
					]) {
						const cell = document.createElement("div");
						const term = document.createElement("dt");
						term.textContent = label;
						term.prepend(siteIcon(icon));
						const valueNode = document.createElement("dd");
						valueNode.textContent = value;
						if (label === "等级") {
							valueNode.className = "nspp-user-badges";
							const badgeValue = document.createElement("span");
							badgeValue.className = "nspp-level";
							badgeValue.dataset.level = String(info.level ?? "unknown");
							badgeValue.textContent = value;
							valueNode.replaceChildren(badgeValue);
						}
						cell.append(term, valueNode);
						profileDetails.append(cell);
					}
					badge.replaceChildren();
					const level = document.createElement("span");
					level.className = "nspp-level";
					level.textContent = info.level === null ? "Lv?" : `Lv${info.level}`;
					level.prepend(siteIcon("level"));
					level.dataset.level = String(info.level ?? "unknown");
					const age = document.createElement("button");
					age.type = "button";
					age.dataset.tone = info.tone;
					age.className = "nspp-age";
					age.textContent = info.days === null ? "加入时间未知" : `${info.days}天`;
					age.prepend(siteIcon("calendar-thirty"));
					age.title = [
						info.days === null ? "注册时长未知" : `已加入 ${info.days} 天`,
						Number.isFinite(info.timestamp) ? `加入于 ${new Date(info.timestamp).toLocaleDateString("zh-CN")}` : "注册时间未知",
						`发帖 ${user.nPost ?? "—"} · 评论 ${user.nComment ?? "—"}`
					].join("\n");
					age.setAttribute("aria-label", `${age.textContent}，查看注册资料`);
					age.addEventListener("click", () => {
						scoreDialog?.remove();
						scoreDialog = document.createElement("dialog");
						scoreDialog.className = "nspp-history nspp-profile-dialog";
						scoreDialog.setAttribute("aria-label", "注册资料");
						const header = document.createElement("header");
						const heading = document.createElement("h2");
						heading.textContent = "注册资料";
						const close = document.createElement("button");
						close.type = "button";
						close.textContent = "关闭";
						close.addEventListener("click", () => scoreDialog?.close(), { signal: ctx.signal });
						header.append(heading, close);
						const summary = document.createElement("div");
						summary.className = "nspp-profile-summary";
						const duration = document.createElement("strong");
						duration.textContent = info.days === null ? "时间未知" : `${info.days} 天`;
						const stage = document.createElement("span");
						stage.className = "nspp-age";
						stage.dataset.tone = info.tone;
						stage.textContent = info.label;
						summary.append(duration, stage);
						const data = document.createElement("dl");
						for (const [label, value] of [
							["论坛存续", `${forumAge()} 天`],
							["注册日期", info.days !== null ? new Date(info.timestamp).toLocaleDateString("zh-CN") : "未知"],
							["发帖", String(user.nPost ?? "—")],
							["评论", String(user.nComment ?? "—")]
						]) {
							const term = document.createElement("dt");
							term.textContent = label;
							const detail = document.createElement("dd");
							detail.textContent = value;
							data.append(term, detail);
						}
						scoreDialog.append(header, summary, data);
						if (info.tone === "new" || info.tone === "recent") {
							const note = document.createElement("p");
							note.textContent = "新加入的成员，参与记录尚少；交易前请核实信息。";
							scoreDialog.append(note);
						}
						document.body.append(scoreDialog);
						scoreDialog.showModal();
					}, { signal: ctx.signal });
					const trust = trustScore(user);
					const score = document.createElement("button");
					score.type = "button";
					score.className = "nspp-trust";
					score.textContent = trust ? String(trust.score) : "—";
					score.dataset.tier = !trust ? "unknown" : trust.score === 100 ? "perfect" : trust.score >= 70 ? "success" : trust.score >= 40 ? "warning" : "danger";
					score.prepend(siteIcon("crown-two"));
					const details = `${trust ? `信任分 ${trust.score}/100\n注册时长 ${trust.age.toFixed(1)}/35 · 主题帖 ${trust.posts.toFixed(1)}/20 · 评论 ${trust.comments.toFixed(1)}/20\n鸡腿 ${trust.coin.toFixed(1)}/10 · 星辰 ${trust.stardust.toFixed(1)}/10 · 粉丝 ${trust.fans.toFixed(1)}/5` : "资料不足：需要注册日期、主题帖、评论、鸡腿、星辰和粉丝数据。"}\n\n规则 v4：注册时长按 √(天数 / 730) × 35 计算，最多 35 分；其余指标按 ln(1 + 数量) / ln(1 + 上限) × 权重计算。上限：主题帖 300、评论 2000、鸡腿 6000、星辰 500、粉丝 50。负余额按 0 计算；等级不重复加分；缺少数据不评分。\n\n这是社区资料参考分，余额可转移，粉丝和发言数量不等于交易信用。`;
					score.title = details;
					score.setAttribute("aria-label", `信任分 ${trust?.score ?? "未知"}，查看评分依据`);
					score.addEventListener("click", () => {
						scoreDialog?.remove();
						scoreDialog = document.createElement("dialog");
						scoreDialog.className = "nspp-history nspp-trust-dialog";
						scoreDialog.setAttribute("aria-label", "信任分依据");
						const heading = document.createElement("h2");
						heading.textContent = "信任分依据";
						const body = document.createElement("p");
						body.textContent = details;
						const close = document.createElement("button");
						close.type = "button";
						close.textContent = "关闭";
						close.addEventListener("click", () => scoreDialog?.close(), { signal: ctx.signal });
						scoreDialog.append(heading, body, close);
						document.body.append(scoreDialog);
						scoreDialog.showModal();
					}, { signal: ctx.signal });
					badge.append(score, age, level);
					const card = profileDetails.parentElement;
					card.dataset.trust = !trust ? "unknown" : trust.score === 100 ? "perfect" : trust.score >= 70 ? "success" : trust.score >= 40 ? "warning" : "danger";
					card.querySelector(".nspp-user-hover-signature")?.remove();
					const signatureText = [
						user.bio,
						user.introduction,
						user.signature_text,
						user.signature
					].find((value) => typeof value === "string" && value.trim());
					if (signatureText) {
						const signature = document.createElement("p");
						signature.className = "nspp-user-hover-signature";
						signature.textContent = signatureText.trim();
						card.querySelector(".nspp-user-hover-header").after(signature);
					}
					card.querySelector(".nspp-user-hover-score")?.remove();
					const headline = document.createElement("button");
					headline.type = "button";
					headline.className = "nspp-user-hover-score";
					headline.setAttribute("aria-label", `信任分 ${trust?.score ?? "未知"}，查看评分依据`);
					const number = document.createElement("strong");
					number.textContent = trust ? String(trust.score) : "—";
					const scoreLabel = document.createElement("small");
					scoreLabel.textContent = "信任分";
					headline.append(number, scoreLabel);
					headline.addEventListener("click", () => score.click(), { signal: ctx.signal });
					card.querySelector(".nspp-user-hover-header").append(headline);
					card.querySelector(".nspp-user-hover-rich")?.remove();
					const rich = document.createElement("div");
					rich.className = "nspp-user-hover-rich nspp-user-badges";
					const duration = age.cloneNode(true);
					duration.removeAttribute("title");
					const dayCount = document.createElement("strong");
					dayCount.textContent = info.days === null ? "未知" : String(info.days);
					duration.replaceChildren(siteIcon("calendar-thirty"), document.createTextNode("加入 "), dayCount, document.createTextNode(info.days === null ? "" : " 天"));
					duration.addEventListener("click", () => age.click(), { signal: ctx.signal });
					const joined = document.createElement("span");
					joined.textContent = `注册 ${info.days === null ? "未知" : format(new Date(info.timestamp), "yyyy-MM-dd")}`;
					rich.append(duration, joined);
					profileDetails.after(rich);
				} catch {
					if (ctx.signal.aborted || !badge.isConnected) return;
					const details = nodes.get(author)?.details;
					if (details) details.textContent = "资料读取失败，可点击用户名旁的重试。";
					const retry = document.createElement("button");
					retry.type = "button";
					retry.textContent = "重试资料";
					retry.addEventListener("click", () => {
						load(author, id, badge);
					}, { signal: ctx.signal });
					badge.replaceChildren(retry);
				} finally {
					badge.removeAttribute("aria-busy");
				}
			};
			const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver((entries) => {
				for (const entry of entries) if (entry.isIntersecting) {
					observer?.unobserve(entry.target);
					const state = nodes.get(entry.target);
					if (state) load(entry.target, state.id, state.badge);
				}
			}, { rootMargin: "200px" }) : null;
			const scan = () => {
				document.querySelectorAll(".role-tag:not(.user-level)").forEach((tag) => {
					const text = tag.textContent?.trim();
					const role = text === "管理员" || text === "管理" ? "admin" : text === "站点创建者" || text === "创建者" ? "founder" : text === "服主" || text === "拥有者" || text === "所有者" || text === "站点拥有者" ? "owner" : void 0;
					if (role) {
						if (!roles.has(tag)) roles.set(tag, tag.getAttribute("data-nspp-role"));
						if (tag.getAttribute("data-nspp-role") !== role) tag.setAttribute("data-nspp-role", role);
					} else if (roles.has(tag)) {
						const original = roles.get(tag);
						if (original === null) tag.removeAttribute("data-nspp-role");
						else if (original !== void 0) tag.setAttribute("data-nspp-role", original);
						roles.delete(tag);
					}
				});
				for (const tag of roles.keys()) if (!tag.isConnected) roles.delete(tag);
				for (const [author, state] of nodes) if (!author.isConnected) {
					observer?.unobserve(author);
					state.badge.remove();
					state.details.remove();
					state.release();
					nodes.delete(author);
				}
				document.querySelectorAll(userHoverSelector).forEach((author) => {
					if (!isUserHoverAnchor(author)) return;
					if (author.closest(".nspp-user-hover, .nspp-profile-dialog")) return;
					if (!author.textContent?.trim() && !author.querySelector("img")) return;
					const id = authorId(author, location.origin);
					if (!id) return;
					const previous = nodes.get(author);
					if (previous?.id === id && previous.badge.isConnected) return;
					previous?.badge.remove();
					previous?.details.remove();
					previous?.release();
					const badge = document.createElement("span");
					badge.className = "nspp-user-badges";
					badge.setAttribute("aria-label", "用户资料");
					badge.hidden = !!author.closest(".info-last-commenter") || !!author.querySelector("img") || !author.matches(".author-info a, a.info-author, .info-author a, a.post-author, .post-author a, .nsk-content-meta-info a");
					const hover = userHover(author, ctx);
					const details = document.createElement("dl");
					details.textContent = "正在读取用户资料…";
					hover.element.insertBefore(details, hover.element.querySelector(".nspp-user-hover-actions, :scope > .nspp-block-toggle"));
					author.after(badge);
					nodes.set(author, {
						id,
						badge,
						details,
						release: hover.release
					});
					if (badge.hidden) {
						let started = false;
						const start = () => {
							if (!started) {
								started = true;
								load(author, id, badge);
							}
						};
						author.addEventListener("mouseenter", start, { signal: ctx.signal });
						author.addEventListener("focus", start, { signal: ctx.signal });
						author.addEventListener("click", start, { signal: ctx.signal });
						return;
					}
					const rect = author.getBoundingClientRect();
					if (!observer || rect.bottom >= 0 && rect.top <= innerHeight + 200) load(author, id, badge);
					else observer.observe(author);
				});
			};
			const stop = ctx.watch(scan);
			return () => {
				stop();
				colorStyle.remove();
				scoreDialog?.remove();
				roles.forEach((original, tag) => {
					if (original === null) tag.removeAttribute("data-nspp-role");
					else tag.setAttribute("data-nspp-role", original);
				});
				observer?.disconnect();
				nodes.forEach(({ badge, details, release }) => {
					badge.remove();
					details.remove();
					release();
				});
			};
		}
	};
	var authorSelector = ".author-info > a[href*=\"/space/\"], .info-author, .post-author";
	var filteringFeatures = [
		{
			id: "hide-sidebar-ads",
			title: "屏蔽侧栏广告",
			description: "隐藏侧栏广告卡片，保留版块简介与其他正常内容。",
			group: "外观",
			defaults: { enabled: true },
			mount() {
				const style = document.createElement("style");
				style.textContent = ".promotation-item { display: none !important; }";
				document.head.append(style);
				return () => style.remove();
			}
		},
		{
			id: "content-filter",
			title: "帖子与用户过滤",
			description: "关键词按标题包含匹配，用户按名称精确匹配；等级过滤仅隐藏超过当前等级的锁定帖子。",
			group: "过滤",
			defaults: {
				enabled: true,
				keywords: "",
				users: "",
				level: -1,
				mode: "hide",
				highlight: false
			},
			fields: {
				mode: {
					label: "过滤方式",
					type: "select",
					options: [
						{
							label: "隐藏",
							value: "hide"
						},
						{
							label: "折叠，可展开",
							value: "collapse"
						},
						{
							label: "保留，只高亮",
							value: "highlight"
						}
					]
				},
				highlight: {
					label: "高亮匹配的标题关键词",
					type: "text"
				},
				keywords: {
					label: "屏蔽标题关键词（每行一个）",
					type: "textarea"
				},
				users: {
					label: "屏蔽用户名（每行一个）",
					type: "textarea"
				},
				level: {
					label: "当前等级（-1 不过滤锁定帖子）",
					type: "number"
				}
			},
			mount(ctx) {
				const keywords = filterLines(ctx.get("keywords")).map((s) => s.toLowerCase()), users = filterLines(ctx.get("users"));
				const hidden = new Map();
				const seen = new WeakSet();
				const restore = [];
				const stop = ctx.watch(() => {
					document.querySelectorAll(".post-list-item, .comments .content-item").forEach((item) => {
						if (seen.has(item)) return;
						seen.add(item);
						const title = item.querySelector(".post-title a")?.textContent?.toLowerCase() || "";
						const author = item.querySelector(authorSelector)?.textContent?.trim() || "";
						const lock = item.querySelector("use[href=\"#lock\"]");
						const required = Number(lock?.closest("span")?.textContent?.match(/\d+/)?.[0] ?? NaN);
						const level = Number(ctx.get("level"));
						if (shouldFilter(title, author, keywords, users, level, required)) {
							const mode = ctx.get("mode");
							if (mode !== "highlight") {
								hidden.set(item, item.hidden);
								item.hidden = true;
								if (mode === "collapse") {
									const placeholder = document.createElement(item.tagName === "LI" ? "li" : "div");
									const button = document.createElement("button");
									button.type = "button";
									button.textContent = "已过滤内容，点击展开";
									button.setAttribute("aria-expanded", "false");
									button.addEventListener("click", () => {
										item.hidden = !item.hidden;
										button.setAttribute("aria-expanded", String(!item.hidden));
										button.textContent = item.hidden ? "已过滤内容，点击展开" : "收起过滤内容";
									}, { signal: ctx.signal });
									placeholder.append(button);
									item.before(placeholder);
									restore.push(() => placeholder.remove());
								}
							}
							if (ctx.get("highlight") || mode === "highlight") {
								const anchor = item.querySelector(".post-title a");
								if (anchor) {
									const walker = document.createTreeWalker(anchor, NodeFilter.SHOW_TEXT);
									const nodes = [];
									while (walker.nextNode()) nodes.push(walker.currentNode);
									for (const node of nodes) {
										const text = node.data;
										const ranges = [];
										for (const keyword of keywords) {
											let at = text.toLowerCase().indexOf(keyword);
											while (at >= 0) {
												ranges.push([at, at + keyword.length]);
												at = text.toLowerCase().indexOf(keyword, at + keyword.length);
											}
										}
										if (!ranges.length) continue;
										ranges.sort((a, b) => a[0] - b[0]);
										const fragment = document.createDocumentFragment();
										let offset = 0;
										for (const [start, end] of ranges) {
											if (start < offset) continue;
											fragment.append(text.slice(offset, start));
											const mark = document.createElement("mark");
											mark.textContent = text.slice(start, end);
											fragment.append(mark);
											offset = end;
										}
										fragment.append(text.slice(offset));
										const inserted = Array.from(fragment.childNodes);
										node.replaceWith(fragment);
										restore.push(() => {
											inserted[0]?.before(node);
											inserted.forEach((child) => child.remove());
										});
									}
								}
							}
						}
					});
				});
				return () => {
					stop();
					hidden.forEach((value, item) => {
						item.hidden = value;
					});
					restore.reverse().forEach((fn) => fn());
				};
			}
		},
		{
			id: "user-notes",
			title: "用户备注",
			description: "仅保存在本机，用户名后显示备注；可在设置中编辑。",
			group: "用户",
			defaults: {
				enabled: true,
				notes: ""
			},
			fields: { notes: {
				label: "备注（每行 用户名=备注）",
				type: "textarea"
			} },
			mount(ctx) {
				const notes = new Map(String(ctx.get("notes") || "").split("\n").flatMap((line) => {
					const index = line.indexOf("=");
					return index > 0 ? [[line.slice(0, index).trim(), line.slice(index + 1).trim()]] : [];
				}));
				const seen = new WeakSet(), added = [];
				const stop = ctx.watch(() => document.querySelectorAll(authorSelector).forEach((author) => {
					if (seen.has(author)) return;
					seen.add(author);
					const note = notes.get(author.textContent?.trim() || "");
					if (!note) return;
					const badge = document.createElement("span");
					badge.textContent = ` [${note}]`;
					badge.className = "nspp-user-note";
					author.after(badge);
					added.push(badge);
				}));
				return () => {
					stop();
					added.forEach((el) => el.remove());
				};
			}
		},
		userBadges
	];
	function _assertThisInitialized(self) {
		if (self === void 0) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
		return self;
	}
	function _inheritsLoose(subClass, superClass) {
		subClass.prototype = Object.create(superClass.prototype);
		subClass.prototype.constructor = subClass;
		subClass.__proto__ = superClass;
	}
	var _config = {
		autoSleep: 120,
		force3D: "auto",
		nullTargetWarn: 1,
		units: { lineHeight: "" }
	};
	var _defaults = {
		duration: .5,
		overwrite: false,
		delay: 0
	};
	var _suppressOverwrites;
	var _reverting$1;
	var _context;
	var _bigNum$1 = 1e8;
	var _tinyNum = 1 / _bigNum$1;
	var _2PI = Math.PI * 2;
	var _HALF_PI = _2PI / 4;
	var _gsID = 0;
	var _sqrt = Math.sqrt;
	var _cos = Math.cos;
	var _sin = Math.sin;
	var _isString = function _isString(value) {
		return typeof value === "string";
	};
	var _isFunction = function _isFunction(value) {
		return typeof value === "function";
	};
	var _isNumber = function _isNumber(value) {
		return typeof value === "number";
	};
	var _isUndefined = function _isUndefined(value) {
		return typeof value === "undefined";
	};
	var _isObject = function _isObject(value) {
		return typeof value === "object";
	};
	var _isNotFalse = function _isNotFalse(value) {
		return value !== false;
	};
	var _windowExists$1 = function _windowExists() {
		return typeof window !== "undefined";
	};
	var _isFuncOrString = function _isFuncOrString(value) {
		return _isFunction(value) || _isString(value);
	};
	var _isTypedArray = typeof ArrayBuffer === "function" && ArrayBuffer.isView || function() {};
	var _isArray = Array.isArray;
	var _randomExp = /random\([^)]+\)/g;
	var _commaDelimExp = /,\s*/g;
	var _strictNumExp = /(?:-?\.?\d|\.)+/gi;
	var _numExp = /[-+=.]*\d+[.e\-+]*\d*[e\-+]*\d*/g;
	var _numWithUnitExp = /[-+=.]*\d+[.e-]*\d*[a-z%]*/g;
	var _complexStringNumExp = /[-+=.]*\d+\.?\d*(?:e-|e\+)?\d*/gi;
	var _relExp = /[+-]=-?[.\d]+/;
	var _delimitedValueExp = /[^,'"\[\]\s]+/gi;
	var _unitExp = /^[+\-=e\s\d]*\d+[.\d]*([a-z]*|%)\s*$/i;
	var _globalTimeline;
	var _win$1;
	var _coreInitted;
	var _doc$1;
	var _globals = {};
	var _installScope = {};
	var _coreReady;
	var _install = function _install(scope) {
		return (_installScope = _merge(scope, _globals)) && gsap;
	};
	var _missingPlugin = function _missingPlugin(property, value) {
		return console.warn("Invalid property", property, "set to", value, "Missing plugin? gsap.registerPlugin()");
	};
	var _warn = function _warn(message, suppress) {
		return !suppress && console.warn(message);
	};
	var _addGlobal = function _addGlobal(name, obj) {
		return name && (_globals[name] = obj) && _installScope && (_installScope[name] = obj) || _globals;
	};
	var _emptyFunc = function _emptyFunc() {
		return 0;
	};
	var _startAtRevertConfig = {
		suppressEvents: true,
		isStart: true,
		kill: false
	};
	var _revertConfigNoKill = {
		suppressEvents: true,
		kill: false
	};
	var _revertConfig = { suppressEvents: true };
	var _reservedProps = {};
	var _lazyTweens = [];
	var _lazyLookup = {};
	var _lastRenderedFrame;
	var _plugins = {};
	var _effects = {};
	var _nextGCFrame = 30;
	var _harnessPlugins = [];
	var _callbackNames = "";
	var _harness = function _harness(targets) {
		var target = targets[0], harnessPlugin, i;
		_isObject(target) || _isFunction(target) || (targets = [targets]);
		if (!(harnessPlugin = (target._gsap || {}).harness)) {
			i = _harnessPlugins.length;
			while (i-- && !_harnessPlugins[i].targetTest(target));
			harnessPlugin = _harnessPlugins[i];
		}
		i = targets.length;
		while (i--) targets[i] && (targets[i]._gsap || (targets[i]._gsap = new GSCache(targets[i], harnessPlugin))) || targets.splice(i, 1);
		return targets;
	};
	var _getCache = function _getCache(target) {
		return target._gsap || _harness(toArray(target))[0]._gsap;
	};
	var _getProperty = function _getProperty(target, property, v) {
		return (v = target[property]) && _isFunction(v) ? target[property]() : _isUndefined(v) && target.getAttribute && target.getAttribute(property) || v;
	};
	var _forEachName = function _forEachName(names, func) {
		return (names = names.split(",")).forEach(func) || names;
	};
	var _round = function _round(value) {
		return Math.round(value * 1e5) / 1e5 || 0;
	};
	var _roundPrecise = function _roundPrecise(value) {
		return Math.round(value * 1e7) / 1e7 || 0;
	};
	var _parseRelative = function _parseRelative(start, value) {
		var operator = value.charAt(0), end = parseFloat(value.substr(2));
		start = parseFloat(start);
		return operator === "+" ? start + end : operator === "-" ? start - end : operator === "*" ? start * end : start / end;
	};
	var _arrayContainsAny = function _arrayContainsAny(toSearch, toFind) {
		var l = toFind.length, i = 0;
		for (; toSearch.indexOf(toFind[i]) < 0 && ++i < l;);
		return i < l;
	};
	var _lazyRender = function _lazyRender() {
		var l = _lazyTweens.length, a = _lazyTweens.slice(0), i, tween;
		_lazyLookup = {};
		_lazyTweens.length = 0;
		for (i = 0; i < l; i++) {
			tween = a[i];
			tween && tween._lazy && (tween.render(tween._lazy[0], tween._lazy[1], true)._lazy = 0);
		}
	};
	var _isRevertWorthy = function _isRevertWorthy(animation) {
		return !!(animation._initted || animation._startAt || animation.add);
	};
	var _lazySafeRender = function _lazySafeRender(animation, time, suppressEvents, force) {
		_lazyTweens.length && !_reverting$1 && _lazyRender();
		animation.render(time, suppressEvents, force || !!(_reverting$1 && time < 0 && _isRevertWorthy(animation)));
		_lazyTweens.length && !_reverting$1 && _lazyRender();
	};
	var _numericIfPossible = function _numericIfPossible(value) {
		var n = parseFloat(value);
		return (n || n === 0) && (value + "").match(_delimitedValueExp).length < 2 ? n : _isString(value) ? value.trim() : value;
	};
	var _passThrough = function _passThrough(p) {
		return p;
	};
	var _setDefaults = function _setDefaults(obj, defaults) {
		for (var p in defaults) p in obj || (obj[p] = defaults[p]);
		return obj;
	};
	var _setKeyframeDefaults = function _setKeyframeDefaults(excludeDuration) {
		return function(obj, defaults) {
			for (var p in defaults) p in obj || p === "duration" && excludeDuration || p === "ease" || (obj[p] = defaults[p]);
		};
	};
	var _merge = function _merge(base, toMerge) {
		for (var p in toMerge) base[p] = toMerge[p];
		return base;
	};
	var _mergeDeep = function _mergeDeep(base, toMerge) {
		for (var p in toMerge) p !== "__proto__" && p !== "constructor" && p !== "prototype" && (base[p] = _isObject(toMerge[p]) ? _mergeDeep(base[p] || (base[p] = {}), toMerge[p]) : toMerge[p]);
		return base;
	};
	var _copyExcluding = function _copyExcluding(obj, excluding) {
		var copy = {}, p;
		for (p in obj) p in excluding || (copy[p] = obj[p]);
		return copy;
	};
	var _inheritDefaults = function _inheritDefaults(vars) {
		var parent = vars.parent || _globalTimeline, func = vars.keyframes ? _setKeyframeDefaults(_isArray(vars.keyframes)) : _setDefaults;
		if (_isNotFalse(vars.inherit)) while (parent) {
			func(vars, parent.vars.defaults);
			parent = parent.parent || parent._dp;
		}
		return vars;
	};
	var _arraysMatch = function _arraysMatch(a1, a2) {
		var i = a1.length, match = i === a2.length;
		while (match && i-- && a1[i] === a2[i]);
		return i < 0;
	};
	var _addLinkedListItem = function _addLinkedListItem(parent, child, firstProp, lastProp, sortBy) {
		if (firstProp === void 0) firstProp = "_first";
		if (lastProp === void 0) lastProp = "_last";
		var prev = parent[lastProp], t;
		if (sortBy) {
			t = child[sortBy];
			while (prev && prev[sortBy] > t) prev = prev._prev;
		}
		if (prev) {
			child._next = prev._next;
			prev._next = child;
		} else {
			child._next = parent[firstProp];
			parent[firstProp] = child;
		}
		if (child._next) child._next._prev = child;
		else parent[lastProp] = child;
		child._prev = prev;
		child.parent = child._dp = parent;
		return child;
	};
	var _removeLinkedListItem = function _removeLinkedListItem(parent, child, firstProp, lastProp) {
		if (firstProp === void 0) firstProp = "_first";
		if (lastProp === void 0) lastProp = "_last";
		var prev = child._prev, next = child._next;
		if (prev) prev._next = next;
		else if (parent[firstProp] === child) parent[firstProp] = next;
		if (next) next._prev = prev;
		else if (parent[lastProp] === child) parent[lastProp] = prev;
		child._next = child._prev = child.parent = null;
	};
	var _removeFromParent = function _removeFromParent(child, onlyIfParentHasAutoRemove) {
		child.parent && (!onlyIfParentHasAutoRemove || child.parent.autoRemoveChildren) && child.parent.remove && child.parent.remove(child);
		child._act = 0;
	};
	var _uncache = function _uncache(animation, child) {
		if (animation && (!child || child._end > animation._dur || child._start < 0)) {
			var a = animation;
			while (a) {
				a._dirty = 1;
				a = a.parent;
			}
		}
		return animation;
	};
	var _recacheAncestors = function _recacheAncestors(animation) {
		var parent = animation.parent;
		while (parent && parent.parent) {
			parent._dirty = 1;
			parent.totalDuration();
			parent = parent.parent;
		}
		return animation;
	};
	var _rewindStartAt = function _rewindStartAt(tween, totalTime, suppressEvents, force) {
		return tween._startAt && (_reverting$1 ? tween._startAt.revert(_revertConfigNoKill) : tween.vars.immediateRender && !tween.vars.autoRevert || tween._startAt.render(totalTime, true, force));
	};
	var _hasNoPausedAncestors = function _hasNoPausedAncestors(animation) {
		return !animation || animation._ts && _hasNoPausedAncestors(animation.parent);
	};
	var _elapsedCycleDuration = function _elapsedCycleDuration(animation) {
		return animation._repeat ? _animationCycle(animation._tTime, animation = animation.duration() + animation._rDelay) * animation : 0;
	};
	var _animationCycle = function _animationCycle(tTime, cycleDuration) {
		var whole = Math.floor(tTime = _roundPrecise(tTime / cycleDuration));
		return tTime && whole === tTime ? whole - 1 : whole;
	};
	var _parentToChildTotalTime = function _parentToChildTotalTime(parentTime, child) {
		return (parentTime - child._start) * child._ts + (child._ts >= 0 ? 0 : child._dirty ? child.totalDuration() : child._tDur);
	};
	var _setEnd = function _setEnd(animation) {
		return animation._end = _roundPrecise(animation._start + (animation._tDur / Math.abs(animation._ts || animation._rts || _tinyNum) || 0));
	};
	var _alignPlayhead = function _alignPlayhead(animation, totalTime) {
		var parent = animation._dp;
		if (parent && parent.smoothChildTiming && animation._ts) {
			animation._start = _roundPrecise(parent._time - (animation._ts > 0 ? totalTime / animation._ts : ((animation._dirty ? animation.totalDuration() : animation._tDur) - totalTime) / -animation._ts));
			_setEnd(animation);
			parent._dirty || _uncache(parent, animation);
		}
		return animation;
	};
	var _postAddChecks = function _postAddChecks(timeline, child) {
		var t;
		if (child._time || !child._dur && child._initted || child._start < timeline._time && (child._dur || !child.add)) {
			t = _parentToChildTotalTime(timeline.rawTime(), child);
			if (!child._dur || _clamp(0, child.totalDuration(), t) - child._tTime > _tinyNum) child.render(t, true);
		}
		if (_uncache(timeline, child)._dp && timeline._initted && timeline._time >= timeline._dur && timeline._ts) {
			if (timeline._dur < timeline.duration()) {
				t = timeline;
				while (t._dp) {
					t.rawTime() >= 0 && t.totalTime(t._tTime);
					t = t._dp;
				}
			}
			timeline._zTime = -_tinyNum;
		}
	};
	var _addToTimeline = function _addToTimeline(timeline, child, position, skipChecks) {
		child.parent && _removeFromParent(child);
		child._start = _roundPrecise((_isNumber(position) ? position : position || timeline !== _globalTimeline ? _parsePosition(timeline, position, child) : timeline._time) + child._delay);
		child._end = _roundPrecise(child._start + (child.totalDuration() / Math.abs(child.timeScale()) || 0));
		_addLinkedListItem(timeline, child, "_first", "_last", timeline._sort ? "_start" : 0);
		_isFromOrFromStart(child) || (timeline._recent = child);
		skipChecks || _postAddChecks(timeline, child);
		timeline._ts < 0 && _alignPlayhead(timeline, timeline._tTime);
		return timeline;
	};
	var _scrollTrigger = function _scrollTrigger(animation, trigger) {
		return (_globals.ScrollTrigger || _missingPlugin("scrollTrigger", trigger)) && _globals.ScrollTrigger.create(trigger, animation);
	};
	var _attemptInitTween = function _attemptInitTween(tween, time, force, suppressEvents, tTime) {
		_initTween(tween, time, tTime);
		if (!tween._initted) return 1;
		if (!force && tween._pt && !_reverting$1 && (tween._dur && tween.vars.lazy !== false || !tween._dur && tween.vars.lazy) && _lastRenderedFrame !== _ticker.frame) {
			_lazyTweens.push(tween);
			tween._lazy = [tTime, suppressEvents];
			return 1;
		}
	};
	var _parentPlayheadIsBeforeStart = function _parentPlayheadIsBeforeStart(_ref) {
		var parent = _ref.parent;
		return parent && parent._ts && parent._initted && !parent._lock && (parent.rawTime() < 0 || _parentPlayheadIsBeforeStart(parent));
	};
	var _isFromOrFromStart = function _isFromOrFromStart(_ref2) {
		var data = _ref2.data;
		return data === "isFromStart" || data === "isStart";
	};
	var _renderZeroDurationTween = function _renderZeroDurationTween(tween, totalTime, suppressEvents, force) {
		var prevRatio = tween.ratio, ratio = totalTime < 0 || !totalTime && (!tween._start && _parentPlayheadIsBeforeStart(tween) && !(!tween._initted && _isFromOrFromStart(tween)) || (tween._ts < 0 || tween._dp._ts < 0) && !_isFromOrFromStart(tween)) ? 0 : 1, repeatDelay = tween._rDelay, tTime = 0, pt, iteration, prevIteration;
		if (repeatDelay && tween._repeat) {
			tTime = _clamp(0, tween._tDur, totalTime);
			iteration = _animationCycle(tTime, repeatDelay);
			tween._yoyo && iteration & 1 && (ratio = 1 - ratio);
			if (iteration !== _animationCycle(tween._tTime, repeatDelay)) {
				prevRatio = 1 - ratio;
				tween.vars.repeatRefresh && tween._initted && tween.invalidate();
			}
		}
		if (ratio !== prevRatio || _reverting$1 || force || tween._zTime === _tinyNum || !totalTime && tween._zTime) {
			if (!tween._initted && _attemptInitTween(tween, totalTime, force, suppressEvents, tTime)) return;
			prevIteration = tween._zTime;
			tween._zTime = totalTime || (suppressEvents ? _tinyNum : 0);
			suppressEvents || (suppressEvents = totalTime && !prevIteration);
			tween.ratio = ratio;
			tween._from && (ratio = 1 - ratio);
			tween._time = 0;
			tween._tTime = tTime;
			pt = tween._pt;
			while (pt) {
				pt.r(ratio, pt.d);
				pt = pt._next;
			}
			totalTime < 0 && _rewindStartAt(tween, totalTime, suppressEvents, true);
			tween._onUpdate && !suppressEvents && _callback(tween, "onUpdate");
			tTime && tween._repeat && !suppressEvents && tween.parent && _callback(tween, "onRepeat");
			if ((totalTime >= tween._tDur || totalTime < 0) && tween.ratio === ratio) {
				ratio && _removeFromParent(tween, 1);
				if (!suppressEvents && !_reverting$1) {
					_callback(tween, ratio ? "onComplete" : "onReverseComplete", true);
					tween._prom && tween._prom();
				}
			}
		} else if (!tween._zTime) tween._zTime = totalTime;
	};
	var _findNextPauseTween = function _findNextPauseTween(animation, prevTime, time) {
		var child;
		if (time > prevTime) {
			child = animation._first;
			while (child && child._start <= time) {
				if (child.data === "isPause" && child._start > prevTime) return child;
				child = child._next;
			}
		} else {
			child = animation._last;
			while (child && child._start >= time) {
				if (child.data === "isPause" && child._start < prevTime) return child;
				child = child._prev;
			}
		}
	};
	var _setDuration = function _setDuration(animation, duration, skipUncache, leavePlayhead) {
		var repeat = animation._repeat, dur = _roundPrecise(duration) || 0, totalProgress = animation._tTime / animation._tDur;
		totalProgress && !leavePlayhead && (animation._time *= dur / animation._dur);
		animation._dur = dur;
		animation._tDur = !repeat ? dur : repeat < 0 ? 1e10 : _roundPrecise(dur * (repeat + 1) + animation._rDelay * repeat);
		totalProgress > 0 && !leavePlayhead && _alignPlayhead(animation, animation._tTime = animation._tDur * totalProgress);
		animation.parent && _setEnd(animation);
		skipUncache || _uncache(animation.parent, animation);
		return animation;
	};
	var _onUpdateTotalDuration = function _onUpdateTotalDuration(animation) {
		return animation instanceof Timeline ? _uncache(animation) : _setDuration(animation, animation._dur);
	};
	var _zeroPosition = {
		_start: 0,
		endTime: _emptyFunc,
		totalDuration: _emptyFunc
	};
	var _parsePosition = function _parsePosition(animation, position, percentAnimation) {
		var labels = animation.labels, recent = animation._recent || _zeroPosition, clippedDuration = animation.duration() >= _bigNum$1 ? recent.endTime(false) : animation._dur, i, offset, isPercent;
		if (_isString(position) && (isNaN(position) || position in labels)) {
			offset = position.charAt(0);
			isPercent = position.substr(-1) === "%";
			i = position.indexOf("=");
			if (offset === "<" || offset === ">") {
				i >= 0 && (position = position.replace(/=/, ""));
				return (offset === "<" ? recent._start : recent.endTime(recent._repeat >= 0)) + (parseFloat(position.substr(1)) || 0) * (isPercent ? (i < 0 ? recent : percentAnimation).totalDuration() / 100 : 1);
			}
			if (i < 0) {
				position in labels || (labels[position] = clippedDuration);
				return labels[position];
			}
			offset = parseFloat(position.charAt(i - 1) + position.substr(i + 1));
			if (isPercent && percentAnimation) offset = offset / 100 * (_isArray(percentAnimation) ? percentAnimation[0] : percentAnimation).totalDuration();
			return i > 1 ? _parsePosition(animation, position.substr(0, i - 1), percentAnimation) + offset : clippedDuration + offset;
		}
		return position == null ? clippedDuration : +position;
	};
	var _createTweenType = function _createTweenType(type, params, timeline) {
		var isLegacy = _isNumber(params[1]), varsIndex = (isLegacy ? 2 : 1) + (type < 2 ? 0 : 1), vars = params[varsIndex], irVars, parent;
		isLegacy && (vars.duration = params[1]);
		vars.parent = timeline;
		if (type) {
			irVars = vars;
			parent = timeline;
			while (parent && !("immediateRender" in irVars)) {
				irVars = parent.vars.defaults || {};
				parent = _isNotFalse(parent.vars.inherit) && parent.parent;
			}
			vars.immediateRender = _isNotFalse(irVars.immediateRender);
			type < 2 ? vars.runBackwards = 1 : vars.startAt = params[varsIndex - 1];
		}
		return new Tween(params[0], vars, params[varsIndex + 1]);
	};
	var _conditionalReturn = function _conditionalReturn(value, func) {
		return value || value === 0 ? func(value) : func;
	};
	var _clamp = function _clamp(min, max, value) {
		return value < min ? min : value > max ? max : value;
	};
	var getUnit = function getUnit(value, v) {
		return !_isString(value) || !(v = _unitExp.exec(value)) ? "" : v[1];
	};
	var clamp = function clamp(min, max, value) {
		return _conditionalReturn(value, function(v) {
			return _clamp(min, max, v);
		});
	};
	var _slice = [].slice;
	var _isArrayLike = function _isArrayLike(value, nonEmpty) {
		return value && _isObject(value) && "length" in value && (!nonEmpty && !value.length || value.length - 1 in value && _isObject(value[0])) && !value.nodeType && value !== _win$1;
	};
	var _flatten = function _flatten(ar, leaveStrings, accumulator) {
		if (accumulator === void 0) accumulator = [];
		return ar.forEach(function(value) {
			var _accumulator;
			return _isString(value) && !leaveStrings || _isArrayLike(value, 1) ? (_accumulator = accumulator).push.apply(_accumulator, toArray(value)) : accumulator.push(value);
		}) || accumulator;
	};
	var toArray = function toArray(value, scope, leaveStrings) {
		return _context && !scope && _context.selector ? _context.selector(value) : _isString(value) && !leaveStrings && (_coreInitted || !_wake()) ? _slice.call((scope || _doc$1).querySelectorAll(value), 0) : _isArray(value) ? _flatten(value, leaveStrings) : _isArrayLike(value) ? _slice.call(value, 0) : value ? [value] : [];
	};
	var selector = function selector(value) {
		value = toArray(value)[0] || _warn("Invalid scope") || {};
		return function(v) {
			var el = value.current || value.nativeElement || value;
			return toArray(v, el.querySelectorAll ? el : el === value ? _warn("Invalid scope") || _doc$1.createElement("div") : value);
		};
	};
	var shuffle = function shuffle(a) {
		return a.sort(function() {
			return .5 - Math.random();
		});
	};
	var distribute = function distribute(v) {
		if (_isFunction(v)) return v;
		var vars = _isObject(v) ? v : { each: v }, ease = _parseEase(vars.ease), from = vars.from || 0, base = parseFloat(vars.base) || 0, cache = {}, isDecimal = from > 0 && from < 1, ratios = isNaN(from) || isDecimal, axis = vars.axis, ratioX = from, ratioY = from;
		if (_isString(from)) ratioX = ratioY = {
			center: .5,
			edges: .5,
			end: 1
		}[from] || 0;
		else if (!isDecimal && ratios) {
			ratioX = from[0];
			ratioY = from[1];
		}
		return function(i, target, a) {
			var l = (a || vars).length, distances = cache[l], originX, originY, x, y, d, j, max, min, wrapAt;
			if (!distances) {
				wrapAt = vars.grid === "auto" ? 0 : (vars.grid || [1, _bigNum$1])[1];
				if (!wrapAt) {
					max = -_bigNum$1;
					while (max < (max = a[wrapAt++].getBoundingClientRect().left) && wrapAt < l);
					wrapAt < l && wrapAt--;
				}
				distances = cache[l] = [];
				originX = ratios ? Math.min(wrapAt, l) * ratioX - .5 : from % wrapAt;
				originY = wrapAt === _bigNum$1 ? 0 : ratios ? l * ratioY / wrapAt - .5 : from / wrapAt | 0;
				max = 0;
				min = _bigNum$1;
				for (j = 0; j < l; j++) {
					x = j % wrapAt - originX;
					y = originY - (j / wrapAt | 0);
					distances[j] = d = !axis ? _sqrt(x * x + y * y) : Math.abs(axis === "y" ? y : x);
					d > max && (max = d);
					d < min && (min = d);
				}
				from === "random" && shuffle(distances);
				distances.max = max - min;
				distances.min = min;
				distances.v = l = (parseFloat(vars.amount) || parseFloat(vars.each) * (wrapAt > l ? l - 1 : !axis ? Math.max(wrapAt, l / wrapAt) : axis === "y" ? l / wrapAt : wrapAt) || 0) * (from === "edges" ? -1 : 1);
				distances.b = l < 0 ? base - l : base;
				distances.u = getUnit(vars.amount || vars.each) || 0;
				ease = ease && l < 0 ? _invertEase(ease) : ease;
			}
			l = (distances[i] - distances.min) / distances.max || 0;
			return _roundPrecise(distances.b + (ease ? ease(l) : l) * distances.v) + distances.u;
		};
	};
	var _roundModifier = function _roundModifier(v) {
		var p = Math.pow(10, ((v + "").split(".")[1] || "").length);
		return function(raw) {
			var n = _roundPrecise(Math.round(parseFloat(raw) / v) * v * p);
			return (n - n % 1) / p + (_isNumber(raw) ? 0 : getUnit(raw));
		};
	};
	var snap = function snap(snapTo, value) {
		var isArray = _isArray(snapTo), radius, is2D;
		if (!isArray && _isObject(snapTo)) {
			radius = isArray = snapTo.radius || _bigNum$1;
			if (snapTo.values) {
				snapTo = toArray(snapTo.values);
				if (is2D = !_isNumber(snapTo[0])) radius *= radius;
			} else snapTo = _roundModifier(snapTo.increment);
		}
		return _conditionalReturn(value, !isArray ? _roundModifier(snapTo) : _isFunction(snapTo) ? function(raw) {
			is2D = snapTo(raw);
			return Math.abs(is2D - raw) <= radius ? is2D : raw;
		} : function(raw) {
			var x = parseFloat(is2D ? raw.x : raw), y = parseFloat(is2D ? raw.y : 0), min = _bigNum$1, closest = 0, i = snapTo.length, dx, dy;
			while (i--) {
				if (is2D) {
					dx = snapTo[i].x - x;
					dy = snapTo[i].y - y;
					dx = dx * dx + dy * dy;
				} else dx = Math.abs(snapTo[i] - x);
				if (dx < min) {
					min = dx;
					closest = i;
				}
			}
			closest = !radius || min <= radius ? snapTo[closest] : raw;
			return is2D || closest === raw || _isNumber(raw) ? closest : closest + getUnit(raw);
		});
	};
	var random = function random(min, max, roundingIncrement, returnFunction) {
		return _conditionalReturn(_isArray(min) ? !max : roundingIncrement === true ? !!(roundingIncrement = 0) : !returnFunction, function() {
			return _isArray(min) ? min[~~(Math.random() * min.length)] : (roundingIncrement = roundingIncrement || 1e-5) && (returnFunction = roundingIncrement < 1 ? Math.pow(10, (roundingIncrement + "").length - 2) : 1) && Math.floor(Math.round((min - roundingIncrement / 2 + Math.random() * (max - min + roundingIncrement * .99)) / roundingIncrement) * roundingIncrement * returnFunction) / returnFunction;
		});
	};
	var pipe = function pipe() {
		for (var _len = arguments.length, functions = new Array(_len), _key = 0; _key < _len; _key++) functions[_key] = arguments[_key];
		return function(value) {
			return functions.reduce(function(v, f) {
				return f(v);
			}, value);
		};
	};
	var unitize = function unitize(func, unit) {
		return function(value) {
			return func(parseFloat(value)) + (unit || getUnit(value));
		};
	};
	var normalize = function normalize(min, max, value) {
		return mapRange(min, max, 0, 1, value);
	};
	var _wrapArray = function _wrapArray(a, wrapper, value) {
		return _conditionalReturn(value, function(index) {
			return a[~~wrapper(index)];
		});
	};
	var wrap = function wrap(min, max, value) {
		var range = max - min;
		return _isArray(min) ? _wrapArray(min, wrap(0, min.length), max) : _conditionalReturn(value, function(value) {
			return (range + (value - min) % range) % range + min;
		});
	};
	var wrapYoyo = function wrapYoyo(min, max, value) {
		var range = max - min, total = range * 2;
		return _isArray(min) ? _wrapArray(min, wrapYoyo(0, min.length - 1), max) : _conditionalReturn(value, function(value) {
			value = (total + (value - min) % total) % total || 0;
			return min + (value > range ? total - value : value);
		});
	};
	var _replaceRandom = function _replaceRandom(s) {
		return s.replace(_randomExp, function(match) {
			var arIndex = match.indexOf("[") + 1, values = match.substring(arIndex || 7, arIndex ? match.indexOf("]") : match.length - 1).split(_commaDelimExp);
			return random(arIndex ? values : +values[0], arIndex ? 0 : +values[1], +values[2] || 1e-5);
		});
	};
	var mapRange = function mapRange(inMin, inMax, outMin, outMax, value) {
		var inRange = inMax - inMin, outRange = outMax - outMin;
		return _conditionalReturn(value, function(value) {
			return outMin + ((value - inMin) / inRange * outRange || 0);
		});
	};
	var interpolate = function interpolate(start, end, progress, mutate) {
		var func = isNaN(start + end) ? 0 : function(p) {
			return (1 - p) * start + p * end;
		};
		if (!func) {
			var isString = _isString(start), master = {}, p, i, interpolators, l, il;
			progress === true && (mutate = 1) && (progress = null);
			if (isString) {
				start = { p: start };
				end = { p: end };
			} else if (_isArray(start) && !_isArray(end)) {
				interpolators = [];
				l = start.length;
				il = l - 2;
				for (i = 1; i < l; i++) interpolators.push(interpolate(start[i - 1], start[i]));
				l--;
				func = function func(p) {
					p *= l;
					var i = Math.min(il, ~~p);
					return interpolators[i](p - i);
				};
				progress = end;
			} else if (!mutate) start = _merge(_isArray(start) ? [] : {}, start);
			if (!interpolators) {
				for (p in end) _addPropTween.call(master, start, p, "get", end[p]);
				func = function func(p) {
					return _renderPropTweens(p, master) || (isString ? start.p : start);
				};
			}
		}
		return _conditionalReturn(progress, func);
	};
	var _getLabelInDirection = function _getLabelInDirection(timeline, fromTime, backward) {
		var labels = timeline.labels, min = _bigNum$1, p, distance, label;
		for (p in labels) {
			distance = labels[p] - fromTime;
			if (distance < 0 === !!backward && distance && min > (distance = Math.abs(distance))) {
				label = p;
				min = distance;
			}
		}
		return label;
	};
	var _callback = function _callback(animation, type, executeLazyFirst) {
		var v = animation.vars, callback = v[type], prevContext = _context, context = animation._ctx, params, scope, result;
		if (!callback) return;
		params = v[type + "Params"];
		scope = v.callbackScope || animation;
		executeLazyFirst && _lazyTweens.length && _lazyRender();
		context && (_context = context);
		result = params ? callback.apply(scope, params) : callback.call(scope);
		_context = prevContext;
		return result;
	};
	var _interrupt = function _interrupt(animation) {
		_removeFromParent(animation);
		animation.scrollTrigger && animation.scrollTrigger.kill(!!_reverting$1);
		animation.progress() < 1 && _callback(animation, "onInterrupt");
		return animation;
	};
	var _quickTween;
	var _registerPluginQueue = [];
	var _createPlugin = function _createPlugin(config) {
		if (!config) return;
		config = !config.name && config["default"] || config;
		if (_windowExists$1() || config.headless) {
			var name = config.name, isFunc = _isFunction(config), Plugin = name && !isFunc && config.init ? function() {
				this._props = [];
			} : config, instanceDefaults = {
				init: _emptyFunc,
				render: _renderPropTweens,
				add: _addPropTween,
				kill: _killPropTweensOf,
				modifier: _addPluginModifier,
				rawVars: 0
			}, statics = {
				targetTest: 0,
				get: 0,
				getSetter: _getSetter,
				aliases: {},
				register: 0
			};
			_wake();
			if (config !== Plugin) {
				if (_plugins[name]) return;
				_setDefaults(Plugin, _setDefaults(_copyExcluding(config, instanceDefaults), statics));
				_merge(Plugin.prototype, _merge(instanceDefaults, _copyExcluding(config, statics)));
				_plugins[Plugin.prop = name] = Plugin;
				if (config.targetTest) {
					_harnessPlugins.push(Plugin);
					_reservedProps[name] = 1;
				}
				name = (name === "css" ? "CSS" : name.charAt(0).toUpperCase() + name.substr(1)) + "Plugin";
			}
			_addGlobal(name, Plugin);
			config.register && config.register(gsap, Plugin, PropTween);
		} else _registerPluginQueue.push(config);
	};
	var _255 = 255;
	var _colorLookup = {
		aqua: [
			0,
			_255,
			_255
		],
		lime: [
			0,
			_255,
			0
		],
		silver: [
			192,
			192,
			192
		],
		black: [
			0,
			0,
			0
		],
		maroon: [
			128,
			0,
			0
		],
		teal: [
			0,
			128,
			128
		],
		blue: [
			0,
			0,
			_255
		],
		navy: [
			0,
			0,
			128
		],
		white: [
			_255,
			_255,
			_255
		],
		olive: [
			128,
			128,
			0
		],
		yellow: [
			_255,
			_255,
			0
		],
		orange: [
			_255,
			165,
			0
		],
		gray: [
			128,
			128,
			128
		],
		purple: [
			128,
			0,
			128
		],
		green: [
			0,
			128,
			0
		],
		red: [
			_255,
			0,
			0
		],
		pink: [
			_255,
			192,
			203
		],
		cyan: [
			0,
			_255,
			_255
		],
		transparent: [
			_255,
			_255,
			_255,
			0
		]
	};
	var _hue = function _hue(h, m1, m2) {
		h += h < 0 ? 1 : h > 1 ? -1 : 0;
		return (h * 6 < 1 ? m1 + (m2 - m1) * h * 6 : h < .5 ? m2 : h * 3 < 2 ? m1 + (m2 - m1) * (2 / 3 - h) * 6 : m1) * _255 + .5 | 0;
	};
	var splitColor = function splitColor(v, toHSL, forceAlpha) {
		var a = !v ? _colorLookup.black : _isNumber(v) ? [
			v >> 16,
			v >> 8 & _255,
			v & _255
		] : 0, r, g, b, h, s, l, max, min, d, wasHSL;
		if (!a) {
			if (v.substr(-1) === ",") v = v.substr(0, v.length - 1);
			if (_colorLookup[v]) a = _colorLookup[v];
			else if (v.charAt(0) === "#") {
				if (v.length < 6) {
					r = v.charAt(1);
					g = v.charAt(2);
					b = v.charAt(3);
					v = "#" + r + r + g + g + b + b + (v.length === 5 ? v.charAt(4) + v.charAt(4) : "");
				}
				if (v.length === 9) {
					a = parseInt(v.substr(1, 6), 16);
					return [
						a >> 16,
						a >> 8 & _255,
						a & _255,
						parseInt(v.substr(7), 16) / 255
					];
				}
				v = parseInt(v.substr(1), 16);
				a = [
					v >> 16,
					v >> 8 & _255,
					v & _255
				];
			} else if (v.substr(0, 3) === "hsl") {
				a = wasHSL = v.match(_strictNumExp);
				if (!toHSL) {
					h = +a[0] % 360 / 360;
					s = +a[1] / 100;
					l = +a[2] / 100;
					g = l <= .5 ? l * (s + 1) : l + s - l * s;
					r = l * 2 - g;
					a.length > 3 && (a[3] *= 1);
					a[0] = _hue(h + 1 / 3, r, g);
					a[1] = _hue(h, r, g);
					a[2] = _hue(h - 1 / 3, r, g);
				} else if (~v.indexOf("=")) {
					a = v.match(_numExp);
					forceAlpha && a.length < 4 && (a[3] = 1);
					return a;
				}
			} else a = v.match(_strictNumExp) || _colorLookup.transparent;
			a = a.map(Number);
		}
		if (toHSL && !wasHSL) {
			r = a[0] / _255;
			g = a[1] / _255;
			b = a[2] / _255;
			max = Math.max(r, g, b);
			min = Math.min(r, g, b);
			l = (max + min) / 2;
			if (max === min) h = s = 0;
			else {
				d = max - min;
				s = l > .5 ? d / (2 - max - min) : d / (max + min);
				h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
				h *= 60;
			}
			a[0] = ~~(h + .5);
			a[1] = ~~(s * 100 + .5);
			a[2] = ~~(l * 100 + .5);
		}
		forceAlpha && a.length < 4 && (a[3] = 1);
		return a;
	};
	var _colorOrderData = function _colorOrderData(v) {
		var values = [], c = [], i = -1;
		v.split(_colorExp).forEach(function(v) {
			var a = v.match(_numWithUnitExp) || [];
			values.push.apply(values, a);
			c.push(i += a.length + 1);
		});
		values.c = c;
		return values;
	};
	var _formatColors = function _formatColors(s, toHSL, orderMatchData) {
		var result = "", colors = (s + result).match(_colorExp), type = toHSL ? "hsla(" : "rgba(", i = 0, c, shell, d, l;
		if (!colors) return s;
		colors = colors.map(function(color) {
			return (color = splitColor(color, toHSL, 1)) && type + (toHSL ? color[0] + "," + color[1] + "%," + color[2] + "%," + color[3] : color.join(",")) + ")";
		});
		if (orderMatchData) {
			d = _colorOrderData(s);
			c = orderMatchData.c;
			if (c.join(result) !== d.c.join(result)) {
				shell = s.replace(_colorExp, "1").split(_numWithUnitExp);
				l = shell.length - 1;
				for (; i < l; i++) result += shell[i] + (~c.indexOf(i) ? colors.shift() || type + "0,0,0,0)" : (d.length ? d : colors.length ? colors : orderMatchData).shift());
			}
		}
		if (!shell) {
			shell = s.split(_colorExp);
			l = shell.length - 1;
			for (; i < l; i++) result += shell[i] + colors[i];
		}
		return result + shell[l];
	};
	var _colorExp = function() {
		var s = "(?:\\b(?:(?:rgb|rgba|hsl|hsla)\\(.+?\\))|\\B#(?:[0-9a-f]{3,4}){1,2}\\b", p;
		for (p in _colorLookup) s += "|" + p + "\\b";
		return new RegExp(s + ")", "gi");
	}();
	var _hslExp = /hsl[a]?\(/;
	var _colorStringFilter = function _colorStringFilter(a) {
		var combined = a.join(" "), toHSL;
		_colorExp.lastIndex = 0;
		if (_colorExp.test(combined)) {
			toHSL = _hslExp.test(combined);
			a[1] = _formatColors(a[1], toHSL);
			a[0] = _formatColors(a[0], toHSL, _colorOrderData(a[1]));
			return true;
		}
	};
	var _tickerActive;
	var _ticker = function() {
		var _getTime = Date.now, _lagThreshold = 500, _adjustedLag = 33, _startTime = _getTime(), _lastUpdate = _startTime, _gap = 1e3 / 240, _nextTime = _gap, _listeners = [], _id, _req, _raf, _self, _delta, _i, _tick = function _tick(v) {
			var elapsed = _getTime() - _lastUpdate, manual = v === true, overlap, dispatch, time, frame;
			(elapsed > _lagThreshold || elapsed < 0) && (_startTime += elapsed - _adjustedLag);
			_lastUpdate += elapsed;
			time = _lastUpdate - _startTime;
			overlap = time - _nextTime;
			if (overlap > 0 || manual) {
				frame = ++_self.frame;
				_delta = time - _self.time * 1e3;
				_self.time = time = time / 1e3;
				_nextTime += overlap + (overlap >= _gap ? 4 : _gap - overlap);
				dispatch = 1;
			}
			manual || (_id = _req(_tick));
			if (dispatch) for (_i = 0; _i < _listeners.length; _i++) _listeners[_i](time, _delta, frame, v);
		};
		_self = {
			time: 0,
			frame: 0,
			tick: function tick() {
				_tick(true);
			},
			deltaRatio: function deltaRatio(fps) {
				return _delta / (1e3 / (fps || 60));
			},
			wake: function wake() {
				if (_coreReady) {
					if (!_coreInitted && _windowExists$1()) {
						_win$1 = _coreInitted = window;
						_doc$1 = _win$1.document || {};
						_globals.gsap = gsap;
						(_win$1.gsapVersions || (_win$1.gsapVersions = [])).push(gsap.version);
						_install(_installScope || _win$1.GreenSockGlobals || !_win$1.gsap && _win$1 || {});
						_registerPluginQueue.forEach(_createPlugin);
					}
					_raf = typeof requestAnimationFrame !== "undefined" && requestAnimationFrame;
					_id && _self.sleep();
					_req = _raf || function(f) {
						return setTimeout(f, _nextTime - _self.time * 1e3 + 1 | 0);
					};
					_tickerActive = 1;
					_tick(2);
				}
			},
			sleep: function sleep() {
				(_raf ? cancelAnimationFrame : clearTimeout)(_id);
				_tickerActive = 0;
				_req = _emptyFunc;
			},
			lagSmoothing: function lagSmoothing(threshold, adjustedLag) {
				_lagThreshold = threshold || Infinity;
				_adjustedLag = Math.min(adjustedLag || 33, _lagThreshold);
			},
			fps: function fps(_fps) {
				_gap = 1e3 / (_fps || 240);
				_nextTime = _self.time * 1e3 + _gap;
			},
			add: function add(callback, once, prioritize) {
				var func = once ? function(t, d, f, v) {
					callback(t, d, f, v);
					_self.remove(func);
				} : callback;
				_self.remove(callback);
				_listeners[prioritize ? "unshift" : "push"](func);
				_wake();
				return func;
			},
			remove: function remove(callback, i) {
				~(i = _listeners.indexOf(callback)) && _listeners.splice(i, 1) && _i >= i && _i--;
			},
			_listeners
		};
		return _self;
	}();
	var _wake = function _wake() {
		return !_tickerActive && _ticker.wake();
	};
	var _easeMap = {};
	var _customEaseExp = /^[\d.\-M][\d.\-,\s]/;
	var _quotesExp = /["']/g;
	var _parseObjectInString = function _parseObjectInString(value) {
		var obj = {}, split = value.substr(1, value.length - 3).split(":"), key = split[0], i = 1, l = split.length, index, val, parsedVal;
		for (; i < l; i++) {
			val = split[i];
			index = i !== l - 1 ? val.lastIndexOf(",") : val.length;
			parsedVal = val.substr(0, index);
			obj[key] = isNaN(parsedVal) ? parsedVal.replace(_quotesExp, "").trim() : +parsedVal;
			key = val.substr(index + 1).trim();
		}
		return obj;
	};
	var _valueInParentheses = function _valueInParentheses(value) {
		var open = value.indexOf("(") + 1, close = value.indexOf(")"), nested = value.indexOf("(", open);
		return value.substring(open, ~nested && nested < close ? value.indexOf(")", close + 1) : close);
	};
	var _configEaseFromString = function _configEaseFromString(name) {
		var split = (name + "").split("("), ease = _easeMap[split[0]];
		return ease && split.length > 1 && ease.config ? ease.config.apply(null, ~name.indexOf("{") ? [_parseObjectInString(split[1])] : _valueInParentheses(name).split(",").map(_numericIfPossible)) : _easeMap._CE && _customEaseExp.test(name) ? _easeMap._CE("", name) : ease;
	};
	var _invertEase = function _invertEase(ease) {
		return function(p) {
			return 1 - ease(1 - p);
		};
	};
	var _parseEase = function _parseEase(ease, defaultEase) {
		return !ease ? defaultEase : (_isFunction(ease) ? ease : _easeMap[ease] || _configEaseFromString(ease)) || defaultEase;
	};
	var _insertEase = function _insertEase(names, easeIn, easeOut, easeInOut) {
		if (easeOut === void 0) easeOut = function easeOut(p) {
			return 1 - easeIn(1 - p);
		};
		if (easeInOut === void 0) easeInOut = function easeInOut(p) {
			return p < .5 ? easeIn(p * 2) / 2 : 1 - easeIn((1 - p) * 2) / 2;
		};
		var ease = {
			easeIn,
			easeOut,
			easeInOut
		}, lowercaseName;
		_forEachName(names, function(name) {
			_easeMap[name] = _globals[name] = ease;
			_easeMap[lowercaseName = name.toLowerCase()] = easeOut;
			for (var p in ease) _easeMap[lowercaseName + (p === "easeIn" ? ".in" : p === "easeOut" ? ".out" : ".inOut")] = _easeMap[name + "." + p] = ease[p];
		});
		return ease;
	};
	var _easeInOutFromOut = function _easeInOutFromOut(easeOut) {
		return function(p) {
			return p < .5 ? (1 - easeOut(1 - p * 2)) / 2 : .5 + easeOut((p - .5) * 2) / 2;
		};
	};
	var _configElastic = function _configElastic(type, amplitude, period) {
		var p1 = amplitude >= 1 ? amplitude : 1, p2 = (period || (type ? .3 : .45)) / (amplitude < 1 ? amplitude : 1), p3 = p2 / _2PI * (Math.asin(1 / p1) || 0), easeOut = function easeOut(p) {
			return p === 1 ? 1 : p1 * Math.pow(2, -10 * p) * _sin((p - p3) * p2) + 1;
		}, ease = type === "out" ? easeOut : type === "in" ? function(p) {
			return 1 - easeOut(1 - p);
		} : _easeInOutFromOut(easeOut);
		p2 = _2PI / p2;
		ease.config = function(amplitude, period) {
			return _configElastic(type, amplitude, period);
		};
		return ease;
	};
	var _configBack = function _configBack(type, overshoot) {
		if (overshoot === void 0) overshoot = 1.70158;
		var easeOut = function easeOut(p) {
			return p ? --p * p * ((overshoot + 1) * p + overshoot) + 1 : 0;
		}, ease = type === "out" ? easeOut : type === "in" ? function(p) {
			return 1 - easeOut(1 - p);
		} : _easeInOutFromOut(easeOut);
		ease.config = function(overshoot) {
			return _configBack(type, overshoot);
		};
		return ease;
	};
	_forEachName("Linear,Quad,Cubic,Quart,Quint,Strong", function(name, i) {
		var power = i < 5 ? i + 1 : i;
		_insertEase(name + ",Power" + (power - 1), i ? function(p) {
			return Math.pow(p, power);
		} : function(p) {
			return p;
		}, function(p) {
			return 1 - Math.pow(1 - p, power);
		}, function(p) {
			return p < .5 ? Math.pow(p * 2, power) / 2 : 1 - Math.pow((1 - p) * 2, power) / 2;
		});
	});
	_easeMap.Linear.easeNone = _easeMap.none = _easeMap.Linear.easeIn;
	_insertEase("Elastic", _configElastic("in"), _configElastic("out"), _configElastic());
	(function(n, c) {
		var n1 = 1 / c, n2 = 2 * n1, n3 = 2.5 * n1, easeOut = function easeOut(p) {
			return p < n1 ? n * p * p : p < n2 ? n * Math.pow(p - 1.5 / c, 2) + .75 : p < n3 ? n * (p -= 2.25 / c) * p + .9375 : n * Math.pow(p - 2.625 / c, 2) + .984375;
		};
		_insertEase("Bounce", function(p) {
			return 1 - easeOut(1 - p);
		}, easeOut);
	})(7.5625, 2.75);
	_insertEase("Expo", function(p) {
		return Math.pow(2, 10 * (p - 1)) * p + p * p * p * p * p * p * (1 - p);
	});
	_insertEase("Circ", function(p) {
		return -(_sqrt(1 - p * p) - 1);
	});
	_insertEase("Sine", function(p) {
		return p === 1 ? 1 : -_cos(p * _HALF_PI) + 1;
	});
	_insertEase("Back", _configBack("in"), _configBack("out"), _configBack());
	_easeMap.SteppedEase = _easeMap.steps = _globals.SteppedEase = { config: function config(steps, immediateStart) {
		if (steps === void 0) steps = 1;
		var p1 = 1 / steps, p2 = steps + (immediateStart ? 0 : 1), p3 = immediateStart ? 1 : 0, max = 1 - _tinyNum;
		return function(p) {
			return ((p2 * _clamp(0, max, p) | 0) + p3) * p1;
		};
	} };
	_defaults.ease = _easeMap["quad.out"];
	_forEachName("onComplete,onUpdate,onStart,onRepeat,onReverseComplete,onInterrupt", function(name) {
		return _callbackNames += name + "," + name + "Params,";
	});
	var GSCache = function GSCache(target, harness) {
		this.id = _gsID++;
		target._gsap = this;
		this.target = target;
		this.harness = harness;
		this.get = harness ? harness.get : _getProperty;
		this.set = harness ? harness.getSetter : _getSetter;
	};
	var Animation = function() {
		function Animation(vars) {
			this.vars = vars;
			this._delay = +vars.delay || 0;
			if (this._repeat = vars.repeat === Infinity ? -2 : vars.repeat || 0) {
				this._rDelay = vars.repeatDelay || 0;
				this._yoyo = !!vars.yoyo || !!vars.yoyoEase;
			}
			this._ts = 1;
			_setDuration(this, +vars.duration, 1, 1);
			this.data = vars.data;
			if (_context) {
				this._ctx = _context;
				_context.data.push(this);
			}
			_tickerActive || _ticker.wake();
		}
		var _proto = Animation.prototype;
		_proto.delay = function delay(value) {
			if (value || value === 0) {
				this.parent && this.parent.smoothChildTiming && this.startTime(this._start + value - this._delay);
				this._delay = value;
				return this;
			}
			return this._delay;
		};
		_proto.duration = function duration(value) {
			return arguments.length ? this.totalDuration(this._repeat > 0 ? value + (value + this._rDelay) * this._repeat : value) : this.totalDuration() && this._dur;
		};
		_proto.totalDuration = function totalDuration(value) {
			if (!arguments.length) return this._tDur;
			this._dirty = 0;
			return _setDuration(this, this._repeat < 0 ? value : (value - this._repeat * this._rDelay) / (this._repeat + 1));
		};
		_proto.totalTime = function totalTime(_totalTime, suppressEvents) {
			_wake();
			if (!arguments.length) return this._tTime;
			var parent = this._dp;
			if (parent && parent.smoothChildTiming && this._ts) {
				_alignPlayhead(this, _totalTime);
				!parent._dp || parent.parent || _postAddChecks(parent, this);
				while (parent && parent.parent) {
					if (parent.parent._time !== parent._start + (parent._ts >= 0 ? parent._tTime / parent._ts : (parent.totalDuration() - parent._tTime) / -parent._ts)) parent.totalTime(parent._tTime, true);
					parent = parent.parent;
				}
				if (!this.parent && this._dp.autoRemoveChildren && (this._ts > 0 && _totalTime < this._tDur || this._ts < 0 && _totalTime > 0 || !this._tDur && !_totalTime)) _addToTimeline(this._dp, this, this._start - this._delay);
			}
			if (this._tTime !== _totalTime || !this._dur && !suppressEvents || this._initted && Math.abs(this._zTime) === _tinyNum || !this._initted && this._dur && _totalTime || !_totalTime && !this._initted && (this.add || this._ptLookup)) {
				this._ts || (this._pTime = _totalTime);
				_lazySafeRender(this, _totalTime, suppressEvents);
			}
			return this;
		};
		_proto.time = function time(value, suppressEvents) {
			return arguments.length ? this.totalTime(Math.min(this.totalDuration(), value + _elapsedCycleDuration(this)) % (this._dur + this._rDelay) || (value ? this._dur : 0), suppressEvents) : this._time;
		};
		_proto.totalProgress = function totalProgress(value, suppressEvents) {
			return arguments.length ? this.totalTime(this.totalDuration() * value, suppressEvents) : this.totalDuration() ? Math.min(1, this._tTime / this._tDur) : this.rawTime() >= 0 && this._initted ? 1 : 0;
		};
		_proto.progress = function progress(value, suppressEvents) {
			return arguments.length ? this.totalTime(this.duration() * (this._yoyo && !(this.iteration() & 1) ? 1 - value : value) + _elapsedCycleDuration(this), suppressEvents) : this.duration() ? Math.min(1, this._time / this._dur) : this.rawTime() > 0 ? 1 : 0;
		};
		_proto.iteration = function iteration(value, suppressEvents) {
			var cycleDuration = this.duration() + this._rDelay;
			return arguments.length ? this.totalTime(this._time + (value - 1) * cycleDuration, suppressEvents) : this._repeat ? _animationCycle(this._tTime, cycleDuration) + 1 : 1;
		};
		_proto.timeScale = function timeScale(value, suppressEvents) {
			if (!arguments.length) return this._rts === -_tinyNum ? 0 : this._rts;
			if (this._rts === value) return this;
			var tTime = this.parent && this._ts ? _parentToChildTotalTime(this.parent._time, this) : this._tTime;
			this._rts = +value || 0;
			this._ts = this._ps || value === -_tinyNum ? 0 : this._rts;
			this.totalTime(_clamp(-Math.abs(this._delay), this.totalDuration(), tTime), suppressEvents !== false);
			_setEnd(this);
			return _recacheAncestors(this);
		};
		_proto.paused = function paused(value) {
			if (!arguments.length) return this._ps;
			if (this._ps !== value) {
				this._ps = value;
				if (value) {
					this._pTime = this._tTime || Math.max(-this._delay, this.rawTime());
					this._ts = this._act = 0;
				} else {
					_wake();
					this._ts = this._rts;
					this.totalTime(this.parent && !this.parent.smoothChildTiming ? this.rawTime() : this._tTime || this._pTime, this.progress() === 1 && Math.abs(this._zTime) !== _tinyNum && (this._tTime -= _tinyNum));
				}
			}
			return this;
		};
		_proto.startTime = function startTime(value) {
			if (arguments.length) {
				this._start = _roundPrecise(value);
				var parent = this.parent || this._dp;
				parent && (parent._sort || !this.parent) && _addToTimeline(parent, this, this._start - this._delay);
				return this;
			}
			return this._start;
		};
		_proto.endTime = function endTime(includeRepeats) {
			return this._start + (_isNotFalse(includeRepeats) ? this.totalDuration() : this.duration()) / Math.abs(this._ts || 1);
		};
		_proto.rawTime = function rawTime(wrapRepeats) {
			var parent = this.parent || this._dp;
			return !parent ? this._tTime : wrapRepeats && (!this._ts || this._repeat && this._time && this.totalProgress() < 1) ? this._tTime % (this._dur + this._rDelay) : !this._ts ? this._tTime : _parentToChildTotalTime(parent.rawTime(wrapRepeats), this);
		};
		_proto.revert = function revert(config) {
			if (config === void 0) config = _revertConfig;
			var prevIsReverting = _reverting$1;
			_reverting$1 = config;
			if (_isRevertWorthy(this)) {
				this.timeline && this.timeline.revert(config);
				this.totalTime(-.01, config.suppressEvents);
			}
			this.data !== "nested" && config.kill !== false && this.kill();
			_reverting$1 = prevIsReverting;
			return this;
		};
		_proto.globalTime = function globalTime(rawTime) {
			var animation = this, time = arguments.length ? rawTime : animation.rawTime();
			while (animation) {
				time = animation._start + time / (Math.abs(animation._ts) || 1);
				animation = animation._dp;
			}
			return !this.parent && this._sat ? this._sat.globalTime(rawTime) : time;
		};
		_proto.repeat = function repeat(value) {
			if (arguments.length) {
				this._repeat = value === Infinity ? -2 : value;
				return _onUpdateTotalDuration(this);
			}
			return this._repeat === -2 ? Infinity : this._repeat;
		};
		_proto.repeatDelay = function repeatDelay(value) {
			if (arguments.length) {
				var time = this._time;
				this._rDelay = value;
				_onUpdateTotalDuration(this);
				return time ? this.time(time) : this;
			}
			return this._rDelay;
		};
		_proto.yoyo = function yoyo(value) {
			if (arguments.length) {
				this._yoyo = value;
				return this;
			}
			return this._yoyo;
		};
		_proto.seek = function seek(position, suppressEvents) {
			return this.totalTime(_parsePosition(this, position), _isNotFalse(suppressEvents));
		};
		_proto.restart = function restart(includeDelay, suppressEvents) {
			this.play().totalTime(includeDelay ? -this._delay : 0, _isNotFalse(suppressEvents));
			this._dur || (this._zTime = -_tinyNum);
			return this;
		};
		_proto.play = function play(from, suppressEvents) {
			from != null && this.seek(from, suppressEvents);
			return this.reversed(false).paused(false);
		};
		_proto.reverse = function reverse(from, suppressEvents) {
			from != null && this.seek(from || this.totalDuration(), suppressEvents);
			return this.reversed(true).paused(false);
		};
		_proto.pause = function pause(atTime, suppressEvents) {
			atTime != null && this.seek(atTime, suppressEvents);
			return this.paused(true);
		};
		_proto.resume = function resume() {
			return this.paused(false);
		};
		_proto.reversed = function reversed(value) {
			if (arguments.length) {
				!!value !== this.reversed() && this.timeScale(-this._rts || (value ? -_tinyNum : 0));
				return this;
			}
			return this._rts < 0;
		};
		_proto.invalidate = function invalidate() {
			this._initted = this._act = 0;
			this._zTime = -_tinyNum;
			return this;
		};
		_proto.isActive = function isActive() {
			var parent = this.parent || this._dp, start = this._start, rawTime;
			return !!(!parent || this._ts && this._initted && parent.isActive() && (rawTime = parent.rawTime(true)) >= start && rawTime < this.endTime(true) - _tinyNum);
		};
		_proto.eventCallback = function eventCallback(type, callback, params) {
			var vars = this.vars;
			if (arguments.length > 1) {
				if (!callback) delete vars[type];
				else {
					vars[type] = callback;
					params && (vars[type + "Params"] = params);
					type === "onUpdate" && (this._onUpdate = callback);
				}
				return this;
			}
			return vars[type];
		};
		_proto.then = function then(onFulfilled) {
			var self = this, prevProm = self._prom;
			return new Promise(function(resolve) {
				var f = _isFunction(onFulfilled) ? onFulfilled : _passThrough, _resolve = function _resolve() {
					var _then = self.then;
					self.then = null;
					prevProm && prevProm();
					_isFunction(f) && (f = f(self)) && (f.then || f === self) && (self.then = _then);
					resolve(f);
					self.then = _then;
				};
				if (self._initted && self.totalProgress() === 1 && self._ts >= 0 || !self._tTime && self._ts < 0) _resolve();
				else self._prom = _resolve;
			});
		};
		_proto.kill = function kill() {
			_interrupt(this);
		};
		return Animation;
	}();
	_setDefaults(Animation.prototype, {
		_time: 0,
		_start: 0,
		_end: 0,
		_tTime: 0,
		_tDur: 0,
		_dirty: 0,
		_repeat: 0,
		_yoyo: false,
		parent: null,
		_initted: false,
		_rDelay: 0,
		_ts: 1,
		_dp: 0,
		ratio: 0,
		_zTime: -_tinyNum,
		_prom: 0,
		_ps: false,
		_rts: 1
	});
	var Timeline = function(_Animation) {
		_inheritsLoose(Timeline, _Animation);
		function Timeline(vars, position) {
			var _this;
			if (vars === void 0) vars = {};
			_this = _Animation.call(this, vars) || this;
			_this.labels = {};
			_this.smoothChildTiming = !!vars.smoothChildTiming;
			_this.autoRemoveChildren = !!vars.autoRemoveChildren;
			_this._sort = _isNotFalse(vars.sortChildren);
			_globalTimeline && _addToTimeline(vars.parent || _globalTimeline, _assertThisInitialized(_this), position);
			vars.reversed && _this.reverse();
			vars.paused && _this.paused(true);
			vars.scrollTrigger && _scrollTrigger(_assertThisInitialized(_this), vars.scrollTrigger);
			return _this;
		}
		var _proto2 = Timeline.prototype;
		_proto2.to = function to(targets, vars, position) {
			_createTweenType(0, arguments, this);
			return this;
		};
		_proto2.from = function from(targets, vars, position) {
			_createTweenType(1, arguments, this);
			return this;
		};
		_proto2.fromTo = function fromTo(targets, fromVars, toVars, position) {
			_createTweenType(2, arguments, this);
			return this;
		};
		_proto2.set = function set(targets, vars, position) {
			vars.duration = 0;
			vars.parent = this;
			_inheritDefaults(vars).repeatDelay || (vars.repeat = 0);
			vars.immediateRender = !!vars.immediateRender;
			new Tween(targets, vars, _parsePosition(this, position), 1);
			return this;
		};
		_proto2.call = function call(callback, params, position) {
			return _addToTimeline(this, Tween.delayedCall(0, callback, params), position);
		};
		_proto2.staggerTo = function staggerTo(targets, duration, vars, stagger, position, onCompleteAll, onCompleteAllParams) {
			vars.duration = duration;
			vars.stagger = vars.stagger || stagger;
			vars.onComplete = onCompleteAll;
			vars.onCompleteParams = onCompleteAllParams;
			vars.parent = this;
			new Tween(targets, vars, _parsePosition(this, position));
			return this;
		};
		_proto2.staggerFrom = function staggerFrom(targets, duration, vars, stagger, position, onCompleteAll, onCompleteAllParams) {
			vars.runBackwards = 1;
			_inheritDefaults(vars).immediateRender = _isNotFalse(vars.immediateRender);
			return this.staggerTo(targets, duration, vars, stagger, position, onCompleteAll, onCompleteAllParams);
		};
		_proto2.staggerFromTo = function staggerFromTo(targets, duration, fromVars, toVars, stagger, position, onCompleteAll, onCompleteAllParams) {
			toVars.startAt = fromVars;
			_inheritDefaults(toVars).immediateRender = _isNotFalse(toVars.immediateRender);
			return this.staggerTo(targets, duration, toVars, stagger, position, onCompleteAll, onCompleteAllParams);
		};
		_proto2.render = function render(totalTime, suppressEvents, force) {
			var prevTime = this._time, tDur = this._dirty ? this.totalDuration() : this._tDur, dur = this._dur, tTime = totalTime <= 0 ? 0 : _roundPrecise(totalTime), crossingStart = this._zTime < 0 !== totalTime < 0 && (this._initted || !dur), time, child, next, iteration, cycleDuration, prevPaused, pauseTween, timeScale, prevStart, prevIteration, yoyo, isYoyo;
			this !== _globalTimeline && tTime > tDur && totalTime >= 0 && (tTime = tDur);
			if (tTime !== this._tTime || force || crossingStart) {
				if (prevTime !== this._time && dur) {
					tTime += this._time - prevTime;
					totalTime += this._time - prevTime;
				}
				time = tTime;
				prevStart = this._start;
				timeScale = this._ts;
				prevPaused = !timeScale;
				if (crossingStart) {
					dur || (prevTime = this._zTime);
					(totalTime || !suppressEvents) && (this._zTime = totalTime);
				}
				if (this._repeat) {
					yoyo = this._yoyo;
					cycleDuration = dur + this._rDelay;
					if (this._repeat < -1 && totalTime < 0) return this.totalTime(cycleDuration * 100 + totalTime, suppressEvents, force);
					time = _roundPrecise(tTime % cycleDuration);
					if (tTime === tDur) {
						iteration = this._repeat;
						time = dur;
					} else {
						prevIteration = _roundPrecise(tTime / cycleDuration);
						iteration = ~~prevIteration;
						if (iteration && iteration === prevIteration) {
							time = dur;
							iteration--;
						}
						time > dur && (time = dur);
					}
					prevIteration = _animationCycle(this._tTime, cycleDuration);
					!prevTime && this._tTime && prevIteration !== iteration && this._tTime - prevIteration * cycleDuration - this._dur <= 0 && (prevIteration = iteration);
					if (yoyo && iteration & 1) {
						time = dur - time;
						isYoyo = 1;
					}
					if (iteration !== prevIteration && !this._lock) {
						var rewinding = yoyo && prevIteration & 1, doesWrap = rewinding === (yoyo && iteration & 1);
						iteration < prevIteration && (rewinding = !rewinding);
						prevTime = rewinding ? 0 : tTime % dur ? dur : tTime;
						this._lock = 1;
						this.render(prevTime || (isYoyo ? 0 : _roundPrecise(iteration * cycleDuration)), suppressEvents, !dur)._lock = 0;
						this._tTime = tTime;
						!suppressEvents && this.parent && _callback(this, "onRepeat");
						if (this.vars.repeatRefresh && !isYoyo) {
							this.invalidate()._lock = 1;
							prevIteration = iteration;
						}
						if (prevTime && prevTime !== this._time || prevPaused !== !this._ts || this.vars.onRepeat && !this.parent && !this._act) return this;
						dur = this._dur;
						tDur = this._tDur;
						if (doesWrap) {
							this._lock = 2;
							prevTime = rewinding ? dur : -1e-4;
							this.render(prevTime, true);
							this.vars.repeatRefresh && !isYoyo && this.invalidate();
						}
						this._lock = 0;
						if (!this._ts && !prevPaused) return this;
					}
				}
				if (this._hasPause && !this._forcing && this._lock < 2) {
					pauseTween = _findNextPauseTween(this, _roundPrecise(prevTime), _roundPrecise(time));
					if (pauseTween) tTime -= time - (time = pauseTween._start);
				}
				this._tTime = tTime;
				this._time = time;
				this._act = !!timeScale;
				if (!this._initted) {
					this._onUpdate = this.vars.onUpdate;
					this._initted = 1;
					this._zTime = totalTime;
					prevTime = 0;
				}
				if (!prevTime && tTime && dur && !suppressEvents && !prevIteration) {
					_callback(this, "onStart");
					if (this._tTime !== tTime) return this;
				}
				if (time >= prevTime && totalTime >= 0) {
					child = this._first;
					while (child) {
						next = child._next;
						if ((child._act || time >= child._start) && child._ts && pauseTween !== child) {
							if (child.parent !== this) return this.render(totalTime, suppressEvents, force);
							child.render(child._ts > 0 ? (time - child._start) * child._ts : (child._dirty ? child.totalDuration() : child._tDur) + (time - child._start) * child._ts, suppressEvents, force);
							if (time !== this._time || !this._ts && !prevPaused) {
								pauseTween = 0;
								next && (tTime += this._zTime = -_tinyNum);
								break;
							}
						}
						child = next;
					}
				} else {
					child = this._last;
					var adjustedTime = totalTime < 0 ? totalTime : time;
					while (child) {
						next = child._prev;
						if ((child._act || adjustedTime <= child._end) && child._ts && pauseTween !== child) {
							if (child.parent !== this) return this.render(totalTime, suppressEvents, force);
							child.render(child._ts > 0 ? (adjustedTime - child._start) * child._ts : (child._dirty ? child.totalDuration() : child._tDur) + (adjustedTime - child._start) * child._ts, suppressEvents, force || _reverting$1 && _isRevertWorthy(child));
							if (time !== this._time || !this._ts && !prevPaused) {
								pauseTween = 0;
								next && (tTime += this._zTime = adjustedTime ? -_tinyNum : _tinyNum);
								break;
							}
						}
						child = next;
					}
				}
				if (pauseTween && !suppressEvents) {
					this.pause();
					pauseTween.render(time >= prevTime ? 0 : -_tinyNum)._zTime = time >= prevTime ? 1 : -1;
					if (this._ts) {
						this._start = prevStart;
						_setEnd(this);
						return this.render(totalTime, suppressEvents, force);
					}
				}
				this._onUpdate && !suppressEvents && _callback(this, "onUpdate", true);
				if (tTime === tDur && this._tTime >= this.totalDuration() || !tTime && prevTime) {
					if (prevStart === this._start || Math.abs(timeScale) !== Math.abs(this._ts)) {
						if (!this._lock) {
							(totalTime || !dur) && (tTime === tDur && this._ts > 0 || !tTime && this._ts < 0) && _removeFromParent(this, 1);
							if (!suppressEvents && !(totalTime < 0 && !prevTime) && (tTime || prevTime || !tDur)) {
								_callback(this, tTime === tDur && totalTime >= 0 ? "onComplete" : "onReverseComplete", true);
								this._prom && !(tTime < tDur && this.timeScale() > 0) && this._prom();
							}
						}
					}
				}
			}
			return this;
		};
		_proto2.add = function add(child, position) {
			var _this2 = this;
			_isNumber(position) || (position = _parsePosition(this, position, child));
			if (!(child instanceof Animation)) {
				if (_isArray(child)) {
					child.forEach(function(obj) {
						return _this2.add(obj, position);
					});
					return this;
				}
				if (_isString(child)) return this.addLabel(child, position);
				if (_isFunction(child)) child = Tween.delayedCall(0, child);
				else return this;
			}
			return this !== child ? _addToTimeline(this, child, position) : this;
		};
		_proto2.getChildren = function getChildren(nested, tweens, timelines, ignoreBeforeTime) {
			if (nested === void 0) nested = true;
			if (tweens === void 0) tweens = true;
			if (timelines === void 0) timelines = true;
			if (ignoreBeforeTime === void 0) ignoreBeforeTime = -_bigNum$1;
			var a = [], child = this._first;
			while (child) {
				if (child._start >= ignoreBeforeTime) {
					if (child instanceof Tween) tweens && a.push(child);
					else {
						timelines && a.push(child);
						nested && a.push.apply(a, child.getChildren(true, tweens, timelines));
					}
				}
				child = child._next;
			}
			return a;
		};
		_proto2.getById = function getById(id) {
			var animations = this.getChildren(1, 1, 1), i = animations.length;
			while (i--) if (animations[i].vars.id === id) return animations[i];
		};
		_proto2.remove = function remove(child) {
			if (_isString(child)) return this.removeLabel(child);
			if (_isFunction(child)) return this.killTweensOf(child);
			child.parent === this && _removeLinkedListItem(this, child);
			if (child === this._recent) this._recent = this._last;
			return _uncache(this);
		};
		_proto2.totalTime = function totalTime(_totalTime2, suppressEvents) {
			if (!arguments.length) return this._tTime;
			this._forcing = 1;
			if (!this._dp && this._ts) this._start = _roundPrecise(_ticker.time - (this._ts > 0 ? _totalTime2 / this._ts : (this.totalDuration() - _totalTime2) / -this._ts));
			_Animation.prototype.totalTime.call(this, _totalTime2, suppressEvents);
			this._forcing = 0;
			return this;
		};
		_proto2.addLabel = function addLabel(label, position) {
			this.labels[label] = _parsePosition(this, position);
			return this;
		};
		_proto2.removeLabel = function removeLabel(label) {
			delete this.labels[label];
			return this;
		};
		_proto2.addPause = function addPause(position, callback, params) {
			var t = Tween.delayedCall(0, callback || _emptyFunc, params);
			t.data = "isPause";
			this._hasPause = 1;
			return _addToTimeline(this, t, _parsePosition(this, position));
		};
		_proto2.removePause = function removePause(position) {
			var child = this._first;
			position = _parsePosition(this, position);
			while (child) {
				if (child._start === position && child.data === "isPause") _removeFromParent(child);
				child = child._next;
			}
		};
		_proto2.killTweensOf = function killTweensOf(targets, props, onlyActive) {
			var tweens = this.getTweensOf(targets, onlyActive), i = tweens.length;
			while (i--) _overwritingTween !== tweens[i] && tweens[i].kill(targets, props);
			return this;
		};
		_proto2.getTweensOf = function getTweensOf(targets, onlyActive) {
			var a = [], parsedTargets = toArray(targets), child = this._first, isGlobalTime = _isNumber(onlyActive), children;
			while (child) {
				if (child instanceof Tween) {
					if (_arrayContainsAny(child._targets, parsedTargets) && (isGlobalTime ? (!_overwritingTween || child._initted && child._ts) && child.globalTime(0) <= onlyActive && child.globalTime(child.totalDuration()) > onlyActive : !onlyActive || child.isActive())) a.push(child);
				} else if ((children = child.getTweensOf(parsedTargets, onlyActive)).length) a.push.apply(a, children);
				child = child._next;
			}
			return a;
		};
		_proto2.tweenTo = function tweenTo(position, vars) {
			vars = vars || {};
			var tl = this, endTime = _parsePosition(tl, position), _vars = vars, startAt = _vars.startAt, _onStart = _vars.onStart, onStartParams = _vars.onStartParams, immediateRender = _vars.immediateRender, initted, tween = Tween.to(tl, _setDefaults({
				ease: vars.ease || "none",
				lazy: false,
				immediateRender: false,
				time: endTime,
				overwrite: "auto",
				duration: vars.duration || Math.abs((endTime - (startAt && "time" in startAt ? startAt.time : tl._time)) / tl.timeScale()) || _tinyNum,
				onStart: function onStart() {
					tl.pause();
					if (!initted) {
						var duration = vars.duration || Math.abs((endTime - (startAt && "time" in startAt ? startAt.time : tl._time)) / tl.timeScale());
						tween._dur !== duration && _setDuration(tween, duration, 0, 1).render(tween._time, true, true);
						initted = 1;
					}
					_onStart && _onStart.apply(tween, onStartParams || []);
				}
			}, vars));
			return immediateRender ? tween.render(0) : tween;
		};
		_proto2.tweenFromTo = function tweenFromTo(fromPosition, toPosition, vars) {
			return this.tweenTo(toPosition, _setDefaults({ startAt: { time: _parsePosition(this, fromPosition) } }, vars));
		};
		_proto2.recent = function recent() {
			return this._recent;
		};
		_proto2.nextLabel = function nextLabel(afterTime) {
			if (afterTime === void 0) afterTime = this._time;
			return _getLabelInDirection(this, _parsePosition(this, afterTime));
		};
		_proto2.previousLabel = function previousLabel(beforeTime) {
			if (beforeTime === void 0) beforeTime = this._time;
			return _getLabelInDirection(this, _parsePosition(this, beforeTime), 1);
		};
		_proto2.currentLabel = function currentLabel(value) {
			return arguments.length ? this.seek(value, true) : this.previousLabel(this._time + _tinyNum);
		};
		_proto2.shiftChildren = function shiftChildren(amount, adjustLabels, ignoreBeforeTime) {
			if (ignoreBeforeTime === void 0) ignoreBeforeTime = 0;
			var child = this._first, labels = this.labels, p;
			amount = _roundPrecise(amount);
			while (child) {
				if (child._start >= ignoreBeforeTime) {
					child._start += amount;
					child._end += amount;
				}
				child = child._next;
			}
			if (adjustLabels) {
				for (p in labels) if (labels[p] >= ignoreBeforeTime) labels[p] += amount;
			}
			return _uncache(this);
		};
		_proto2.invalidate = function invalidate(soft) {
			var child = this._first;
			this._lock = 0;
			while (child) {
				child.invalidate(soft);
				child = child._next;
			}
			return _Animation.prototype.invalidate.call(this, soft);
		};
		_proto2.clear = function clear(includeLabels) {
			if (includeLabels === void 0) includeLabels = true;
			var child = this._first, next;
			while (child) {
				next = child._next;
				this.remove(child);
				child = next;
			}
			this._dp && (this._time = this._tTime = this._pTime = 0);
			includeLabels && (this.labels = {});
			return _uncache(this);
		};
		_proto2.totalDuration = function totalDuration(value) {
			var max = 0, self = this, child = self._last, prevStart = _bigNum$1, prev, start, parent;
			if (arguments.length) return self.timeScale((self._repeat < 0 ? self.duration() : self.totalDuration()) / (self.reversed() ? -value : value));
			if (self._dirty) {
				parent = self.parent;
				while (child) {
					prev = child._prev;
					child._dirty && child.totalDuration();
					start = child._start;
					if (start > prevStart && self._sort && child._ts && !self._lock) {
						self._lock = 1;
						_addToTimeline(self, child, start - child._delay, 1)._lock = 0;
					} else prevStart = start;
					if (start < 0 && child._ts) {
						max -= start;
						if (!parent && !self._dp || parent && parent.smoothChildTiming) {
							self._start += _roundPrecise(start / self._ts);
							self._time -= start;
							self._tTime -= start;
						}
						self.shiftChildren(-start, false, -Infinity);
						prevStart = 0;
					}
					child._end > max && child._ts && (max = child._end);
					child = prev;
				}
				_setDuration(self, self === _globalTimeline && self._time > max ? self._time : max, 1, 1);
				self._dirty = 0;
			}
			return self._tDur;
		};
		Timeline.updateRoot = function updateRoot(time) {
			if (_globalTimeline._ts) {
				_lazySafeRender(_globalTimeline, _parentToChildTotalTime(time, _globalTimeline));
				_lastRenderedFrame = _ticker.frame;
			}
			if (_ticker.frame >= _nextGCFrame) {
				_nextGCFrame += _config.autoSleep || 120;
				var child = _globalTimeline._first;
				if (!child || !child._ts) {
					if (_config.autoSleep && _ticker._listeners.length < 2) {
						while (child && !child._ts) child = child._next;
						child || _ticker.sleep();
					}
				}
			}
		};
		return Timeline;
	}(Animation);
	_setDefaults(Timeline.prototype, {
		_lock: 0,
		_hasPause: 0,
		_forcing: 0
	});
	var _addComplexStringPropTween = function _addComplexStringPropTween(target, prop, start, end, setter, stringFilter, funcParam) {
		var pt = new PropTween(this._pt, target, prop, 0, 1, _renderComplexString, null, setter), index = 0, matchIndex = 0, result, startNums, color, endNum, chunk, startNum, hasRandom, a;
		pt.b = start;
		pt.e = end;
		start += "";
		end += "";
		if (hasRandom = ~end.indexOf("random(")) end = _replaceRandom(end);
		if (stringFilter) {
			a = [start, end];
			stringFilter(a, target, prop);
			start = a[0];
			end = a[1];
		}
		startNums = start.match(_complexStringNumExp) || [];
		while (result = _complexStringNumExp.exec(end)) {
			endNum = result[0];
			chunk = end.substring(index, result.index);
			if (color) color = (color + 1) % 5;
			else if (chunk.substr(-5) === "rgba(") color = 1;
			if (endNum !== startNums[matchIndex++]) {
				startNum = parseFloat(startNums[matchIndex - 1]) || 0;
				pt._pt = {
					_next: pt._pt,
					p: chunk || matchIndex === 1 ? chunk : ",",
					s: startNum,
					c: endNum.charAt(1) === "=" ? _parseRelative(startNum, endNum) - startNum : parseFloat(endNum) - startNum,
					m: color && color < 4 ? Math.round : 0
				};
				index = _complexStringNumExp.lastIndex;
			}
		}
		pt.c = index < end.length ? end.substring(index, end.length) : "";
		pt.fp = funcParam;
		if (_relExp.test(end) || hasRandom) pt.e = 0;
		this._pt = pt;
		return pt;
	};
	var _addPropTween = function _addPropTween(target, prop, start, end, index, targets, modifier, stringFilter, funcParam, optional) {
		_isFunction(end) && (end = end(index || 0, target, targets));
		var currentValue = target[prop], parsedStart = start !== "get" ? start : !_isFunction(currentValue) ? currentValue : funcParam ? target[prop.indexOf("set") || !_isFunction(target["get" + prop.substr(3)]) ? prop : "get" + prop.substr(3)](funcParam) : target[prop](), setter = !_isFunction(currentValue) ? _setterPlain : funcParam ? _setterFuncWithParam : _setterFunc, pt;
		if (_isString(end)) {
			if (~end.indexOf("random(")) end = _replaceRandom(end);
			if (end.charAt(1) === "=") {
				pt = _parseRelative(parsedStart, end) + (getUnit(parsedStart) || 0);
				if (pt || pt === 0) end = pt;
			}
		}
		if (!optional || parsedStart !== end || _forceAllPropTweens) {
			if (!isNaN(parsedStart * end) && end !== "") {
				pt = new PropTween(this._pt, target, prop, +parsedStart || 0, end - (parsedStart || 0), typeof currentValue === "boolean" ? _renderBoolean : _renderPlain, 0, setter);
				funcParam && (pt.fp = funcParam);
				modifier && pt.modifier(modifier, this, target);
				return this._pt = pt;
			}
			!currentValue && !(prop in target) && _missingPlugin(prop, end);
			return _addComplexStringPropTween.call(this, target, prop, parsedStart, end, setter, stringFilter || _config.stringFilter, funcParam);
		}
	};
	var _processVars = function _processVars(vars, index, target, targets, tween) {
		_isFunction(vars) && (vars = _parseFuncOrString(vars, tween, index, target, targets));
		if (!_isObject(vars) || vars.style && vars.nodeType || _isArray(vars) || _isTypedArray(vars)) return _isString(vars) ? _parseFuncOrString(vars, tween, index, target, targets) : vars;
		var copy = {}, p;
		for (p in vars) copy[p] = _parseFuncOrString(vars[p], tween, index, target, targets);
		return copy;
	};
	var _checkPlugin = function _checkPlugin(property, vars, tween, index, target, targets) {
		var plugin, pt, ptLookup, i;
		if (_plugins[property] && (plugin = new _plugins[property]()).init(target, plugin.rawVars ? vars[property] : _processVars(vars[property], index, target, targets, tween), tween, index, targets) !== false) {
			tween._pt = pt = new PropTween(tween._pt, target, property, 0, 1, plugin.render, plugin, 0, plugin.priority);
			if (tween !== _quickTween) {
				ptLookup = tween._ptLookup[tween._targets.indexOf(target)];
				i = plugin._props.length;
				while (i--) ptLookup[plugin._props[i]] = pt;
			}
		}
		return plugin;
	};
	var _overwritingTween;
	var _forceAllPropTweens;
	var _initTween = function _initTween(tween, time, tTime) {
		var vars = tween.vars, ease = vars.ease, startAt = vars.startAt, immediateRender = vars.immediateRender, lazy = vars.lazy, onUpdate = vars.onUpdate, runBackwards = vars.runBackwards, yoyoEase = vars.yoyoEase, keyframes = vars.keyframes, autoRevert = vars.autoRevert, dur = tween._dur, prevStartAt = tween._startAt, targets = tween._targets, parent = tween.parent, fullTargets = parent && parent.data === "nested" ? parent.vars.targets : targets, autoOverwrite = tween._overwrite === "auto" && !_suppressOverwrites, tl = tween.timeline, reverseEase = vars.easeReverse || yoyoEase, cleanVars, i, p, pt, target, hasPriority, gsData, harness, plugin, ptLookup, index, harnessVars, overwritten;
		tl && (!keyframes || !ease) && (ease = "none");
		tween._ease = _parseEase(ease, _defaults.ease);
		tween._rEase = reverseEase && (_parseEase(reverseEase) || tween._ease);
		tween._from = !tl && !!vars.runBackwards;
		if (tween._from) tween.ratio = 1;
		if (!tl || keyframes && !vars.stagger) {
			harness = targets[0] ? _getCache(targets[0]).harness : 0;
			harnessVars = harness && vars[harness.prop];
			cleanVars = _copyExcluding(vars, _reservedProps);
			if (prevStartAt) {
				prevStartAt._zTime < 0 && prevStartAt.progress(1);
				time < 0 && runBackwards && immediateRender && !autoRevert ? prevStartAt.render(-1, true) : prevStartAt.revert(runBackwards && dur ? _revertConfigNoKill : _startAtRevertConfig);
				prevStartAt._lazy = 0;
			}
			if (startAt) {
				_removeFromParent(tween._startAt = Tween.set(targets, _setDefaults({
					data: "isStart",
					overwrite: false,
					parent,
					immediateRender: true,
					lazy: !prevStartAt && _isNotFalse(lazy),
					startAt: null,
					delay: 0,
					onUpdate: onUpdate && function() {
						return _callback(tween, "onUpdate");
					},
					stagger: 0
				}, startAt)));
				tween._startAt._dp = 0;
				tween._startAt._sat = tween;
				time < 0 && (_reverting$1 || !immediateRender && !autoRevert) && tween._startAt.revert(_revertConfigNoKill);
				if (immediateRender) {
					if (dur && time <= 0 && tTime <= 0) {
						time && (tween._zTime = time);
						return;
					}
				}
			} else if (runBackwards && dur) {
				if (!prevStartAt) {
					time && (immediateRender = false);
					p = _setDefaults({
						overwrite: false,
						data: "isFromStart",
						lazy: immediateRender && !prevStartAt && _isNotFalse(lazy),
						immediateRender,
						stagger: 0,
						parent
					}, cleanVars);
					harnessVars && (p[harness.prop] = harnessVars);
					_removeFromParent(tween._startAt = Tween.set(targets, p));
					tween._startAt._dp = 0;
					tween._startAt._sat = tween;
					time < 0 && (_reverting$1 ? tween._startAt.revert(_revertConfigNoKill) : tween._startAt.render(-1, true));
					tween._zTime = time;
					if (!immediateRender) _initTween(tween._startAt, _tinyNum, _tinyNum);
					else if (!time) return;
				}
			}
			tween._pt = tween._ptCache = 0;
			lazy = dur && _isNotFalse(lazy) || lazy && !dur;
			for (i = 0; i < targets.length; i++) {
				target = targets[i];
				gsData = target._gsap || _harness(targets)[i]._gsap;
				tween._ptLookup[i] = ptLookup = {};
				_lazyLookup[gsData.id] && _lazyTweens.length && _lazyRender();
				index = fullTargets === targets ? i : fullTargets.indexOf(target);
				if (harness && (plugin = new harness()).init(target, harnessVars || cleanVars, tween, index, fullTargets) !== false) {
					tween._pt = pt = new PropTween(tween._pt, target, plugin.name, 0, 1, plugin.render, plugin, 0, plugin.priority);
					plugin._props.forEach(function(name) {
						ptLookup[name] = pt;
					});
					plugin.priority && (hasPriority = 1);
				}
				if (!harness || harnessVars) for (p in cleanVars) if (_plugins[p] && (plugin = _checkPlugin(p, cleanVars, tween, index, target, fullTargets))) plugin.priority && (hasPriority = 1);
				else ptLookup[p] = pt = _addPropTween.call(tween, target, p, "get", cleanVars[p], index, fullTargets, 0, vars.stringFilter);
				tween._op && tween._op[i] && tween.kill(target, tween._op[i]);
				if (autoOverwrite && tween._pt) {
					_overwritingTween = tween;
					_globalTimeline.killTweensOf(target, ptLookup, tween.globalTime(time));
					overwritten = !tween.parent;
					_overwritingTween = 0;
				}
				tween._pt && lazy && (_lazyLookup[gsData.id] = 1);
			}
			hasPriority && _sortPropTweensByPriority(tween);
			tween._onInit && tween._onInit(tween);
		}
		tween._onUpdate = onUpdate;
		tween._initted = (!tween._op || tween._pt) && !overwritten;
		keyframes && time <= 0 && tl.render(_bigNum$1, true, true);
	};
	var _updatePropTweens = function _updatePropTweens(tween, property, value, start, startIsRelative, ratio, time, skipRecursion) {
		var ptCache = (tween._pt && tween._ptCache || (tween._ptCache = {}))[property], pt, rootPT, lookup, i;
		if (!ptCache) {
			ptCache = tween._ptCache[property] = [];
			lookup = tween._ptLookup;
			i = tween._targets.length;
			while (i--) {
				pt = lookup[i][property];
				if (pt && pt.d && pt.d._pt) {
					pt = pt.d._pt;
					while (pt && pt.p !== property && pt.fp !== property) pt = pt._next;
				}
				if (!pt) {
					_forceAllPropTweens = 1;
					tween.vars[property] = "+=0";
					_initTween(tween, time);
					_forceAllPropTweens = 0;
					return skipRecursion ? _warn(property + " not eligible for reset. Try splitting into individual properties") : 1;
				}
				ptCache.push(pt);
			}
		}
		i = ptCache.length;
		while (i--) {
			rootPT = ptCache[i];
			pt = rootPT._pt || rootPT;
			pt.s = (start || start === 0) && !startIsRelative ? start : pt.s + (start || 0) + ratio * pt.c;
			pt.c = value - pt.s;
			rootPT.e && (rootPT.e = _round(value) + getUnit(rootPT.e));
			rootPT.b && (rootPT.b = pt.s + getUnit(rootPT.b));
		}
	};
	var _addAliasesToVars = function _addAliasesToVars(targets, vars) {
		var harness = targets[0] ? _getCache(targets[0]).harness : 0, propertyAliases = harness && harness.aliases, copy, p, i, aliases;
		if (!propertyAliases) return vars;
		copy = _merge({}, vars);
		for (p in propertyAliases) if (p in copy) {
			aliases = propertyAliases[p].split(",");
			i = aliases.length;
			while (i--) copy[aliases[i]] = copy[p];
		}
		return copy;
	};
	var _parseKeyframe = function _parseKeyframe(prop, obj, allProps, easeEach) {
		var ease = obj.ease || easeEach || "power1.inOut", p, a;
		if (_isArray(obj)) {
			a = allProps[prop] || (allProps[prop] = []);
			obj.forEach(function(value, i) {
				return a.push({
					t: i / (obj.length - 1) * 100,
					v: value,
					e: ease
				});
			});
		} else for (p in obj) {
			a = allProps[p] || (allProps[p] = []);
			p === "ease" || a.push({
				t: parseFloat(prop),
				v: obj[p],
				e: ease
			});
		}
	};
	var _parseFuncOrString = function _parseFuncOrString(value, tween, i, target, targets) {
		return _isFunction(value) ? value.call(tween, i, target, targets) : _isString(value) && ~value.indexOf("random(") ? _replaceRandom(value) : value;
	};
	var _staggerTweenProps = _callbackNames + "repeat,repeatDelay,yoyo,repeatRefresh,yoyoEase,easeReverse,autoRevert";
	var _staggerPropsToSkip = {};
	_forEachName(_staggerTweenProps + ",id,stagger,delay,duration,paused,scrollTrigger", function(name) {
		return _staggerPropsToSkip[name] = 1;
	});
	var Tween = function(_Animation2) {
		_inheritsLoose(Tween, _Animation2);
		function Tween(targets, vars, position, skipInherit) {
			var _this3;
			if (typeof vars === "number") {
				position.duration = vars;
				vars = position;
				position = null;
			}
			_this3 = _Animation2.call(this, skipInherit ? vars : _inheritDefaults(vars)) || this;
			var _this3$vars = _this3.vars, duration = _this3$vars.duration, delay = _this3$vars.delay, immediateRender = _this3$vars.immediateRender, stagger = _this3$vars.stagger, overwrite = _this3$vars.overwrite, keyframes = _this3$vars.keyframes, defaults = _this3$vars.defaults, scrollTrigger = _this3$vars.scrollTrigger, parent = vars.parent || _globalTimeline, parsedTargets = (_isArray(targets) || _isTypedArray(targets) ? _isNumber(targets[0]) : "length" in vars) ? [targets] : toArray(targets), tl, i, copy, l, p, curTarget, staggerFunc, staggerVarsToMerge;
			_this3._targets = parsedTargets.length ? _harness(parsedTargets) : _warn("GSAP target " + targets + " not found. https://gsap.com", !_config.nullTargetWarn) || [];
			_this3._ptLookup = [];
			_this3._overwrite = overwrite;
			if (keyframes || stagger || _isFuncOrString(duration) || _isFuncOrString(delay)) {
				vars = _this3.vars;
				var easeReverse = vars.easeReverse || vars.yoyoEase;
				tl = _this3.timeline = new Timeline({
					data: "nested",
					defaults: defaults || {},
					targets: parent && parent.data === "nested" ? parent.vars.targets : parsedTargets
				});
				tl.kill();
				tl.parent = tl._dp = _assertThisInitialized(_this3);
				tl._start = 0;
				if (stagger || _isFuncOrString(duration) || _isFuncOrString(delay)) {
					l = parsedTargets.length;
					staggerFunc = stagger && distribute(stagger);
					if (_isObject(stagger)) {
						for (p in stagger) if (~_staggerTweenProps.indexOf(p)) {
							staggerVarsToMerge || (staggerVarsToMerge = {});
							staggerVarsToMerge[p] = stagger[p];
						}
					}
					for (i = 0; i < l; i++) {
						copy = _copyExcluding(vars, _staggerPropsToSkip);
						copy.stagger = 0;
						easeReverse && (copy.easeReverse = easeReverse);
						staggerVarsToMerge && _merge(copy, staggerVarsToMerge);
						curTarget = parsedTargets[i];
						copy.duration = +_parseFuncOrString(duration, _assertThisInitialized(_this3), i, curTarget, parsedTargets);
						copy.delay = (+_parseFuncOrString(delay, _assertThisInitialized(_this3), i, curTarget, parsedTargets) || 0) - _this3._delay;
						if (!stagger && l === 1 && copy.delay) {
							_this3._delay = delay = copy.delay;
							_this3._start += delay;
							copy.delay = 0;
						}
						tl.to(curTarget, copy, staggerFunc ? staggerFunc(i, curTarget, parsedTargets) : 0);
						tl._ease = _easeMap.none;
					}
					tl.duration() ? duration = delay = 0 : _this3.timeline = 0;
				} else if (keyframes) {
					_inheritDefaults(_setDefaults(tl.vars.defaults, { ease: "none" }));
					tl._ease = _parseEase(keyframes.ease || vars.ease || "none");
					var time = 0, a, kf, v;
					if (_isArray(keyframes)) {
						keyframes.forEach(function(frame) {
							return tl.to(parsedTargets, frame, ">");
						});
						tl.duration();
					} else {
						copy = {};
						for (p in keyframes) p === "ease" || p === "easeEach" || _parseKeyframe(p, keyframes[p], copy, keyframes.easeEach);
						for (p in copy) {
							a = copy[p].sort(function(a, b) {
								return a.t - b.t;
							});
							time = 0;
							for (i = 0; i < a.length; i++) {
								kf = a[i];
								v = {
									ease: kf.e,
									duration: (kf.t - (i ? a[i - 1].t : 0)) / 100 * duration
								};
								v[p] = kf.v;
								tl.to(parsedTargets, v, time);
								time += v.duration;
							}
						}
						tl.duration() < duration && tl.to({}, { duration: duration - tl.duration() });
					}
				}
				duration || _this3.duration(duration = tl.duration());
			} else _this3.timeline = 0;
			if (overwrite === true && !_suppressOverwrites) {
				_overwritingTween = _assertThisInitialized(_this3);
				_globalTimeline.killTweensOf(parsedTargets);
				_overwritingTween = 0;
			}
			_addToTimeline(parent, _assertThisInitialized(_this3), position);
			vars.reversed && _this3.reverse();
			vars.paused && _this3.paused(true);
			if (immediateRender || !duration && !keyframes && _this3._start === _roundPrecise(parent._time) && _isNotFalse(immediateRender) && _hasNoPausedAncestors(_assertThisInitialized(_this3)) && parent.data !== "nested") {
				_this3._tTime = -_tinyNum;
				_this3.render(Math.max(0, -delay) || 0);
			}
			scrollTrigger && _scrollTrigger(_assertThisInitialized(_this3), scrollTrigger);
			return _this3;
		}
		var _proto3 = Tween.prototype;
		_proto3.render = function render(totalTime, suppressEvents, force) {
			var prevTime = this._time, tDur = this._tDur, dur = this._dur, isNegative = totalTime < 0, tTime = totalTime > tDur - _tinyNum && !isNegative ? tDur : totalTime < _tinyNum ? 0 : totalTime, time, pt, iteration, cycleDuration, prevIteration, isYoyo, ratio, timeline;
			if (!dur) _renderZeroDurationTween(this, totalTime, suppressEvents, force);
			else if (tTime !== this._tTime || !totalTime || force || !this._initted && this._tTime || this._startAt && this._zTime < 0 !== isNegative || this._lazy) {
				time = tTime;
				timeline = this.timeline;
				if (this._repeat) {
					cycleDuration = dur + this._rDelay;
					if (this._repeat < -1 && isNegative) return this.totalTime(cycleDuration * 100 + totalTime, suppressEvents, force);
					time = _roundPrecise(tTime % cycleDuration);
					if (tTime === tDur) {
						iteration = this._repeat;
						time = dur;
					} else {
						prevIteration = _roundPrecise(tTime / cycleDuration);
						iteration = ~~prevIteration;
						if (iteration && iteration === prevIteration) {
							time = dur;
							iteration--;
						} else if (time > dur) time = dur;
					}
					isYoyo = this._yoyo && iteration & 1;
					if (isYoyo) time = dur - time;
					prevIteration = _animationCycle(this._tTime, cycleDuration);
					if (time === prevTime && !force && this._initted && iteration === prevIteration) {
						this._tTime = tTime;
						return this;
					}
					if (iteration !== prevIteration) {
						if (this.vars.repeatRefresh && !isYoyo && !this._lock && time !== cycleDuration && this._initted) {
							this._lock = force = 1;
							this.render(_roundPrecise(cycleDuration * iteration), true).invalidate()._lock = 0;
						}
					}
				}
				if (!this._initted) {
					if (_attemptInitTween(this, isNegative ? totalTime : time, force, suppressEvents, tTime)) {
						this._tTime = 0;
						return this;
					}
					if (prevTime !== this._time && !(force && this.vars.repeatRefresh && iteration !== prevIteration)) return this;
					if (dur !== this._dur) return this.render(totalTime, suppressEvents, force);
				}
				if (this._rEase) {
					var inv = time < prevTime;
					if (inv !== this._inv) {
						var segDur = inv ? prevTime : dur - prevTime;
						this._inv = inv;
						if (this._from) this.ratio = 1 - this.ratio;
						this._invRatio = this.ratio;
						this._invTime = prevTime;
						this._invRecip = segDur ? (inv ? -1 : 1) / segDur : 0;
						this._invScale = inv ? -this.ratio : 1 - this.ratio;
						this._invEase = inv ? this._rEase : this._ease;
					}
					this.ratio = ratio = this._invRatio + this._invScale * this._invEase((time - this._invTime) * this._invRecip);
				} else this.ratio = ratio = this._ease(time / dur);
				if (this._from) this.ratio = ratio = 1 - ratio;
				this._tTime = tTime;
				this._time = time;
				if (!this._act && this._ts) {
					this._act = 1;
					this._lazy = 0;
				}
				if (!prevTime && tTime && !suppressEvents && !prevIteration) {
					_callback(this, "onStart");
					if (this._tTime !== tTime) return this;
				}
				pt = this._pt;
				while (pt) {
					pt.r(ratio, pt.d);
					pt = pt._next;
				}
				timeline && timeline.render(totalTime < 0 ? totalTime : timeline._dur * timeline._ease(time / this._dur), suppressEvents, force) || this._startAt && (this._zTime = totalTime);
				if (this._onUpdate && !suppressEvents) {
					isNegative && _rewindStartAt(this, totalTime, suppressEvents, force);
					_callback(this, "onUpdate");
				}
				this._repeat && iteration !== prevIteration && this.vars.onRepeat && !suppressEvents && this.parent && _callback(this, "onRepeat");
				if ((tTime === this._tDur || !tTime) && this._tTime === tTime) {
					isNegative && !this._onUpdate && _rewindStartAt(this, totalTime, true, true);
					(totalTime || !dur) && (tTime === this._tDur && this._ts > 0 || !tTime && this._ts < 0) && _removeFromParent(this, 1);
					if (!suppressEvents && !(isNegative && !prevTime) && (tTime || prevTime || isYoyo)) {
						_callback(this, tTime === tDur ? "onComplete" : "onReverseComplete", true);
						this._prom && !(tTime < tDur && this.timeScale() > 0) && this._prom();
					}
				}
			}
			return this;
		};
		_proto3.targets = function targets() {
			return this._targets;
		};
		_proto3.invalidate = function invalidate(soft) {
			(!soft || !this.vars.runBackwards) && (this._startAt = 0);
			this._pt = this._op = this._onUpdate = this._lazy = this.ratio = 0;
			this._ptLookup = [];
			this.timeline && this.timeline.invalidate(soft);
			return _Animation2.prototype.invalidate.call(this, soft);
		};
		_proto3.resetTo = function resetTo(property, value, start, startIsRelative, skipRecursion) {
			_tickerActive || _ticker.wake();
			this._ts || this.play();
			var time = Math.min(this._dur, (this._dp._time - this._start) * this._ts), ratio;
			this._initted || _initTween(this, time);
			ratio = this._ease(time / this._dur);
			if (_updatePropTweens(this, property, value, start, startIsRelative, ratio, time, skipRecursion)) return this.resetTo(property, value, start, startIsRelative, 1);
			_alignPlayhead(this, 0);
			this.parent || _addLinkedListItem(this._dp, this, "_first", "_last", this._dp._sort ? "_start" : 0);
			return this.render(0);
		};
		_proto3.kill = function kill(targets, vars) {
			if (vars === void 0) vars = "all";
			if (!targets && (!vars || vars === "all")) {
				this._lazy = this._pt = 0;
				this.parent ? _interrupt(this) : this.scrollTrigger && this.scrollTrigger.kill(!!_reverting$1);
				return this;
			}
			if (this.timeline) {
				var tDur = this.timeline.totalDuration();
				this.timeline.killTweensOf(targets, vars, _overwritingTween && _overwritingTween.vars.overwrite !== true)._first || _interrupt(this);
				this.parent && tDur !== this.timeline.totalDuration() && _setDuration(this, this._dur * this.timeline._tDur / tDur, 0, 1);
				return this;
			}
			var parsedTargets = this._targets, killingTargets = targets ? toArray(targets) : parsedTargets, propTweenLookup = this._ptLookup, firstPT = this._pt, overwrittenProps, curLookup, curOverwriteProps, props, p, pt, i;
			if ((!vars || vars === "all") && _arraysMatch(parsedTargets, killingTargets)) {
				vars === "all" && (this._pt = 0);
				return _interrupt(this);
			}
			overwrittenProps = this._op = this._op || [];
			if (vars !== "all") {
				if (_isString(vars)) {
					p = {};
					_forEachName(vars, function(name) {
						return p[name] = 1;
					});
					vars = p;
				}
				vars = _addAliasesToVars(parsedTargets, vars);
			}
			i = parsedTargets.length;
			while (i--) if (~killingTargets.indexOf(parsedTargets[i])) {
				curLookup = propTweenLookup[i];
				if (vars === "all") {
					overwrittenProps[i] = vars;
					props = curLookup;
					curOverwriteProps = {};
				} else {
					curOverwriteProps = overwrittenProps[i] = overwrittenProps[i] || {};
					props = vars;
				}
				for (p in props) {
					pt = curLookup && curLookup[p];
					if (pt) {
						if (!("kill" in pt.d) || pt.d.kill(p) === true) _removeLinkedListItem(this, pt, "_pt");
						delete curLookup[p];
					}
					if (curOverwriteProps !== "all") curOverwriteProps[p] = 1;
				}
			}
			this._initted && !this._pt && firstPT && _interrupt(this);
			return this;
		};
		Tween.to = function to(targets, vars) {
			return new Tween(targets, vars, arguments[2]);
		};
		Tween.from = function from(targets, vars) {
			return _createTweenType(1, arguments);
		};
		Tween.delayedCall = function delayedCall(delay, callback, params, scope) {
			return new Tween(callback, 0, {
				immediateRender: false,
				lazy: false,
				overwrite: false,
				delay,
				onComplete: callback,
				onReverseComplete: callback,
				onCompleteParams: params,
				onReverseCompleteParams: params,
				callbackScope: scope
			});
		};
		Tween.fromTo = function fromTo(targets, fromVars, toVars) {
			return _createTweenType(2, arguments);
		};
		Tween.set = function set(targets, vars) {
			vars.duration = 0;
			vars.repeatDelay || (vars.repeat = 0);
			return new Tween(targets, vars);
		};
		Tween.killTweensOf = function killTweensOf(targets, props, onlyActive) {
			return _globalTimeline.killTweensOf(targets, props, onlyActive);
		};
		return Tween;
	}(Animation);
	_setDefaults(Tween.prototype, {
		_targets: [],
		_lazy: 0,
		_startAt: 0,
		_op: 0,
		_onInit: 0
	});
	_forEachName("staggerTo,staggerFrom,staggerFromTo", function(name) {
		Tween[name] = function() {
			var tl = new Timeline(), params = _slice.call(arguments, 0);
			params.splice(name === "staggerFromTo" ? 5 : 4, 0, 0);
			return tl[name].apply(tl, params);
		};
	});
	var _setterPlain = function _setterPlain(target, property, value) {
		return target[property] = value;
	};
	var _setterFunc = function _setterFunc(target, property, value) {
		return target[property](value);
	};
	var _setterFuncWithParam = function _setterFuncWithParam(target, property, value, data) {
		return target[property](data.fp, value);
	};
	var _setterAttribute = function _setterAttribute(target, property, value) {
		return target.setAttribute(property, value);
	};
	var _getSetter = function _getSetter(target, property) {
		return _isFunction(target[property]) ? _setterFunc : _isUndefined(target[property]) && target.setAttribute ? _setterAttribute : _setterPlain;
	};
	var _renderPlain = function _renderPlain(ratio, data) {
		return data.set(data.t, data.p, Math.round((data.s + data.c * ratio) * 1e6) / 1e6, data);
	};
	var _renderBoolean = function _renderBoolean(ratio, data) {
		return data.set(data.t, data.p, !!(data.s + data.c * ratio), data);
	};
	var _renderComplexString = function _renderComplexString(ratio, data) {
		var pt = data._pt, s = "";
		if (!ratio && data.b) s = data.b;
		else if (ratio === 1 && data.e) s = data.e;
		else {
			while (pt) {
				s = pt.p + (pt.m ? pt.m(pt.s + pt.c * ratio) : Math.round((pt.s + pt.c * ratio) * 1e4) / 1e4) + s;
				pt = pt._next;
			}
			s += data.c;
		}
		data.set(data.t, data.p, s, data);
	};
	var _renderPropTweens = function _renderPropTweens(ratio, data) {
		var pt = data._pt;
		while (pt) {
			pt.r(ratio, pt.d);
			pt = pt._next;
		}
	};
	var _addPluginModifier = function _addPluginModifier(modifier, tween, target, property) {
		var pt = this._pt, next;
		while (pt) {
			next = pt._next;
			pt.p === property && pt.modifier(modifier, tween, target);
			pt = next;
		}
	};
	var _killPropTweensOf = function _killPropTweensOf(property) {
		var pt = this._pt, hasNonDependentRemaining, next;
		while (pt) {
			next = pt._next;
			if (pt.p === property && !pt.op || pt.op === property) _removeLinkedListItem(this, pt, "_pt");
			else if (!pt.dep) hasNonDependentRemaining = 1;
			pt = next;
		}
		return !hasNonDependentRemaining;
	};
	var _setterWithModifier = function _setterWithModifier(target, property, value, data) {
		data.mSet(target, property, data.m.call(data.tween, value, data.mt), data);
	};
	var _sortPropTweensByPriority = function _sortPropTweensByPriority(parent) {
		var pt = parent._pt, next, pt2, first, last;
		while (pt) {
			next = pt._next;
			pt2 = first;
			while (pt2 && pt2.pr > pt.pr) pt2 = pt2._next;
			if (pt._prev = pt2 ? pt2._prev : last) pt._prev._next = pt;
			else first = pt;
			if (pt._next = pt2) pt2._prev = pt;
			else last = pt;
			pt = next;
		}
		parent._pt = first;
	};
	var PropTween = function() {
		function PropTween(next, target, prop, start, change, renderer, data, setter, priority) {
			this.t = target;
			this.s = start;
			this.c = change;
			this.p = prop;
			this.r = renderer || _renderPlain;
			this.d = data || this;
			this.set = setter || _setterPlain;
			this.pr = priority || 0;
			this._next = next;
			if (next) next._prev = this;
		}
		var _proto4 = PropTween.prototype;
		_proto4.modifier = function modifier(func, tween, target) {
			this.mSet = this.mSet || this.set;
			this.set = _setterWithModifier;
			this.m = func;
			this.mt = target;
			this.tween = tween;
		};
		return PropTween;
	}();
	_forEachName(_callbackNames + "parent,duration,ease,delay,overwrite,runBackwards,startAt,yoyo,immediateRender,repeat,repeatDelay,data,paused,reversed,lazy,callbackScope,stringFilter,id,yoyoEase,stagger,inherit,repeatRefresh,keyframes,autoRevert,scrollTrigger,easeReverse", function(name) {
		return _reservedProps[name] = 1;
	});
	_globals.TweenMax = _globals.TweenLite = Tween;
	_globals.TimelineLite = _globals.TimelineMax = Timeline;
	_globalTimeline = new Timeline({
		sortChildren: false,
		defaults: _defaults,
		autoRemoveChildren: true,
		id: "root",
		smoothChildTiming: true
	});
	_config.stringFilter = _colorStringFilter;
	var _media = [];
	var _listeners = {};
	var _emptyArray = [];
	var _lastMediaTime = 0;
	var _contextID = 0;
	var _dispatch = function _dispatch(type) {
		return (_listeners[type] || _emptyArray).map(function(f) {
			return f();
		});
	};
	var _onMediaChange = function _onMediaChange() {
		var time = Date.now(), matches = [];
		if (time - _lastMediaTime > 2) {
			_dispatch("matchMediaInit");
			_media.forEach(function(c) {
				var queries = c.queries, conditions = c.conditions, match, p, anyMatch, toggled;
				for (p in queries) {
					match = _win$1.matchMedia(queries[p]).matches;
					match && (anyMatch = 1);
					if (match !== conditions[p]) {
						conditions[p] = match;
						toggled = 1;
					}
				}
				if (toggled) {
					c.revert();
					anyMatch && matches.push(c);
				}
			});
			_dispatch("matchMediaRevert");
			matches.forEach(function(c) {
				return c.onMatch(c, function(func) {
					return c.add(null, func);
				});
			});
			_lastMediaTime = time;
			_dispatch("matchMedia");
		}
	};
	var Context = function() {
		function Context(func, scope) {
			this.selector = scope && selector(scope);
			this.data = [];
			this._r = [];
			this.isReverted = false;
			this.id = _contextID++;
			func && this.add(func);
		}
		var _proto5 = Context.prototype;
		_proto5.add = function add(name, func, scope) {
			if (_isFunction(name)) {
				scope = func;
				func = name;
				name = _isFunction;
			}
			var self = this, f = function f() {
				var prev = _context, prevSelector = self.selector, result;
				prev && prev !== self && prev.data.push(self);
				scope && (self.selector = selector(scope));
				_context = self;
				result = func.apply(self, arguments);
				_isFunction(result) && self._r.push(result);
				_context = prev;
				self.selector = prevSelector;
				self.isReverted = false;
				return result;
			};
			self.last = f;
			return name === _isFunction ? f(self, function(func) {
				return self.add(null, func);
			}) : name ? self[name] = f : f;
		};
		_proto5.ignore = function ignore(func) {
			var prev = _context;
			_context = null;
			func(this);
			_context = prev;
		};
		_proto5.getTweens = function getTweens() {
			var a = [];
			this.data.forEach(function(e) {
				return e instanceof Context ? a.push.apply(a, e.getTweens()) : e instanceof Tween && !(e.parent && e.parent.data === "nested") && a.push(e);
			});
			return a;
		};
		_proto5.clear = function clear() {
			this._r.length = this.data.length = 0;
		};
		_proto5.kill = function kill(revert, matchMedia) {
			var _this4 = this;
			if (revert) (function() {
				var tweens = _this4.getTweens(), i = _this4.data.length, t;
				while (i--) {
					t = _this4.data[i];
					if (t.data === "isFlip") {
						t.revert();
						t.getChildren(true, true, false).forEach(function(tween) {
							return tweens.splice(tweens.indexOf(tween), 1);
						});
					}
				}
				tweens.map(function(t) {
					return {
						g: t._dur || t._delay || t._sat && !t._sat.vars.immediateRender ? t.globalTime(0) : -Infinity,
						t
					};
				}).sort(function(a, b) {
					return b.g - a.g || -Infinity;
				}).forEach(function(o) {
					return o.t.revert(revert);
				});
				i = _this4.data.length;
				while (i--) {
					t = _this4.data[i];
					if (t instanceof Timeline) {
						if (t.data !== "nested") {
							t.scrollTrigger && t.scrollTrigger.revert();
							t.kill();
						}
					} else !(t instanceof Tween) && t.revert && t.revert(revert);
				}
				_this4._r.forEach(function(f) {
					return f(revert, _this4);
				});
				_this4.isReverted = true;
			})();
			else this.data.forEach(function(e) {
				return e.kill && e.kill();
			});
			this.clear();
			if (matchMedia) {
				var i = _media.length;
				while (i--) _media[i].id === this.id && _media.splice(i, 1);
			}
		};
		_proto5.revert = function revert(config) {
			this.kill(config || {});
		};
		return Context;
	}();
	var MatchMedia = function() {
		function MatchMedia(scope) {
			this.contexts = [];
			this.scope = scope;
			_context && _context.data.push(this);
		}
		var _proto6 = MatchMedia.prototype;
		_proto6.add = function add(conditions, func, scope) {
			_isObject(conditions) || (conditions = { matches: conditions });
			var context = new Context(0, scope || this.scope), cond = context.conditions = {}, mq, p, active;
			_context && !context.selector && (context.selector = _context.selector);
			this.contexts.push(context);
			func = context.add("onMatch", func);
			context.queries = conditions;
			for (p in conditions) if (p === "all") active = 1;
			else {
				mq = _win$1.matchMedia(conditions[p]);
				if (mq) {
					_media.indexOf(context) < 0 && _media.push(context);
					(cond[p] = mq.matches) && (active = 1);
					mq.addListener ? mq.addListener(_onMediaChange) : mq.addEventListener("change", _onMediaChange);
				}
			}
			active && func(context, function(f) {
				return context.add(null, f);
			});
			return this;
		};
		_proto6.revert = function revert(config) {
			this.kill(config || {});
		};
		_proto6.kill = function kill(revert) {
			this.contexts.forEach(function(c) {
				return c.kill(revert, true);
			});
		};
		return MatchMedia;
	}();
	var _gsap = {
		registerPlugin: function registerPlugin() {
			for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) args[_key2] = arguments[_key2];
			args.forEach(function(config) {
				return _createPlugin(config);
			});
		},
		timeline: function timeline(vars) {
			return new Timeline(vars);
		},
		getTweensOf: function getTweensOf(targets, onlyActive) {
			return _globalTimeline.getTweensOf(targets, onlyActive);
		},
		getProperty: function getProperty(target, property, unit, uncache) {
			_isString(target) && (target = toArray(target)[0]);
			var getter = _getCache(target || {}).get, format = unit ? _passThrough : _numericIfPossible;
			unit === "native" && (unit = "");
			return !target ? target : !property ? function(property, unit, uncache) {
				return format((_plugins[property] && _plugins[property].get || getter)(target, property, unit, uncache));
			} : format((_plugins[property] && _plugins[property].get || getter)(target, property, unit, uncache));
		},
		quickSetter: function quickSetter(target, property, unit) {
			target = toArray(target);
			if (target.length > 1) {
				var setters = target.map(function(t) {
					return gsap.quickSetter(t, property, unit);
				}), l = setters.length;
				return function(value) {
					var i = l;
					while (i--) setters[i](value);
				};
			}
			target = target[0] || {};
			var Plugin = _plugins[property], cache = _getCache(target), p = cache.harness && (cache.harness.aliases || {})[property] || property, setter = Plugin ? function(value) {
				var p = new Plugin();
				_quickTween._pt = 0;
				p.init(target, unit ? value + unit : value, _quickTween, 0, [target]);
				p.render(1, p);
				_quickTween._pt && _renderPropTweens(1, _quickTween);
			} : cache.set(target, p);
			return Plugin ? setter : function(value) {
				return setter(target, p, unit ? value + unit : value, cache, 1);
			};
		},
		quickTo: function quickTo(target, property, vars) {
			var _setDefaults2;
			var tween = gsap.to(target, _setDefaults((_setDefaults2 = {}, _setDefaults2[property] = "+=0.1", _setDefaults2.paused = true, _setDefaults2.stagger = 0, _setDefaults2), vars || {})), func = function func(value, start, startIsRelative) {
				return tween.resetTo(property, value, start, startIsRelative);
			};
			func.tween = tween;
			return func;
		},
		isTweening: function isTweening(targets) {
			return _globalTimeline.getTweensOf(targets, true).length > 0;
		},
		defaults: function defaults(value) {
			value && value.ease && (value.ease = _parseEase(value.ease, _defaults.ease));
			return _mergeDeep(_defaults, value || {});
		},
		config: function config(value) {
			return _mergeDeep(_config, value || {});
		},
		registerEffect: function registerEffect(_ref3) {
			var name = _ref3.name, effect = _ref3.effect, plugins = _ref3.plugins, defaults = _ref3.defaults, extendTimeline = _ref3.extendTimeline;
			(plugins || "").split(",").forEach(function(pluginName) {
				return pluginName && !_plugins[pluginName] && !_globals[pluginName] && _warn(name + " effect requires " + pluginName + " plugin.");
			});
			_effects[name] = function(targets, vars, tl) {
				return effect(toArray(targets), _setDefaults(vars || {}, defaults), tl);
			};
			if (extendTimeline) Timeline.prototype[name] = function(targets, vars, position) {
				return this.add(_effects[name](targets, _isObject(vars) ? vars : (position = vars) && {}, this), position);
			};
		},
		registerEase: function registerEase(name, ease) {
			_easeMap[name] = _parseEase(ease);
		},
		parseEase: function parseEase(ease, defaultEase) {
			return arguments.length ? _parseEase(ease, defaultEase) : _easeMap;
		},
		getById: function getById(id) {
			return _globalTimeline.getById(id);
		},
		exportRoot: function exportRoot(vars, includeDelayedCalls) {
			if (vars === void 0) vars = {};
			var tl = new Timeline(vars), child, next;
			tl.smoothChildTiming = _isNotFalse(vars.smoothChildTiming);
			_globalTimeline.remove(tl);
			tl._dp = 0;
			tl._time = tl._tTime = _globalTimeline._time;
			child = _globalTimeline._first;
			while (child) {
				next = child._next;
				if (includeDelayedCalls || !(!child._dur && child instanceof Tween && child.vars.onComplete === child._targets[0])) _addToTimeline(tl, child, child._start - child._delay);
				child = next;
			}
			_addToTimeline(_globalTimeline, tl, 0);
			return tl;
		},
		context: function context(func, scope) {
			return func ? new Context(func, scope) : _context;
		},
		matchMedia: function matchMedia(scope) {
			return new MatchMedia(scope);
		},
		matchMediaRefresh: function matchMediaRefresh() {
			return _media.forEach(function(c) {
				var cond = c.conditions, found, p;
				for (p in cond) if (cond[p]) {
					cond[p] = false;
					found = 1;
				}
				found && c.revert();
			}) || _onMediaChange();
		},
		addEventListener: function addEventListener(type, callback) {
			var a = _listeners[type] || (_listeners[type] = []);
			~a.indexOf(callback) || a.push(callback);
		},
		removeEventListener: function removeEventListener(type, callback) {
			var a = _listeners[type], i = a && a.indexOf(callback);
			i >= 0 && a.splice(i, 1);
		},
		utils: {
			wrap,
			wrapYoyo,
			distribute,
			random,
			snap,
			normalize,
			getUnit,
			clamp,
			splitColor,
			toArray,
			selector,
			mapRange,
			pipe,
			unitize,
			interpolate,
			shuffle
		},
		install: _install,
		effects: _effects,
		ticker: _ticker,
		updateRoot: Timeline.updateRoot,
		plugins: _plugins,
		globalTimeline: _globalTimeline,
		core: {
			PropTween,
			globals: _addGlobal,
			Tween,
			Timeline,
			Animation,
			getCache: _getCache,
			_removeLinkedListItem,
			reverting: function reverting() {
				return _reverting$1;
			},
			context: function context(toAdd) {
				if (toAdd && _context) {
					_context.data.push(toAdd);
					toAdd._ctx = _context;
				}
				return _context;
			},
			suppressOverwrites: function suppressOverwrites(value) {
				return _suppressOverwrites = value;
			}
		}
	};
	_forEachName("to,from,fromTo,delayedCall,set,killTweensOf", function(name) {
		return _gsap[name] = Tween[name];
	});
	_ticker.add(Timeline.updateRoot);
	_quickTween = _gsap.to({}, { duration: 0 });
	var _getPluginPropTween = function _getPluginPropTween(plugin, prop) {
		var pt = plugin._pt;
		while (pt && pt.p !== prop && pt.op !== prop && pt.fp !== prop) pt = pt._next;
		return pt;
	};
	var _addModifiers = function _addModifiers(tween, modifiers) {
		var targets = tween._targets, p, i, pt;
		for (p in modifiers) {
			i = targets.length;
			while (i--) {
				pt = tween._ptLookup[i][p];
				if (pt && (pt = pt.d)) {
					if (pt._pt) pt = _getPluginPropTween(pt, p);
					pt && pt.modifier && pt.modifier(modifiers[p], tween, targets[i], p);
				}
			}
		}
	};
	var _buildModifierPlugin = function _buildModifierPlugin(name, modifier) {
		return {
			name,
			headless: 1,
			rawVars: 1,
			init: function init(target, vars, tween) {
				tween._onInit = function(tween) {
					var temp, p;
					if (_isString(vars)) {
						temp = {};
						_forEachName(vars, function(name) {
							return temp[name] = 1;
						});
						vars = temp;
					}
					if (modifier) {
						temp = {};
						for (p in vars) temp[p] = modifier(vars[p]);
						vars = temp;
					}
					_addModifiers(tween, vars);
				};
			}
		};
	};
	var gsap = _gsap.registerPlugin({
		name: "attr",
		init: function init(target, vars, tween, index, targets) {
			var p, pt, v;
			this.tween = tween;
			for (p in vars) {
				v = target.getAttribute(p) || "";
				pt = this.add(target, "setAttribute", (v || 0) + "", vars[p], index, targets, 0, 0, p);
				pt.op = p;
				pt.b = v;
				this._props.push(p);
			}
		},
		render: function render(ratio, data) {
			var pt = data._pt;
			while (pt) {
				_reverting$1 ? pt.set(pt.t, pt.p, pt.b, pt) : pt.r(ratio, pt.d);
				pt = pt._next;
			}
		}
	}, {
		name: "endArray",
		headless: 1,
		init: function init(target, value) {
			var i = value.length;
			while (i--) this.add(target, i, target[i] || 0, value[i], 0, 0, 0, 0, 0, 1);
		}
	}, _buildModifierPlugin("roundProps", _roundModifier), _buildModifierPlugin("modifiers"), _buildModifierPlugin("snap", snap)) || _gsap;
	Tween.version = Timeline.version = gsap.version = "3.15.0";
	_coreReady = 1;
	_windowExists$1() && _wake();
	_easeMap.Power0;
	_easeMap.Power1;
	_easeMap.Power2;
	_easeMap.Power3;
	_easeMap.Power4;
	_easeMap.Linear;
	_easeMap.Quad;
	_easeMap.Cubic;
	_easeMap.Quart;
	_easeMap.Quint;
	_easeMap.Strong;
	_easeMap.Elastic;
	_easeMap.Back;
	_easeMap.SteppedEase;
	_easeMap.Bounce;
	_easeMap.Sine;
	_easeMap.Expo;
	_easeMap.Circ;
	var _win;
	var _doc;
	var _docElement;
	var _pluginInitted;
	var _tempDiv;
	var _recentSetterPlugin;
	var _reverting;
	var _windowExists = function _windowExists() {
		return typeof window !== "undefined";
	};
	var _transformProps = {};
	var _RAD2DEG = 180 / Math.PI;
	var _DEG2RAD = Math.PI / 180;
	var _atan2 = Math.atan2;
	var _bigNum = 1e8;
	var _capsExp = /([A-Z])/g;
	var _horizontalExp = /(left|right|width|margin|padding|x)/i;
	var _complexExp = /[\s,\(]\S/;
	var _propertyAliases = {
		autoAlpha: "opacity,visibility",
		scale: "scaleX,scaleY",
		alpha: "opacity"
	};
	var _renderCSSProp = function _renderCSSProp(ratio, data) {
		return data.set(data.t, data.p, Math.round((data.s + data.c * ratio) * 1e4) / 1e4 + data.u, data);
	};
	var _renderPropWithEnd = function _renderPropWithEnd(ratio, data) {
		return data.set(data.t, data.p, ratio === 1 ? data.e : Math.round((data.s + data.c * ratio) * 1e4) / 1e4 + data.u, data);
	};
	var _renderCSSPropWithBeginning = function _renderCSSPropWithBeginning(ratio, data) {
		return data.set(data.t, data.p, ratio ? Math.round((data.s + data.c * ratio) * 1e4) / 1e4 + data.u : data.b, data);
	};
	var _renderCSSPropWithBeginningAndEnd = function _renderCSSPropWithBeginningAndEnd(ratio, data) {
		return data.set(data.t, data.p, ratio === 1 ? data.e : ratio ? Math.round((data.s + data.c * ratio) * 1e4) / 1e4 + data.u : data.b, data);
	};
	var _renderRoundedCSSProp = function _renderRoundedCSSProp(ratio, data) {
		var value = data.s + data.c * ratio;
		data.set(data.t, data.p, ~~(value + (value < 0 ? -.5 : .5)) + data.u, data);
	};
	var _renderNonTweeningValue = function _renderNonTweeningValue(ratio, data) {
		return data.set(data.t, data.p, ratio ? data.e : data.b, data);
	};
	var _renderNonTweeningValueOnlyAtEnd = function _renderNonTweeningValueOnlyAtEnd(ratio, data) {
		return data.set(data.t, data.p, ratio !== 1 ? data.b : data.e, data);
	};
	var _setterCSSStyle = function _setterCSSStyle(target, property, value) {
		return target.style[property] = value;
	};
	var _setterCSSProp = function _setterCSSProp(target, property, value) {
		return target.style.setProperty(property, value);
	};
	var _setterTransform = function _setterTransform(target, property, value) {
		return target._gsap[property] = value;
	};
	var _setterScale = function _setterScale(target, property, value) {
		return target._gsap.scaleX = target._gsap.scaleY = value;
	};
	var _setterScaleWithRender = function _setterScaleWithRender(target, property, value, data, ratio) {
		var cache = target._gsap;
		cache.scaleX = cache.scaleY = value;
		cache.renderTransform(ratio, cache);
	};
	var _setterTransformWithRender = function _setterTransformWithRender(target, property, value, data, ratio) {
		var cache = target._gsap;
		cache[property] = value;
		cache.renderTransform(ratio, cache);
	};
	var _transformProp = "transform";
	var _transformOriginProp = _transformProp + "Origin";
	var _saveStyle = function _saveStyle(property, isNotCSS) {
		var _this = this;
		var target = this.target, style = target.style, cache = target._gsap;
		if (property in _transformProps && style) {
			this.tfm = this.tfm || {};
			if (property !== "transform") {
				property = _propertyAliases[property] || property;
				~property.indexOf(",") ? property.split(",").forEach(function(a) {
					return _this.tfm[a] = _get(target, a);
				}) : this.tfm[property] = cache.x ? cache[property] : _get(target, property);
				property === _transformOriginProp && (this.tfm.zOrigin = cache.zOrigin);
			} else return _propertyAliases.transform.split(",").forEach(function(p) {
				return _saveStyle.call(_this, p, isNotCSS);
			});
			if (this.props.indexOf(_transformProp) >= 0) return;
			if (cache.svg) {
				this.svgo = target.getAttribute("data-svg-origin");
				this.props.push(_transformOriginProp, isNotCSS, "");
			}
			property = _transformProp;
		}
		(style || isNotCSS) && this.props.push(property, isNotCSS, style[property]);
	};
	var _removeIndependentTransforms = function _removeIndependentTransforms(style) {
		if (style.translate) {
			style.removeProperty("translate");
			style.removeProperty("scale");
			style.removeProperty("rotate");
		}
	};
	var _revertStyle = function _revertStyle() {
		var props = this.props, target = this.target, style = target.style, cache = target._gsap, i = 0, p;
		for (; i < props.length; i += 3) if (!props[i + 1]) props[i + 2] ? style[props[i]] = props[i + 2] : style.removeProperty(props[i].substr(0, 2) === "--" ? props[i] : props[i].replace(_capsExp, "-$1").toLowerCase());
		else if (props[i + 1] === 2) target[props[i]](props[i + 2]);
		else target[props[i]] = props[i + 2];
		if (this.tfm) {
			for (p in this.tfm) cache[p] = this.tfm[p];
			if (cache.svg) {
				cache.renderTransform();
				target.setAttribute("data-svg-origin", this.svgo || "");
			}
			i = _reverting();
			if ((!i || !i.isStart) && !style[_transformProp]) {
				_removeIndependentTransforms(style);
				if (cache.zOrigin && style[_transformOriginProp]) {
					style[_transformOriginProp] += " " + cache.zOrigin + "px";
					cache.zOrigin = 0;
					cache.renderTransform();
				}
				cache.uncache = 1;
			}
		}
	};
	var _getStyleSaver = function _getStyleSaver(target, properties) {
		var saver = {
			target,
			props: [],
			revert: _revertStyle,
			save: _saveStyle
		};
		target._gsap || gsap.core.getCache(target);
		properties && target.style && target.nodeType && properties.split(",").forEach(function(p) {
			return saver.save(p);
		});
		return saver;
	};
	var _supports3D;
	var _createElement = function _createElement(type, ns) {
		var e = _doc.createElementNS ? _doc.createElementNS((ns || "http://www.w3.org/1999/xhtml").replace(/^https/, "http"), type) : _doc.createElement(type);
		return e && e.style ? e : _doc.createElement(type);
	};
	var _getComputedProperty = function _getComputedProperty(target, property, skipPrefixFallback) {
		var cs = getComputedStyle(target);
		return cs[property] || cs.getPropertyValue(property.replace(_capsExp, "-$1").toLowerCase()) || cs.getPropertyValue(property) || !skipPrefixFallback && _getComputedProperty(target, _checkPropPrefix(property) || property, 1) || "";
	};
	var _prefixes = "O,Moz,ms,Ms,Webkit".split(",");
	var _checkPropPrefix = function _checkPropPrefix(property, element, preferPrefix) {
		var s = (element || _tempDiv).style, i = 5;
		if (property in s && !preferPrefix) return property;
		property = property.charAt(0).toUpperCase() + property.substr(1);
		while (i-- && !(_prefixes[i] + property in s));
		return i < 0 ? null : (i === 3 ? "ms" : i >= 0 ? _prefixes[i] : "") + property;
	};
	var _initCore = function _initCore() {
		if (_windowExists() && window.document) {
			_win = window;
			_doc = _win.document;
			_docElement = _doc.documentElement;
			_tempDiv = _createElement("div") || { style: {} };
			_createElement("div");
			_transformProp = _checkPropPrefix(_transformProp);
			_transformOriginProp = _transformProp + "Origin";
			_tempDiv.style.cssText = "border-width:0;line-height:0;position:absolute;padding:0";
			_supports3D = !!_checkPropPrefix("perspective");
			_reverting = gsap.core.reverting;
			_pluginInitted = 1;
		}
	};
	var _getReparentedCloneBBox = function _getReparentedCloneBBox(target) {
		var owner = target.ownerSVGElement, svg = _createElement("svg", owner && owner.getAttribute("xmlns") || "http://www.w3.org/2000/svg"), clone = target.cloneNode(true), bbox;
		clone.style.display = "block";
		svg.appendChild(clone);
		_docElement.appendChild(svg);
		try {
			bbox = clone.getBBox();
		} catch (e) {}
		svg.removeChild(clone);
		_docElement.removeChild(svg);
		return bbox;
	};
	var _getAttributeFallbacks = function _getAttributeFallbacks(target, attributesArray) {
		var i = attributesArray.length;
		while (i--) if (target.hasAttribute(attributesArray[i])) return target.getAttribute(attributesArray[i]);
	};
	var _getBBox = function _getBBox(target) {
		var bounds, cloned;
		try {
			bounds = target.getBBox();
		} catch (error) {
			bounds = _getReparentedCloneBBox(target);
			cloned = 1;
		}
		bounds && (bounds.width || bounds.height) || cloned || (bounds = _getReparentedCloneBBox(target));
		return bounds && !bounds.width && !bounds.x && !bounds.y ? {
			x: +_getAttributeFallbacks(target, [
				"x",
				"cx",
				"x1"
			]) || 0,
			y: +_getAttributeFallbacks(target, [
				"y",
				"cy",
				"y1"
			]) || 0,
			width: 0,
			height: 0
		} : bounds;
	};
	var _isSVG = function _isSVG(e) {
		return !!(e.getCTM && (!e.parentNode || e.ownerSVGElement) && _getBBox(e));
	};
	var _removeProperty = function _removeProperty(target, property) {
		if (property) {
			var style = target.style, first2Chars;
			if (property in _transformProps && property !== _transformOriginProp) property = _transformProp;
			if (style.removeProperty) {
				first2Chars = property.substr(0, 2);
				if (first2Chars === "ms" || property.substr(0, 6) === "webkit") property = "-" + property;
				style.removeProperty(first2Chars === "--" ? property : property.replace(_capsExp, "-$1").toLowerCase());
			} else style.removeAttribute(property);
		}
	};
	var _addNonTweeningPT = function _addNonTweeningPT(plugin, target, property, beginning, end, onlySetAtEnd) {
		var pt = new PropTween(plugin._pt, target, property, 0, 1, onlySetAtEnd ? _renderNonTweeningValueOnlyAtEnd : _renderNonTweeningValue);
		plugin._pt = pt;
		pt.b = beginning;
		pt.e = end;
		plugin._props.push(property);
		return pt;
	};
	var _nonConvertibleUnits = {
		deg: 1,
		rad: 1,
		turn: 1
	};
	var _nonStandardLayouts = {
		grid: 1,
		flex: 1
	};
	var _convertToUnit = function _convertToUnit(target, property, value, unit) {
		var curValue = parseFloat(value) || 0, curUnit = (value + "").trim().substr((curValue + "").length) || "px", style = _tempDiv.style, horizontal = _horizontalExp.test(property), isRootSVG = target.tagName.toLowerCase() === "svg", measureProperty = (isRootSVG ? "client" : "offset") + (horizontal ? "Width" : "Height"), amount = 100, toPixels = unit === "px", toPercent = unit === "%", px, parent, cache, isSVG;
		if (unit === curUnit || !curValue || _nonConvertibleUnits[unit] || _nonConvertibleUnits[curUnit]) return curValue;
		curUnit !== "px" && !toPixels && (curValue = _convertToUnit(target, property, value, "px"));
		isSVG = target.getCTM && _isSVG(target);
		if ((toPercent || curUnit === "%") && (_transformProps[property] || ~property.indexOf("adius"))) {
			px = isSVG ? target.getBBox()[horizontal ? "width" : "height"] : target[measureProperty];
			return _round(toPercent ? curValue / px * amount : curValue / 100 * px);
		}
		style[horizontal ? "width" : "height"] = amount + (toPixels ? curUnit : unit);
		parent = unit !== "rem" && ~property.indexOf("adius") || unit === "em" && target.appendChild && !isRootSVG ? target : target.parentNode;
		if (isSVG) parent = (target.ownerSVGElement || {}).parentNode;
		if (!parent || parent === _doc || !parent.appendChild) parent = _doc.body;
		cache = parent._gsap;
		if (cache && toPercent && cache.width && horizontal && cache.time === _ticker.time && !cache.uncache) return _round(curValue / cache.width * amount);
		else {
			if (toPercent && (property === "height" || property === "width")) {
				var v = target.style[property];
				target.style[property] = amount + unit;
				px = target[measureProperty];
				v ? target.style[property] = v : _removeProperty(target, property);
			} else {
				(toPercent || curUnit === "%") && !_nonStandardLayouts[_getComputedProperty(parent, "display")] && (style.position = _getComputedProperty(target, "position"));
				parent === target && (style.position = "static");
				parent.appendChild(_tempDiv);
				px = _tempDiv[measureProperty];
				parent.removeChild(_tempDiv);
				style.position = "absolute";
			}
			if (horizontal && toPercent) {
				cache = _getCache(parent);
				cache.time = _ticker.time;
				cache.width = parent[measureProperty];
			}
		}
		return _round(toPixels ? px * curValue / amount : px && curValue ? amount / px * curValue : 0);
	};
	var _get = function _get(target, property, unit, uncache) {
		var value;
		_pluginInitted || _initCore();
		if (property in _propertyAliases && property !== "transform") {
			property = _propertyAliases[property];
			if (~property.indexOf(",")) property = property.split(",")[0];
		}
		if (_transformProps[property] && property !== "transform") {
			value = _parseTransform(target, uncache);
			value = property !== "transformOrigin" ? value[property] : value.svg ? value.origin : _firstTwoOnly(_getComputedProperty(target, _transformOriginProp)) + " " + value.zOrigin + "px";
		} else {
			value = target.style[property];
			if (!value || value === "auto" || uncache || ~(value + "").indexOf("calc(")) value = _specialProps[property] && _specialProps[property](target, property, unit) || _getComputedProperty(target, property) || _getProperty(target, property) || (property === "opacity" ? 1 : 0);
		}
		return unit && !~(value + "").trim().indexOf(" ") ? _convertToUnit(target, property, value, unit) + unit : value;
	};
	var _tweenComplexCSSString = function _tweenComplexCSSString(target, prop, start, end) {
		if (!start || start === "none") {
			var p = _checkPropPrefix(prop, target, 1), s = p && _getComputedProperty(target, p, 1);
			if (s && s !== start) {
				prop = p;
				start = s;
			} else if (prop === "borderColor") start = _getComputedProperty(target, "borderTopColor");
		}
		var pt = new PropTween(this._pt, target.style, prop, 0, 1, _renderComplexString), index = 0, matchIndex = 0, a, result, startValues, startNum, color, startValue, endValue, endNum, chunk, endUnit, startUnit, endValues;
		pt.b = start;
		pt.e = end;
		start += "";
		end += "";
		if (end.substring(0, 6) === "var(--") end = _getComputedProperty(target, end.substring(4, end.indexOf(")")));
		if (end === "auto") {
			startValue = target.style[prop];
			target.style[prop] = end;
			end = _getComputedProperty(target, prop) || end;
			startValue ? target.style[prop] = startValue : _removeProperty(target, prop);
		}
		a = [start, end];
		_colorStringFilter(a);
		start = a[0];
		end = a[1];
		startValues = start.match(_numWithUnitExp) || [];
		endValues = end.match(_numWithUnitExp) || [];
		if (endValues.length) {
			while (result = _numWithUnitExp.exec(end)) {
				endValue = result[0];
				chunk = end.substring(index, result.index);
				if (color) color = (color + 1) % 5;
				else if (chunk.substr(-5) === "rgba(" || chunk.substr(-5) === "hsla(") color = 1;
				if (endValue !== (startValue = startValues[matchIndex++] || "")) {
					startNum = parseFloat(startValue) || 0;
					startUnit = startValue.substr((startNum + "").length);
					endValue.charAt(1) === "=" && (endValue = _parseRelative(startNum, endValue) + startUnit);
					endNum = parseFloat(endValue);
					endUnit = endValue.substr((endNum + "").length);
					index = _numWithUnitExp.lastIndex - endUnit.length;
					if (!endUnit) {
						endUnit = endUnit || _config.units[prop] || startUnit;
						if (index === end.length) {
							end += endUnit;
							pt.e += endUnit;
						}
					}
					if (startUnit !== endUnit) startNum = _convertToUnit(target, prop, startValue, endUnit) || 0;
					pt._pt = {
						_next: pt._pt,
						p: chunk || matchIndex === 1 ? chunk : ",",
						s: startNum,
						c: endNum - startNum,
						m: color && color < 4 || prop === "zIndex" ? Math.round : 0
					};
				}
			}
			pt.c = index < end.length ? end.substring(index, end.length) : "";
		} else pt.r = prop === "display" && end === "none" ? _renderNonTweeningValueOnlyAtEnd : _renderNonTweeningValue;
		_relExp.test(end) && (pt.e = 0);
		this._pt = pt;
		return pt;
	};
	var _keywordToPercent = {
		top: "0%",
		bottom: "100%",
		left: "0%",
		right: "100%",
		center: "50%"
	};
	var _convertKeywordsToPercentages = function _convertKeywordsToPercentages(value) {
		var split = value.split(" "), x = split[0], y = split[1] || "50%";
		if (x === "top" || x === "bottom" || y === "left" || y === "right") {
			value = x;
			x = y;
			y = value;
		}
		split[0] = _keywordToPercent[x] || x;
		split[1] = _keywordToPercent[y] || y;
		return split.join(" ");
	};
	var _renderClearProps = function _renderClearProps(ratio, data) {
		if (data.tween && data.tween._time === data.tween._dur) {
			var target = data.t, style = target.style, props = data.u, cache = target._gsap, prop, clearTransforms, i;
			if (props === "all" || props === true) {
				style.cssText = "";
				clearTransforms = 1;
			} else {
				props = props.split(",");
				i = props.length;
				while (--i > -1) {
					prop = props[i];
					if (_transformProps[prop]) {
						clearTransforms = 1;
						prop = prop === "transformOrigin" ? _transformOriginProp : _transformProp;
					}
					_removeProperty(target, prop);
				}
			}
			if (clearTransforms) {
				_removeProperty(target, _transformProp);
				if (cache) {
					cache.svg && target.removeAttribute("transform");
					style.scale = style.rotate = style.translate = "none";
					_parseTransform(target, 1);
					cache.uncache = 1;
					_removeIndependentTransforms(style);
				}
			}
		}
	};
	var _specialProps = { clearProps: function clearProps(plugin, target, property, endValue, tween) {
		if (tween.data !== "isFromStart") {
			var pt = plugin._pt = new PropTween(plugin._pt, target, property, 0, 0, _renderClearProps);
			pt.u = endValue;
			pt.pr = -10;
			pt.tween = tween;
			plugin._props.push(property);
			return 1;
		}
	} };
	var _identity2DMatrix = [
		1,
		0,
		0,
		1,
		0,
		0
	];
	var _rotationalProperties = {};
	var _isNullTransform = function _isNullTransform(value) {
		return value === "matrix(1, 0, 0, 1, 0, 0)" || value === "none" || !value;
	};
	var _getComputedTransformMatrixAsArray = function _getComputedTransformMatrixAsArray(target) {
		var matrixString = _getComputedProperty(target, _transformProp);
		return _isNullTransform(matrixString) ? _identity2DMatrix : matrixString.substr(7).match(_numExp).map(_round);
	};
	var _getMatrix = function _getMatrix(target, force2D) {
		var cache = target._gsap || _getCache(target), style = target.style, matrix = _getComputedTransformMatrixAsArray(target), parent, nextSibling, temp, addedToDOM;
		if (cache.svg && target.getAttribute("transform")) {
			temp = target.transform.baseVal.consolidate().matrix;
			matrix = [
				temp.a,
				temp.b,
				temp.c,
				temp.d,
				temp.e,
				temp.f
			];
			return matrix.join(",") === "1,0,0,1,0,0" ? _identity2DMatrix : matrix;
		} else if (matrix === _identity2DMatrix && !target.offsetParent && target !== _docElement && !cache.svg) {
			temp = style.display;
			style.display = "block";
			parent = target.parentNode;
			if (!parent || !target.offsetParent && !target.getBoundingClientRect().width) {
				addedToDOM = 1;
				nextSibling = target.nextElementSibling;
				_docElement.appendChild(target);
			}
			matrix = _getComputedTransformMatrixAsArray(target);
			temp ? style.display = temp : _removeProperty(target, "display");
			if (addedToDOM) nextSibling ? parent.insertBefore(target, nextSibling) : parent ? parent.appendChild(target) : _docElement.removeChild(target);
		}
		return force2D && matrix.length > 6 ? [
			matrix[0],
			matrix[1],
			matrix[4],
			matrix[5],
			matrix[12],
			matrix[13]
		] : matrix;
	};
	var _applySVGOrigin = function _applySVGOrigin(target, origin, originIsAbsolute, smooth, matrixArray, pluginToAddPropTweensTo) {
		var cache = target._gsap, matrix = matrixArray || _getMatrix(target, true), xOriginOld = cache.xOrigin || 0, yOriginOld = cache.yOrigin || 0, xOffsetOld = cache.xOffset || 0, yOffsetOld = cache.yOffset || 0, a = matrix[0], b = matrix[1], c = matrix[2], d = matrix[3], tx = matrix[4], ty = matrix[5], originSplit = origin.split(" "), xOrigin = parseFloat(originSplit[0]) || 0, yOrigin = parseFloat(originSplit[1]) || 0, bounds, determinant, x, y;
		if (!originIsAbsolute) {
			bounds = _getBBox(target);
			xOrigin = bounds.x + (~originSplit[0].indexOf("%") ? xOrigin / 100 * bounds.width : xOrigin);
			yOrigin = bounds.y + (~(originSplit[1] || originSplit[0]).indexOf("%") ? yOrigin / 100 * bounds.height : yOrigin);
		} else if (matrix !== _identity2DMatrix && (determinant = a * d - b * c)) {
			x = xOrigin * (d / determinant) + yOrigin * (-c / determinant) + (c * ty - d * tx) / determinant;
			y = xOrigin * (-b / determinant) + yOrigin * (a / determinant) - (a * ty - b * tx) / determinant;
			xOrigin = x;
			yOrigin = y;
		}
		if (smooth || smooth !== false && cache.smooth) {
			tx = xOrigin - xOriginOld;
			ty = yOrigin - yOriginOld;
			cache.xOffset = xOffsetOld + (tx * a + ty * c) - tx;
			cache.yOffset = yOffsetOld + (tx * b + ty * d) - ty;
		} else cache.xOffset = cache.yOffset = 0;
		cache.xOrigin = xOrigin;
		cache.yOrigin = yOrigin;
		cache.smooth = !!smooth;
		cache.origin = origin;
		cache.originIsAbsolute = !!originIsAbsolute;
		target.style[_transformOriginProp] = "0px 0px";
		if (pluginToAddPropTweensTo) {
			_addNonTweeningPT(pluginToAddPropTweensTo, cache, "xOrigin", xOriginOld, xOrigin);
			_addNonTweeningPT(pluginToAddPropTweensTo, cache, "yOrigin", yOriginOld, yOrigin);
			_addNonTweeningPT(pluginToAddPropTweensTo, cache, "xOffset", xOffsetOld, cache.xOffset);
			_addNonTweeningPT(pluginToAddPropTweensTo, cache, "yOffset", yOffsetOld, cache.yOffset);
		}
		target.setAttribute("data-svg-origin", xOrigin + " " + yOrigin);
	};
	var _parseTransform = function _parseTransform(target, uncache) {
		var cache = target._gsap || new GSCache(target);
		if ("x" in cache && !uncache && !cache.uncache) return cache;
		var style = target.style, invertedScaleX = cache.scaleX < 0, px = "px", deg = "deg", cs = getComputedStyle(target), origin = _getComputedProperty(target, _transformOriginProp) || "0", x = y = z = rotation = rotationX = rotationY = skewX = skewY = perspective = 0, y, z, scaleX = scaleY = 1, scaleY, rotation, rotationX, rotationY, skewX, skewY, perspective, xOrigin, yOrigin, matrix, angle, cos, sin, a, b, c, d, a12, a22, t1, t2, t3, a13, a23, a33, a42, a43, a32;
		cache.svg = !!(target.getCTM && _isSVG(target));
		if (cs.translate) {
			if (cs.translate !== "none" || cs.scale !== "none" || cs.rotate !== "none") style[_transformProp] = (cs.translate !== "none" ? "translate3d(" + (cs.translate + " 0 0").split(" ").slice(0, 3).join(", ") + ") " : "") + (cs.rotate !== "none" ? "rotate(" + cs.rotate + ") " : "") + (cs.scale !== "none" ? "scale(" + cs.scale.split(" ").join(",") + ") " : "") + (cs[_transformProp] !== "none" ? cs[_transformProp] : "");
			style.scale = style.rotate = style.translate = "none";
		}
		matrix = _getMatrix(target, cache.svg);
		if (cache.svg) {
			if (cache.uncache) {
				t2 = target.getBBox();
				origin = cache.xOrigin - t2.x + "px " + (cache.yOrigin - t2.y) + "px";
				t1 = "";
			} else t1 = !uncache && target.getAttribute("data-svg-origin");
			_applySVGOrigin(target, t1 || origin, !!t1 || cache.originIsAbsolute, cache.smooth !== false, matrix);
		}
		xOrigin = cache.xOrigin || 0;
		yOrigin = cache.yOrigin || 0;
		if (matrix !== _identity2DMatrix) {
			a = matrix[0];
			b = matrix[1];
			c = matrix[2];
			d = matrix[3];
			x = a12 = matrix[4];
			y = a22 = matrix[5];
			if (matrix.length === 6) {
				scaleX = Math.sqrt(a * a + b * b);
				scaleY = Math.sqrt(d * d + c * c);
				rotation = a || b ? _atan2(b, a) * _RAD2DEG : 0;
				skewX = c || d ? _atan2(c, d) * _RAD2DEG + rotation : 0;
				skewX && (scaleY *= Math.abs(Math.cos(skewX * _DEG2RAD)));
				if (cache.svg) {
					x -= xOrigin - (xOrigin * a + yOrigin * c);
					y -= yOrigin - (xOrigin * b + yOrigin * d);
				}
			} else {
				a32 = matrix[6];
				a42 = matrix[7];
				a13 = matrix[8];
				a23 = matrix[9];
				a33 = matrix[10];
				a43 = matrix[11];
				x = matrix[12];
				y = matrix[13];
				z = matrix[14];
				angle = _atan2(a32, a33);
				rotationX = angle * _RAD2DEG;
				if (angle) {
					cos = Math.cos(-angle);
					sin = Math.sin(-angle);
					t1 = a12 * cos + a13 * sin;
					t2 = a22 * cos + a23 * sin;
					t3 = a32 * cos + a33 * sin;
					a13 = a12 * -sin + a13 * cos;
					a23 = a22 * -sin + a23 * cos;
					a33 = a32 * -sin + a33 * cos;
					a43 = a42 * -sin + a43 * cos;
					a12 = t1;
					a22 = t2;
					a32 = t3;
				}
				angle = _atan2(-c, a33);
				rotationY = angle * _RAD2DEG;
				if (angle) {
					cos = Math.cos(-angle);
					sin = Math.sin(-angle);
					t1 = a * cos - a13 * sin;
					t2 = b * cos - a23 * sin;
					t3 = c * cos - a33 * sin;
					a43 = d * sin + a43 * cos;
					a = t1;
					b = t2;
					c = t3;
				}
				angle = _atan2(b, a);
				rotation = angle * _RAD2DEG;
				if (angle) {
					cos = Math.cos(angle);
					sin = Math.sin(angle);
					t1 = a * cos + b * sin;
					t2 = a12 * cos + a22 * sin;
					b = b * cos - a * sin;
					a22 = a22 * cos - a12 * sin;
					a = t1;
					a12 = t2;
				}
				if (rotationX && Math.abs(rotationX) + Math.abs(rotation) > 359.9) {
					rotationX = rotation = 0;
					rotationY = 180 - rotationY;
				}
				scaleX = _round(Math.sqrt(a * a + b * b + c * c));
				scaleY = _round(Math.sqrt(a22 * a22 + a32 * a32));
				angle = _atan2(a12, a22);
				skewX = Math.abs(angle) > 2e-4 ? angle * _RAD2DEG : 0;
				perspective = a43 ? 1 / (a43 < 0 ? -a43 : a43) : 0;
			}
			if (cache.svg) {
				t1 = target.getAttribute("transform");
				cache.forceCSS = target.setAttribute("transform", "") || !_isNullTransform(_getComputedProperty(target, _transformProp));
				t1 && target.setAttribute("transform", t1);
			}
		}
		if (Math.abs(skewX) > 90 && Math.abs(skewX) < 270) {
			if (invertedScaleX) {
				scaleX *= -1;
				skewX += rotation <= 0 ? 180 : -180;
				rotation += rotation <= 0 ? 180 : -180;
			} else {
				scaleY *= -1;
				skewX += skewX <= 0 ? 180 : -180;
			}
		}
		uncache = uncache || cache.uncache;
		cache.x = x - ((cache.xPercent = x && (!uncache && cache.xPercent || (Math.round(target.offsetWidth / 2) === Math.round(-x) ? -50 : 0))) ? target.offsetWidth * cache.xPercent / 100 : 0) + px;
		cache.y = y - ((cache.yPercent = y && (!uncache && cache.yPercent || (Math.round(target.offsetHeight / 2) === Math.round(-y) ? -50 : 0))) ? target.offsetHeight * cache.yPercent / 100 : 0) + px;
		cache.z = z + px;
		cache.scaleX = _round(scaleX);
		cache.scaleY = _round(scaleY);
		cache.rotation = _round(rotation) + deg;
		cache.rotationX = _round(rotationX) + deg;
		cache.rotationY = _round(rotationY) + deg;
		cache.skewX = skewX + deg;
		cache.skewY = skewY + deg;
		cache.transformPerspective = perspective + px;
		if (cache.zOrigin = parseFloat(origin.split(" ")[2]) || !uncache && cache.zOrigin || 0) style[_transformOriginProp] = _firstTwoOnly(origin);
		cache.xOffset = cache.yOffset = 0;
		cache.force3D = _config.force3D;
		cache.renderTransform = cache.svg ? _renderSVGTransforms : _supports3D ? _renderCSSTransforms : _renderNon3DTransforms;
		cache.uncache = 0;
		return cache;
	};
	var _firstTwoOnly = function _firstTwoOnly(value) {
		return (value = value.split(" "))[0] + " " + value[1];
	};
	var _addPxTranslate = function _addPxTranslate(target, start, value) {
		var unit = getUnit(start);
		return _round(parseFloat(start) + parseFloat(_convertToUnit(target, "x", value + "px", unit))) + unit;
	};
	var _renderNon3DTransforms = function _renderNon3DTransforms(ratio, cache) {
		cache.z = "0px";
		cache.rotationY = cache.rotationX = "0deg";
		cache.force3D = 0;
		_renderCSSTransforms(ratio, cache);
	};
	var _zeroDeg = "0deg";
	var _zeroPx = "0px";
	var _endParenthesis = ") ";
	var _renderCSSTransforms = function _renderCSSTransforms(ratio, cache) {
		var _ref = cache || this, xPercent = _ref.xPercent, yPercent = _ref.yPercent, x = _ref.x, y = _ref.y, z = _ref.z, rotation = _ref.rotation, rotationY = _ref.rotationY, rotationX = _ref.rotationX, skewX = _ref.skewX, skewY = _ref.skewY, scaleX = _ref.scaleX, scaleY = _ref.scaleY, transformPerspective = _ref.transformPerspective, force3D = _ref.force3D, target = _ref.target, zOrigin = _ref.zOrigin, transforms = "", use3D = force3D === "auto" && ratio && ratio !== 1 || force3D === true;
		if (zOrigin && (rotationX !== _zeroDeg || rotationY !== _zeroDeg)) {
			var angle = parseFloat(rotationY) * _DEG2RAD, a13 = Math.sin(angle), a33 = Math.cos(angle), cos;
			angle = parseFloat(rotationX) * _DEG2RAD;
			cos = Math.cos(angle);
			x = _addPxTranslate(target, x, a13 * cos * -zOrigin);
			y = _addPxTranslate(target, y, -Math.sin(angle) * -zOrigin);
			z = _addPxTranslate(target, z, a33 * cos * -zOrigin + zOrigin);
		}
		if (transformPerspective !== _zeroPx) transforms += "perspective(" + transformPerspective + _endParenthesis;
		if (xPercent || yPercent) transforms += "translate(" + xPercent + "%, " + yPercent + "%) ";
		if (use3D || x !== _zeroPx || y !== _zeroPx || z !== _zeroPx) transforms += z !== _zeroPx || use3D ? "translate3d(" + x + ", " + y + ", " + z + ") " : "translate(" + x + ", " + y + _endParenthesis;
		if (rotation !== _zeroDeg) transforms += "rotate(" + rotation + _endParenthesis;
		if (rotationY !== _zeroDeg) transforms += "rotateY(" + rotationY + _endParenthesis;
		if (rotationX !== _zeroDeg) transforms += "rotateX(" + rotationX + _endParenthesis;
		if (skewX !== _zeroDeg || skewY !== _zeroDeg) transforms += "skew(" + skewX + ", " + skewY + _endParenthesis;
		if (scaleX !== 1 || scaleY !== 1) transforms += "scale(" + scaleX + ", " + scaleY + _endParenthesis;
		target.style[_transformProp] = transforms || "translate(0, 0)";
	};
	var _renderSVGTransforms = function _renderSVGTransforms(ratio, cache) {
		var _ref2 = cache || this, xPercent = _ref2.xPercent, yPercent = _ref2.yPercent, x = _ref2.x, y = _ref2.y, rotation = _ref2.rotation, skewX = _ref2.skewX, skewY = _ref2.skewY, scaleX = _ref2.scaleX, scaleY = _ref2.scaleY, target = _ref2.target, xOrigin = _ref2.xOrigin, yOrigin = _ref2.yOrigin, xOffset = _ref2.xOffset, yOffset = _ref2.yOffset, forceCSS = _ref2.forceCSS, tx = parseFloat(x), ty = parseFloat(y), a11, a21, a12, a22, temp;
		rotation = parseFloat(rotation);
		skewX = parseFloat(skewX);
		skewY = parseFloat(skewY);
		if (skewY) {
			skewY = parseFloat(skewY);
			skewX += skewY;
			rotation += skewY;
		}
		if (rotation || skewX) {
			rotation *= _DEG2RAD;
			skewX *= _DEG2RAD;
			a11 = Math.cos(rotation) * scaleX;
			a21 = Math.sin(rotation) * scaleX;
			a12 = Math.sin(rotation - skewX) * -scaleY;
			a22 = Math.cos(rotation - skewX) * scaleY;
			if (skewX) {
				skewY *= _DEG2RAD;
				temp = Math.tan(skewX - skewY);
				temp = Math.sqrt(1 + temp * temp);
				a12 *= temp;
				a22 *= temp;
				if (skewY) {
					temp = Math.tan(skewY);
					temp = Math.sqrt(1 + temp * temp);
					a11 *= temp;
					a21 *= temp;
				}
			}
			a11 = _round(a11);
			a21 = _round(a21);
			a12 = _round(a12);
			a22 = _round(a22);
		} else {
			a11 = scaleX;
			a22 = scaleY;
			a21 = a12 = 0;
		}
		if (tx && !~(x + "").indexOf("px") || ty && !~(y + "").indexOf("px")) {
			tx = _convertToUnit(target, "x", x, "px");
			ty = _convertToUnit(target, "y", y, "px");
		}
		if (xOrigin || yOrigin || xOffset || yOffset) {
			tx = _round(tx + xOrigin - (xOrigin * a11 + yOrigin * a12) + xOffset);
			ty = _round(ty + yOrigin - (xOrigin * a21 + yOrigin * a22) + yOffset);
		}
		if (xPercent || yPercent) {
			temp = target.getBBox();
			tx = _round(tx + xPercent / 100 * temp.width);
			ty = _round(ty + yPercent / 100 * temp.height);
		}
		temp = "matrix(" + a11 + "," + a21 + "," + a12 + "," + a22 + "," + tx + "," + ty + ")";
		target.setAttribute("transform", temp);
		forceCSS && (target.style[_transformProp] = temp);
	};
	var _addRotationalPropTween = function _addRotationalPropTween(plugin, target, property, startNum, endValue) {
		var cap = 360, isString = _isString(endValue), change = parseFloat(endValue) * (isString && ~endValue.indexOf("rad") ? _RAD2DEG : 1) - startNum, finalValue = startNum + change + "deg", direction, pt;
		if (isString) {
			direction = endValue.split("_")[1];
			if (direction === "short") {
				change %= cap;
				if (change !== change % (cap / 2)) change += change < 0 ? cap : -cap;
			}
			if (direction === "cw" && change < 0) change = (change + cap * _bigNum) % cap - ~~(change / cap) * cap;
			else if (direction === "ccw" && change > 0) change = (change - cap * _bigNum) % cap - ~~(change / cap) * cap;
		}
		plugin._pt = pt = new PropTween(plugin._pt, target, property, startNum, change, _renderPropWithEnd);
		pt.e = finalValue;
		pt.u = "deg";
		plugin._props.push(property);
		return pt;
	};
	var _assign = function _assign(target, source) {
		for (var p in source) target[p] = source[p];
		return target;
	};
	var _addRawTransformPTs = function _addRawTransformPTs(plugin, transforms, target) {
		var startCache = _assign({}, target._gsap), exclude = "perspective,force3D,transformOrigin,svgOrigin", style = target.style, endCache, p, startValue, endValue, startNum, endNum, startUnit, endUnit;
		if (startCache.svg) {
			startValue = target.getAttribute("transform");
			target.setAttribute("transform", "");
			style[_transformProp] = transforms;
			endCache = _parseTransform(target, 1);
			_removeProperty(target, _transformProp);
			target.setAttribute("transform", startValue);
		} else {
			startValue = getComputedStyle(target)[_transformProp];
			style[_transformProp] = transforms;
			endCache = _parseTransform(target, 1);
			style[_transformProp] = startValue;
		}
		for (p in _transformProps) {
			startValue = startCache[p];
			endValue = endCache[p];
			if (startValue !== endValue && exclude.indexOf(p) < 0) {
				startUnit = getUnit(startValue);
				endUnit = getUnit(endValue);
				startNum = startUnit !== endUnit ? _convertToUnit(target, p, startValue, endUnit) : parseFloat(startValue);
				endNum = parseFloat(endValue);
				plugin._pt = new PropTween(plugin._pt, endCache, p, startNum, endNum - startNum, _renderCSSProp);
				plugin._pt.u = endUnit || 0;
				plugin._props.push(p);
			}
		}
		_assign(endCache, startCache);
	};
	_forEachName("padding,margin,Width,Radius", function(name, index) {
		var t = "Top", r = "Right", b = "Bottom", l = "Left", props = (index < 3 ? [
			t,
			r,
			b,
			l
		] : [
			t + l,
			t + r,
			b + r,
			b + l
		]).map(function(side) {
			return index < 2 ? name + side : "border" + side + name;
		});
		_specialProps[index > 1 ? "border" + name : name] = function(plugin, target, property, endValue, tween) {
			var a, vars;
			if (arguments.length < 4) {
				a = props.map(function(prop) {
					return _get(plugin, prop, property);
				});
				vars = a.join(" ");
				return vars.split(a[0]).length === 5 ? a[0] : vars;
			}
			a = (endValue + "").split(" ");
			vars = {};
			props.forEach(function(prop, i) {
				return vars[prop] = a[i] = a[i] || a[(i - 1) / 2 | 0];
			});
			plugin.init(target, vars, tween);
		};
	});
	var CSSPlugin = {
		name: "css",
		register: _initCore,
		targetTest: function targetTest(target) {
			return target.style && target.nodeType;
		},
		init: function init(target, vars, tween, index, targets) {
			var props = this._props, style = target.style, startAt = tween.vars.startAt, startValue, endValue, endNum, startNum, type, specialProp, p, startUnit, endUnit, relative, isTransformRelated, transformPropTween, cache, smooth, hasPriority, inlineProps, finalTransformValue;
			_pluginInitted || _initCore();
			this.styles = this.styles || _getStyleSaver(target);
			inlineProps = this.styles.props;
			this.tween = tween;
			for (p in vars) {
				if (p === "autoRound") continue;
				endValue = vars[p];
				if (_plugins[p] && _checkPlugin(p, vars, tween, index, target, targets)) continue;
				type = typeof endValue;
				specialProp = _specialProps[p];
				if (type === "function") {
					endValue = endValue.call(tween, index, target, targets);
					type = typeof endValue;
				}
				if (type === "string" && ~endValue.indexOf("random(")) endValue = _replaceRandom(endValue);
				if (specialProp) specialProp(this, target, p, endValue, tween) && (hasPriority = 1);
				else if (p.substr(0, 2) === "--") {
					startValue = (getComputedStyle(target).getPropertyValue(p) + "").trim();
					endValue += "";
					_colorExp.lastIndex = 0;
					if (!_colorExp.test(startValue)) {
						startUnit = getUnit(startValue);
						endUnit = getUnit(endValue);
						endUnit ? startUnit !== endUnit && (startValue = _convertToUnit(target, p, startValue, endUnit) + endUnit) : startUnit && (endValue += startUnit);
					}
					this.add(style, "setProperty", startValue, endValue, index, targets, 0, 0, p);
					props.push(p);
					inlineProps.push(p, 0, style[p]);
				} else if (type !== "undefined") {
					if (startAt && p in startAt) {
						startValue = typeof startAt[p] === "function" ? startAt[p].call(tween, index, target, targets) : startAt[p];
						_isString(startValue) && ~startValue.indexOf("random(") && (startValue = _replaceRandom(startValue));
						getUnit(startValue + "") || startValue === "auto" || (startValue += _config.units[p] || getUnit(_get(target, p)) || "");
						(startValue + "").charAt(1) === "=" && (startValue = _get(target, p));
					} else startValue = _get(target, p);
					startNum = parseFloat(startValue);
					relative = type === "string" && endValue.charAt(1) === "=" && endValue.substr(0, 2);
					relative && (endValue = endValue.substr(2));
					endNum = parseFloat(endValue);
					if (p in _propertyAliases) {
						if (p === "autoAlpha") {
							if (startNum === 1 && _get(target, "visibility") === "hidden" && endNum) startNum = 0;
							inlineProps.push("visibility", 0, style.visibility);
							_addNonTweeningPT(this, style, "visibility", startNum ? "inherit" : "hidden", endNum ? "inherit" : "hidden", !endNum);
						}
						if (p !== "scale" && p !== "transform") {
							p = _propertyAliases[p];
							~p.indexOf(",") && (p = p.split(",")[0]);
						}
					}
					isTransformRelated = p in _transformProps;
					if (isTransformRelated) {
						this.styles.save(p);
						finalTransformValue = endValue;
						if (type === "string" && endValue.substring(0, 6) === "var(--") {
							endValue = _getComputedProperty(target, endValue.substring(4, endValue.indexOf(")")));
							if (endValue.substring(0, 5) === "calc(") {
								var origPerspective = target.style.perspective;
								target.style.perspective = endValue;
								endValue = _getComputedProperty(target, "perspective");
								origPerspective ? target.style.perspective = origPerspective : _removeProperty(target, "perspective");
							}
							endNum = parseFloat(endValue);
						}
						if (!transformPropTween) {
							cache = target._gsap;
							cache.renderTransform && !vars.parseTransform || _parseTransform(target, vars.parseTransform);
							smooth = vars.smoothOrigin !== false && cache.smooth;
							transformPropTween = this._pt = new PropTween(this._pt, style, _transformProp, 0, 1, cache.renderTransform, cache, 0, -1);
							transformPropTween.dep = 1;
						}
						if (p === "scale") {
							this._pt = new PropTween(this._pt, cache, "scaleY", cache.scaleY, (relative ? _parseRelative(cache.scaleY, relative + endNum) : endNum) - cache.scaleY || 0, _renderCSSProp);
							this._pt.u = 0;
							props.push("scaleY", p);
							p += "X";
						} else if (p === "transformOrigin") {
							inlineProps.push(_transformOriginProp, 0, style[_transformOriginProp]);
							endValue = _convertKeywordsToPercentages(endValue);
							if (cache.svg) _applySVGOrigin(target, endValue, 0, smooth, 0, this);
							else {
								endUnit = parseFloat(endValue.split(" ")[2]) || 0;
								endUnit !== cache.zOrigin && _addNonTweeningPT(this, cache, "zOrigin", cache.zOrigin, endUnit);
								_addNonTweeningPT(this, style, p, _firstTwoOnly(startValue), _firstTwoOnly(endValue));
							}
							continue;
						} else if (p === "svgOrigin") {
							_applySVGOrigin(target, endValue, 1, smooth, 0, this);
							continue;
						} else if (p in _rotationalProperties) {
							_addRotationalPropTween(this, cache, p, startNum, relative ? _parseRelative(startNum, relative + endValue) : endValue);
							continue;
						} else if (p === "smoothOrigin") {
							_addNonTweeningPT(this, cache, "smooth", cache.smooth, endValue);
							continue;
						} else if (p === "force3D") {
							cache[p] = endValue;
							continue;
						} else if (p === "transform") {
							_addRawTransformPTs(this, endValue, target);
							continue;
						}
					} else if (!(p in style)) p = _checkPropPrefix(p) || p;
					if (isTransformRelated || (endNum || endNum === 0) && (startNum || startNum === 0) && !_complexExp.test(endValue) && p in style) {
						startUnit = (startValue + "").substr((startNum + "").length);
						endNum || (endNum = 0);
						endUnit = getUnit(endValue) || (p in _config.units ? _config.units[p] : startUnit);
						startUnit !== endUnit && (startNum = _convertToUnit(target, p, startValue, endUnit));
						this._pt = new PropTween(this._pt, isTransformRelated ? cache : style, p, startNum, (relative ? _parseRelative(startNum, relative + endNum) : endNum) - startNum, !isTransformRelated && (endUnit === "px" || p === "zIndex") && vars.autoRound !== false ? _renderRoundedCSSProp : _renderCSSProp);
						this._pt.u = endUnit || 0;
						if (isTransformRelated && finalTransformValue !== endValue) {
							this._pt.b = startValue;
							this._pt.e = finalTransformValue;
							this._pt.r = _renderCSSPropWithBeginningAndEnd;
						} else if (startUnit !== endUnit && endUnit !== "%") {
							this._pt.b = startValue;
							this._pt.r = _renderCSSPropWithBeginning;
						}
					} else if (!(p in style)) {
						if (p in target) this.add(target, p, startValue || target[p], relative ? relative + endValue : endValue, index, targets);
						else if (p !== "parseTransform") {
							_missingPlugin(p, endValue);
							continue;
						}
					} else _tweenComplexCSSString.call(this, target, p, startValue, relative ? relative + endValue : endValue);
					isTransformRelated || (p in style ? inlineProps.push(p, 0, style[p]) : typeof target[p] === "function" ? inlineProps.push(p, 2, target[p]()) : inlineProps.push(p, 1, startValue || target[p]));
					props.push(p);
				}
			}
			hasPriority && _sortPropTweensByPriority(this);
		},
		render: function render(ratio, data) {
			if (data.tween._time || !_reverting()) {
				var pt = data._pt;
				while (pt) {
					pt.r(ratio, pt.d);
					pt = pt._next;
				}
			} else data.styles.revert();
		},
		get: _get,
		aliases: _propertyAliases,
		getSetter: function getSetter(target, property, plugin) {
			var p = _propertyAliases[property];
			p && p.indexOf(",") < 0 && (property = p);
			return property in _transformProps && property !== _transformOriginProp && (target._gsap.x || _get(target, "x")) ? plugin && _recentSetterPlugin === plugin ? property === "scale" ? _setterScale : _setterTransform : (_recentSetterPlugin = plugin || {}) && (property === "scale" ? _setterScaleWithRender : _setterTransformWithRender) : target.style && !_isUndefined(target.style[property]) ? _setterCSSStyle : ~property.indexOf("-") ? _setterCSSProp : _getSetter(target, property);
		},
		core: {
			_removeProperty,
			_getMatrix
		}
	};
	gsap.utils.checkPrefix = _checkPropPrefix;
	gsap.core.getStyleSaver = _getStyleSaver;
	(function(positionAndScale, rotation, others, aliases) {
		var all = _forEachName(positionAndScale + "," + rotation + "," + others, function(name) {
			_transformProps[name] = 1;
		});
		_forEachName(rotation, function(name) {
			_config.units[name] = "deg";
			_rotationalProperties[name] = 1;
		});
		_propertyAliases[all[13]] = positionAndScale + "," + rotation;
		_forEachName(aliases, function(name) {
			var split = name.split(":");
			_propertyAliases[split[1]] = all[split[0]];
		});
	})("x,y,z,scale,scaleX,scaleY,xPercent,yPercent", "rotation,rotationX,rotationY,skewX,skewY", "transform,transformOrigin,svgOrigin,force3D,smoothOrigin,transformPerspective", "0:translateX,1:translateY,2:translateZ,8:rotate,8:rotationZ,8:rotateZ,9:rotateX,10:rotateY");
	_forEachName("x,y,z,top,right,bottom,left,width,height,fontSize,padding,margin,perspective", function(name) {
		_config.units[name] = "px";
	});
	gsap.registerPlugin(CSSPlugin);
	var gsapWithCSS = gsap.registerPlugin(CSSPlugin) || gsap;
	gsapWithCSS.core.Tween;
	async function withTabLock(name, intervalMs, task) {
		const key = `nspp:lock:${location.hostname}:${name}`;
		const owner = crypto.randomUUID();
		const execute = async () => {
			const now = Date.now();
			const previous = GM_getValue$1(key, null);
			if (previous && (now - previous.started < intervalMs || previous.until > now)) return false;
			GM_setValue$1(key, {
				started: now,
				until: now + 12e4,
				owner
			});
			if (GM_getValue$1(key, null)?.owner !== owner) return false;
			try {
				await task();
				return true;
			} finally {
				const current = GM_getValue$1(key, null);
				if (current?.owner === owner) GM_setValue$1(key, {
					...current,
					until: 0
				});
			}
		};
		if (navigator.locks?.request) return navigator.locks.request(key, { ifAvailable: true }, (lock) => lock ? execute() : false);
		return execute();
	}
	function uploadNodeImage(body, headers, signal) {
		return new Promise((resolve, reject) => {
			if (signal.aborted) {
				reject(new Error("上传已取消"));
				return;
			}
			if (typeof _GM_xmlhttpRequest !== "function") {
				reject(new Error("请重新安装最新版脚本，授予 NodeImage 连接权限"));
				return;
			}
			const cleanup = () => signal.removeEventListener("abort", cancel);
			const request = _GM_xmlhttpRequest({
				method: "POST",
				url: "https://api.nodeimage.com/api/upload",
				data: body,
				headers,
				anonymous: true,
				responseType: "json",
				timeout: 12e4,
				onload: (response) => {
					cleanup();
					if (response.status === 401 || response.status === 403) {
						reject(new Error("NodeImage 密钥无效或无权限，请到官网 API 页面检查"));
						return;
					}
					if (response.status < 200 || response.status >= 300) {
						reject(new Error(`NodeImage 上传失败（HTTP ${response.status}）`));
						return;
					}
					resolve(response.response);
				},
				onerror: () => {
					cleanup();
					reject(new Error("无法连接 NodeImage，请检查网络和脚本连接权限"));
				},
				ontimeout: () => {
					cleanup();
					reject(new Error("上传超时，请检查图床是否已收到图片后再重试"));
				},
				onabort: () => {
					cleanup();
					reject(new Error("上传已取消"));
				}
			});
			function cancel() {
				request.abort();
			}
			signal.addEventListener("abort", cancel, { once: true });
		});
	}
	function getNodeImageKey(signal) {
		return new Promise((resolve, reject) => {
			if (signal.aborted) {
				reject(new Error("已取消"));
				return;
			}
			if (typeof _GM_xmlhttpRequest !== "function") {
				reject(new Error("请更新脚本并允许连接 NodeImage"));
				return;
			}
			const cleanup = () => signal.removeEventListener("abort", cancel);
			const request = _GM_xmlhttpRequest({
				method: "GET",
				url: "https://api.nodeimage.com/api/user/api-key",
				anonymous: false,
				headers: { Accept: "application/json" },
				responseType: "json",
				timeout: 2e4,
				onload: (response) => {
					cleanup();
					const key = response.response?.api_key;
					if (response.status === 200 && typeof key === "string" && key.trim()) resolve(key.trim());
					else reject(new Error("请先登录 NodeImage，返回论坛后重试"));
				},
				onerror: () => {
					cleanup();
					reject(new Error("无法读取 NodeImage 登录状态，可手动填写 API Key"));
				},
				ontimeout: () => {
					cleanup();
					reject(new Error("获取 NodeImage 登录状态超时"));
				},
				onabort: () => {
					cleanup();
					reject(new Error("已取消"));
				}
			});
			function cancel() {
				request.abort();
			}
			signal.addEventListener("abort", cancel, { once: true });
		});
	}
	function uploadRequest(provider, configuredBase, key, file) {
		const base = new URL(provider === "NodeImage" ? "https://api.nodeimage.com" : configuredBase);
		if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) throw new Error("Invalid service URL");
		const root = base.href.replace(/\/$/, "");
		const body = new FormData();
		const headers = { Accept: "application/json" };
		let path = "/upload";
		let field = "file";
		if (provider === "NodeImage") {
			path = "/api/upload";
			field = "image";
			headers["X-API-Key"] = key;
		} else if (provider === "LskyPro") {
			path = "/api/v1/upload";
			headers.Authorization = `Bearer ${key}`;
		} else if (provider === "Chevereto") {
			path = "/api/1/upload";
			field = "source";
			headers["X-API-Key"] = key;
		} else if (provider === "EasyImages") {
			path = key ? "/api/index.php" : "/app/upload.php";
			field = key ? "image" : "file";
			body.append(key ? "token" : "sign", key || String(Math.floor(Date.now() / 1e3)));
		} else if (!["Telegraph", "Telegraph2"].includes(provider)) throw new Error("Unknown provider");
		if ([
			"NodeImage",
			"LskyPro",
			"Chevereto"
		].includes(provider) && !key) throw new Error("API Key required");
		body.append(field, file);
		return {
			url: root + path,
			base: root,
			body,
			headers
		};
	}
	function uploadResult(provider, base, raw) {
		if (!raw || typeof raw !== "object") throw new Error("Invalid upload response");
		const result = raw;
		let direct;
		if (provider === "Telegraph" && Array.isArray(result)) direct = result[0]?.src;
		else if (!Array.isArray(result)) {
			if (result.success === false) throw new Error("Upload failed");
			if (provider === "NodeImage") direct = result.links?.direct;
			else if (provider === "Telegraph2" && typeof result.data === "string") direct = result.data;
			else if (provider === "LskyPro" && typeof result.data === "object") direct = result.data?.links?.url;
			else if (provider === "Chevereto") direct = result.image?.url;
			else if (provider === "EasyImages") direct = result.url;
		}
		if (typeof direct !== "string" || !direct) throw new Error("Missing image URL");
		const url = new URL(direct, base + "/");
		if (!["https:", "http:"].includes(url.protocol)) throw new Error("Invalid image URL");
		return url;
	}
	var imageUpload = {
		id: "image-upload",
		title: "图片上传",
		group: "操作辅助",
		description: "选择图片上传并插入链接，支持六类图床协议。默认使用 NodeImage 官方图床；其他服务须允许 CORS；密钥仅存当前页面内存。",
		defaults: {
			enabled: true,
			provider: "NodeImage",
			base: ""
		},
		fields: {
			provider: {
				label: "图床协议",
				type: "select",
				options: [
					"NodeImage",
					"Telegraph",
					"Telegraph2",
					"LskyPro",
					"Chevereto",
					"EasyImages"
				].map((value) => ({
					label: value === "NodeImage" ? "NodeImage（论坛官方，默认）" : value,
					value
				}))
			},
			base: {
				label: "其他图床地址（NodeImage 固定使用官方地址）",
				type: "text"
			}
		},
		mount(ctx) {
			const bound = new WeakSet();
			const bars = [];
			let apiKey = "";
			let auth;
			let lastCheck = 0;
			const ensureKey = () => {
				if (apiKey) return Promise.resolve(apiKey);
				return auth ||= getNodeImageKey(ctx.signal).then((value) => {
					if (!ctx.signal.aborted) apiKey = value;
					return value;
				}).finally(() => {
					auth = void 0;
				});
			};
			const checkLogin = () => {
				if (ctx.get("provider") !== "NodeImage" || apiKey || !bars.length || Date.now() - lastCheck < 3e3) return;
				lastCheck = Date.now();
				ensureKey().then(() => {
					if (!ctx.signal.aborted) bars.forEach((bar) => {
						bar.querySelector("[role=\"status\"]").textContent = "NodeImage 已连接";
						bar.querySelector("a").hidden = true;
					});
				}).catch(() => {});
			};
			window.addEventListener("focus", checkLogin, { signal: ctx.signal });
			function scan() {
				ctx.root.querySelectorAll(".md-editor").forEach((host) => {
					if (bound.has(host)) return;
					const cm = host.querySelector(".CodeMirror")?.CodeMirror;
					const ta = host.querySelector("textarea");
					if (!cm && !ta) return;
					bound.add(host);
					const bar = document.createElement("div");
					bar.className = "nspp-compose nspp-upload-status";
					const nodeImage = ctx.get("provider") === "NodeImage";
					const official = document.createElement("a");
					official.href = "https://www.nodeimage.com/";
					official.target = "_blank";
					official.rel = "noopener noreferrer";
					official.textContent = "登录 NodeImage";
					official.hidden = ctx.get("provider") !== "NodeImage";
					const key = document.createElement("input");
					key.type = "password";
					key.placeholder = "图床 API Key / Token（不保存）";
					key.autocomplete = "off";
					key.setAttribute("aria-label", "图床 API Key / Token");
					key.addEventListener("input", () => {
						apiKey = key.value.trim();
					}, { signal: ctx.signal });
					const input = document.createElement("input");
					input.type = "file";
					input.hidden = true;
					input.multiple = true;
					input.accept = "image/*";
					input.setAttribute("aria-label", "选择要上传至所选图床的图片");
					const status = document.createElement("span");
					status.setAttribute("role", "status");
					let uploading = false;
					async function uploadFiles(files) {
						if (uploading) return;
						uploading = true;
						try {
							for (const file of files) if (ctx.signal.aborted || !await upload(file)) break;
						} finally {
							uploading = false;
						}
					}
					input.addEventListener("change", () => {
						uploadFiles(Array.from(input.files || []));
					}, { signal: ctx.signal });
					host.addEventListener("paste", (event) => {
						if (!(event.target instanceof Element) || !event.target.closest(".CodeMirror, textarea") || event.target.closest(".nspp-compose")) return;
						const files = Array.from(event.clipboardData?.items || []).filter((item) => item.kind === "file" && item.type.startsWith("image/")).map((item) => item.getAsFile()).filter((file) => !!file);
						if (files.length) {
							event.preventDefault();
							event.stopPropagation();
							uploadFiles(files);
						}
					}, {
						signal: ctx.signal,
						capture: true
					});
					host.addEventListener("dragover", (event) => {
						if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
					}, { signal: ctx.signal });
					host.addEventListener("drop", (event) => {
						const files = Array.from(event.dataTransfer?.files || []).filter((file) => file.type.startsWith("image/"));
						if (files.length) {
							event.preventDefault();
							event.stopPropagation();
							uploadFiles(files);
						}
					}, {
						signal: ctx.signal,
						capture: true
					});
					async function upload(file) {
						if (input.disabled) return false;
						if (!file.type.startsWith("image/")) {
							status.textContent = "请选择图片文件";
							input.value = "";
							return false;
						}
						input.disabled = true;
						key.disabled = true;
						status.setAttribute("aria-busy", "true");
						status.textContent = "上传中…";
						try {
							if (ctx.get("provider") === "NodeImage" && !apiKey) {
								status.textContent = "正在获取 NodeImage 登录状态…";
								await ensureKey();
								status.textContent = "上传中…";
							}
							const request = uploadRequest(ctx.get("provider"), ctx.get("base"), apiKey, file);
							const result = ctx.get("provider") === "NodeImage" ? await uploadNodeImage(request.body, request.headers, ctx.signal) : await ctx.request(request.url, {
								method: "POST",
								headers: request.headers,
								body: request.body
							});
							const url = uploadResult(ctx.get("provider"), request.base, result);
							if (ctx.signal.aborted) return false;
							const markdown = `![image](<${url.href.replace(/>/g, "%3E")}>)`;
							if (cm) {
								cm.replaceSelection(markdown);
								cm.focus();
							} else {
								ta.setRangeText(markdown, ta.selectionStart, ta.selectionEnd, "end");
								ta.dispatchEvent(new Event("input", { bubbles: true }));
							}
							status.textContent = "上传完成";
							if (nodeImage) official.hidden = true;
							return true;
						} catch (error) {
							if (error instanceof Error && /密钥无效|无权限/.test(error.message)) {
								apiKey = "";
								key.value = "";
								official.hidden = false;
							}
							if (!ctx.signal.aborted) status.textContent = ctx.get("provider") === "NodeImage" && error instanceof Error ? error.message : "上传失败：请检查 HTTPS 图床地址、API Key、协议或 CORS 支持";
							return false;
						} finally {
							input.disabled = false;
							key.disabled = false;
							input.value = "";
							status.removeAttribute("aria-busy");
						}
					}
					bar.append(official);
					if (!nodeImage) bar.append(key);
					bar.append(input, status);
					const toolbar = host.querySelector(".mde-toolbar");
					const imageSelector = ".toolbar-item.i-icon.i-icon-pic[title=\"图片\"]";
					host.addEventListener("click", (event) => {
						if (!(event.target instanceof Element) || !event.target.closest(imageSelector)) return;
						event.preventDefault();
						event.stopImmediatePropagation();
						if (!uploading) input.click();
					}, {
						signal: ctx.signal,
						capture: true
					});
					if (!host.querySelector(imageSelector)) {
						const choose = document.createElement("button");
						choose.type = "button";
						choose.title = "上传图片";
						choose.setAttribute("aria-label", choose.title);
						choose.append(siteIcon("pic"));
						choose.addEventListener("click", () => {
							if (!uploading) input.click();
						}, { signal: ctx.signal });
						bar.prepend(choose);
					}
					(toolbar || host).append(bar);
					bars.push(bar);
				});
			}
			scan();
			checkLogin();
			const unwatch = ctx.watch(() => {
				const count = bars.length;
				scan();
				if (bars.length > count) checkLogin();
			});
			return () => {
				unwatch();
				apiKey = "";
				bars.forEach((bar) => bar.remove());
			};
		}
	};
	function currentUser() {
		return unsafeWindow$1.__config__?.user;
	}
	function button(label, fn, ctx) {
		const el = document.createElement("button");
		el.type = "button";
		el.textContent = label;
		el.addEventListener("click", fn, { signal: ctx.signal });
		return el;
	}
	var actionFeatures = [
		{
			id: "attendance",
			title: "签到",
			description: "每天尝试一次，成功或失败均缓存当天记录并隐藏按钮，次日再试；按账户隔离。",
			group: "操作辅助",
			defaults: {
				enabled: true,
				automatic: true,
				mode: "fixed"
			},
			fields: {
				automatic: {
					label: "每天自动签到",
					type: "text"
				},
				mode: {
					label: "奖励方式",
					type: "select",
					options: [{
						label: "固定",
						value: "fixed"
					}, {
						label: "随机",
						value: "random"
					}]
				}
			},
			mount(ctx) {
				const initialize = () => {
					const user = currentUser();
					if (!user?.member_id) return;
					const key = `day:${user.member_id}`;
					const day = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());
					const control = button("签到", () => {
						run();
					}, ctx);
					control.className = "nspp-action nspp-tool-icon";
					const renderControl = (label = "签到") => {
						control.replaceChildren(toolIcon("attendance"));
						control.title = label;
						control.setAttribute("aria-label", label);
					};
					renderControl();
					(document.querySelector("#nspp-tools") || document.body).append(control);
					const initialDay = day();
					let animation;
					const known = () => ctx.get(key) === day();
					const signedText = (root) => Array.from(root.querySelectorAll(".user-card, .user-panel, #attendance, .attendance, a[href=\"/board\"], button, [role=\"status\"]")).some((el) => !el.closest("#nspp-tools, .post-content, .comment-content, .markdown-body") && /^(?:[✓✔]\s*)?(?:(?:今日|今天)已(?:完成)?签到|已签到|(?:今日|今天)?签到已完成)(?:[！!。]|\s|$)/.test(el.textContent?.trim() || ""));
					const sync = () => {
						if (day() === initialDay && !known() && signedText(document)) ctx.set(key, day());
						const signed = known();
						if (!animation?.isActive()) control.hidden = signed;
					};
					sync();
					const tick = () => {
						sync();
						if (ctx.get("automatic") && !known() && !document.hidden && !control.disabled) run();
					};
					window.addEventListener("focus", tick, { signal: ctx.signal });
					document.addEventListener("visibilitychange", tick, { signal: ctx.signal });
					const rollover = setInterval(tick, 6e4);
					const complete = (fresh) => {
						animation?.kill();
						gsapWithCSS.set(control, { clearProps: "transform,opacity,visibility" });
						if (!fresh || matchMedia("(prefers-reduced-motion: reduce)").matches) {
							control.hidden = true;
							return;
						}
						renderControl("已签到");
						animation = gsapWithCSS.timeline({ onComplete: () => {
							control.hidden = true;
							gsapWithCSS.set(control, { clearProps: "transform,opacity,visibility" });
						} });
						animation.fromTo(control, { scale: .9 }, {
							scale: 1.06,
							duration: .18,
							ease: "back.out(2)"
						}).to(control, {
							scale: 1,
							duration: .15
						}).to(control, {
							y: -8,
							autoAlpha: 0,
							duration: .25,
							delay: .45,
							ease: "power2.in"
						});
					};
					async function run() {
						if (control.disabled || ctx.signal.aborted) return;
						if (known()) {
							complete(false);
							return;
						}
						animation?.kill();
						if (!matchMedia("(prefers-reduced-motion: reduce)").matches) gsapWithCSS.fromTo(control, { scale: .94 }, {
							scale: 1,
							duration: .2,
							ease: "power2.out"
						});
						control.disabled = true;
						renderControl("签到中…");
						control.setAttribute("aria-busy", "true");
						const requestDay = day();
						try {
							await withTabLock(`attendance:${user.member_id}`, 1e4, async () => {
								if (ctx.signal.aborted) return;
								if (known()) {
									complete(false);
									return;
								}
								const result = await ctx.request(`/api/attendance?random=${ctx.get("mode") === "random"}`, { method: "POST" });
								if (ctx.signal.aborted) return;
								ctx.set(key, requestDay);
								if (known()) complete(!!result?.success);
								else sync();
								if (result?.success) ctx.notify(result.message || `签到成功，获得 ${result.gain ?? ""} 鸡腿`);
							});
						} catch {
							if (!ctx.signal.aborted) {
								ctx.set(key, requestDay);
								if (known()) complete(false);
								else sync();
							}
						} finally {
							control.disabled = false;
							renderControl(known() ? "已签到" : "签到");
							control.removeAttribute("aria-busy");
						}
					}
					const stop = ctx.watch(sync);
					tick();
					return () => {
						stop();
						clearInterval(rollover);
						animation?.kill();
						gsapWithCSS.killTweensOf(control);
						control.remove();
					};
				};
				let cleanup;
				const start = () => {
					if (!cleanup && !ctx.signal.aborted) cleanup = initialize();
				};
				const stopReady = ctx.watch(start);
				const ready = setInterval(start, 1e3);
				return () => {
					stopReady();
					clearInterval(ready);
					cleanup?.();
				};
			}
		},
		{
			id: "compose",
			title: "回复快捷键",
			description: "可选 Ctrl+Enter 提交回复，默认关闭。",
			group: "操作辅助",
			defaults: {
				enabled: true,
				ctrlEnter: false
			},
			fields: { ctrlEnter: {
				label: "Ctrl+Enter 提交回复",
				type: "text"
			} },
			mount(ctx) {
				const bound = new WeakSet();
				const scan = () => ctx.root.querySelectorAll(".md-editor").forEach((host) => {
					if (bound.has(host)) return;
					const cm = host.querySelector(".CodeMirror")?.CodeMirror;
					const ta = host.querySelector("textarea");
					if (!cm && !ta) return;
					bound.add(host);
					const read = () => cm ? cm.getValue() : ta.value;
					host.addEventListener("keydown", (event) => {
						if (!ctx.get("ctrlEnter") || !event.ctrlKey || event.key !== "Enter" || event.isComposing || event.repeat) return;
						const submit = host.querySelector("button.submit.btn.focus-visible");
						if (submit && !submit.disabled && read().trim()) {
							event.preventDefault();
							submit.click();
						}
					}, { signal: ctx.signal });
				});
				scan();
				return ctx.watch(scan);
			}
		},
		imageUpload
	];
	function parseMonitorRSS(xml) {
		const doc = new DOMParser().parseFromString(xml, "application/xml");
		if (doc.querySelector("parsererror") || !doc.querySelector("rss > channel")) throw new Error("RSS 内容无效");
		const posts = new Map();
		for (const item of doc.querySelectorAll("channel > item")) {
			const text = (name) => item.getElementsByTagName(name)[0]?.textContent?.trim() || "";
			const title = text("title");
			let url;
			try {
				url = new URL(text("link"));
			} catch {
				continue;
			}
			const id = url.pathname.match(/^\/post-(\d+)(?:-\d+)?$/)?.[1];
			if (!id || !title || url.origin !== "https://www.nodeseek.com") continue;
			posts.set(id, {
				id,
				title,
				url: url.href,
				category: text("category")
			});
		}
		return [...posts.values()];
	}
	function requestMonitorRSS(signal) {
		return new Promise((resolve, reject) => {
			if (signal.aborted) {
				reject(new Error("已取消"));
				return;
			}
			const cleanup = () => signal.removeEventListener("abort", cancel);
			const request = _GM_xmlhttpRequest({
				method: "GET",
				url: "https://rss.nodeseek.com/",
				anonymous: true,
				timeout: 2e4,
				headers: { Accept: "application/rss+xml, application/xml, text/xml" },
				onload: (response) => {
					cleanup();
					if (response.status === 200) resolve(response.responseText);
					else reject(new Error(`RSS HTTP ${response.status}`));
				},
				onerror: () => {
					cleanup();
					reject(new Error("RSS 连接失败"));
				},
				ontimeout: () => {
					cleanup();
					reject(new Error("RSS 请求超时"));
				},
				onabort: () => {
					cleanup();
					reject(new Error("已取消"));
				}
			});
			function cancel() {
				request.abort();
			}
			signal.addEventListener("abort", cancel, { once: true });
		});
	}
	function compileMonitorRules(value) {
		const errors = [];
		return {
			rules: value.split("\n").map((x) => x.trim()).filter(Boolean).map((label, index) => {
				try {
					if (label.startsWith("/")) {
						const end = label.lastIndexOf("/");
						if (end < 1) throw new Error();
						const pattern = new RegExp(label.slice(1, end), label.slice(end + 1));
						return {
							label,
							color: String(index % 4),
							matches: (text) => {
								pattern.lastIndex = 0;
								return pattern.test(text);
							}
						};
					}
					const pattern = new RegExp(label, "i");
					return {
						label,
						color: String(index % 4),
						matches: (text) => {
							pattern.lastIndex = 0;
							return pattern.test(text);
						}
					};
				} catch {
					errors.push(label);
					return null;
				}
			}).filter((rule) => rule !== null),
			errors
		};
	}
	function parsePosts(doc) {
		const seen = new Set();
		const posts = [];
		doc.querySelectorAll(".post-title a[href*=\"/post-\"]").forEach((link) => {
			const path = link.getAttribute("href") || "";
			const id = path.match(/\/post-(\d+)/)?.[1];
			const title = link.textContent?.trim();
			if (!id || !title || title.length < 3 || seen.has(id) || link.closest(".pagination")) return;
			const url = new URL(path, location.origin);
			if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return;
			seen.add(id);
			posts.push({
				id,
				title,
				url: url.href
			});
		});
		return posts;
	}
	function control(label, fn, ctx) {
		const el = document.createElement("button");
		el.type = "button";
		el.textContent = label;
		const icon = label === "关闭" ? "close" : label === "刷新" || label === "更新" ? "refresh" : label === "停止" ? "stop" : void 0;
		if (icon) el.prepend(toolIcon(icon));
		if (label === "关闭") {
			el.replaceChildren(toolIcon("close"));
			el.title = label;
			el.setAttribute("aria-label", label);
		}
		el.addEventListener("click", fn, { signal: ctx.signal });
		return el;
	}
	var monitoringFeatures = [{
		id: "monitor",
		title: "帖子监控与抽奖追踪",
		description: "使用 NodeSeek RSS 监控新帖，正则匹配标题，后台标签页可运行。开奖提示仅为线索，需人工核实中奖。",
		group: "监控",
		defaults: {
			enabled: true,
			interval: 300
		},
		fields: { interval: {
			label: "刷新间隔（秒，60–3600）",
			type: "number"
		} },
		mount(ctx) {
			if (location.hostname !== "www.nodeseek.com") return;
			const panel = document.createElement("dialog");
			panel.className = "nspp-monitor";
			panel.setAttribute("aria-label", "帖子监控");
			const header = document.createElement("header");
			const title = document.createElement("h3");
			title.textContent = "帖子监控";
			header.append(title, control("关闭", () => panel.close(), ctx));
			panel.append(header);
			const launch = control("帖子监控", () => {
				ctx.set(unreadKey, []);
				renderUnread();
				panel.showModal();
			}, ctx);
			launch.className = "nspp-tool-icon";
			launch.title = "帖子监控";
			launch.setAttribute("aria-label", launch.title);
			launch.replaceChildren(toolIcon("monitor"));
			const badge = document.createElement("span");
			badge.className = "nspp-monitor-badge";
			badge.setAttribute("aria-hidden", "true");
			launch.append(badge);
			const status = document.createElement("p");
			status.className = "nspp-monitor-summary";
			status.setAttribute("role", "status");
			const spinner = document.createElement("span");
			spinner.className = "nspp-monitor-spinner";
			spinner.hidden = true;
			spinner.setAttribute("aria-hidden", "true");
			const statusText = document.createElement("span");
			status.append(spinner, statusText);
			panel.append(status);
			let spin;
			const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
			function stopSpin() {
				spin?.kill();
				spin = void 0;
				spinner.style.transform = "";
				spinner.hidden = true;
			}
			function syncAnimation() {
				const active = busy && (!paused || manualCheck) && !cooling();
				if (reducedMotion.matches) {
					stopSpin();
					spinner.hidden = !active;
					return;
				}
				if (active) {
					spinner.hidden = false;
					if (!spin) spin = gsapWithCSS.fromTo(spinner, { rotation: 0 }, {
						rotation: 360,
						duration: .8,
						repeat: -1,
						ease: "none",
						onRepeat: () => {
							if (!busy || paused && !manualCheck || cooling()) stopSpin();
						}
					});
				} else if (!spin) spinner.hidden = true;
			}
			reducedMotion.addEventListener("change", syncAnimation, { signal: ctx.signal });
			const stats = document.createElement("span");
			stats.textContent = "0 轮 · 累计 0 帖 · 符合 0 · 不符合 0";
			status.append(stats);
			const output = document.createElement("div");
			output.className = "nspp-monitor-results";
			panel.append(output);
			const user = currentUser()?.member_id;
			const trackKey = `tracked:${user}`;
			const unreadKey = `unread-posts:${user || "guest"}`;
			const readUnread = () => (ctx.get(unreadKey) || []).filter((post) => match(post));
			function renderUnread() {
				const posts = readUnread();
				launch.toggleAttribute("data-unread", posts.length > 0);
				if (posts.length) launch.dataset.unread = "true";
				renderState();
			}
			const readTracked = () => (ctx.get(trackKey) || []).filter((x) => x.added > Date.now() - 2592e6).slice(0, 50);
			const trackList = document.createElement("section");
			trackList.className = "nspp-monitor-tracked";
			panel.append(trackList);
			function renderTracks() {
				trackList.replaceChildren();
				trackList.hidden = !readTracked().length;
				const heading = document.createElement("h4");
				heading.textContent = "正在追踪";
				trackList.append(heading);
				for (const post of readTracked()) {
					const row = document.createElement("div");
					const link = document.createElement("a");
					link.href = post.url;
					link.textContent = `${post.title}${post.signal ? " · 检测到开奖文字，请核实" : ""}`;
					row.append(link, control("取消追踪", () => {
						ctx.set(trackKey, readTracked().filter((x) => x.id !== post.id));
						renderTracks();
					}, ctx));
					trackList.append(row);
				}
			}
			const currentId = location.pathname.match(/^\/post-(\d+)/)?.[1];
			if (currentId && user) panel.append(control("追踪当前抽奖帖", () => {
				const existing = readTracked();
				if (!existing.some((x) => x.id === currentId)) ctx.set(trackKey, [{
					id: currentId,
					title: document.title,
					url: location.href,
					added: Date.now()
				}, ...existing].slice(0, 50));
				renderTracks();
				ctx.notify("已追踪；检测到开奖文字会提示人工核实");
			}, ctx));
			if (user) renderTracks();
			let interval = Math.min(3600, Math.max(60, Number(ctx.get("interval")) || 300)) * 1e3;
			let busy = false;
			let last = 0;
			let paused = false;
			let manualCheck = false;
			const cooldownKey = "rss-request-cooldown";
			const hasWork = () => !!(rules.length || readTracked().length);
			const cooling = () => (ctx.get(cooldownKey) || 0) > Date.now();
			function renderState() {
				syncAnimation();
				renderCountdown();
				const state = !hasWork() ? "idle" : paused ? "paused" : cooling() ? "cooldown" : "running";
				if (launch.dataset.monitorState !== state) launch.dataset.monitorState = state;
				const label = {
					idle: "未配置监控",
					paused: "监控已暂停",
					cooldown: "监控冷却中",
					running: "监控中"
				}[state];
				const count = readUnread().length;
				const snapshot = ctx.get(snapshotKey);
				const matched = snapshot?.matched ?? (snapshot ? [...new Map([...snapshot.home, ...snapshot.trades].map((post) => [post.id, post])).values()].filter((post) => match(post)).length : 0);
				badge.textContent = String(matched);
				badge.hidden = matched === 0;
				launch.title = `帖子监控 · ${label}\n累计匹配 ${matched} 条 · ${count} 条未读\n红色徽章表示本轮监控规则下累计匹配的帖子数，打开面板不会清零；清空记录或修改规则后重新统计。\n每 ${interval / 1e3} 秒检查 NodeSeek RSS，结果列表保留最近 200 条。\n点击查看匹配帖子并清除未读标记。`;
				launch.setAttribute("aria-label", launch.title);
			}
			const wait = () => new Promise((resolve) => {
				const done = () => {
					clearTimeout(timer);
					ctx.signal.removeEventListener("abort", done);
					resolve();
				};
				const timer = setTimeout(done, 5e3);
				ctx.signal.addEventListener("abort", done, { once: true });
			});
			let requests = Promise.resolve();
			function requestPage(url) {
				const result = requests.then(async () => {
					while (!ctx.signal.aborted && (!paused || manualCheck) && !cooling()) {
						let html = "";
						if (await withTabLock("monitor-requests", 5e3, async () => {
							const now = Date.now();
							const budget = ctx.get("request-budget");
							const next = !budget || now - budget.start >= 3e5 ? {
								start: now,
								count: 0
							} : budget;
							if (next.count >= 12) {
								ctx.set(cooldownKey, next.start + 3e5);
								throw new Error("监控请求配额已用完");
							}
							ctx.set("request-budget", {
								...next,
								count: next.count + 1
							});
							try {
								html = await ctx.request(url, {
									responseType: "text",
									signal: ctx.signal
								});
							} catch (error) {
								if (!ctx.signal.aborted) ctx.set(cooldownKey, Date.now() + 6e5);
								throw error;
							}
						})) return html;
						await wait();
					}
					throw new Error("监控暂停或冷却中");
				});
				requests = result.then(() => {}, () => {
					renderState();
				});
				return result;
			}
			function render(posts) {
				if (!posts.length) return;
				const section = document.createElement("section");
				section.setAttribute("aria-label", "符合要求的帖子");
				output.append(section);
				const list = document.createElement("ul");
				for (const post of posts) {
					const item = document.createElement("li");
					const link = document.createElement("a");
					link.href = post.url;
					link.textContent = post.title;
					item.append(link);
					highlight(item, post);
					list.append(item);
				}
				section.append(list);
			}
			async function checkTracked() {
				if (!user) return;
				const pending = readTracked().filter((x) => !x.signal && Date.now() - (x.checked || 0) >= 6e5).sort((a, b) => (a.checked || 0) - (b.checked || 0)).slice(0, 2);
				for (const entry of pending) {
					if (ctx.signal.aborted) break;
					const html = await requestPage(entry.url);
					const doc = new DOMParser().parseFromString(html, "text/html");
					const signal = /已开奖|开奖结果|中奖名单|已结束/.test(doc.title) ? doc.title : "";
					const updated = readTracked().map((x) => x.id === entry.id ? {
						...x,
						checked: Date.now(),
						signal
					} : x);
					if (signal && updated.some((x) => x.id === entry.id)) notify(`抽奖状态可能已更新：${entry.title}，请打开帖子核实`, "抽奖状态更新", "lottery");
					ctx.set(trackKey, updated);
					renderTracks();
				}
			}
			const snapshotKey = `rss-snapshot:${user || "guest"}`;
			const legacy = GM_getValue$1(`nspp:settings:${location.hostname}`, {});
			let keywordText = ctx.get("match-keywords") ?? legacy.monitor?.keywords ?? "";
			ctx.set("match-keywords", keywordText);
			let { rules, errors } = compileMonitorRules(keywordText);
			const editor = document.createElement("form");
			editor.className = "nspp-monitor-editor";
			const label = document.createElement("label");
			label.textContent = "监控正则";
			const input = document.createElement("textarea");
			input.rows = 2;
			input.value = keywordText;
			input.placeholder = "每行一个正则，如 vmiss|搬瓦工 或 /香港.*年付/i";
			const help = document.createElement("a");
			help.className = "nspp-regex-help";
			help.href = "https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_expressions";
			help.target = "_blank";
			help.rel = "noopener noreferrer";
			help.textContent = "?";
			help.title = "正则怎么写？查看 MDN 文档（新标签页）";
			help.setAttribute("aria-label", help.title);
			label.append(help, input);
			const apply = control("更新", () => {}, ctx);
			apply.type = "submit";
			const feedback = document.createElement("span");
			feedback.setAttribute("role", "status");
			const explanation = document.createElement("small");
			explanation.textContent = "每行一个正则，任意命中RSS 标题即收录。默认忽略大小写；例如 vmiss|搬瓦工，或 /香港.*年付/i。更新会清空旧结果并重新检查。";
			const configDialog = document.createElement("dialog");
			configDialog.className = "nspp-monitor nspp-monitor-config";
			configDialog.setAttribute("aria-label", "监控配置");
			const configHeader = document.createElement("header");
			const configTitle = document.createElement("h3");
			configTitle.textContent = "监控配置";
			configHeader.append(configTitle, control("关闭", () => configDialog.close(), ctx));
			const frequencyLabel = document.createElement("label");
			frequencyLabel.textContent = "刷新间隔（秒）";
			const frequency = document.createElement("input");
			frequency.type = "number";
			frequency.min = "60";
			frequency.max = "3600";
			frequency.step = "1";
			frequency.required = true;
			frequency.value = String(interval / 1e3);
			frequencyLabel.append(frequency);
			const frequencyHelp = document.createElement("small");
			frequencyHelp.textContent = "支持 60–3600 秒。后台标签页继续检查，请求限速与冷却保护保持开启。";
			const aiHelp = document.createElement("small");
			aiHelp.textContent = "不会写正则？可以让 AI 帮你生成。例如：请生成 JavaScript 正则，匹配包含 vmiss 或搬瓦工、但不包含已出的帖子，忽略大小写，按 /表达式/i 格式输出，每行一个，不要代码块。复制结果到上方，检查是否符合需求后点击更新。";
			editor.append(label, explanation, aiHelp, frequencyLabel, frequencyHelp, feedback, apply);
			configDialog.append(configHeader, editor);
			document.body.append(configDialog);
			const configure = control("配置", () => {
				input.value = keywordText;
				frequency.value = String(interval / 1e3);
				feedback.textContent = "";
				configDialog.showModal();
			}, ctx);
			configure.prepend(toolIcon("settings"));
			header.insertBefore(configure, header.lastElementChild);
			const clear = control("清空记录", () => {
				if (busy) {
					ctx.notify("正在检查，请完成后再清空记录");
					return;
				}
				const snapshot = ctx.get(snapshotKey);
				if (snapshot) {
					const cursor = snapshot.cursor ?? [...snapshot.home, ...snapshot.trades].reduce((id, post) => BigInt(post.id) > BigInt(id) ? post.id : id, "0");
					const cleared = {
						...snapshot,
						cursor,
						rounds: 0,
						checked: 0,
						matched: 0,
						results: []
					};
					ctx.set(snapshotKey, cleared);
					display(cleared);
				}
				ctx.set(unreadKey, []);
				output.replaceChildren();
				renderUnread();
				statusText.textContent = "记录已清空，后续从上次检查位置继续监控";
				ctx.notify("已清空监控记录、未读标记和累计计数");
			}, ctx);
			clear.title = "清空帖子结果、未读标记和累计计数，保留监控规则与检查位置";
			header.insertBefore(clear, configure);
			configDialog.addEventListener("close", () => configure.focus(), { signal: ctx.signal });
			editor.addEventListener("submit", (event) => {
				event.preventDefault();
				if (busy) {
					ctx.notify("正在检查，请完成后再更新");
					return;
				}
				const seconds = Number(frequency.value);
				if (!Number.isInteger(seconds) || seconds < 60 || seconds > 3600) {
					feedback.textContent = "刷新间隔需为 60–3600 秒的整数";
					ctx.notify(feedback.textContent);
					return;
				}
				const compiled = compileMonitorRules(input.value);
				if (compiled.errors.length) {
					feedback.textContent = `无效规则：${compiled.errors.join("、")}`;
					ctx.notify(feedback.textContent);
					return;
				}
				interval = seconds * 1e3;
				ctx.set("interval", seconds);
				renderCountdown();
				refreshButton.title = "立即检查一次（不等待自动刷新周期）";
				keywordText = input.value;
				rules = compiled.rules;
				errors = compiled.errors;
				ctx.set("match-keywords", keywordText);
				ctx.set(unreadKey, []);
				ctx.set(`seen-posts:${user || "guest"}`, void 0);
				highlighted.forEach((node) => node.removeAttribute("data-nspp-monitor-match"));
				highlighted.clear();
				scanned.clear();
				ctx.set(snapshotKey, void 0);
				output.replaceChildren();
				stats.textContent = "0 轮 · 累计 0 帖 · 符合 0 · 不符合 0";
				stats.title = "";
				paused = false;
				pause.replaceChildren(toolIcon("stop"), document.createTextNode("停止"));
				renderUnread();
				feedback.textContent = "已更新，正在重新检查";
				configDialog.close();
				refresh(true, "配置已更新，旧结果已清空，开始检查");
			}, { signal: ctx.signal });
			const match = (post) => rules.find((rule) => rule.matches(post.title));
			const highlighted = new Set();
			function highlight(node, post) {
				const rule = match(post);
				if (rule) {
					if (node.dataset.nsppMonitorMatch !== rule.color) node.dataset.nsppMonitorMatch = rule.color;
					highlighted.add(node);
				} else {
					node.removeAttribute("data-nspp-monitor-match");
					highlighted.delete(node);
				}
			}
			const scanned = new Map();
			const scan = () => {
				if (!rules.length || paused || cooling() || ctx.signal.aborted) return;
				for (const node of scanned.keys()) if (!node.isConnected) {
					scanned.delete(node);
					highlighted.delete(node);
				}
				for (const post of parsePosts(document)) {
					const row = Array.from(document.querySelectorAll(".post-title a")).find((link) => link.href === post.url)?.closest(".post-list-item");
					if (!row || scanned.get(row) === post.title) continue;
					scanned.set(row, post.title);
					const cached = ctx.get(snapshotKey)?.home.find((item) => item.url === post.url);
					highlight(row, cached || post);
				}
			};
			function display(snapshot) {
				output.replaceChildren();
				for (const node of highlighted) if (!node.isConnected) highlighted.delete(node);
				const posts = [...new Map([...snapshot.home, ...snapshot.trades].map((post) => [post.id, post])).values()];
				const matches = posts.filter((post) => match(post));
				const checked = snapshot.checked ?? posts.length;
				const matched = snapshot.matched ?? matches.length;
				stats.textContent = `${snapshot.rounds ?? 0} 轮 · 累计 ${checked} 帖 · 符合 ${matched} · 不符合 ${checked - matched}`;
				stats.title = snapshot.cursor ? `上次检查位置：帖子 #${snapshot.cursor}；下方保留最近 200 条匹配结果` : "";
				render(snapshot.results ?? matches);
				statusText.textContent = busy ? "正在检查匹配帖子…" : `更新于 ${new Date(snapshot.at).toLocaleTimeString()}${errors.length ? ` · 无效正则：${errors.join("、")}` : ""}`;
				renderTracks();
			}
			async function refresh(force = false, message = "已开始手动刷新") {
				renderState();
				if (!hasWork()) {
					statusText.textContent = "添加正则后开始监控";
					if (force) ctx.notify(statusText.textContent);
					return;
				}
				if (!force && paused || ctx.signal.aborted) return;
				if (busy) {
					if (force) ctx.notify("正在检查，请稍候");
					return;
				}
				if (cooling()) {
					statusText.textContent = "请求冷却中，请稍后手动刷新";
					if (force) ctx.notify(statusText.textContent);
					return;
				}
				if (!force && Date.now() - last < interval) {
					statusText.textContent = `等待下次检查 · 约 ${Math.ceil((interval - (Date.now() - last)) / 1e3)} 秒后可刷新`;
					return;
				}
				if (force) ctx.notify(message);
				manualCheck = force;
				busy = true;
				syncAnimation();
				renderCountdown();
				apply.disabled = true;
				clear.disabled = true;
				panel.dataset.checking = "true";
				status.setAttribute("aria-busy", "true");
				last = Date.now();
				statusText.textContent = "正在检查匹配帖子…";
				refreshButton.disabled = true;
				refreshButton.setAttribute("aria-busy", "true");
				try {
					if (!await withTabLock(`monitor:${user || "guest"}`, force ? 0 : interval, async () => {
						if (ctx.signal.aborted) return;
						const home = parseMonitorRSS(await requestMonitorRSS(ctx.signal));
						const trades = [];
						if (ctx.signal.aborted) return;
						const previous = ctx.get(snapshotKey);
						const previousPosts = [...new Map([...previous?.home ?? [], ...previous?.trades ?? []].map((post) => [post.id, post])).values()];
						const previousMatches = previousPosts.filter((post) => match(post));
						const cursor = previous?.cursor ?? previousPosts.reduce((id, post) => BigInt(post.id) > BigInt(id) ? post.id : id, "0");
						const incoming = home.filter((post) => BigInt(post.id) > BigInt(cursor));
						const matches = incoming.filter((post) => match(post));
						const snapshot = {
							home,
							trades,
							at: Date.now(),
							rounds: (previous?.rounds ?? 0) + 1,
							cursor: home.reduce((id, post) => BigInt(post.id) > BigInt(id) ? post.id : id, cursor),
							checked: (previous?.checked ?? previousPosts.length) + incoming.length,
							matched: (previous?.matched ?? previousMatches.length) + matches.length,
							results: [...matches.sort((a, b) => Number(b.id) - Number(a.id)), ...previous?.results ?? previousMatches].slice(0, 200)
						};
						ctx.set(snapshotKey, snapshot);
						display(snapshot);
						scanned.clear();
						scan();
						const seenKey = `seen-posts:${user || "guest"}`;
						const seen = ctx.get(seenKey);
						const next = Object.fromEntries(Object.entries(seen || {}).filter(([, time]) => Date.now() - time < 2592e6));
						const fresh = [...new Map(matches.map((post) => [post.id, post])).values()].filter((post) => !seen?.[post.id]);
						for (const post of matches) next[post.id] = Date.now();
						ctx.set(seenKey, Object.fromEntries(Object.entries(next).sort((a, b) => b[1] - a[1]).slice(0, 5e3)));
						if (BigInt(cursor) > 0n && fresh.length) {
							const message = `发现 ${fresh.length} 条新帖：${fresh.slice(0, 2).map((post) => post.title).join("；")}`;
							ctx.set(unreadKey, [...new Map([...fresh.map((post) => ({
								id: post.id,
								title: post.title,
								url: post.url,
								found: Date.now()
							})), ...readUnread()].map((post) => [post.id, post])).values()].slice(0, 200));
							renderUnread();
							notify(message, "发现匹配新帖", "posts");
						}
						await checkTracked();
						if (force && !ctx.signal.aborted) ctx.notify(`检查完成，匹配 ${matches.length} 条帖子`);
					}) && !ctx.signal.aborted) {
						if (force) ctx.notify("其他标签页正在检查，已读取可用缓存");
						const cached = ctx.get(snapshotKey);
						if (cached) {
							display(cached);
							renderUnread();
						} else statusText.textContent = "其他标签页正在刷新，下个周期读取共享结果";
					}
				} catch {
					if (!ctx.signal.aborted) {
						ctx.set(cooldownKey, Date.now() + 6e4);
						if (force) ctx.notify("检查未完成，请检查登录、站点验证或冷却状态");
						const cached = ctx.get(snapshotKey);
						statusText.textContent = `检查未完成，将在冷却结束后的监控周期重试${cached ? ` · 保留 ${new Date(cached.at).toLocaleTimeString()} 的结果` : " · 请确认论坛可正常访问"}；可检查登录或站点验证`;
					}
				} finally {
					busy = false;
					manualCheck = false;
					if (statusText.textContent === "正在检查匹配帖子…") {
						const snapshot = ctx.get(snapshotKey);
						statusText.textContent = snapshot ? `更新于 ${new Date(snapshot.at).toLocaleTimeString()}` : "检查结束";
					}
					apply.disabled = false;
					clear.disabled = false;
					delete panel.dataset.checking;
					status.removeAttribute("aria-busy");
					renderState();
					refreshButton.disabled = false;
					refreshButton.removeAttribute("aria-busy");
				}
			}
			function notify(message, title, category) {
				ctx.notify(message);
				if (ctx.get("desktop-notifications") && typeof Notification !== "undefined" && Notification.permission === "granted") try {
					new Notification(`NodeSeek++ · ${title}`, {
						body: message,
						tag: `nspp-monitor:${category}`
					});
				} catch {}
			}
			const footer = document.createElement("footer");
			const permission = control("开启系统通知", () => {
				(async () => {
					if (typeof Notification === "undefined") {
						ctx.notify("当前浏览器不支持系统通知，仍会显示页面提示");
						return;
					}
					if (ctx.get("desktop-notifications")) {
						ctx.set("desktop-notifications", false);
						permission.textContent = "开启系统通知";
						return;
					}
					try {
						const result = await Notification.requestPermission();
						ctx.set("desktop-notifications", result === "granted");
						permission.textContent = result === "granted" ? "关闭系统通知" : "开启系统通知";
						ctx.notify(result === "granted" ? "系统通知已开启" : "系统通知未授权，仍会显示页面提示；可在浏览器站点设置中调整");
					} catch {
						ctx.notify("无法申请系统通知权限，仍会显示页面提示");
					}
				})();
			}, ctx);
			if (ctx.get("desktop-notifications") && typeof Notification !== "undefined" && Notification.permission === "granted") permission.textContent = "关闭系统通知";
			const refreshButton = control("刷新", () => {
				refresh(true);
			}, ctx);
			refreshButton.title = "立即检查一次（不等待自动刷新周期）";
			const hint = document.createElement("span");
			function renderCountdown() {
				const remaining = Math.max(0, Math.ceil((Math.max(last + interval, ctx.get(cooldownKey) || 0) - Date.now()) / 1e3));
				const label = busy ? "正在检查…" : !hasWork() ? "未配置监控" : paused ? "已暂停" : cooling() ? `冷却中 · ${remaining} 秒后检查` : `下次检查 ${remaining} 秒`;
				hint.textContent = `${label} · NodeSeek RSS`;
			}
			const pause = control("停止", () => {
				paused = !paused;
				pause.replaceChildren(toolIcon(paused ? "play" : "stop"), document.createTextNode(paused ? "启动" : "停止"));
				statusText.textContent = paused ? "监控已暂停" : "监控已恢复";
				renderState();
				if (!paused) refresh();
			}, ctx);
			footer.append(hint, pause, permission, refreshButton);
			panel.append(footer);
			document.body.append(panel, configDialog);
			(document.querySelector("#nspp-tools") || document.body).prepend(launch);
			const cached = ctx.get(snapshotKey);
			if (cached) display(cached);
			renderUnread();
			refresh();
			const stopScan = ctx.watch(scan);
			const timer = setInterval(() => {
				renderState();
				if (hasWork() && !busy && !paused && !cooling() && Date.now() - last >= interval) refresh();
			}, 1e3);
			document.addEventListener("visibilitychange", () => {
				refresh();
			}, { signal: ctx.signal });
			return () => {
				configDialog.remove();
				spin?.kill();
				stopScan();
				highlighted.forEach((node) => node.removeAttribute("data-nspp-monitor-match"));
				clearInterval(timer);
				panel.close();
				panel.remove();
				launch.remove();
			};
		}
	}, {
		id: "timed-pagination",
		title: "定时翻页",
		description: "手动开始后按计时前往真实下一页链接，隐藏页面暂停；不会猜测下一页 URL。",
		group: "监控",
		defaults: {
			enabled: false,
			interval: 60
		},
		fields: { interval: {
			label: "翻页等待秒数（最少 15）",
			type: "number"
		} },
		mount(ctx) {
			const next = ctx.root.querySelector(".nsk-pager a.pager-next, a.next, a[rel=\"next\"]");
			if (!next) return;
			const url = new URL(next.href, location.href);
			if (url.origin !== location.origin || url.href === location.href) return;
			let running = false;
			const seconds = Math.max(15, Number(ctx.get("interval")) || 60);
			let remaining = seconds;
			const bar = document.createElement("div");
			bar.className = "nspp-pagination";
			const status = document.createElement("span");
			status.textContent = "定时翻页已停止";
			const toggle = control("开始翻页", () => {
				running = !running;
				remaining = seconds;
				toggle.textContent = running ? "停止翻页" : "开始翻页";
				status.textContent = running ? `${remaining} 秒后前往下一页` : "定时翻页已停止";
			}, ctx);
			bar.append(status, toggle);
			next.parentElement?.append(bar);
			const timer = setInterval(() => {
				if (!running || document.hidden) return;
				remaining--;
				status.textContent = `${remaining} 秒后前往下一页`;
				if (remaining <= 0) {
					running = false;
					location.assign(url.href);
				}
			}, 1e3);
			return () => {
				clearInterval(timer);
				bar.remove();
			};
		}
	}];
	function parseLinkRules(text) {
		const rules = {
			allow: [],
			block: [],
			paths: []
		};
		const macros = new Map();
		const wildcard = (text) => new RegExp(`^${text.split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`, "i");
		for (const raw of text.split("\n")) {
			const line = raw.trim();
			if (!line || line.startsWith("#")) continue;
			if (line.startsWith("@") && line.includes("=")) {
				const i = line.indexOf("=");
				macros.set(line.slice(0, i).trim(), line.slice(i + 1).split(",").map((s) => s.trim()));
				continue;
			}
			const split = line.includes(">>") ? line.split(">>") : line.split(/\s+/, 2);
			if (split.length !== 2) continue;
			const scopes = split[0].trim().split(/\s+/).map((s) => s.replace(/^~/, "").toLowerCase());
			const allow = split[0].trim().startsWith("~");
			for (const entry of split[1].split(",").flatMap((s) => macros.get(s.trim()) || [s.trim()])) {
				if (!entry) continue;
				if (entry.startsWith("/") && entry.endsWith("/")) {
					if (!allow) try {
						rules.paths.push({
							scopes,
							regex: new RegExp(entry.slice(1, -1))
						});
					} catch {}
				} else {
					const regex = wildcard(entry);
					rules[allow ? "allow" : "block"].push({
						scopes,
						test: (name) => regex.test(name)
					});
				}
			}
		}
		return rules;
	}
	function cleanLink(url, rules) {
		if (!/^https?:$/.test(url.protocol)) return url;
		const scope = (scopes) => scopes.some((s) => s === "*" || url.hostname === s || url.hostname.endsWith(`.${s}`) || s.endsWith("*") && url.hostname.startsWith(s.slice(0, -1)));
		const clean = (value) => {
			const params = new URLSearchParams(value);
			let changed = false;
			for (const key of [...params.keys()]) if (!rules.allow.some((r) => scope(r.scopes) && r.test(key)) && rules.block.some((r) => scope(r.scopes) && r.test(key))) {
				params.delete(key);
				changed = true;
			}
			return changed ? params.toString() : null;
		};
		const query = clean(url.search);
		if (query !== null) url.search = query;
		if (url.hash.includes("?")) {
			const i = url.hash.indexOf("?");
			const hashQuery = clean(url.hash.slice(i + 1));
			if (hashQuery !== null) url.hash = url.hash.slice(0, i) + (hashQuery ? `?${hashQuery}` : "");
		}
		for (const rule of rules.paths) if (scope(rule.scopes)) {
			const path = url.pathname.replace(rule.regex, "");
			if (path !== url.pathname) url.pathname = path.replace(/\/+/g, "/") || "/";
		}
		return url;
	}
	function footprintHref(post, floor, perPage = 10) {
		return `/post-${post}-${Math.max(1, Math.ceil(floor / Math.max(1, perPage)))}#${floor}`;
	}
	async function resolveLink(href, signal) {
		const url = new URL(href);
		if (!/^https?:$/.test(url.protocol)) throw new Error("不支持的链接");
		const response = await fetch(url, {
			method: "HEAD",
			credentials: "omit",
			redirect: "follow",
			signal: AbortSignal.any([signal, AbortSignal.timeout(2e4)])
		});
		if (!response.ok || !response.url) throw new Error("解析失败");
		const target = new URL(response.url);
		if (!/^https?:$/.test(target.protocol)) throw new Error("不支持的目标");
		return target.href;
	}
	function pageConfig() {
		return unsafeWindow$1.__config__;
	}
	var extraFeatures = [{
		id: "footprints",
		title: "回帖足迹",
		description: "手动同步自己的历史评论，按账号缓存并提供帖子入口；可续传和清空。",
		group: "阅读",
		defaults: { enabled: false },
		mount(ctx) {
			const uid = pageConfig()?.user?.member_id;
			if (!uid) return;
			const key = `records:${location.host}:${uid}`;
			let records = ctx.get(key) || [];
			let cursor = ctx.get(`${key}:cursor`) || 1;
			let busy = false;
			const panel = document.createElement("dialog");
			panel.className = "nspp-history nspp-footprints-dialog";
			panel.dataset.nsppFootprints = "";
			const summary = document.createElement("h2");
			summary.textContent = "我的回帖足迹";
			const open = document.createElement("button");
			open.type = "button";
			open.className = "nspp-tool-icon";
			open.title = "回帖足迹";
			open.setAttribute("aria-label", open.title);
			open.append(toolIcon("footprints"));
			const close = document.createElement("button");
			close.type = "button";
			close.textContent = "关闭";
			open.addEventListener("click", () => {
				panel.showModal();
				render();
			}, { signal: ctx.signal });
			close.addEventListener("click", () => panel.close(), { signal: ctx.signal });
			const sync = document.createElement("button");
			sync.type = "button";
			sync.textContent = "同步 / 继续";
			const reset = document.createElement("button");
			reset.type = "button";
			reset.textContent = "清空缓存";
			const status = document.createElement("span");
			status.setAttribute("role", "status");
			const list = document.createElement("div");
			list.className = "nspp-footprints-list";
			close.prepend(toolIcon("close"));
			sync.prepend(toolIcon("refresh"));
			const header = document.createElement("header");
			header.append(summary, close);
			const toolbar = document.createElement("div");
			toolbar.className = "nspp-footprints-toolbar";
			toolbar.append(sync, reset, status);
			panel.append(header, toolbar, list);
			(document.getElementById("nspp-tools") || document.querySelector(".user-card") || document.body).append(open);
			document.body.append(panel);
			const badges = [];
			const markTitles = () => {
				const latest = new Map();
				records.forEach((r) => latest.set(r.post_id, Math.max(latest.get(r.post_id) || 0, r.floor_id)));
				document.querySelectorAll(".post-title").forEach((title) => {
					const post = Number(title.querySelector("a[href]")?.pathname.match(/post-(\d+)/)?.[1]);
					const floor = latest.get(post);
					let badge = title.querySelector("[data-nspp-footprint]");
					if (!floor) {
						badge?.remove();
						return;
					}
					if (!badge) {
						badge = document.createElement("a");
						badge.dataset.nsppFootprint = "";
						badge.style.marginInlineStart = "8px";
						title.append(badge);
						badges.push(badge);
					}
					const href = footprintHref(post, floor, pageConfig()?.commentPerPage);
					if (badge.getAttribute("href") !== href) badge.setAttribute("href", href);
					const text = `已回复 #${floor}`;
					if (badge.textContent !== text) badge.textContent = text;
				});
			};
			const stopBadges = ctx.watch(markTitles);
			let titleController = new AbortController();
			const loadTitle = async (link) => {
				const signal = titleController.signal;
				const post = Number(link.dataset.post);
				const label = link.querySelector(".nspp-footprint-title");
				label.textContent = "正在加载帖子标题…";
				link.setAttribute("aria-busy", "true");
				try {
					const html = await ctx.request(`/post-${post}-1`, {
						responseType: "text",
						signal
					});
					if (signal.aborted || ctx.signal.aborted) return;
					const encoded = new DOMParser().parseFromString(html, "text/html").querySelector("#temp-script")?.textContent?.trim();
					if (!encoded) throw new Error("帖子数据不可用");
					const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
					const data = JSON.parse(new TextDecoder().decode(bytes))?.postData;
					if (String(data?.postId) !== String(post) || typeof data?.title !== "string" || !data.title.trim()) throw new Error("帖子标题不可用");
					const title = data.title.trim();
					records.forEach((record) => {
						if (record.post_id === post) record.title = title;
					});
					ctx.set(key, records);
					label.textContent = title;
					link.title = title;
				} catch {
					if (!signal.aborted && !ctx.signal.aborted) label.textContent = `标题暂不可用 · 帖子 ${post}`;
				} finally {
					link.removeAttribute("aria-busy");
				}
			};
			const titleObserver = new IntersectionObserver((entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting || !panel.open) continue;
					titleObserver.unobserve(entry.target);
					loadTitle(entry.target);
				}
			}, { root: list });
			panel.addEventListener("close", () => {
				titleController.abort();
				titleObserver.disconnect();
			}, { signal: ctx.signal });
			const render = () => {
				titleController.abort();
				titleController = new AbortController();
				titleObserver.disconnect();
				list.replaceChildren();
				markTitles();
				const titles = new Map();
				records.forEach((record) => {
					if (record.title) titles.set(record.post_id, record.title);
				});
				document.querySelectorAll(".post-title a[href*=\"/post-\"]:not([data-nspp-footprint])").forEach((link) => {
					const post = Number(link.pathname.match(/post-(\d+)/)?.[1]);
					const title = link.textContent?.trim();
					if (post && title) titles.set(post, title);
				});
				let changed = false;
				records.forEach((record) => {
					const title = titles.get(record.post_id);
					if (title && record.title !== title) {
						record.title = title;
						changed = true;
					}
				});
				if (changed) ctx.set(key, records);
				const latest = new Map();
				records.forEach((r) => latest.set(r.post_id, Math.max(latest.get(r.post_id) || 0, r.floor_id)));
				status.textContent = `${latest.size} 个帖子 · ${records.length} 条回复`;
				if (!latest.size) {
					const empty = document.createElement("p");
					empty.textContent = "暂无回帖足迹，点击“同步 / 继续”获取历史回复。";
					list.append(empty);
				}
				latest.forEach((floor, post) => {
					const a = document.createElement("a");
					a.href = footprintHref(post, floor, pageConfig()?.commentPerPage);
					a.dataset.post = String(post);
					const title = titles.get(post);
					const label = document.createElement("span");
					label.className = "nspp-footprint-title";
					label.textContent = title || "等待加载帖子标题…";
					const floorLabel = document.createElement("small");
					floorLabel.textContent = `第 ${floor} 楼`;
					a.append(label, floorLabel);
					if (title) a.title = title;
					list.append(a);
					if (!title && panel.open) titleObserver.observe(a);
				});
			};
			render();
			sync.addEventListener("click", async () => {
				if (busy) return;
				busy = true;
				sync.disabled = reset.disabled = true;
				sync.setAttribute("aria-busy", "true");
				try {
					const seen = new Set(records.map((r) => `${r.post_id}:${r.floor_id}`));
					for (let i = 0; i < 10 && !ctx.signal.aborted; i++) {
						sync.textContent = `同步第 ${cursor} 页…`;
						const res = await ctx.request(`/api/content/list-comments?uid=${uid}&page=${cursor}`, { signal: ctx.signal });
						if (!res.success || !Array.isArray(res.comments)) throw new Error("评论接口返回无效数据");
						if (!res.comments.length) {
							cursor = 1;
							break;
						}
						for (const r of res.comments) {
							if (!Number.isInteger(r.post_id) || !Number.isInteger(r.floor_id) || r.post_id <= 0 || r.floor_id <= 0) continue;
							const id = `${r.post_id}:${r.floor_id}`;
							if (!seen.has(id)) {
								records.push({
									post_id: r.post_id,
									floor_id: r.floor_id
								});
								seen.add(id);
							}
						}
						cursor++;
						ctx.set(key, records);
						ctx.set(`${key}:cursor`, cursor);
						await new Promise((resolve) => {
							const done = () => {
								clearTimeout(timer);
								ctx.signal.removeEventListener("abort", done);
								resolve();
							};
							const timer = setTimeout(done, 1e3);
							ctx.signal.addEventListener("abort", done, { once: true });
						});
					}
					ctx.set(`${key}:cursor`, cursor);
					render();
				} catch {
					if (!ctx.signal.aborted) ctx.notify("足迹同步失败，已保留进度，请重试");
				} finally {
					busy = false;
					sync.disabled = reset.disabled = false;
					sync.removeAttribute("aria-busy");
					sync.textContent = "同步 / 继续";
				}
			}, { signal: ctx.signal });
			reset.addEventListener("click", () => {
				records = [];
				cursor = 1;
				ctx.set(key, []);
				ctx.set(`${key}:cursor`, 1);
				render();
			}, { signal: ctx.signal });
			return () => {
				titleController.abort();
				titleObserver.disconnect();
				stopBadges();
				badges.forEach((badge) => badge.remove());
				open.remove();
				panel.remove();
			};
		}
	}, {
		id: "linkRules",
		title: "自定义链接净化",
		description: "支持 X 的 scope >> 参数、宏、~允许规则及 /路径正则/，也接受 host 参数名简写。短链仅在点击旁边的解析按钮时请求，需目标支持 CORS。",
		group: "导航",
		defaults: {
			enabled: false,
			rules: "* utm_*\n* fbclid\n* gclid",
			shortHosts: ""
		},
		fields: {
			rules: {
				label: "删除参数规则（例如 example.com ref）",
				type: "textarea"
			},
			shortHosts: {
				label: "短链域名（每行一个）",
				type: "textarea"
			}
		},
		mount(ctx) {
			const rules = parseLinkRules(String(ctx.get("rules") || ""));
			const shortHosts = new Set(String(ctx.get("shortHosts") || "").split("\n").map((x) => x.trim().toLowerCase()).filter(Boolean));
			const touched = new WeakMap();
			const added = [];
			const clean = (url) => cleanLink(url, rules);
			const run = () => {
				document.querySelectorAll(".post-content a[href], .markdown-body a[href], .content-item .nsk-content a[href]").forEach((a) => {
					if (touched.get(a) === a.href) return;
					let url;
					try {
						url = new URL(a.href);
					} catch {
						return;
					}
					if (!/^https?:$/.test(url.protocol) || url.origin === location.origin) return;
					a.href = clean(url).href;
					touched.set(a, a.href);
					if (!shortHosts.has(url.hostname) || a.nextElementSibling?.hasAttribute("data-nspp-resolve")) return;
					const button = document.createElement("button");
					button.type = "button";
					button.textContent = "解析短链";
					button.dataset.nsppResolve = "";
					button.addEventListener("click", async () => {
						button.disabled = true;
						button.textContent = "解析中…";
						button.setAttribute("aria-busy", "true");
						try {
							const target = new URL(await resolveLink(a.href, ctx.signal));
							a.href = clean(target).href;
							touched.set(a, a.href);
							button.remove();
							ctx.notify("已更新链接，请再次点击原链接打开");
						} catch {
							if (!ctx.signal.aborted) {
								ctx.notify("短链服务不允许跨域解析或请求失败，保留原链接");
								button.textContent = "重试解析";
							}
						} finally {
							button.disabled = false;
							button.removeAttribute("aria-busy");
						}
					}, { signal: ctx.signal });
					a.after(button);
					added.push(button);
				});
			};
			run();
			const unwatch = ctx.watch(run);
			return () => {
				unwatch();
				added.forEach((el) => el.remove());
			};
		}
	}];
	var serviceFeatures = [
		{
			id: "notification-categories",
			title: "通知分类",
			description: "侧边卡片分别显示回复、@我、私信；每60秒检查，新回复、@我和私信使用系统通知，失败保留上次结果。",
			group: "操作辅助",
			defaults: { enabled: true },
			mount(ctx) {
				const initialize = () => {
					const uid = unsafeWindow$1.__config__?.user?.member_id;
					if (!uid) return;
					const cacheKey = `counts:${uid}`;
					const originals = new Map();
					const rows = [
						"reply",
						"atMe",
						"message"
					].map(() => document.createElement("div"));
					rows.forEach((row) => {
						row.className = "nspp-notification-row";
					});
					const place = () => {
						const card = document.querySelector(".user-card .user-stat, .user-stat");
						const columns = card?.querySelectorAll(".stat-block");
						if (columns && columns.length >= 2) rows.forEach((row, index) => {
							const target = columns[index === 1 ? 1 : 0];
							if (row.parentElement !== target) target.append(row);
						});
						else rows.forEach((row) => row.remove());
						card?.querySelectorAll("a[href^=\"/notification\"]").forEach((anchor) => {
							if (anchor.classList.contains("nspp-notification-link")) return;
							if (!originals.has(anchor)) originals.set(anchor, anchor.hidden);
							anchor.hidden = true;
							anchor.classList.add("nspp-original-notification");
						});
					};
					let pending = false;
					let failed = false;
					let lastAttempt = 0;
					const render = (counts) => {
						if (!counts) return;
						const links = [];
						for (const [key, label, path] of [
							[
								"reply",
								"回复",
								"reply"
							],
							[
								"atMe",
								"我",
								"atMe"
							],
							[
								"message",
								"私信",
								"message?mode=list"
							]
						]) {
							const count = counts[key];
							if (!Number.isFinite(count) || count < 0) throw new Error("Invalid count");
							const a = document.createElement("a");
							a.href = `/notification#/${path}`;
							a.className = "nspp-notification-link";
							const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
							icon.setAttribute("viewBox", "0 0 24 24");
							icon.setAttribute("fill", "none");
							icon.setAttribute("stroke", "currentColor");
							icon.setAttribute("stroke-width", "1.8");
							icon.setAttribute("stroke-linecap", "round");
							icon.setAttribute("stroke-linejoin", "round");
							icon.setAttribute("aria-hidden", "true");
							icon.classList.add("nspp-notification-icon");
							const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
							shape.setAttribute("d", key === "reply" ? "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" : key === "atMe" ? "M16 8v6a2 2 0 0 0 4 0v-2a8 8 0 1 0-3 6.25M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0" : "M3 5h18v14H3zM3 5l9 7 9-7");
							icon.append(shape);
							const template = document.querySelector(".user-stat a[href^=\"/notification\"]:not(.nspp-notification-link)");
							const native = template?.cloneNode(true);
							if (native && native.children.length >= 3 && native.querySelector("svg")) {
								native.removeAttribute("id");
								native.hidden = false;
								native.classList.remove("nspp-original-notification");
								native.classList.add("nspp-notification-link");
								native.href = a.href;
								const nativeIcon = native.querySelector("svg");
								if (key !== "reply") {
									const symbol = key === "atMe" ? "at-sign" : "envelope-one";
									if (document.getElementById(symbol)) {
										const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
										use.setAttribute("href", `#${symbol}`);
										nativeIcon.replaceChildren(use);
									} else {
										for (const attr of [
											"viewBox",
											"fill",
											"stroke",
											"stroke-width",
											"stroke-linecap",
											"stroke-linejoin"
										]) nativeIcon.setAttribute(attr, icon.getAttribute(attr));
										nativeIcon.replaceChildren(shape);
									}
								}
								native.children[1].textContent = `${label} `;
								const badge = native.lastElementChild;
								badge.textContent = String(count);
								badge.classList.toggle("notify-count", count > 0);
								badge.classList.add(count > 0 ? "nspp-unread-count" : "nspp-read-count");
								links.push(native);
								const rowTemplate = template.parentElement;
								if (rowTemplate && !rowTemplate.classList.contains("stat-block")) {
									const index = links.length - 1;
									const row = rowTemplate.cloneNode(false);
									row.removeAttribute("id");
									row.hidden = false;
									row.classList.add("nspp-notification-row");
									row.append(...rows[index].childNodes);
									rows[index].replaceWith(row);
									rows[index] = row;
								}
							} else {
								const text = document.createElement("span");
								text.textContent = label;
								a.append(icon, text);
								const badge = document.createElement("span");
								badge.textContent = String(count);
								badge.className = count > 0 ? "notify-count nspp-unread-count" : "nspp-read-count";
								a.append(badge);
								links.push(a);
							}
						}
						links.forEach((link, index) => {
							const old = rows[index].querySelector("a");
							if (old) old.replaceWith(link);
							else rows[index].prepend(link);
						});
					};
					const run = async () => {
						if (pending || ctx.signal.aborted || Date.now() - lastAttempt < 5e3) return;
						lastAttempt = Date.now();
						pending = true;
						try {
							await withTabLock(`unread:${uid}`, 6e4, async () => {
								const result = await ctx.request("/api/notification/unread-count");
								if (!result.success || !result.unreadCount) throw new Error("Invalid response");
								const previous = ctx.get(cacheKey);
								render(result.unreadCount);
								ctx.set(cacheKey, result.unreadCount);
								failed = false;
								if (previous && !ctx.signal.aborted) for (const [key, label, title, path] of [
									[
										"reply",
										"评论/回复",
										"收到了评论/回复",
										"reply"
									],
									[
										"atMe",
										"@提醒",
										"有人 @你",
										"atMe"
									],
									[
										"message",
										"私信",
										"收到了私信",
										"message?mode=list"
									]
								]) {
									const before = previous[key];
									const count = result.unreadCount[key];
									if (!Number.isFinite(before) || before < 0 || !Number.isFinite(count) || count <= before) continue;
									const message = `收到 ${count - before} 条新${label}，当前有 ${count} 条${label}未读`;
									if (!systemNotify(message, `${location.origin}/notification#/${path}`, `nspp:${location.hostname}:${uid}:${key}`, title)) ctx.notify(message);
								}
							});
							render(ctx.get(cacheKey));
						} catch {
							if (!ctx.signal.aborted && !failed) ctx.notify("未读消息检查失败，保留上次结果");
							failed = true;
						} finally {
							pending = false;
						}
					};
					render({
						reply: 0,
						atMe: 0,
						message: 0
					});
					try {
						render(ctx.get(cacheKey));
					} catch {}
					const stopPlacement = ctx.watch(place);
					document.addEventListener("visibilitychange", () => {
						if (!document.hidden) run();
					}, { signal: ctx.signal });
					run();
					const timer = setInterval(() => {
						run();
					}, 6e4);
					return () => {
						clearInterval(timer);
						stopPlacement();
						rows.forEach((row) => row.remove());
						originals.forEach((hidden, el) => {
							el.hidden = hidden;
							el.classList.remove("nspp-original-notification");
						});
					};
				};
				let cleanup;
				const start = () => {
					if (!cleanup && !ctx.signal.aborted) cleanup = initialize();
				};
				const stop = ctx.watch(start);
				const readyTimer = setInterval(start, 1e3);
				return () => {
					stop();
					clearInterval(readyTimer);
					cleanup?.();
				};
			}
		},
		{
			id: "ai-polish",
			title: "AI 写作助手",
			description: "支持写帖子、提纲、润色和续写；点击生成将正文和要求发送至配置的服务；先预览，再手动采用，不自动提交。服务需允许 CORS。",
			group: "编辑",
			defaults: {
				enabled: true,
				url: "",
				apiKey: "",
				model: "",
				prompt: "请润色以下 Markdown 文本，保留原意，只输出修改后的文本。"
			},
			fields: {
				url: {
					label: "完整 chat/completions 接口 URL",
					type: "text"
				},
				apiKey: {
					label: "API Key（仅本机保存）",
					type: "text"
				},
				model: {
					label: "模型",
					type: "text"
				},
				prompt: {
					label: "系统提示词",
					type: "textarea"
				}
			},
			mount(ctx) {
				let dialog;
				const launch = document.createElement("button");
				launch.type = "button";
				launch.className = "nspp-tool-icon";
				launch.append(toolIcon("ai"));
				launch.title = "AI 写作助手";
				launch.setAttribute("aria-label", launch.title);
				launch.dataset.nsppAiLauncher = "";
				(document.getElementById("nspp-tools") || document.body).append(launch);
				const compose = document.createElement("dialog");
				compose.className = "nspp-ai-dialog";
				document.body.append(compose);
				const open = (configure = false) => {
					compose.replaceChildren();
					compose.classList.remove("nspp-ai-config");
					const heading = document.createElement("h2");
					heading.textContent = configure ? "配置 AI 写作助手" : "AI 写作助手";
					const close = document.createElement("button");
					close.type = "button";
					close.textContent = "关闭";
					close.addEventListener("click", () => compose.close());
					const header = document.createElement("div");
					header.className = "nspp-ai-header";
					header.append(toolIcon("ai"), heading);
					compose.append(header);
					if (configure || !ctx.get("url").trim() || !ctx.get("model").trim() || !ctx.get("apiKey").trim()) {
						heading.textContent = "配置 AI 写作助手";
						compose.classList.add("nspp-ai-config");
						const hint = document.createElement("p");
						hint.className = "nspp-ai-hint";
						hint.textContent = "连接你的 AI 服务，配置仅保存在本机。";
						compose.append(hint);
						const form = document.createElement("form");
						const inputs = {};
						for (const [key, label] of [
							["url", "接口地址"],
							["apiKey", "API Key（仅本机保存）"],
							["model", "模型"]
						]) {
							const row = document.createElement("label");
							row.textContent = label;
							const input = document.createElement("input");
							input.type = key === "apiKey" ? "password" : key === "url" ? "url" : "text";
							input.required = true;
							input.value = ctx.get(key);
							input.autocomplete = "off";
							input.placeholder = key === "url" ? "https://api.example.com/v1/chat/completions" : key === "apiKey" ? "输入 API Key" : "输入模型名称";
							inputs[key] = input;
							row.append(input);
							form.append(row);
						}
						const save = document.createElement("button");
						save.type = "submit";
						save.textContent = "保存配置";
						save.className = "nspp-ai-primary";
						const actions = document.createElement("div");
						actions.className = "nspp-ai-actions";
						actions.append(close, save);
						form.append(actions);
						compose.append(form);
						form.addEventListener("submit", (event) => {
							event.preventDefault();
							try {
								if (new URL(inputs.url.value.trim()).protocol !== "https:") throw new Error();
							} catch {
								ctx.notify("请设置完整 HTTPS API 地址");
								return;
							}
							if (Object.values(inputs).some((input) => !input.value.trim())) {
								ctx.notify("请填写完整配置");
								return;
							}
							try {
								for (const [key, input] of Object.entries(inputs)) ctx.set(key, input.value.trim());
							} catch {
								ctx.notify("配置保存失败，请检查油猴存储");
								return;
							}
							open();
						});
						if (!compose.open) compose.showModal();
						return;
					}
					const nativeEditor = document.querySelector(".md-editor .CodeMirror")?.CodeMirror;
					const source = document.createElement("textarea");
					source.rows = 8;
					source.placeholder = "输入正文或材料，也可以只填写写作要求";
					source.setAttribute("aria-label", "AI 写作正文");
					const editor = nativeEditor || {
						getValue: () => source.value,
						setValue: (text) => {
							source.value = text;
						},
						focus: () => source.focus()
					};
					if (!nativeEditor) compose.append(source);
					const toolbar = document.createElement("div");
					toolbar.className = "nspp-ai-actions";
					const configureButton = document.createElement("button");
					configureButton.type = "button";
					configureButton.textContent = "配置";
					configureButton.addEventListener("click", () => open(true));
					toolbar.append(configureButton, close);
					compose.append(toolbar);
					const panel = document.createElement("div");
					panel.className = "nspp-ai-compose";
					const mode = document.createElement("select");
					mode.setAttribute("aria-label", "AI 写作方式");
					for (const label of [
						"润色",
						"写帖子",
						"列提纲",
						"续写"
					]) {
						const option = document.createElement("option");
						option.value = label;
						option.textContent = label;
						mode.append(option);
					}
					const requirements = document.createElement("textarea");
					requirements.placeholder = "主题、要点、语气或写作要求（写帖子时必填）";
					requirements.setAttribute("aria-label", "AI 写作要求");
					requirements.rows = 2;
					const disclosure = document.createElement("small");
					disclosure.textContent = "生成时会发送当前正文和写作要求到你配置的 AI 服务，结果需手动采用。";
					panel.append(mode, requirements, disclosure);
					toolbar.before(panel);
					const button = document.createElement("button");
					button.type = "button";
					button.textContent = "AI 生成";
					button.dataset.nsppAi = "";
					toolbar.append(button);
					const test = document.createElement("button");
					test.type = "button";
					test.dataset.nsppAiTest = "";
					test.textContent = "测试 AI 连接";
					toolbar.insertBefore(test, button);
					test.addEventListener("click", async () => {
						let url;
						try {
							url = new URL(ctx.get("url"));
							if (url.protocol !== "https:") throw new Error("HTTPS required");
						} catch {
							ctx.notify("请设置完整 HTTPS API 地址");
							return;
						}
						if (!ctx.get("model")) {
							ctx.notify("请先填写模型名称");
							return;
						}
						test.disabled = true;
						test.textContent = "连接测试中…";
						test.setAttribute("aria-busy", "true");
						try {
							if (!(await ctx.request(url.href, {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									Authorization: `Bearer ${ctx.get("apiKey")}`
								},
								body: JSON.stringify({
									model: ctx.get("model"),
									messages: [{
										role: "user",
										content: "Reply with OK. This is a connection test."
									}],
									max_tokens: 16,
									stream: false
								})
							})).choices?.[0]?.message?.content) throw new Error("Empty response");
							ctx.notify("AI 连接成功");
						} catch {
							if (!ctx.signal.aborted) ctx.notify("AI 连接失败，请检查地址、模型、Key 和 CORS");
						} finally {
							test.disabled = false;
							test.textContent = "测试 AI 连接";
							test.removeAttribute("aria-busy");
						}
					}, { signal: ctx.signal });
					button.addEventListener("click", async () => {
						const original = editor.getValue();
						if (!original.trim() && !requirements.value.trim()) {
							ctx.notify("请填写正文或写作要求");
							return;
						}
						if (mode.value === "写帖子" && !requirements.value.trim()) {
							ctx.notify("请填写帖子主题和要点");
							return;
						}
						const instruction = mode.value === "续写" ? "续写正文，只输出新增部分，不重复原文。" : mode.value === "列提纲" ? "根据主题和材料生成 Markdown 帖子提纲。" : mode.value === "写帖子" ? "根据主题和要点撰写 Markdown 帖子正文。" : "润色正文，保留原意。";
						const appendResult = mode.value === "续写";
						let url;
						try {
							url = new URL(ctx.get("url"));
							if (url.protocol !== "https:") throw new Error("HTTPS required");
						} catch {
							ctx.notify("请设置完整 HTTPS API 地址");
							return;
						}
						if (!ctx.get("model")) {
							ctx.notify("请先填写模型名称");
							return;
						}
						button.disabled = true;
						button.textContent = "生成中…";
						button.setAttribute("aria-busy", "true");
						try {
							const result = (await ctx.request(url.href, {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									Authorization: `Bearer ${ctx.get("apiKey")}`
								},
								body: JSON.stringify({
									model: ctx.get("model"),
									messages: [{
										role: "system",
										content: ctx.get("prompt")
									}, {
										role: "user",
										content: `${instruction} 不编造事实、价格或测试数据，缺失信息用待补充标记。只输出结果。\n\n写作要求：\n${requirements.value}\n\n当前正文：\n${original}`
									}],
									stream: false
								})
							})).choices?.[0]?.message?.content;
							if (!result) throw new Error("Empty response");
							if (ctx.signal.aborted) return;
							dialog?.remove();
							dialog = document.createElement("dialog");
							dialog.className = "nspp-ai-dialog";
							const heading = document.createElement("h2");
							heading.textContent = "AI 结果预览";
							const preview = document.createElement("textarea");
							preview.value = result;
							preview.style.cssText = "width:100%;height:45vh;box-sizing:border-box";
							preview.setAttribute("aria-label", "AI 修改结果");
							const apply = document.createElement("button");
							apply.type = "button";
							apply.textContent = appendResult ? "追加到正文" : "替换编辑器内容";
							const close = document.createElement("button");
							close.type = "button";
							close.textContent = "取消";
							close.addEventListener("click", () => dialog?.close(), { signal: ctx.signal });
							apply.addEventListener("click", () => {
								if (editor.getValue() !== original) {
									ctx.notify("编辑器内容已变化，请复制预览文本以免覆盖新修改");
									return;
								}
								editor.setValue(appendResult ? `${original}${original ? "\n\n" : ""}${preview.value}` : preview.value);
								editor.focus();
								dialog?.close();
							}, { signal: ctx.signal });
							apply.className = "nspp-ai-primary";
							const actions = document.createElement("div");
							actions.className = "nspp-ai-actions";
							actions.append(close, apply);
							dialog.append(heading, preview, actions);
							document.body.append(dialog);
							dialog.showModal();
						} catch {
							if (!ctx.signal.aborted) ctx.notify("AI 请求失败，请检查服务地址、模型、Key 和 CORS 配置");
						} finally {
							button.disabled = false;
							button.textContent = "AI 生成";
							button.removeAttribute("aria-busy");
						}
					}, { signal: ctx.signal });
					if (!compose.open) compose.showModal();
				};
				launch.addEventListener("click", () => open(), { signal: ctx.signal });
				return () => {
					launch.remove();
					compose.remove();
					dialog?.remove();
				};
			}
		},
		{
			id: "prefetch",
			title: "帖子悬停预加载",
			description: "仅预取同站帖子，最多20条，节省流量模式下不运行。",
			group: "导航",
			defaults: { enabled: false },
			mount(ctx) {
				const seen = new Set();
				let timer;
				if (navigator.connection?.saveData) return;
				document.addEventListener("pointerover", (event) => {
					clearTimeout(timer);
					const anchor = event.target.closest("a[href]");
					if (!anchor || seen.size >= 20) return;
					const url = new URL(anchor.href);
					if (url.origin !== location.origin || !/^\/post-\d+(?:-\d+)?(?:\.html)?$/.test(url.pathname) || url.search) return;
					url.hash = "";
					if (seen.has(url.href)) return;
					timer = setTimeout(() => {
						seen.add(url.href);
						ctx.request(url.href, { responseType: "text" }).catch(() => {});
					}, 800);
				}, { signal: ctx.signal });
				document.addEventListener("pointerout", () => clearTimeout(timer), { signal: ctx.signal });
				return () => clearTimeout(timer);
			}
		}
	];
	function confirmDialog(title, description, confirmLabel, signal) {
		if (signal.aborted) return Promise.resolve(false);
		return new Promise((resolve) => {
			const dialog = document.createElement("dialog");
			dialog.className = "nspp-confirm-dialog";
			dialog.setAttribute("aria-label", title);
			const heading = document.createElement("h2");
			heading.textContent = title;
			const body = document.createElement("p");
			body.textContent = description;
			const actions = document.createElement("form");
			actions.method = "dialog";
			const cancel = document.createElement("button");
			cancel.type = "submit";
			cancel.value = "cancel";
			cancel.textContent = "取消";
			cancel.autofocus = true;
			const confirm = document.createElement("button");
			confirm.type = "submit";
			confirm.value = "confirm";
			confirm.textContent = confirmLabel;
			confirm.className = "nspp-confirm-danger";
			actions.append(cancel, confirm);
			dialog.append(heading, body, actions);
			const abort = () => {
				dialog.close("cancel");
			};
			dialog.addEventListener("close", () => {
				signal.removeEventListener("abort", abort);
				dialog.remove();
				resolve(!signal.aborted && dialog.returnValue === "confirm");
			}, { once: true });
			dialog.addEventListener("click", (event) => {
				const rect = dialog.getBoundingClientRect();
				if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close("cancel");
			});
			document.body.append(dialog);
			dialog.showModal();
			signal.addEventListener("abort", abort, { once: true });
		});
	}
	function parseBlocklist(value) {
		const result = value;
		if (result?.success !== true || !Array.isArray(result.data)) throw new Error("黑名单查询失败");
		const ids = new Set();
		for (const row of result.data) {
			const id = String(row?.block_member_id ?? "");
			if (!/^[1-9]\d*$/.test(id)) throw new Error("黑名单格式异常");
			ids.add(id);
		}
		return ids;
	}
	var officialBlocklist = {
		id: "official-blocklist",
		title: "站点黑名单",
		description: "按站点当前屏蔽状态显示操作。",
		group: "用户",
		defaults: { enabled: true },
		mount(ctx) {
			const buttons = new Map();
			let blocked = new Set();
			let loaded = false, checked = 0;
			let fetching;
			const pending = new Set();
			function render() {
				buttons.forEach(({ id, name, button }) => {
					button.disabled = !!fetching || pending.has(id);
					const label = button.disabled ? "…" : !loaded ? "重试" : blocked.has(id) ? "取消屏蔽" : "屏蔽";
					if (button.textContent !== label) button.replaceChildren(siteIcon("forbid"), document.createTextNode(label));
					button.title = button.disabled ? "查询中" : !loaded ? "重试查询黑名单" : `${blocked.has(id) ? "解除屏蔽" : "屏蔽"} ${name}`;
					button.setAttribute("aria-label", button.title);
					if (button.disabled) button.setAttribute("aria-busy", "true");
					else button.removeAttribute("aria-busy");
					button.dataset.blocked = String(loaded && blocked.has(id));
				});
			}
			function refresh() {
				if (fetching) return fetching;
				fetching = Promise.resolve().then(async () => {
					blocked = parseBlocklist(await ctx.request("/api/block-list/list"));
					loaded = true;
					checked = Date.now();
				}).catch((error) => {
					loaded = false;
					throw error;
				}).finally(() => {
					fetching = void 0;
					render();
				});
				render();
				return fetching;
			}
			const stop = ctx.watch(() => {
				const ownId = unsafeWindow$1.__config__?.user?.member_id;
				if (!ownId) return;
				for (const [anchor, item] of buttons) if (!anchor.isConnected) {
					item.button.remove();
					item.release();
					buttons.delete(anchor);
				}
				document.querySelectorAll(userHoverSelector).forEach((anchor) => {
					if (!isUserHoverAnchor(anchor)) return;
					if (anchor.closest(".nspp-user-hover, .nspp-profile-dialog")) return;
					const id = authorId(anchor, location.origin);
					const name = anchor.textContent?.trim() || Array.from(document.querySelectorAll("a:is(.info-author,.post-author), :is(.author-info,.info-author,.post-author,.info-last-commenter) > a[href*=\"/space/\"], a[href*=\"/space/\"]:has(img), a[data-uid]")).find((candidate) => !candidate.closest(".nspp-user-hover, .nspp-profile-dialog") && authorId(candidate, location.origin) === id && candidate.textContent?.trim())?.textContent?.trim() || anchor.querySelector("img")?.alt.trim();
					if (!id || id === String(ownId) || !name || buttons.has(anchor)) return;
					const button = document.createElement("button");
					button.type = "button";
					button.className = "nspp-block-toggle";
					const hover = userHover(anchor, ctx);
					(hover.element.querySelector(".nspp-user-hover-actions") || hover.element).append(button);
					buttons.set(anchor, {
						id,
						name,
						button,
						release: hover.release
					});
					button.addEventListener("click", async () => {
						if (pending.has(id) || fetching) return;
						if (!loaded) {
							try {
								await refresh();
							} catch {
								ctx.notify("黑名单查询失败");
							}
							return;
						}
						pending.add(id);
						render();
						try {
							if (Date.now() - checked > 3e4) await refresh();
							const remove = blocked.has(id);
							const action = remove ? "解除屏蔽" : "屏蔽";
							if (!await confirmDialog(`${action} ${name}？`, remove ? "解除后将恢复显示该用户的内容。" : "屏蔽后将按站点规则隐藏该用户的内容，可随时解除。", `确认${action}`, ctx.signal)) return;
							if (Date.now() - checked > 3e4) await refresh();
							if (blocked.has(id) !== remove || unsafeWindow$1.__config__?.user?.member_id !== ownId) {
								ctx.notify("状态已变化，请重新操作");
								return;
							}
							const result = await ctx.request(`/api/block-list/${remove ? "del" : "add"}`, {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify(remove ? { block_member_id: Number(id) } : { block_member_name: name })
							});
							if (!result?.success) throw new Error(result?.message || "操作未成功");
							if (remove) blocked.delete(id);
							else blocked.add(id);
							checked = Date.now();
							ctx.notify(remove ? "已解除屏蔽" : "已屏蔽");
						} catch {
							loaded = false;
							ctx.notify("操作未确认，请重新查询");
						} finally {
							pending.delete(id);
							render();
						}
					}, { signal: ctx.signal });
				});
				render();
				if (buttons.size && !checked && !fetching) {
					checked = Date.now();
					refresh().catch(() => {});
				}
			});
			return () => {
				stop();
				buttons.forEach(({ button, release }) => {
					button.remove();
					release();
				});
			};
		}
	};
	var authors = ".author-info > a[href*=\"/space/\"], .info-author, .post-author";
	var relationshipFeatures = [{
		id: "local-friends",
		title: "本地好友高亮",
		description: "按用户名精确匹配，仅保存在本机，不发送关注请求。",
		group: "用户",
		defaults: {
			enabled: true,
			users: ""
		},
		fields: { users: {
			label: "好友用户名（每行一个）",
			type: "textarea"
		} },
		mount(ctx) {
			const friends = new Set(filterLines(ctx.get("users")));
			const seen = new WeakSet();
			const badges = [];
			const stop = ctx.watch(() => {
				document.querySelectorAll(authors).forEach((author) => {
					if (seen.has(author)) return;
					seen.add(author);
					if (!friends.has(author.textContent?.trim() || "")) return;
					const badge = document.createElement("strong");
					badge.textContent = " ★ 好友";
					badge.title = "本地好友";
					author.after(badge);
					badges.push(badge);
				});
			});
			return () => {
				stop();
				badges.forEach((badge) => badge.remove());
			};
		}
	}, officialBlocklist];
	var core_default = __toESM(__commonJSMin(((exports, module) => {
		function deepFreeze(obj) {
			if (obj instanceof Map) obj.clear = obj.delete = obj.set = function() {
				throw new Error("map is read-only");
			};
			else if (obj instanceof Set) obj.add = obj.clear = obj.delete = function() {
				throw new Error("set is read-only");
			};
			Object.freeze(obj);
			Object.getOwnPropertyNames(obj).forEach((name) => {
				const prop = obj[name];
				const type = typeof prop;
				if ((type === "object" || type === "function") && !Object.isFrozen(prop)) deepFreeze(prop);
			});
			return obj;
		}
		var Response = class {
			constructor(mode) {
				if (mode.data === void 0) mode.data = {};
				this.data = mode.data;
				this.isMatchIgnored = false;
			}
			ignoreMatch() {
				this.isMatchIgnored = true;
			}
		};
		function escapeHTML(value) {
			return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
		}
		function inherit$1(original, ...objects) {
			const result = Object.create(null);
			for (const key in original) result[key] = original[key];
			objects.forEach(function(obj) {
				for (const key in obj) result[key] = obj[key];
			});
			return result;
		}
		var SPAN_CLOSE = "</span>";
		var emitsWrappingTags = (node) => {
			return !!node.scope;
		};
		var scopeToCSSClass = (name, { prefix }) => {
			if (name.startsWith("language:")) return name.replace("language:", "language-");
			if (name.includes(".")) {
				const pieces = name.split(".");
				return [`${prefix}${pieces.shift()}`, ...pieces.map((x, i) => `${x}${"_".repeat(i + 1)}`)].join(" ");
			}
			return `${prefix}${name}`;
		};
		var HTMLRenderer = class {
			constructor(parseTree, options) {
				this.buffer = "";
				this.classPrefix = options.classPrefix;
				parseTree.walk(this);
			}
			addText(text) {
				this.buffer += escapeHTML(text);
			}
			openNode(node) {
				if (!emitsWrappingTags(node)) return;
				const className = scopeToCSSClass(node.scope, { prefix: this.classPrefix });
				this.span(className);
			}
			closeNode(node) {
				if (!emitsWrappingTags(node)) return;
				this.buffer += SPAN_CLOSE;
			}
			value() {
				return this.buffer;
			}
			span(className) {
				this.buffer += `<span class="${className}">`;
			}
		};
		var newNode = (opts = {}) => {
			const result = { children: [] };
			Object.assign(result, opts);
			return result;
		};
		var TokenTree = class TokenTree {
			constructor() {
				this.rootNode = newNode();
				this.stack = [this.rootNode];
			}
			get top() {
				return this.stack[this.stack.length - 1];
			}
			get root() {
				return this.rootNode;
			}
			add(node) {
				this.top.children.push(node);
			}
			openNode(scope) {
				const node = newNode({ scope });
				this.add(node);
				this.stack.push(node);
			}
			closeNode() {
				if (this.stack.length > 1) return this.stack.pop();
			}
			closeAllNodes() {
				while (this.closeNode());
			}
			toJSON() {
				return JSON.stringify(this.rootNode, null, 4);
			}
			walk(builder) {
				return this.constructor._walk(builder, this.rootNode);
			}
			static _walk(builder, node) {
				if (typeof node === "string") builder.addText(node);
				else if (node.children) {
					builder.openNode(node);
					node.children.forEach((child) => this._walk(builder, child));
					builder.closeNode(node);
				}
				return builder;
			}
			static _collapse(node) {
				if (typeof node === "string") return;
				if (!node.children) return;
				if (node.children.every((el) => typeof el === "string")) node.children = [node.children.join("")];
				else node.children.forEach((child) => {
					TokenTree._collapse(child);
				});
			}
		};
		var TokenTreeEmitter = class extends TokenTree {
			constructor(options) {
				super();
				this.options = options;
			}
			addText(text) {
				if (text === "") return;
				this.add(text);
			}
			startScope(scope) {
				this.openNode(scope);
			}
			endScope() {
				this.closeNode();
			}
			__addSublanguage(emitter, name) {
				const node = emitter.root;
				if (name) node.scope = `language:${name}`;
				this.add(node);
			}
			toHTML() {
				return new HTMLRenderer(this, this.options).value();
			}
			finalize() {
				this.closeAllNodes();
				return true;
			}
		};
		function source(re) {
			if (!re) return null;
			if (typeof re === "string") return re;
			return re.source;
		}
		function lookahead(re) {
			return concat("(?=", re, ")");
		}
		function anyNumberOfTimes(re) {
			return concat("(?:", re, ")*");
		}
		function optional(re) {
			return concat("(?:", re, ")?");
		}
		function concat(...args) {
			return args.map((x) => source(x)).join("");
		}
		function stripOptionsFromArgs(args) {
			const opts = args[args.length - 1];
			if (typeof opts === "object" && opts.constructor === Object) {
				args.splice(args.length - 1, 1);
				return opts;
			} else return {};
		}
		function either(...args) {
			return "(" + (stripOptionsFromArgs(args).capture ? "" : "?:") + args.map((x) => source(x)).join("|") + ")";
		}
		function countMatchGroups(re) {
			return new RegExp(re.toString() + "|").exec("").length - 1;
		}
		function startsWith(re, lexeme) {
			const match = re && re.exec(lexeme);
			return match && match.index === 0;
		}
		var BACKREF_RE = new RegExp(either(/\[(?:[^\\\]]|\\.)*\]/, /\(\?<(?![=!])[^>]+>/, /\(\?'[^']+'/, /\(\??/, /\\([1-9][0-9]*)/, /\\./));
		function _rewriteBackreferences(regexps, { joinWith }) {
			let numCaptures = 0;
			return regexps.map((regex) => {
				numCaptures += 1;
				const offset = numCaptures;
				let re = source(regex);
				let out = "";
				while (re.length > 0) {
					const match = BACKREF_RE.exec(re);
					if (!match) {
						out += re;
						break;
					}
					out += re.substring(0, match.index);
					re = re.substring(match.index + match[0].length);
					if (match[0][0] === "\\" && match[1]) out += "\\" + String(Number(match[1]) + offset);
					else {
						out += match[0];
						if (match[0] === "(" || /^\(\?[<']/.test(match[0])) numCaptures++;
					}
				}
				return out;
			}).map((re) => `(${re})`).join(joinWith);
		}
		var MATCH_NOTHING_RE = /\b\B/;
		var IDENT_RE = "[a-zA-Z]\\w*";
		var UNDERSCORE_IDENT_RE = "[a-zA-Z_]\\w*";
		var NUMBER_RE = "\\b\\d+(\\.\\d+)?";
		var C_NUMBER_RE = "(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)";
		var BINARY_NUMBER_RE = "\\b(0b[01]+)";
		var RE_STARTERS_RE = "!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~";
		var SHEBANG = (opts = {}) => {
			const beginShebang = /^#![ ]*\//;
			if (opts.binary) opts.begin = concat(beginShebang, /.*\b/, opts.binary, /\b.*/);
			return inherit$1({
				scope: "meta",
				begin: beginShebang,
				end: /$/,
				relevance: 0,
				"on:begin": (m, resp) => {
					if (m.index !== 0) resp.ignoreMatch();
				}
			}, opts);
		};
		var BACKSLASH_ESCAPE = {
			begin: "\\\\[\\s\\S]",
			relevance: 0
		};
		var APOS_STRING_MODE = {
			scope: "string",
			begin: "'",
			end: "'",
			illegal: "\\n",
			contains: [BACKSLASH_ESCAPE]
		};
		var QUOTE_STRING_MODE = {
			scope: "string",
			begin: "\"",
			end: "\"",
			illegal: "\\n",
			contains: [BACKSLASH_ESCAPE]
		};
		var PHRASAL_WORDS_MODE = { begin: /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/ };
		var COMMENT = function(begin, end, modeOptions = {}) {
			const mode = inherit$1({
				scope: "comment",
				begin,
				end,
				contains: []
			}, modeOptions);
			mode.contains.push({
				scope: "doctag",
				begin: "[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)",
				end: /(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,
				excludeBegin: true,
				relevance: 0
			});
			const ENGLISH_WORD = either("I", "a", "is", "so", "us", "to", "at", "if", "in", "it", "on", /[A-Za-z]+['](d|ve|re|ll|t|s|n)/, /[A-Za-z]+[-][a-z]+/, /[A-Za-z][a-z]{2,}/);
			mode.contains.push({ begin: concat(/[ ]+/, "(", ENGLISH_WORD, /[.]?[:]?([.][ ]|[ ])/, "){3}") });
			return mode;
		};
		var C_LINE_COMMENT_MODE = COMMENT("//", "$");
		var C_BLOCK_COMMENT_MODE = COMMENT("/\\*", "\\*/");
		var HASH_COMMENT_MODE = COMMENT("#", "$");
		var NUMBER_MODE = {
			scope: "number",
			begin: NUMBER_RE,
			relevance: 0
		};
		var C_NUMBER_MODE = {
			scope: "number",
			begin: C_NUMBER_RE,
			relevance: 0
		};
		var BINARY_NUMBER_MODE = {
			scope: "number",
			begin: BINARY_NUMBER_RE,
			relevance: 0
		};
		var REGEXP_MODE = {
			scope: "regexp",
			begin: /\/(?=[^/\n]*\/)/,
			end: /\/[gimuy]*/,
			contains: [BACKSLASH_ESCAPE, {
				begin: /\[/,
				end: /\]/,
				relevance: 0,
				contains: [BACKSLASH_ESCAPE]
			}]
		};
		var TITLE_MODE = {
			scope: "title",
			begin: IDENT_RE,
			relevance: 0
		};
		var UNDERSCORE_TITLE_MODE = {
			scope: "title",
			begin: UNDERSCORE_IDENT_RE,
			relevance: 0
		};
		var METHOD_GUARD = {
			begin: "\\.\\s*[a-zA-Z_]\\w*",
			relevance: 0
		};
		var END_SAME_AS_BEGIN = function(mode) {
			return Object.assign(mode, {
				"on:begin": (m, resp) => {
					resp.data._beginMatch = m[1];
				},
				"on:end": (m, resp) => {
					if (resp.data._beginMatch !== m[1]) resp.ignoreMatch();
				}
			});
		};
		var MODES = Object.freeze({
			__proto__: null,
			APOS_STRING_MODE,
			BACKSLASH_ESCAPE,
			BINARY_NUMBER_MODE,
			BINARY_NUMBER_RE,
			COMMENT,
			C_BLOCK_COMMENT_MODE,
			C_LINE_COMMENT_MODE,
			C_NUMBER_MODE,
			C_NUMBER_RE,
			END_SAME_AS_BEGIN,
			HASH_COMMENT_MODE,
			IDENT_RE,
			MATCH_NOTHING_RE,
			METHOD_GUARD,
			NUMBER_MODE,
			NUMBER_RE,
			PHRASAL_WORDS_MODE,
			QUOTE_STRING_MODE,
			REGEXP_MODE,
			RE_STARTERS_RE,
			SHEBANG,
			TITLE_MODE,
			UNDERSCORE_IDENT_RE,
			UNDERSCORE_TITLE_MODE
		});
		function skipIfHasPrecedingDot(match, response) {
			if (match.input[match.index - 1] === ".") response.ignoreMatch();
		}
		function scopeClassName(mode, _parent) {
			if (mode.className !== void 0) {
				mode.scope = mode.className;
				delete mode.className;
			}
		}
		function beginKeywords(mode, parent) {
			if (!parent) return;
			if (!mode.beginKeywords) return;
			mode.begin = "\\b(" + mode.beginKeywords.split(" ").join("|") + ")(?!\\.)(?=\\b|\\s)";
			mode.__beforeBegin = skipIfHasPrecedingDot;
			mode.keywords = mode.keywords || mode.beginKeywords;
			delete mode.beginKeywords;
			if (mode.relevance === void 0) mode.relevance = 0;
		}
		function compileIllegal(mode, _parent) {
			if (!Array.isArray(mode.illegal)) return;
			mode.illegal = either(...mode.illegal);
		}
		function compileMatch(mode, _parent) {
			if (!mode.match) return;
			if (mode.begin || mode.end) throw new Error("begin & end are not supported with match");
			mode.begin = mode.match;
			delete mode.match;
		}
		function compileRelevance(mode, _parent) {
			if (mode.relevance === void 0) mode.relevance = 1;
		}
		var beforeMatchExt = (mode, parent) => {
			if (!mode.beforeMatch) return;
			if (mode.starts) throw new Error("beforeMatch cannot be used with starts");
			const originalMode = Object.assign({}, mode);
			Object.keys(mode).forEach((key) => {
				delete mode[key];
			});
			mode.keywords = originalMode.keywords;
			mode.begin = concat(originalMode.beforeMatch, lookahead(originalMode.begin));
			mode.starts = {
				relevance: 0,
				contains: [Object.assign(originalMode, { endsParent: true })]
			};
			mode.relevance = 0;
			delete originalMode.beforeMatch;
		};
		var COMMON_KEYWORDS = [
			"of",
			"and",
			"for",
			"in",
			"not",
			"or",
			"if",
			"then",
			"parent",
			"list",
			"value"
		];
		var DEFAULT_KEYWORD_SCOPE = "keyword";
		function compileKeywords(rawKeywords, caseInsensitive, scopeName = DEFAULT_KEYWORD_SCOPE) {
			const compiledKeywords = Object.create(null);
			if (typeof rawKeywords === "string") compileList(scopeName, rawKeywords.split(" "));
			else if (Array.isArray(rawKeywords)) compileList(scopeName, rawKeywords);
			else Object.keys(rawKeywords).forEach(function(scopeName) {
				Object.assign(compiledKeywords, compileKeywords(rawKeywords[scopeName], caseInsensitive, scopeName));
			});
			return compiledKeywords;
			function compileList(scopeName, keywordList) {
				if (caseInsensitive) keywordList = keywordList.map((x) => x.toLowerCase());
				keywordList.forEach(function(keyword) {
					const pair = keyword.split("|");
					compiledKeywords[pair[0]] = [scopeName, scoreForKeyword(pair[0], pair[1])];
				});
			}
		}
		function scoreForKeyword(keyword, providedScore) {
			if (providedScore) return Number(providedScore);
			return commonKeyword(keyword) ? 0 : 1;
		}
		function commonKeyword(keyword) {
			return COMMON_KEYWORDS.includes(keyword.toLowerCase());
		}
		var seenDeprecations = {};
		var error = (message) => {
			console.error(message);
		};
		var warn = (message, ...args) => {
			console.log(`WARN: ${message}`, ...args);
		};
		var deprecated = (version, message) => {
			if (seenDeprecations[`${version}/${message}`]) return;
			console.log(`Deprecated as of ${version}. ${message}`);
			seenDeprecations[`${version}/${message}`] = true;
		};
		var MultiClassError = new Error();
		function remapScopeNames(mode, regexes, { key }) {
			let offset = 0;
			const scopeNames = mode[key];
			const emit = {};
			const positions = {};
			for (let i = 1; i <= regexes.length; i++) {
				positions[i + offset] = scopeNames[i];
				emit[i + offset] = true;
				offset += countMatchGroups(regexes[i - 1]);
			}
			mode[key] = positions;
			mode[key]._emit = emit;
			mode[key]._multi = true;
		}
		function beginMultiClass(mode) {
			if (!Array.isArray(mode.begin)) return;
			if (mode.skip || mode.excludeBegin || mode.returnBegin) {
				error("skip, excludeBegin, returnBegin not compatible with beginScope: {}");
				throw MultiClassError;
			}
			if (typeof mode.beginScope !== "object" || mode.beginScope === null) {
				error("beginScope must be object");
				throw MultiClassError;
			}
			remapScopeNames(mode, mode.begin, { key: "beginScope" });
			mode.begin = _rewriteBackreferences(mode.begin, { joinWith: "" });
		}
		function endMultiClass(mode) {
			if (!Array.isArray(mode.end)) return;
			if (mode.skip || mode.excludeEnd || mode.returnEnd) {
				error("skip, excludeEnd, returnEnd not compatible with endScope: {}");
				throw MultiClassError;
			}
			if (typeof mode.endScope !== "object" || mode.endScope === null) {
				error("endScope must be object");
				throw MultiClassError;
			}
			remapScopeNames(mode, mode.end, { key: "endScope" });
			mode.end = _rewriteBackreferences(mode.end, { joinWith: "" });
		}
		function scopeSugar(mode) {
			if (mode.scope && typeof mode.scope === "object" && mode.scope !== null) {
				mode.beginScope = mode.scope;
				delete mode.scope;
			}
		}
		function MultiClass(mode) {
			scopeSugar(mode);
			if (typeof mode.beginScope === "string") mode.beginScope = { _wrap: mode.beginScope };
			if (typeof mode.endScope === "string") mode.endScope = { _wrap: mode.endScope };
			beginMultiClass(mode);
			endMultiClass(mode);
		}
		function compileLanguage(language) {
			function langRe(value, global) {
				return new RegExp(source(value), "m" + (language.case_insensitive ? "i" : "") + (language.unicodeRegex ? "u" : "") + (global ? "g" : ""));
			}
			class MultiRegex {
				constructor() {
					this.matchIndexes = {};
					this.regexes = [];
					this.matchAt = 1;
					this.position = 0;
				}
				addRule(re, opts) {
					opts.position = this.position++;
					this.matchIndexes[this.matchAt] = opts;
					this.regexes.push([opts, re]);
					this.matchAt += countMatchGroups(re) + 1;
				}
				compile() {
					if (this.regexes.length === 0) this.exec = () => null;
					const terminators = this.regexes.map((el) => el[1]);
					this.matcherRe = langRe(_rewriteBackreferences(terminators, { joinWith: "|" }), true);
					this.lastIndex = 0;
				}
				exec(s) {
					this.matcherRe.lastIndex = this.lastIndex;
					const match = this.matcherRe.exec(s);
					if (!match) return null;
					const i = match.findIndex((el, i) => i > 0 && el !== void 0);
					const matchData = this.matchIndexes[i];
					match.splice(0, i);
					return Object.assign(match, matchData);
				}
			}
			class ResumableMultiRegex {
				constructor() {
					this.rules = [];
					this.multiRegexes = [];
					this.count = 0;
					this.lastIndex = 0;
					this.regexIndex = 0;
				}
				getMatcher(index) {
					if (this.multiRegexes[index]) return this.multiRegexes[index];
					const matcher = new MultiRegex();
					this.rules.slice(index).forEach(([re, opts]) => matcher.addRule(re, opts));
					matcher.compile();
					this.multiRegexes[index] = matcher;
					return matcher;
				}
				resumingScanAtSamePosition() {
					return this.regexIndex !== 0;
				}
				considerAll() {
					this.regexIndex = 0;
				}
				addRule(re, opts) {
					this.rules.push([re, opts]);
					if (opts.type === "begin") this.count++;
				}
				exec(s) {
					const m = this.getMatcher(this.regexIndex);
					m.lastIndex = this.lastIndex;
					let result = m.exec(s);
					if (this.resumingScanAtSamePosition()) {
						if (result && result.index === this.lastIndex);
						else {
							const m2 = this.getMatcher(0);
							m2.lastIndex = this.lastIndex + 1;
							result = m2.exec(s);
						}
					}
					if (result) {
						this.regexIndex += result.position + 1;
						if (this.regexIndex === this.count) this.considerAll();
					}
					return result;
				}
			}
			function buildModeRegex(mode) {
				const mm = new ResumableMultiRegex();
				mode.contains.forEach((term) => mm.addRule(term.begin, {
					rule: term,
					type: "begin"
				}));
				if (mode.terminatorEnd) mm.addRule(mode.terminatorEnd, { type: "end" });
				if (mode.illegal) mm.addRule(mode.illegal, { type: "illegal" });
				return mm;
			}
			function compileMode(mode, parent) {
				const cmode = mode;
				if (mode.isCompiled) return cmode;
				[
					scopeClassName,
					compileMatch,
					MultiClass,
					beforeMatchExt
				].forEach((ext) => ext(mode, parent));
				language.compilerExtensions.forEach((ext) => ext(mode, parent));
				mode.__beforeBegin = null;
				[
					beginKeywords,
					compileIllegal,
					compileRelevance
				].forEach((ext) => ext(mode, parent));
				mode.isCompiled = true;
				let keywordPattern = null;
				if (typeof mode.keywords === "object" && mode.keywords.$pattern) {
					mode.keywords = Object.assign({}, mode.keywords);
					keywordPattern = mode.keywords.$pattern;
					delete mode.keywords.$pattern;
				}
				keywordPattern = keywordPattern || /\w+/;
				if (mode.keywords) mode.keywords = compileKeywords(mode.keywords, language.case_insensitive);
				cmode.keywordPatternRe = langRe(keywordPattern, true);
				if (parent) {
					if (!mode.begin) mode.begin = /\B|\b/;
					cmode.beginRe = langRe(cmode.begin);
					if (!mode.end && !mode.endsWithParent) mode.end = /\B|\b/;
					if (mode.end) cmode.endRe = langRe(cmode.end);
					cmode.terminatorEnd = source(cmode.end) || "";
					if (mode.endsWithParent && parent.terminatorEnd) cmode.terminatorEnd += (mode.end ? "|" : "") + parent.terminatorEnd;
				}
				if (mode.illegal) cmode.illegalRe = langRe(mode.illegal);
				if (!mode.contains) mode.contains = [];
				mode.contains = [].concat(...mode.contains.map(function(c) {
					return expandOrCloneMode(c === "self" ? mode : c);
				}));
				mode.contains.forEach(function(c) {
					compileMode(c, cmode);
				});
				if (mode.starts) compileMode(mode.starts, parent);
				cmode.matcher = buildModeRegex(cmode);
				return cmode;
			}
			if (!language.compilerExtensions) language.compilerExtensions = [];
			if (language.contains && language.contains.includes("self")) throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");
			language.classNameAliases = inherit$1(language.classNameAliases || {});
			return compileMode(language);
		}
		function dependencyOnParent(mode) {
			if (!mode) return false;
			return mode.endsWithParent || dependencyOnParent(mode.starts);
		}
		function expandOrCloneMode(mode) {
			if (mode.variants && !mode.cachedVariants) mode.cachedVariants = mode.variants.map(function(variant) {
				return inherit$1(mode, { variants: null }, variant);
			});
			if (mode.cachedVariants) return mode.cachedVariants;
			if (dependencyOnParent(mode)) return inherit$1(mode, { starts: mode.starts ? inherit$1(mode.starts) : null });
			if (Object.isFrozen(mode)) return inherit$1(mode);
			return mode;
		}
		var version = "11.12.0";
		var HTMLInjectionError = class extends Error {
			constructor(reason, html) {
				super(reason);
				this.name = "HTMLInjectionError";
				this.html = html;
			}
		};
		var escape = escapeHTML;
		var inherit = inherit$1;
		var NO_MATCH = Symbol("nomatch");
		var MAX_KEYWORD_HITS = 7;
		var HLJS = function(hljs) {
			const languages = Object.create(null);
			const aliases = Object.create(null);
			const plugins = [];
			let SAFE_MODE = true;
			const LANGUAGE_NOT_FOUND = "Could not find the language '{}', did you forget to load/include a language module?";
			const PLAINTEXT_LANGUAGE = {
				disableAutodetect: true,
				name: "Plain text",
				contains: []
			};
			let options = {
				ignoreUnescapedHTML: false,
				throwUnescapedHTML: false,
				noHighlightRe: /^(no-?highlight)$/i,
				languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
				classPrefix: "hljs-",
				cssSelector: "pre code",
				languages: null,
				__emitter: TokenTreeEmitter
			};
			function shouldNotHighlight(languageName) {
				return options.noHighlightRe.test(languageName);
			}
			function blockLanguage(block) {
				let classes = block.className + " ";
				classes += block.parentNode ? block.parentNode.className : "";
				const match = options.languageDetectRe.exec(classes);
				if (match) {
					const language = getLanguage(match[1]);
					if (!language) {
						warn(LANGUAGE_NOT_FOUND.replace("{}", match[1]));
						warn("Falling back to no-highlight mode for this block.", block);
					}
					return language ? match[1] : "no-highlight";
				}
				return classes.split(/\s+/).find((_class) => shouldNotHighlight(_class) || getLanguage(_class));
			}
			function highlight(codeOrLanguageName, optionsOrCode, ignoreIllegals) {
				let code = "";
				let languageName = "";
				if (typeof optionsOrCode === "object") {
					code = codeOrLanguageName;
					ignoreIllegals = optionsOrCode.ignoreIllegals;
					languageName = optionsOrCode.language;
				} else {
					deprecated("10.7.0", "highlight(lang, code, ...args) has been deprecated.");
					deprecated("10.7.0", "Please use highlight(code, options) instead.\nhttps://github.com/highlightjs/highlight.js/issues/2277");
					languageName = codeOrLanguageName;
					code = optionsOrCode;
				}
				if (ignoreIllegals === void 0) ignoreIllegals = true;
				const context = {
					code,
					language: languageName
				};
				fire("before:highlight", context);
				const result = context.result ? context.result : _highlight(context.language, context.code, ignoreIllegals);
				result.code = context.code;
				fire("after:highlight", result);
				return result;
			}
			function _highlight(languageName, codeToHighlight, ignoreIllegals, continuation) {
				const keywordHits = Object.create(null);
				function keywordData(mode, matchText) {
					return mode.keywords[matchText];
				}
				function processKeywords() {
					if (!top.keywords) {
						emitter.addText(modeBuffer);
						return;
					}
					let lastIndex = 0;
					top.keywordPatternRe.lastIndex = 0;
					let match = top.keywordPatternRe.exec(modeBuffer);
					let buf = "";
					while (match) {
						buf += modeBuffer.substring(lastIndex, match.index);
						const word = language.case_insensitive ? match[0].toLowerCase() : match[0];
						const data = keywordData(top, word);
						if (data) {
							const [kind, keywordRelevance] = data;
							emitter.addText(buf);
							buf = "";
							keywordHits[word] = (keywordHits[word] || 0) + 1;
							if (keywordHits[word] <= MAX_KEYWORD_HITS) relevance += keywordRelevance;
							if (kind.startsWith("_")) buf += match[0];
							else {
								const cssClass = language.classNameAliases[kind] || kind;
								emitKeyword(match[0], cssClass);
							}
						} else buf += match[0];
						lastIndex = top.keywordPatternRe.lastIndex;
						match = top.keywordPatternRe.exec(modeBuffer);
					}
					buf += modeBuffer.substring(lastIndex);
					emitter.addText(buf);
				}
				function processSubLanguage() {
					if (modeBuffer === "") return;
					let result = null;
					if (typeof top.subLanguage === "string") {
						if (!languages[top.subLanguage]) {
							emitter.addText(modeBuffer);
							return;
						}
						result = _highlight(top.subLanguage, modeBuffer, true, continuations[top.subLanguage]);
						continuations[top.subLanguage] = result._top;
					} else result = highlightAuto(modeBuffer, top.subLanguage.length ? top.subLanguage : null);
					if (top.relevance > 0) relevance += result.relevance;
					emitter.__addSublanguage(result._emitter, result.language);
				}
				function processBuffer() {
					if (top.subLanguage != null) processSubLanguage();
					else processKeywords();
					modeBuffer = "";
				}
				function emitKeyword(keyword, scope) {
					if (keyword === "") return;
					emitter.startScope(scope);
					emitter.addText(keyword);
					emitter.endScope();
				}
				function emitMultiClass(scope, match) {
					let i = 1;
					const max = match.length - 1;
					while (i <= max) {
						if (!scope._emit[i]) {
							i++;
							continue;
						}
						const klass = language.classNameAliases[scope[i]] || scope[i];
						const text = match[i];
						if (klass) emitKeyword(text, klass);
						else {
							modeBuffer = text;
							processKeywords();
							modeBuffer = "";
						}
						i++;
					}
				}
				function startNewMode(mode, match) {
					if (mode.scope && typeof mode.scope === "string") emitter.openNode(language.classNameAliases[mode.scope] || mode.scope);
					if (mode.beginScope) {
						if (mode.beginScope._wrap) {
							emitKeyword(modeBuffer, language.classNameAliases[mode.beginScope._wrap] || mode.beginScope._wrap);
							modeBuffer = "";
						} else if (mode.beginScope._multi) {
							emitMultiClass(mode.beginScope, match);
							modeBuffer = "";
						}
					}
					top = Object.create(mode, { parent: { value: top } });
					return top;
				}
				function endOfMode(mode, match, matchPlusRemainder) {
					let matched = startsWith(mode.endRe, matchPlusRemainder);
					if (matched) {
						if (mode["on:end"]) {
							const resp = new Response(mode);
							mode["on:end"](match, resp);
							if (resp.isMatchIgnored) matched = false;
						}
						if (matched) {
							while (mode.endsParent && mode.parent) mode = mode.parent;
							return mode;
						}
					}
					if (mode.endsWithParent) return endOfMode(mode.parent, match, matchPlusRemainder);
				}
				function doIgnore(lexeme) {
					if (top.matcher.regexIndex === 0) {
						modeBuffer += lexeme[0];
						return 1;
					} else {
						resumeScanAtSamePosition = true;
						return 0;
					}
				}
				function doBeginMatch(match) {
					const lexeme = match[0];
					const newMode = match.rule;
					const resp = new Response(newMode);
					const beforeCallbacks = [newMode.__beforeBegin, newMode["on:begin"]];
					for (const cb of beforeCallbacks) {
						if (!cb) continue;
						cb(match, resp);
						if (resp.isMatchIgnored) return doIgnore(lexeme);
					}
					if (newMode.skip) modeBuffer += lexeme;
					else {
						if (newMode.excludeBegin) modeBuffer += lexeme;
						processBuffer();
						if (!newMode.returnBegin && !newMode.excludeBegin) modeBuffer = lexeme;
					}
					startNewMode(newMode, match);
					return newMode.returnBegin ? 0 : lexeme.length;
				}
				function doEndMatch(match) {
					const lexeme = match[0];
					const matchPlusRemainder = codeToHighlight.substring(match.index);
					const endMode = endOfMode(top, match, matchPlusRemainder);
					if (!endMode) return NO_MATCH;
					const origin = top;
					if (top.endScope && top.endScope._wrap) {
						processBuffer();
						emitKeyword(lexeme, top.endScope._wrap);
					} else if (top.endScope && top.endScope._multi) {
						processBuffer();
						emitMultiClass(top.endScope, match);
					} else if (origin.skip) modeBuffer += lexeme;
					else {
						if (!(origin.returnEnd || origin.excludeEnd)) modeBuffer += lexeme;
						processBuffer();
						if (origin.excludeEnd) modeBuffer = lexeme;
					}
					do {
						if (top.scope) emitter.closeNode();
						if (!top.skip && !top.subLanguage) relevance += top.relevance;
						top = top.parent;
					} while (top !== endMode.parent);
					if (endMode.starts) startNewMode(endMode.starts, match);
					return origin.returnEnd ? 0 : lexeme.length;
				}
				function processContinuations() {
					const list = [];
					for (let current = top; current !== language; current = current.parent) if (current.scope) list.unshift(current.scope);
					list.forEach((item) => emitter.openNode(item));
				}
				let lastMatch = {};
				function processLexeme(textBeforeMatch, match) {
					const lexeme = match && match[0];
					modeBuffer += textBeforeMatch;
					if (lexeme == null) {
						processBuffer();
						return 0;
					}
					if (lastMatch.type === "begin" && match.type === "end" && lastMatch.index === match.index && lexeme === "") {
						modeBuffer += codeToHighlight.slice(match.index, match.index + 1);
						if (!SAFE_MODE) {
							const err = new Error(`0 width match regex (${languageName})`);
							err.languageName = languageName;
							err.badRule = lastMatch.rule;
							throw err;
						}
						return 1;
					}
					lastMatch = match;
					if (match.type === "begin") return doBeginMatch(match);
					else if (match.type === "illegal" && !ignoreIllegals) {
						const err = new Error("Illegal lexeme \"" + lexeme + "\" for mode \"" + (top.scope || "<unnamed>") + "\"");
						err.mode = top;
						throw err;
					} else if (match.type === "end") {
						const processed = doEndMatch(match);
						if (processed !== NO_MATCH) return processed;
					}
					if (match.type === "illegal" && lexeme === "") {
						if (match.index === codeToHighlight.length);
						else modeBuffer += "\n";
						return 1;
					}
					if (iterations > 1e5 && iterations > match.index * 3) throw new Error("potential infinite loop, way more iterations than matches");
					modeBuffer += lexeme;
					return lexeme.length;
				}
				const language = getLanguage(languageName);
				if (!language) {
					error(LANGUAGE_NOT_FOUND.replace("{}", languageName));
					throw new Error("Unknown language: \"" + languageName + "\"");
				}
				const md = compileLanguage(language);
				let result = "";
				let top = continuation || md;
				const continuations = {};
				const emitter = new options.__emitter(options);
				processContinuations();
				let modeBuffer = "";
				let relevance = 0;
				let index = 0;
				let iterations = 0;
				let resumeScanAtSamePosition = false;
				try {
					if (!language.__emitTokens) {
						top.matcher.considerAll();
						for (;;) {
							iterations++;
							if (resumeScanAtSamePosition) resumeScanAtSamePosition = false;
							else top.matcher.considerAll();
							top.matcher.lastIndex = index;
							const match = top.matcher.exec(codeToHighlight);
							if (!match) break;
							const processedCount = processLexeme(codeToHighlight.substring(index, match.index), match);
							index = match.index + processedCount;
						}
						processLexeme(codeToHighlight.substring(index));
					} else language.__emitTokens(codeToHighlight, emitter);
					emitter.finalize();
					result = emitter.toHTML();
					return {
						language: languageName,
						value: result,
						relevance,
						illegal: false,
						_emitter: emitter,
						_top: top
					};
				} catch (err) {
					if (err.message && err.message.includes("Illegal")) return {
						language: languageName,
						value: escape(codeToHighlight),
						illegal: true,
						relevance: 0,
						_illegalBy: {
							message: err.message,
							index,
							context: codeToHighlight.slice(index - 100, index + 100),
							mode: err.mode,
							resultSoFar: result
						},
						_emitter: emitter
					};
					else if (SAFE_MODE) return {
						language: languageName,
						value: escape(codeToHighlight),
						illegal: false,
						relevance: 0,
						errorRaised: err,
						_emitter: emitter,
						_top: top
					};
					else throw err;
				}
			}
			function justTextHighlightResult(code) {
				const result = {
					value: escape(code),
					illegal: false,
					relevance: 0,
					_top: PLAINTEXT_LANGUAGE,
					_emitter: new options.__emitter(options)
				};
				result._emitter.addText(code);
				return result;
			}
			function highlightAuto(code, languageSubset) {
				languageSubset = languageSubset || options.languages || Object.keys(languages);
				const plaintext = justTextHighlightResult(code);
				const results = languageSubset.filter(getLanguage).filter(autoDetection).map((name) => _highlight(name, code, false));
				results.unshift(plaintext);
				const [best, secondBest] = results.sort((a, b) => {
					if (a.relevance !== b.relevance) return b.relevance - a.relevance;
					if (a.language && b.language) {
						if (getLanguage(a.language).supersetOf === b.language) return 1;
						else if (getLanguage(b.language).supersetOf === a.language) return -1;
					}
					return 0;
				});
				const result = best;
				result.secondBest = secondBest;
				return result;
			}
			function updateClassName(element, currentLang, resultLang) {
				const language = currentLang && aliases[currentLang] || resultLang;
				element.classList.add("hljs");
				element.classList.add(`language-${language}`);
			}
			function highlightElement(element) {
				let node = null;
				const language = blockLanguage(element);
				if (shouldNotHighlight(language)) return;
				fire("before:highlightElement", {
					el: element,
					language
				});
				if (element.dataset.highlighted) {
					console.log("Element previously highlighted. To highlight again, first unset `dataset.highlighted`.", element);
					return;
				}
				if (element.children.length > 0) {
					if (!options.ignoreUnescapedHTML) {
						console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk.");
						console.warn("https://github.com/highlightjs/highlight.js/wiki/security");
						console.warn("The element with unescaped HTML:");
						console.warn(element);
					}
					if (options.throwUnescapedHTML) throw new HTMLInjectionError("One of your code blocks includes unescaped HTML.", element.innerHTML);
				}
				node = element;
				const text = node.textContent;
				const result = language ? highlight(text, {
					language,
					ignoreIllegals: true
				}) : highlightAuto(text);
				element.innerHTML = result.value;
				element.dataset.highlighted = "yes";
				updateClassName(element, language, result.language);
				element.result = {
					language: result.language,
					re: result.relevance,
					relevance: result.relevance
				};
				if (result.secondBest) element.secondBest = {
					language: result.secondBest.language,
					relevance: result.secondBest.relevance
				};
				fire("after:highlightElement", {
					el: element,
					result,
					text
				});
			}
			function configure(userOptions) {
				options = inherit(options, userOptions);
			}
			const initHighlighting = () => {
				highlightAll();
				deprecated("10.6.0", "initHighlighting() deprecated.  Use highlightAll() now.");
			};
			function initHighlightingOnLoad() {
				highlightAll();
				deprecated("10.6.0", "initHighlightingOnLoad() deprecated.  Use highlightAll() now.");
			}
			let wantsHighlight = false;
			function highlightAll() {
				function boot() {
					highlightAll();
				}
				if (document.readyState === "loading") {
					if (!wantsHighlight) window.addEventListener("DOMContentLoaded", boot, false);
					wantsHighlight = true;
					return;
				}
				document.querySelectorAll(options.cssSelector).forEach(highlightElement);
			}
			function registerLanguage(languageName, languageDefinition) {
				let lang = null;
				try {
					lang = languageDefinition(hljs);
				} catch (error$1) {
					error("Language definition for '{}' could not be registered.".replace("{}", languageName));
					if (!SAFE_MODE) throw error$1;
					else error(error$1);
					lang = PLAINTEXT_LANGUAGE;
				}
				if (!lang.name) lang.name = languageName;
				languages[languageName] = lang;
				lang.rawDefinition = languageDefinition.bind(null, hljs);
				if (lang.aliases) registerAliases(lang.aliases, { languageName });
			}
			function unregisterLanguage(languageName) {
				delete languages[languageName];
				for (const alias of Object.keys(aliases)) if (aliases[alias] === languageName) delete aliases[alias];
			}
			function listLanguages() {
				return Object.keys(languages);
			}
			function getLanguage(name) {
				name = (name || "").toLowerCase();
				return languages[name] || languages[aliases[name]];
			}
			function registerAliases(aliasList, { languageName }) {
				if (typeof aliasList === "string") aliasList = [aliasList];
				aliasList.forEach((alias) => {
					aliases[alias.toLowerCase()] = languageName;
				});
			}
			function autoDetection(name) {
				const lang = getLanguage(name);
				return lang && !lang.disableAutodetect;
			}
			function upgradePluginAPI(plugin) {
				if (plugin["before:highlightBlock"] && !plugin["before:highlightElement"]) plugin["before:highlightElement"] = (data) => {
					plugin["before:highlightBlock"](Object.assign({ block: data.el }, data));
				};
				if (plugin["after:highlightBlock"] && !plugin["after:highlightElement"]) plugin["after:highlightElement"] = (data) => {
					plugin["after:highlightBlock"](Object.assign({ block: data.el }, data));
				};
			}
			function addPlugin(plugin) {
				upgradePluginAPI(plugin);
				plugins.push(plugin);
			}
			function removePlugin(plugin) {
				const index = plugins.indexOf(plugin);
				if (index !== -1) plugins.splice(index, 1);
			}
			function fire(event, args) {
				const cb = event;
				plugins.forEach(function(plugin) {
					if (plugin[cb]) plugin[cb](args);
				});
			}
			function deprecateHighlightBlock(el) {
				deprecated("10.7.0", "highlightBlock will be removed entirely in v12.0");
				deprecated("10.7.0", "Please use highlightElement now.");
				return highlightElement(el);
			}
			Object.assign(hljs, {
				highlight,
				highlightAuto,
				highlightAll,
				highlightElement,
				highlightBlock: deprecateHighlightBlock,
				configure,
				initHighlighting,
				initHighlightingOnLoad,
				registerLanguage,
				unregisterLanguage,
				listLanguages,
				getLanguage,
				registerAliases,
				autoDetection,
				inherit,
				addPlugin,
				removePlugin
			});
			hljs.debugMode = function() {
				SAFE_MODE = false;
			};
			hljs.safeMode = function() {
				SAFE_MODE = true;
			};
			hljs.versionString = version;
			hljs.regex = {
				concat,
				lookahead,
				either,
				optional,
				anyNumberOfTimes
			};
			for (const key in MODES) if (typeof MODES[key] === "object") deepFreeze(MODES[key]);
			Object.assign(hljs, MODES);
			return hljs;
		};
		var highlight = HLJS({});
		highlight.newInstance = () => HLJS({});
		module.exports = highlight;
		highlight.HighlightJS = highlight;
		highlight.default = highlight;
	}))()).default;
	var IDENT_RE$2 = "[A-Za-z$_][0-9A-Za-z$_]*";
	var KEYWORDS$2 = [
		"as",
		"in",
		"of",
		"if",
		"for",
		"while",
		"finally",
		"var",
		"new",
		"function",
		"do",
		"return",
		"void",
		"else",
		"break",
		"catch",
		"instanceof",
		"with",
		"throw",
		"case",
		"default",
		"try",
		"switch",
		"continue",
		"typeof",
		"delete",
		"let",
		"yield",
		"const",
		"class",
		"debugger",
		"async",
		"await",
		"static",
		"import",
		"from",
		"export",
		"extends",
		"using"
	];
	var LITERALS$1 = [
		"true",
		"false",
		"null",
		"undefined",
		"NaN",
		"Infinity"
	];
	var TYPES$1 = [
		"Object",
		"Function",
		"Boolean",
		"Symbol",
		"Math",
		"Date",
		"Number",
		"BigInt",
		"String",
		"RegExp",
		"Array",
		"Float32Array",
		"Float64Array",
		"Int8Array",
		"Uint8Array",
		"Uint8ClampedArray",
		"Int16Array",
		"Int32Array",
		"Uint16Array",
		"Uint32Array",
		"BigInt64Array",
		"BigUint64Array",
		"Set",
		"Map",
		"WeakSet",
		"WeakMap",
		"ArrayBuffer",
		"SharedArrayBuffer",
		"Atomics",
		"DataView",
		"JSON",
		"Promise",
		"Generator",
		"GeneratorFunction",
		"AsyncFunction",
		"Reflect",
		"Proxy",
		"Intl",
		"WebAssembly"
	];
	var ERROR_TYPES$1 = [
		"Error",
		"EvalError",
		"InternalError",
		"RangeError",
		"ReferenceError",
		"SyntaxError",
		"TypeError",
		"URIError"
	];
	var BUILT_IN_GLOBALS$1 = [
		"setInterval",
		"setTimeout",
		"clearInterval",
		"clearTimeout",
		"require",
		"exports",
		"eval",
		"isFinite",
		"isNaN",
		"parseFloat",
		"parseInt",
		"decodeURI",
		"decodeURIComponent",
		"encodeURI",
		"encodeURIComponent",
		"escape",
		"unescape"
	];
	var BUILT_IN_VARIABLES$1 = [
		"arguments",
		"this",
		"super",
		"console",
		"window",
		"document",
		"localStorage",
		"sessionStorage",
		"module",
		"self",
		"global"
	];
	var BUILT_INS$1 = [].concat(BUILT_IN_GLOBALS$1, TYPES$1, ERROR_TYPES$1);
	function javascript$1(hljs) {
		const regex = hljs.regex;
		const hasClosingTag = (match, { after }) => {
			const tag = "</" + match[0].slice(1);
			return match.input.indexOf(tag, after) !== -1;
		};
		const IDENT_RE$1 = IDENT_RE$2;
		const FRAGMENT = {
			begin: "<>",
			end: "</>"
		};
		const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
		const XML_TAG = {
			begin: /<[A-Za-z0-9\\._:-]+/,
			end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
			isTrulyOpeningTag: (match, response) => {
				const afterMatchIndex = match[0].length + match.index;
				const nextChar = match.input[afterMatchIndex];
				if (nextChar === "<" || nextChar === ",") {
					response.ignoreMatch();
					return;
				}
				if (nextChar === ">") {
					if (!hasClosingTag(match, { after: afterMatchIndex })) response.ignoreMatch();
				}
				let m;
				const afterMatch = match.input.substring(afterMatchIndex);
				if (m = afterMatch.match(/^\s*=/)) {
					response.ignoreMatch();
					return;
				}
				if (m = afterMatch.match(/^\s+extends\s+/)) {
					if (m.index === 0) {
						response.ignoreMatch();
						return;
					}
				}
			}
		};
		const KEYWORDS$1 = {
			$pattern: IDENT_RE$2,
			keyword: KEYWORDS$2,
			literal: LITERALS$1,
			built_in: BUILT_INS$1,
			"variable.language": BUILT_IN_VARIABLES$1
		};
		const decimalDigits = "[0-9](_?[0-9])*";
		const frac = `\\.(${decimalDigits})`;
		const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
		const NUMBER = {
			className: "number",
			variants: [
				{ begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))[eE][+-]?(${decimalDigits})\\b` },
				{ begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },
				{ begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },
				{ begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
				{ begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
				{ begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },
				{ begin: "\\b0[0-7]+n?\\b" }
			],
			relevance: 0
		};
		const SUBST = {
			className: "subst",
			begin: "\\$\\{",
			end: "\\}",
			keywords: KEYWORDS$1,
			contains: []
		};
		const HTML_TEMPLATE = {
			begin: ".?html`",
			end: "",
			starts: {
				end: "`",
				returnEnd: false,
				contains: [hljs.BACKSLASH_ESCAPE, SUBST],
				subLanguage: "xml"
			}
		};
		const CSS_TEMPLATE = {
			begin: ".?css`",
			end: "",
			starts: {
				end: "`",
				returnEnd: false,
				contains: [hljs.BACKSLASH_ESCAPE, SUBST],
				subLanguage: "css"
			}
		};
		const GRAPHQL_TEMPLATE = {
			begin: ".?gql`",
			end: "",
			starts: {
				end: "`",
				returnEnd: false,
				contains: [hljs.BACKSLASH_ESCAPE, SUBST],
				subLanguage: "graphql"
			}
		};
		const TEMPLATE_STRING = {
			className: "string",
			begin: "`",
			end: "`",
			contains: [hljs.BACKSLASH_ESCAPE, SUBST]
		};
		const COMMENT = {
			className: "comment",
			variants: [
				hljs.COMMENT(/\/\*\*(?!\/)/, "\\*/", {
					relevance: 0,
					contains: [{
						begin: "(?=@[A-Za-z]+)",
						relevance: 0,
						contains: [
							{
								className: "doctag",
								begin: "@[A-Za-z]+"
							},
							{
								className: "type",
								begin: "\\{",
								end: "\\}",
								excludeEnd: true,
								excludeBegin: true,
								relevance: 0
							},
							{
								className: "variable",
								begin: IDENT_RE$1 + "(?=\\s*(-)|$)",
								endsParent: true,
								relevance: 0
							},
							{
								begin: /(?=[^\n])\s/,
								relevance: 0
							}
						]
					}]
				}),
				hljs.C_BLOCK_COMMENT_MODE,
				hljs.C_LINE_COMMENT_MODE
			]
		};
		const SUBST_INTERNALS = [
			hljs.APOS_STRING_MODE,
			hljs.QUOTE_STRING_MODE,
			HTML_TEMPLATE,
			CSS_TEMPLATE,
			GRAPHQL_TEMPLATE,
			TEMPLATE_STRING,
			{ match: /\$\d+/ },
			NUMBER
		];
		SUBST.contains = SUBST_INTERNALS.concat({
			begin: /\{/,
			end: /\}/,
			keywords: KEYWORDS$1,
			contains: ["self"].concat(SUBST_INTERNALS)
		});
		const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
		const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([{
			begin: /(\s*)\(/,
			end: /\)/,
			keywords: KEYWORDS$1,
			contains: ["self"].concat(SUBST_AND_COMMENTS)
		}]);
		const PARAMS = {
			className: "params",
			begin: /(\s*)\(/,
			end: /\)/,
			excludeBegin: true,
			excludeEnd: true,
			keywords: KEYWORDS$1,
			contains: PARAMS_CONTAINS
		};
		const CLASS_OR_EXTENDS = { variants: [{
			match: [
				/class/,
				/\s+/,
				IDENT_RE$1,
				/\s+/,
				/extends/,
				/\s+/,
				regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")
			],
			scope: {
				1: "keyword",
				3: "title.class",
				5: "keyword",
				7: "title.class.inherited"
			}
		}, {
			match: [
				/class/,
				/\s+/,
				IDENT_RE$1
			],
			scope: {
				1: "keyword",
				3: "title.class"
			}
		}] };
		const CLASS_REFERENCE = {
			relevance: 0,
			match: regex.either(/\bJSON/, /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/, /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/, /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/),
			className: "title.class",
			keywords: { _: [...TYPES$1, ...ERROR_TYPES$1] }
		};
		const USE_STRICT = {
			label: "use_strict",
			className: "meta",
			relevance: 10,
			begin: /^\s*['"]use (strict|asm)['"]/
		};
		const FUNCTION_DEFINITION = {
			variants: [{ match: [
				/function/,
				/\s+/,
				IDENT_RE$1,
				/(?=\s*\()/
			] }, { match: [/function/, /\s*(?=\()/] }],
			className: {
				1: "keyword",
				3: "title.function"
			},
			label: "func.def",
			contains: [PARAMS],
			illegal: /%/
		};
		const UPPER_CASE_CONSTANT = {
			relevance: 0,
			match: /\b[A-Z][A-Z_0-9]+\b/,
			className: "variable.constant"
		};
		function noneOf(list) {
			return regex.concat("(?!", list.join("|"), ")");
		}
		const FUNCTION_CALL = {
			match: regex.concat(/\b/, noneOf([
				...BUILT_IN_GLOBALS$1,
				"super",
				"import",
				"await"
			].map((x) => `${x}\\s*\\(`)), IDENT_RE$1, regex.lookahead(/\s*\(/)),
			className: "title.function",
			relevance: 0
		};
		const PROPERTY_ACCESS = {
			begin: regex.concat(/\./, regex.lookahead(regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/))),
			end: IDENT_RE$1,
			excludeBegin: true,
			keywords: "prototype",
			className: "property",
			relevance: 0
		};
		const GETTER_OR_SETTER = {
			match: [
				/get|set/,
				/\s+/,
				IDENT_RE$1,
				/(?=\()/
			],
			className: {
				1: "keyword",
				3: "title.function"
			},
			contains: [{ begin: /\(\)/ }, PARAMS]
		};
		const FUNC_LEAD_IN_RE = "(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|" + hljs.UNDERSCORE_IDENT_RE + ")\\s*=>";
		const FUNCTION_VARIABLE = {
			match: [
				/const|var|let/,
				/\s+/,
				IDENT_RE$1,
				/\s*/,
				/=\s*/,
				/(async\s*)?/,
				regex.lookahead(FUNC_LEAD_IN_RE)
			],
			keywords: "async",
			className: {
				1: "keyword",
				3: "title.function"
			},
			contains: [PARAMS]
		};
		return {
			name: "JavaScript",
			aliases: [
				"js",
				"jsx",
				"mjs",
				"cjs"
			],
			keywords: KEYWORDS$1,
			exports: {
				PARAMS_CONTAINS,
				CLASS_REFERENCE
			},
			illegal: /#(?![$_A-Za-z])/,
			contains: [
				hljs.SHEBANG({
					label: "shebang",
					binary: "node",
					relevance: 5
				}),
				USE_STRICT,
				hljs.APOS_STRING_MODE,
				hljs.QUOTE_STRING_MODE,
				HTML_TEMPLATE,
				CSS_TEMPLATE,
				GRAPHQL_TEMPLATE,
				TEMPLATE_STRING,
				COMMENT,
				{ match: /\$\d+/ },
				NUMBER,
				CLASS_REFERENCE,
				{
					scope: "attr",
					match: IDENT_RE$1 + regex.lookahead(":"),
					relevance: 0
				},
				FUNCTION_VARIABLE,
				{
					begin: "(" + hljs.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
					keywords: "return throw case",
					relevance: 0,
					contains: [
						COMMENT,
						hljs.REGEXP_MODE,
						{
							className: "function",
							begin: FUNC_LEAD_IN_RE,
							returnBegin: true,
							end: "\\s*=>",
							contains: [{
								className: "params",
								variants: [
									{
										begin: hljs.UNDERSCORE_IDENT_RE,
										relevance: 0
									},
									{
										className: null,
										begin: /\(\s*\)/,
										skip: true
									},
									{
										begin: /(\s*)\(/,
										end: /\)/,
										excludeBegin: true,
										excludeEnd: true,
										keywords: KEYWORDS$1,
										contains: PARAMS_CONTAINS
									}
								]
							}]
						},
						{
							begin: /,/,
							relevance: 0
						},
						{
							match: /\s+/,
							relevance: 0
						},
						{
							variants: [
								{
									begin: FRAGMENT.begin,
									end: FRAGMENT.end
								},
								{ match: XML_SELF_CLOSING },
								{
									begin: XML_TAG.begin,
									"on:begin": XML_TAG.isTrulyOpeningTag,
									end: XML_TAG.end
								}
							],
							subLanguage: "xml",
							contains: [{
								begin: XML_TAG.begin,
								end: XML_TAG.end,
								skip: true,
								contains: ["self"]
							}]
						}
					]
				},
				FUNCTION_DEFINITION,
				{ beginKeywords: "while if switch catch for" },
				{
					begin: "\\b(?!function)" + hljs.UNDERSCORE_IDENT_RE + "\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
					returnBegin: true,
					label: "func.def",
					contains: [PARAMS, hljs.inherit(hljs.TITLE_MODE, {
						begin: IDENT_RE$1,
						className: "title.function"
					})]
				},
				{
					match: /\.\.\./,
					relevance: 0
				},
				PROPERTY_ACCESS,
				{
					match: "\\$" + IDENT_RE$1,
					relevance: 0
				},
				{
					match: [/\bconstructor(?=\s*\()/],
					className: { 1: "title.function" },
					contains: [PARAMS]
				},
				FUNCTION_CALL,
				UPPER_CASE_CONSTANT,
				CLASS_OR_EXTENDS,
				GETTER_OR_SETTER,
				{ match: /\$[(.]/ }
			]
		};
	}
	var IDENT_RE = "[A-Za-z$_][0-9A-Za-z$_]*";
	var KEYWORDS = [
		"as",
		"in",
		"of",
		"if",
		"for",
		"while",
		"finally",
		"var",
		"new",
		"function",
		"do",
		"return",
		"void",
		"else",
		"break",
		"catch",
		"instanceof",
		"with",
		"throw",
		"case",
		"default",
		"try",
		"switch",
		"continue",
		"typeof",
		"delete",
		"let",
		"yield",
		"const",
		"class",
		"debugger",
		"async",
		"await",
		"static",
		"import",
		"from",
		"export",
		"extends",
		"using"
	];
	var LITERALS = [
		"true",
		"false",
		"null",
		"undefined",
		"NaN",
		"Infinity"
	];
	var TYPES = [
		"Object",
		"Function",
		"Boolean",
		"Symbol",
		"Math",
		"Date",
		"Number",
		"BigInt",
		"String",
		"RegExp",
		"Array",
		"Float32Array",
		"Float64Array",
		"Int8Array",
		"Uint8Array",
		"Uint8ClampedArray",
		"Int16Array",
		"Int32Array",
		"Uint16Array",
		"Uint32Array",
		"BigInt64Array",
		"BigUint64Array",
		"Set",
		"Map",
		"WeakSet",
		"WeakMap",
		"ArrayBuffer",
		"SharedArrayBuffer",
		"Atomics",
		"DataView",
		"JSON",
		"Promise",
		"Generator",
		"GeneratorFunction",
		"AsyncFunction",
		"Reflect",
		"Proxy",
		"Intl",
		"WebAssembly"
	];
	var ERROR_TYPES = [
		"Error",
		"EvalError",
		"InternalError",
		"RangeError",
		"ReferenceError",
		"SyntaxError",
		"TypeError",
		"URIError"
	];
	var BUILT_IN_GLOBALS = [
		"setInterval",
		"setTimeout",
		"clearInterval",
		"clearTimeout",
		"require",
		"exports",
		"eval",
		"isFinite",
		"isNaN",
		"parseFloat",
		"parseInt",
		"decodeURI",
		"decodeURIComponent",
		"encodeURI",
		"encodeURIComponent",
		"escape",
		"unescape"
	];
	var BUILT_IN_VARIABLES = [
		"arguments",
		"this",
		"super",
		"console",
		"window",
		"document",
		"localStorage",
		"sessionStorage",
		"module",
		"self",
		"global"
	];
	var BUILT_INS = [].concat(BUILT_IN_GLOBALS, TYPES, ERROR_TYPES);
	function javascript(hljs) {
		const regex = hljs.regex;
		const hasClosingTag = (match, { after }) => {
			const tag = "</" + match[0].slice(1);
			return match.input.indexOf(tag, after) !== -1;
		};
		const IDENT_RE$1 = IDENT_RE;
		const FRAGMENT = {
			begin: "<>",
			end: "</>"
		};
		const XML_SELF_CLOSING = /<[A-Za-z0-9\\._:-]+\s*\/>/;
		const XML_TAG = {
			begin: /<[A-Za-z0-9\\._:-]+/,
			end: /\/[A-Za-z0-9\\._:-]+>|\/>/,
			isTrulyOpeningTag: (match, response) => {
				const afterMatchIndex = match[0].length + match.index;
				const nextChar = match.input[afterMatchIndex];
				if (nextChar === "<" || nextChar === ",") {
					response.ignoreMatch();
					return;
				}
				if (nextChar === ">") {
					if (!hasClosingTag(match, { after: afterMatchIndex })) response.ignoreMatch();
				}
				let m;
				const afterMatch = match.input.substring(afterMatchIndex);
				if (m = afterMatch.match(/^\s*=/)) {
					response.ignoreMatch();
					return;
				}
				if (m = afterMatch.match(/^\s+extends\s+/)) {
					if (m.index === 0) {
						response.ignoreMatch();
						return;
					}
				}
			}
		};
		const KEYWORDS$1 = {
			$pattern: IDENT_RE,
			keyword: KEYWORDS,
			literal: LITERALS,
			built_in: BUILT_INS,
			"variable.language": BUILT_IN_VARIABLES
		};
		const decimalDigits = "[0-9](_?[0-9])*";
		const frac = `\\.(${decimalDigits})`;
		const decimalInteger = `0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*`;
		const NUMBER = {
			className: "number",
			variants: [
				{ begin: `(\\b(${decimalInteger})((${frac})|\\.)?|(${frac}))[eE][+-]?(${decimalDigits})\\b` },
				{ begin: `\\b(${decimalInteger})\\b((${frac})\\b|\\.)?|(${frac})\\b` },
				{ begin: `\\b(0|[1-9](_?[0-9])*)n\\b` },
				{ begin: "\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b" },
				{ begin: "\\b0[bB][0-1](_?[0-1])*n?\\b" },
				{ begin: "\\b0[oO][0-7](_?[0-7])*n?\\b" },
				{ begin: "\\b0[0-7]+n?\\b" }
			],
			relevance: 0
		};
		const SUBST = {
			className: "subst",
			begin: "\\$\\{",
			end: "\\}",
			keywords: KEYWORDS$1,
			contains: []
		};
		const HTML_TEMPLATE = {
			begin: ".?html`",
			end: "",
			starts: {
				end: "`",
				returnEnd: false,
				contains: [hljs.BACKSLASH_ESCAPE, SUBST],
				subLanguage: "xml"
			}
		};
		const CSS_TEMPLATE = {
			begin: ".?css`",
			end: "",
			starts: {
				end: "`",
				returnEnd: false,
				contains: [hljs.BACKSLASH_ESCAPE, SUBST],
				subLanguage: "css"
			}
		};
		const GRAPHQL_TEMPLATE = {
			begin: ".?gql`",
			end: "",
			starts: {
				end: "`",
				returnEnd: false,
				contains: [hljs.BACKSLASH_ESCAPE, SUBST],
				subLanguage: "graphql"
			}
		};
		const TEMPLATE_STRING = {
			className: "string",
			begin: "`",
			end: "`",
			contains: [hljs.BACKSLASH_ESCAPE, SUBST]
		};
		const COMMENT = {
			className: "comment",
			variants: [
				hljs.COMMENT(/\/\*\*(?!\/)/, "\\*/", {
					relevance: 0,
					contains: [{
						begin: "(?=@[A-Za-z]+)",
						relevance: 0,
						contains: [
							{
								className: "doctag",
								begin: "@[A-Za-z]+"
							},
							{
								className: "type",
								begin: "\\{",
								end: "\\}",
								excludeEnd: true,
								excludeBegin: true,
								relevance: 0
							},
							{
								className: "variable",
								begin: IDENT_RE$1 + "(?=\\s*(-)|$)",
								endsParent: true,
								relevance: 0
							},
							{
								begin: /(?=[^\n])\s/,
								relevance: 0
							}
						]
					}]
				}),
				hljs.C_BLOCK_COMMENT_MODE,
				hljs.C_LINE_COMMENT_MODE
			]
		};
		const SUBST_INTERNALS = [
			hljs.APOS_STRING_MODE,
			hljs.QUOTE_STRING_MODE,
			HTML_TEMPLATE,
			CSS_TEMPLATE,
			GRAPHQL_TEMPLATE,
			TEMPLATE_STRING,
			{ match: /\$\d+/ },
			NUMBER
		];
		SUBST.contains = SUBST_INTERNALS.concat({
			begin: /\{/,
			end: /\}/,
			keywords: KEYWORDS$1,
			contains: ["self"].concat(SUBST_INTERNALS)
		});
		const SUBST_AND_COMMENTS = [].concat(COMMENT, SUBST.contains);
		const PARAMS_CONTAINS = SUBST_AND_COMMENTS.concat([{
			begin: /(\s*)\(/,
			end: /\)/,
			keywords: KEYWORDS$1,
			contains: ["self"].concat(SUBST_AND_COMMENTS)
		}]);
		const PARAMS = {
			className: "params",
			begin: /(\s*)\(/,
			end: /\)/,
			excludeBegin: true,
			excludeEnd: true,
			keywords: KEYWORDS$1,
			contains: PARAMS_CONTAINS
		};
		const CLASS_OR_EXTENDS = { variants: [{
			match: [
				/class/,
				/\s+/,
				IDENT_RE$1,
				/\s+/,
				/extends/,
				/\s+/,
				regex.concat(IDENT_RE$1, "(", regex.concat(/\./, IDENT_RE$1), ")*")
			],
			scope: {
				1: "keyword",
				3: "title.class",
				5: "keyword",
				7: "title.class.inherited"
			}
		}, {
			match: [
				/class/,
				/\s+/,
				IDENT_RE$1
			],
			scope: {
				1: "keyword",
				3: "title.class"
			}
		}] };
		const CLASS_REFERENCE = {
			relevance: 0,
			match: regex.either(/\bJSON/, /\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/, /\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/, /\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/),
			className: "title.class",
			keywords: { _: [...TYPES, ...ERROR_TYPES] }
		};
		const USE_STRICT = {
			label: "use_strict",
			className: "meta",
			relevance: 10,
			begin: /^\s*['"]use (strict|asm)['"]/
		};
		const FUNCTION_DEFINITION = {
			variants: [{ match: [
				/function/,
				/\s+/,
				IDENT_RE$1,
				/(?=\s*\()/
			] }, { match: [/function/, /\s*(?=\()/] }],
			className: {
				1: "keyword",
				3: "title.function"
			},
			label: "func.def",
			contains: [PARAMS],
			illegal: /%/
		};
		const UPPER_CASE_CONSTANT = {
			relevance: 0,
			match: /\b[A-Z][A-Z_0-9]+\b/,
			className: "variable.constant"
		};
		function noneOf(list) {
			return regex.concat("(?!", list.join("|"), ")");
		}
		const FUNCTION_CALL = {
			match: regex.concat(/\b/, noneOf([
				...BUILT_IN_GLOBALS,
				"super",
				"import",
				"await"
			].map((x) => `${x}\\s*\\(`)), IDENT_RE$1, regex.lookahead(/\s*\(/)),
			className: "title.function",
			relevance: 0
		};
		const PROPERTY_ACCESS = {
			begin: regex.concat(/\./, regex.lookahead(regex.concat(IDENT_RE$1, /(?![0-9A-Za-z$_(])/))),
			end: IDENT_RE$1,
			excludeBegin: true,
			keywords: "prototype",
			className: "property",
			relevance: 0
		};
		const GETTER_OR_SETTER = {
			match: [
				/get|set/,
				/\s+/,
				IDENT_RE$1,
				/(?=\()/
			],
			className: {
				1: "keyword",
				3: "title.function"
			},
			contains: [{ begin: /\(\)/ }, PARAMS]
		};
		const FUNC_LEAD_IN_RE = "(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|" + hljs.UNDERSCORE_IDENT_RE + ")\\s*=>";
		const FUNCTION_VARIABLE = {
			match: [
				/const|var|let/,
				/\s+/,
				IDENT_RE$1,
				/\s*/,
				/=\s*/,
				/(async\s*)?/,
				regex.lookahead(FUNC_LEAD_IN_RE)
			],
			keywords: "async",
			className: {
				1: "keyword",
				3: "title.function"
			},
			contains: [PARAMS]
		};
		return {
			name: "JavaScript",
			aliases: [
				"js",
				"jsx",
				"mjs",
				"cjs"
			],
			keywords: KEYWORDS$1,
			exports: {
				PARAMS_CONTAINS,
				CLASS_REFERENCE
			},
			illegal: /#(?![$_A-Za-z])/,
			contains: [
				hljs.SHEBANG({
					label: "shebang",
					binary: "node",
					relevance: 5
				}),
				USE_STRICT,
				hljs.APOS_STRING_MODE,
				hljs.QUOTE_STRING_MODE,
				HTML_TEMPLATE,
				CSS_TEMPLATE,
				GRAPHQL_TEMPLATE,
				TEMPLATE_STRING,
				COMMENT,
				{ match: /\$\d+/ },
				NUMBER,
				CLASS_REFERENCE,
				{
					scope: "attr",
					match: IDENT_RE$1 + regex.lookahead(":"),
					relevance: 0
				},
				FUNCTION_VARIABLE,
				{
					begin: "(" + hljs.RE_STARTERS_RE + "|\\b(case|return|throw)\\b)\\s*",
					keywords: "return throw case",
					relevance: 0,
					contains: [
						COMMENT,
						hljs.REGEXP_MODE,
						{
							className: "function",
							begin: FUNC_LEAD_IN_RE,
							returnBegin: true,
							end: "\\s*=>",
							contains: [{
								className: "params",
								variants: [
									{
										begin: hljs.UNDERSCORE_IDENT_RE,
										relevance: 0
									},
									{
										className: null,
										begin: /\(\s*\)/,
										skip: true
									},
									{
										begin: /(\s*)\(/,
										end: /\)/,
										excludeBegin: true,
										excludeEnd: true,
										keywords: KEYWORDS$1,
										contains: PARAMS_CONTAINS
									}
								]
							}]
						},
						{
							begin: /,/,
							relevance: 0
						},
						{
							match: /\s+/,
							relevance: 0
						},
						{
							variants: [
								{
									begin: FRAGMENT.begin,
									end: FRAGMENT.end
								},
								{ match: XML_SELF_CLOSING },
								{
									begin: XML_TAG.begin,
									"on:begin": XML_TAG.isTrulyOpeningTag,
									end: XML_TAG.end
								}
							],
							subLanguage: "xml",
							contains: [{
								begin: XML_TAG.begin,
								end: XML_TAG.end,
								skip: true,
								contains: ["self"]
							}]
						}
					]
				},
				FUNCTION_DEFINITION,
				{ beginKeywords: "while if switch catch for" },
				{
					begin: "\\b(?!function)" + hljs.UNDERSCORE_IDENT_RE + "\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
					returnBegin: true,
					label: "func.def",
					contains: [PARAMS, hljs.inherit(hljs.TITLE_MODE, {
						begin: IDENT_RE$1,
						className: "title.function"
					})]
				},
				{
					match: /\.\.\./,
					relevance: 0
				},
				PROPERTY_ACCESS,
				{
					match: "\\$" + IDENT_RE$1,
					relevance: 0
				},
				{
					match: [/\bconstructor(?=\s*\()/],
					className: { 1: "title.function" },
					contains: [PARAMS]
				},
				FUNCTION_CALL,
				UPPER_CASE_CONSTANT,
				CLASS_OR_EXTENDS,
				GETTER_OR_SETTER,
				{ match: /\$[(.]/ }
			]
		};
	}
	function typescript(hljs) {
		const regex = hljs.regex;
		const tsLanguage = javascript(hljs);
		const IDENT_RE$1 = IDENT_RE;
		const TYPES = [
			"any",
			"void",
			"number",
			"boolean",
			"string",
			"object",
			"never",
			"symbol",
			"bigint",
			"unknown"
		];
		const NAMESPACE = {
			begin: [
				/namespace/,
				/\s+/,
				hljs.IDENT_RE
			],
			beginScope: {
				1: "keyword",
				3: "title.class"
			}
		};
		const INTERFACE = {
			beginKeywords: "interface",
			end: /\{/,
			excludeEnd: true,
			keywords: {
				keyword: "interface extends",
				built_in: TYPES
			},
			contains: [tsLanguage.exports.CLASS_REFERENCE]
		};
		const USE_STRICT = {
			className: "meta",
			relevance: 10,
			begin: /^\s*['"]use strict['"]/
		};
		const KEYWORDS$1 = {
			$pattern: IDENT_RE,
			keyword: KEYWORDS.concat([
				"type",
				"interface",
				"public",
				"private",
				"protected",
				"implements",
				"declare",
				"abstract",
				"readonly",
				"enum",
				"override",
				"satisfies"
			]),
			literal: LITERALS,
			built_in: BUILT_INS.concat(TYPES),
			"variable.language": BUILT_IN_VARIABLES
		};
		const DECORATOR = {
			className: "meta",
			begin: "@" + IDENT_RE$1
		};
		const swapMode = (mode, label, replacement) => {
			const indx = mode.contains.findIndex((m) => m.label === label);
			if (indx === -1) throw new Error("can not find mode to replace");
			mode.contains.splice(indx, 1, replacement);
		};
		Object.assign(tsLanguage.keywords, KEYWORDS$1);
		tsLanguage.exports.PARAMS_CONTAINS.push(DECORATOR);
		const ATTRIBUTE_HIGHLIGHT = tsLanguage.contains.find((c) => c.scope === "attr");
		const OPTIONAL_KEY_OR_ARGUMENT = Object.assign({}, ATTRIBUTE_HIGHLIGHT, { match: regex.concat(IDENT_RE$1, regex.lookahead(/\s*\?:/)) });
		tsLanguage.exports.PARAMS_CONTAINS.push([
			tsLanguage.exports.CLASS_REFERENCE,
			ATTRIBUTE_HIGHLIGHT,
			OPTIONAL_KEY_OR_ARGUMENT
		]);
		tsLanguage.contains = tsLanguage.contains.concat([
			DECORATOR,
			NAMESPACE,
			INTERFACE,
			OPTIONAL_KEY_OR_ARGUMENT
		]);
		swapMode(tsLanguage, "shebang", hljs.SHEBANG());
		swapMode(tsLanguage, "use_strict", USE_STRICT);
		const functionDeclaration = tsLanguage.contains.find((m) => m.label === "func.def");
		functionDeclaration.relevance = 0;
		Object.assign(tsLanguage, {
			name: "TypeScript",
			aliases: [
				"ts",
				"tsx",
				"mts",
				"cts"
			]
		});
		return tsLanguage;
	}
	var EXTENDED_NUMBER_MODE = {
		scope: "number",
		match: "([-+]?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)|NaN|[-+]?Infinity",
		relevance: 0
	};
	function json(hljs) {
		const ATTRIBUTE = {
			className: "attr",
			begin: /(("(\\.|[^\\"\r\n])*")|('(\\.|[^\\'\r\n])*'))(?=\s*:)/,
			relevance: 1.01
		};
		const PUNCTUATION = {
			match: /[{}[\],:]/,
			className: "punctuation",
			relevance: 0
		};
		const LITERALS = [
			"true",
			"false",
			"null"
		];
		const LITERALS_MODE = {
			scope: "literal",
			beginKeywords: LITERALS.join(" ")
		};
		return {
			name: "JSON",
			aliases: ["jsonc", "json5"],
			keywords: { literal: LITERALS },
			contains: [
				ATTRIBUTE,
				PUNCTUATION,
				hljs.APOS_STRING_MODE,
				hljs.QUOTE_STRING_MODE,
				LITERALS_MODE,
				EXTENDED_NUMBER_MODE,
				hljs.C_LINE_COMMENT_MODE,
				hljs.C_BLOCK_COMMENT_MODE
			],
			illegal: "\\S"
		};
	}
	function bash(hljs) {
		const regex = hljs.regex;
		const VAR = {};
		const BRACED_VAR = {
			begin: /\$\{/,
			end: /\}/,
			contains: ["self", {
				begin: /:-/,
				contains: [VAR]
			}]
		};
		Object.assign(VAR, {
			className: "variable",
			variants: [{ begin: regex.concat(/\$[\w\d#@][\w\d_]*/, `(?![\\w\\d])(?![$])`) }, BRACED_VAR]
		});
		const SUBST = {
			className: "subst",
			begin: /\$\(/,
			end: /\)/,
			contains: [hljs.BACKSLASH_ESCAPE]
		};
		const COMMENT = hljs.inherit(hljs.COMMENT(), {
			match: [/(^|\s)/, /#.*$/],
			scope: { 2: "comment" }
		});
		const HERE_DOC = {
			begin: /<<-?\s*(?=\w+)/,
			starts: { contains: [hljs.END_SAME_AS_BEGIN({
				begin: /(\w+)/,
				end: /(\w+)/,
				className: "string"
			})] }
		};
		const QUOTE_STRING = {
			className: "string",
			begin: /"/,
			end: /"/,
			contains: [
				hljs.BACKSLASH_ESCAPE,
				VAR,
				SUBST
			]
		};
		SUBST.contains.push(QUOTE_STRING);
		const ESCAPED_QUOTE = { match: /\\"/ };
		const APOS_STRING = {
			className: "string",
			begin: /'/,
			end: /'/
		};
		const ESCAPED_APOS = { match: /\\'/ };
		const ARITHMETIC = {
			begin: /\$?\(\(/,
			end: /\)\)/,
			contains: [
				{
					begin: /\d+#[0-9a-f]+/,
					className: "number"
				},
				hljs.NUMBER_MODE,
				VAR
			]
		};
		const KNOWN_SHEBANG = hljs.SHEBANG({
			binary: `(${[
				"fish",
				"bash",
				"zsh",
				"sh",
				"csh",
				"ksh",
				"tcsh",
				"dash",
				"scsh"
			].join("|")})`,
			relevance: 10
		});
		const FUNCTION = {
			className: "function",
			begin: /\w[\w\d_]*\s*\(\s*\)\s*\{/,
			returnBegin: true,
			contains: [hljs.inherit(hljs.TITLE_MODE, { begin: /\w[\w\d_]*/ })],
			relevance: 0
		};
		const KEYWORDS = [
			"if",
			"then",
			"else",
			"elif",
			"fi",
			"time",
			"for",
			"while",
			"until",
			"in",
			"do",
			"done",
			"case",
			"esac",
			"coproc",
			"function",
			"select"
		];
		const LITERALS = ["true", "false"];
		const PATH_MODE = { match: /(\/[a-z._-]+)+/ };
		const SHELL_BUILT_INS = [
			"break",
			"cd",
			"continue",
			"eval",
			"exec",
			"exit",
			"export",
			"getopts",
			"hash",
			"pwd",
			"readonly",
			"return",
			"shift",
			"test",
			"times",
			"trap",
			"umask",
			"unset"
		];
		const BASH_BUILT_INS = [
			"alias",
			"bind",
			"builtin",
			"caller",
			"command",
			"declare",
			"echo",
			"enable",
			"help",
			"let",
			"local",
			"logout",
			"mapfile",
			"printf",
			"read",
			"readarray",
			"source",
			"sudo",
			"type",
			"typeset",
			"ulimit",
			"unalias"
		];
		const ZSH_BUILT_INS = [
			"autoload",
			"bg",
			"bindkey",
			"bye",
			"cap",
			"chdir",
			"clone",
			"comparguments",
			"compcall",
			"compctl",
			"compdescribe",
			"compfiles",
			"compgroups",
			"compquote",
			"comptags",
			"comptry",
			"compvalues",
			"dirs",
			"disable",
			"disown",
			"echotc",
			"echoti",
			"emulate",
			"fc",
			"fg",
			"float",
			"functions",
			"getcap",
			"getln",
			"history",
			"integer",
			"jobs",
			"kill",
			"limit",
			"log",
			"noglob",
			"popd",
			"print",
			"pushd",
			"pushln",
			"rehash",
			"sched",
			"setcap",
			"setopt",
			"stat",
			"suspend",
			"ttyctl",
			"unfunction",
			"unhash",
			"unlimit",
			"unsetopt",
			"vared",
			"wait",
			"whence",
			"where",
			"which",
			"zcompile",
			"zformat",
			"zftp",
			"zle",
			"zmodload",
			"zparseopts",
			"zprof",
			"zpty",
			"zregexparse",
			"zsocket",
			"zstyle",
			"ztcp"
		];
		const GNU_CORE_UTILS = [
			"chcon",
			"chgrp",
			"chown",
			"chmod",
			"cp",
			"dd",
			"df",
			"dir",
			"dircolors",
			"ln",
			"ls",
			"mkdir",
			"mkfifo",
			"mknod",
			"mktemp",
			"mv",
			"realpath",
			"rm",
			"rmdir",
			"shred",
			"sync",
			"touch",
			"truncate",
			"vdir",
			"b2sum",
			"base32",
			"base64",
			"cat",
			"cksum",
			"comm",
			"csplit",
			"cut",
			"expand",
			"fmt",
			"fold",
			"head",
			"join",
			"md5sum",
			"nl",
			"numfmt",
			"od",
			"paste",
			"ptx",
			"pr",
			"sha1sum",
			"sha224sum",
			"sha256sum",
			"sha384sum",
			"sha512sum",
			"shuf",
			"sort",
			"split",
			"sum",
			"tac",
			"tail",
			"tr",
			"tsort",
			"unexpand",
			"uniq",
			"wc",
			"arch",
			"basename",
			"chroot",
			"date",
			"dirname",
			"du",
			"echo",
			"env",
			"expr",
			"factor",
			"groups",
			"hostid",
			"id",
			"link",
			"logname",
			"nice",
			"nohup",
			"nproc",
			"pathchk",
			"pinky",
			"printenv",
			"printf",
			"pwd",
			"readlink",
			"runcon",
			"seq",
			"sleep",
			"stat",
			"stdbuf",
			"stty",
			"tee",
			"test",
			"timeout",
			"tty",
			"uname",
			"unlink",
			"uptime",
			"users",
			"who",
			"whoami",
			"yes"
		];
		return {
			name: "Bash",
			aliases: ["sh", "zsh"],
			keywords: {
				$pattern: /\b[a-z][a-z0-9._-]+\b/,
				keyword: KEYWORDS,
				literal: LITERALS,
				built_in: [
					...SHELL_BUILT_INS,
					...BASH_BUILT_INS,
					"set",
					"shopt",
					...ZSH_BUILT_INS,
					...GNU_CORE_UTILS
				]
			},
			contains: [
				KNOWN_SHEBANG,
				hljs.SHEBANG(),
				FUNCTION,
				ARITHMETIC,
				COMMENT,
				HERE_DOC,
				PATH_MODE,
				QUOTE_STRING,
				ESCAPED_QUOTE,
				APOS_STRING,
				ESCAPED_APOS,
				VAR
			]
		};
	}
	function python(hljs) {
		const regex = hljs.regex;
		const IDENT_RE = /[\p{XID_Start}_]\p{XID_Continue}*/u;
		const RESERVED_WORDS = [
			"and",
			"as",
			"assert",
			"async",
			"await",
			"break",
			"case",
			"class",
			"continue",
			"def",
			"del",
			"elif",
			"else",
			"except",
			"finally",
			"for",
			"from",
			"global",
			"if",
			"import",
			"in",
			"is",
			"lambda",
			"lazy",
			"match",
			"nonlocal|10",
			"not",
			"or",
			"pass",
			"raise",
			"return",
			"try",
			"while",
			"with",
			"yield"
		];
		const KEYWORDS = {
			$pattern: /[A-Za-z]\w+|__\w+__/,
			keyword: RESERVED_WORDS,
			built_in: [
				"__import__",
				"abs",
				"aiter",
				"all",
				"anext",
				"any",
				"ascii",
				"bin",
				"bool",
				"breakpoint",
				"bytearray",
				"bytes",
				"callable",
				"chr",
				"classmethod",
				"compile",
				"complex",
				"delattr",
				"dict",
				"dir",
				"divmod",
				"enumerate",
				"eval",
				"exec",
				"filter",
				"float",
				"format",
				"frozendict",
				"frozenset",
				"getattr",
				"globals",
				"hasattr",
				"hash",
				"help",
				"hex",
				"id",
				"input",
				"int",
				"isinstance",
				"issubclass",
				"iter",
				"len",
				"list",
				"locals",
				"map",
				"max",
				"memoryview",
				"min",
				"next",
				"object",
				"oct",
				"open",
				"ord",
				"pow",
				"print",
				"property",
				"range",
				"repr",
				"reversed",
				"round",
				"sentinel",
				"set",
				"setattr",
				"slice",
				"sorted",
				"staticmethod",
				"str",
				"sum",
				"super",
				"tuple",
				"type",
				"vars",
				"zip"
			],
			literal: [
				"__debug__",
				"Ellipsis",
				"False",
				"None",
				"NotImplemented",
				"True"
			],
			type: [
				"Any",
				"Callable",
				"Coroutine",
				"Dict",
				"List",
				"Literal",
				"Generic",
				"Optional",
				"Sequence",
				"Set",
				"Tuple",
				"Type",
				"Union"
			]
		};
		const PROMPT = {
			className: "meta",
			begin: /^(>>>|\.\.\.) /
		};
		const SUBST = {
			className: "subst",
			begin: /\{/,
			end: /\}/,
			keywords: KEYWORDS,
			illegal: /#/
		};
		const LITERAL_BRACKET = {
			begin: /\{\{/,
			relevance: 0
		};
		const STRING = {
			className: "string",
			contains: [hljs.BACKSLASH_ESCAPE],
			variants: [
				{
					begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,
					end: /'''/,
					contains: [hljs.BACKSLASH_ESCAPE, PROMPT],
					relevance: 10
				},
				{
					begin: /([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,
					end: /"""/,
					contains: [hljs.BACKSLASH_ESCAPE, PROMPT],
					relevance: 10
				},
				{
					begin: /([fFtT][rR]|[rR][fFtT]|[fFtT])'''/,
					end: /'''/,
					contains: [
						hljs.BACKSLASH_ESCAPE,
						PROMPT,
						LITERAL_BRACKET,
						SUBST
					]
				},
				{
					begin: /([fFtT][rR]|[rR][fFtT]|[fFtT])"""/,
					end: /"""/,
					contains: [
						hljs.BACKSLASH_ESCAPE,
						PROMPT,
						LITERAL_BRACKET,
						SUBST
					]
				},
				{
					begin: /([uU]|[rR])'/,
					end: /'/,
					relevance: 10
				},
				{
					begin: /([uU]|[rR])"/,
					end: /"/,
					relevance: 10
				},
				{
					begin: /([bB]|[bB][rR]|[rR][bB])'/,
					end: /'/
				},
				{
					begin: /([bB]|[bB][rR]|[rR][bB])"/,
					end: /"/
				},
				{
					begin: /([fFtT][rR]|[rR][fFtT]|[fFtT])'/,
					end: /'/,
					contains: [
						hljs.BACKSLASH_ESCAPE,
						LITERAL_BRACKET,
						SUBST
					]
				},
				{
					begin: /([fFtT][rR]|[rR][fFtT]|[fFtT])"/,
					end: /"/,
					contains: [
						hljs.BACKSLASH_ESCAPE,
						LITERAL_BRACKET,
						SUBST
					]
				},
				hljs.APOS_STRING_MODE,
				hljs.QUOTE_STRING_MODE
			]
		};
		const digitpart = "[0-9](_?[0-9])*";
		const pointfloat = `(\\b(${digitpart}))?\\.(${digitpart})|\\b(${digitpart})\\.`;
		const lookahead = `\\b|${RESERVED_WORDS.join("|")}`;
		const NUMBER = {
			className: "number",
			relevance: 0,
			variants: [
				{ begin: `(\\b(${digitpart})|(${pointfloat}))[eE][+-]?(${digitpart})[jJ]?(?=${lookahead})` },
				{ begin: `(${pointfloat})[jJ]?` },
				{ begin: `\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?(?=${lookahead})` },
				{ begin: `\\b0[bB](_?[01])+[lL]?(?=${lookahead})` },
				{ begin: `\\b0[oO](_?[0-7])+[lL]?(?=${lookahead})` },
				{ begin: `\\b0[xX](_?[0-9a-fA-F])+[lL]?(?=${lookahead})` },
				{ begin: `\\b(${digitpart})[jJ](?=${lookahead})` }
			]
		};
		const COMMENT_TYPE = {
			className: "comment",
			begin: regex.lookahead(/# type:/),
			end: /$/,
			keywords: KEYWORDS,
			contains: [{ begin: /# type:/ }, {
				begin: /#/,
				end: /\b\B/,
				endsWithParent: true
			}]
		};
		const PARAMS = {
			className: "params",
			variants: [{
				className: "",
				begin: /\(\s*\)/,
				skip: true
			}, {
				begin: /\(/,
				end: /\)/,
				excludeBegin: true,
				excludeEnd: true,
				keywords: KEYWORDS,
				contains: [
					"self",
					PROMPT,
					NUMBER,
					STRING,
					hljs.HASH_COMMENT_MODE
				]
			}]
		};
		SUBST.contains = [
			STRING,
			NUMBER,
			PROMPT
		];
		return {
			name: "Python",
			aliases: [
				"py",
				"gyp",
				"ipython"
			],
			unicodeRegex: true,
			keywords: KEYWORDS,
			illegal: /(<\/|\?)|=>/,
			contains: [
				PROMPT,
				NUMBER,
				{
					scope: "variable.language",
					match: /\bself\b/
				},
				{
					beginKeywords: "if",
					relevance: 0
				},
				{
					match: /\bor\b/,
					scope: "keyword"
				},
				STRING,
				COMMENT_TYPE,
				hljs.HASH_COMMENT_MODE,
				{
					match: [
						/\bdef/,
						/\s+/,
						IDENT_RE
					],
					scope: {
						1: "keyword",
						3: "title.function"
					},
					contains: [PARAMS]
				},
				{
					variants: [{ match: [
						/\bclass/,
						/\s+/,
						IDENT_RE,
						/\s*/,
						/\(\s*/,
						IDENT_RE,
						/\s*\)/
					] }, { match: [
						/\bclass/,
						/\s+/,
						IDENT_RE
					] }],
					scope: {
						1: "keyword",
						3: "title.class",
						6: "title.class.inherited"
					}
				},
				{
					className: "meta",
					begin: /^[\t ]*@/,
					end: /(?=#)|$/,
					contains: [
						NUMBER,
						PARAMS,
						STRING
					]
				}
			]
		};
	}
	var MODES = (hljs) => {
		return {
			IMPORTANT: {
				scope: "meta",
				begin: "!important"
			},
			BLOCK_COMMENT: hljs.C_BLOCK_COMMENT_MODE,
			HEXCOLOR: {
				scope: "number",
				begin: /#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/
			},
			UNICODE_RANGE: {
				scope: "number",
				begin: /\b[Uu]\+[0-9A-Fa-f][0-9A-Fa-f?]{0,5}(-[0-9A-Fa-f][0-9A-Fa-f]{0,5})?/
			},
			FUNCTION_DISPATCH: {
				className: "built_in",
				begin: /[\w-]+(?=\()/
			},
			ATTRIBUTE_SELECTOR_MODE: {
				scope: "selector-attr",
				begin: /\[/,
				end: /\]/,
				illegal: "$",
				contains: [hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE]
			},
			CSS_NUMBER_MODE: {
				scope: "number",
				begin: hljs.NUMBER_RE + "(%|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc|px|deg|grad|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?",
				relevance: 0
			},
			CSS_VARIABLE: {
				className: "attr",
				begin: /--[A-Za-z_][A-Za-z0-9_-]*/
			}
		};
	};
	var HTML_TAGS = [
		"a",
		"abbr",
		"address",
		"article",
		"aside",
		"audio",
		"b",
		"blockquote",
		"body",
		"button",
		"canvas",
		"caption",
		"cite",
		"code",
		"dd",
		"del",
		"details",
		"dfn",
		"div",
		"dl",
		"dt",
		"em",
		"fieldset",
		"figcaption",
		"figure",
		"footer",
		"form",
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
		"header",
		"hgroup",
		"html",
		"i",
		"iframe",
		"img",
		"input",
		"ins",
		"kbd",
		"label",
		"legend",
		"li",
		"main",
		"mark",
		"menu",
		"nav",
		"object",
		"ol",
		"optgroup",
		"option",
		"p",
		"picture",
		"q",
		"quote",
		"samp",
		"section",
		"select",
		"source",
		"span",
		"strong",
		"summary",
		"sup",
		"table",
		"tbody",
		"td",
		"textarea",
		"tfoot",
		"th",
		"thead",
		"time",
		"tr",
		"ul",
		"var",
		"video"
	];
	var SVG_TAGS = [
		"defs",
		"g",
		"marker",
		"mask",
		"pattern",
		"svg",
		"switch",
		"symbol",
		"feBlend",
		"feColorMatrix",
		"feComponentTransfer",
		"feComposite",
		"feConvolveMatrix",
		"feDiffuseLighting",
		"feDisplacementMap",
		"feFlood",
		"feGaussianBlur",
		"feImage",
		"feMerge",
		"feMorphology",
		"feOffset",
		"feSpecularLighting",
		"feTile",
		"feTurbulence",
		"linearGradient",
		"radialGradient",
		"stop",
		"circle",
		"ellipse",
		"image",
		"line",
		"path",
		"polygon",
		"polyline",
		"rect",
		"text",
		"use",
		"textPath",
		"tspan",
		"foreignObject",
		"clipPath"
	];
	var TAGS = [...HTML_TAGS, ...SVG_TAGS];
	var MEDIA_FEATURES = [
		"any-hover",
		"any-pointer",
		"aspect-ratio",
		"color",
		"color-gamut",
		"color-index",
		"device-aspect-ratio",
		"device-height",
		"device-width",
		"display-mode",
		"forced-colors",
		"grid",
		"height",
		"hover",
		"inverted-colors",
		"monochrome",
		"orientation",
		"overflow-block",
		"overflow-inline",
		"pointer",
		"prefers-color-scheme",
		"prefers-contrast",
		"prefers-reduced-motion",
		"prefers-reduced-transparency",
		"resolution",
		"scan",
		"scripting",
		"update",
		"width",
		"min-width",
		"max-width",
		"min-height",
		"max-height"
	].sort().reverse();
	var PSEUDO_CLASSES = [
		"active",
		"any-link",
		"blank",
		"checked",
		"current",
		"default",
		"defined",
		"dir",
		"disabled",
		"drop",
		"empty",
		"enabled",
		"first",
		"first-child",
		"first-of-type",
		"fullscreen",
		"future",
		"focus",
		"focus-visible",
		"focus-within",
		"has",
		"host",
		"host-context",
		"hover",
		"indeterminate",
		"in-range",
		"invalid",
		"is",
		"lang",
		"last-child",
		"last-of-type",
		"left",
		"link",
		"local-link",
		"not",
		"nth-child",
		"nth-col",
		"nth-last-child",
		"nth-last-col",
		"nth-last-of-type",
		"nth-of-type",
		"only-child",
		"only-of-type",
		"optional",
		"out-of-range",
		"past",
		"placeholder-shown",
		"read-only",
		"read-write",
		"required",
		"right",
		"root",
		"scope",
		"target",
		"target-within",
		"user-invalid",
		"valid",
		"visited",
		"where"
	].sort().reverse();
	var PSEUDO_ELEMENTS = [
		"after",
		"backdrop",
		"before",
		"cue",
		"cue-region",
		"first-letter",
		"first-line",
		"grammar-error",
		"marker",
		"part",
		"placeholder",
		"selection",
		"slotted",
		"spelling-error"
	].sort().reverse();
	var ATTRIBUTES = [
		"accent-color",
		"align-content",
		"align-items",
		"align-self",
		"alignment-baseline",
		"all",
		"anchor-name",
		"animation",
		"animation-composition",
		"animation-delay",
		"animation-direction",
		"animation-duration",
		"animation-fill-mode",
		"animation-iteration-count",
		"animation-name",
		"animation-play-state",
		"animation-range",
		"animation-range-end",
		"animation-range-start",
		"animation-timeline",
		"animation-timing-function",
		"appearance",
		"aspect-ratio",
		"backdrop-filter",
		"backface-visibility",
		"background",
		"background-attachment",
		"background-blend-mode",
		"background-clip",
		"background-color",
		"background-image",
		"background-origin",
		"background-position",
		"background-position-x",
		"background-position-y",
		"background-repeat",
		"background-size",
		"baseline-shift",
		"block-size",
		"border",
		"border-block",
		"border-block-color",
		"border-block-end",
		"border-block-end-color",
		"border-block-end-style",
		"border-block-end-width",
		"border-block-start",
		"border-block-start-color",
		"border-block-start-style",
		"border-block-start-width",
		"border-block-style",
		"border-block-width",
		"border-bottom",
		"border-bottom-color",
		"border-bottom-left-radius",
		"border-bottom-right-radius",
		"border-bottom-style",
		"border-bottom-width",
		"border-collapse",
		"border-color",
		"border-end-end-radius",
		"border-end-start-radius",
		"border-image",
		"border-image-outset",
		"border-image-repeat",
		"border-image-slice",
		"border-image-source",
		"border-image-width",
		"border-inline",
		"border-inline-color",
		"border-inline-end",
		"border-inline-end-color",
		"border-inline-end-style",
		"border-inline-end-width",
		"border-inline-start",
		"border-inline-start-color",
		"border-inline-start-style",
		"border-inline-start-width",
		"border-inline-style",
		"border-inline-width",
		"border-left",
		"border-left-color",
		"border-left-style",
		"border-left-width",
		"border-radius",
		"border-right",
		"border-right-color",
		"border-right-style",
		"border-right-width",
		"border-spacing",
		"border-start-end-radius",
		"border-start-start-radius",
		"border-style",
		"border-top",
		"border-top-color",
		"border-top-left-radius",
		"border-top-right-radius",
		"border-top-style",
		"border-top-width",
		"border-width",
		"bottom",
		"box-align",
		"box-decoration-break",
		"box-direction",
		"box-flex",
		"box-flex-group",
		"box-lines",
		"box-ordinal-group",
		"box-orient",
		"box-pack",
		"box-shadow",
		"box-sizing",
		"break-after",
		"break-before",
		"break-inside",
		"caption-side",
		"caret-color",
		"clear",
		"clip",
		"clip-path",
		"clip-rule",
		"color",
		"color-interpolation",
		"color-interpolation-filters",
		"color-profile",
		"color-rendering",
		"color-scheme",
		"column-count",
		"column-fill",
		"column-gap",
		"column-rule",
		"column-rule-color",
		"column-rule-style",
		"column-rule-width",
		"column-span",
		"column-width",
		"columns",
		"contain",
		"contain-intrinsic-block-size",
		"contain-intrinsic-height",
		"contain-intrinsic-inline-size",
		"contain-intrinsic-size",
		"contain-intrinsic-width",
		"container",
		"container-name",
		"container-type",
		"content",
		"content-visibility",
		"corner-bottom-left-shape",
		"corner-bottom-right-shape",
		"corner-shape",
		"corner-top-left-shape",
		"corner-top-right-shape",
		"counter-increment",
		"counter-reset",
		"counter-set",
		"cue",
		"cue-after",
		"cue-before",
		"cursor",
		"cx",
		"cy",
		"direction",
		"display",
		"dominant-baseline",
		"empty-cells",
		"enable-background",
		"field-sizing",
		"fill",
		"fill-opacity",
		"fill-rule",
		"filter",
		"flex",
		"flex-basis",
		"flex-direction",
		"flex-flow",
		"flex-grow",
		"flex-shrink",
		"flex-wrap",
		"float",
		"flood-color",
		"flood-opacity",
		"flow",
		"font",
		"font-display",
		"font-family",
		"font-feature-settings",
		"font-kerning",
		"font-language-override",
		"font-optical-sizing",
		"font-palette",
		"font-size",
		"font-size-adjust",
		"font-smooth",
		"font-smoothing",
		"font-stretch",
		"font-style",
		"font-synthesis",
		"font-synthesis-position",
		"font-synthesis-small-caps",
		"font-synthesis-style",
		"font-synthesis-weight",
		"font-variant",
		"font-variant-alternates",
		"font-variant-caps",
		"font-variant-east-asian",
		"font-variant-emoji",
		"font-variant-ligatures",
		"font-variant-numeric",
		"font-variant-position",
		"font-variation-settings",
		"font-weight",
		"forced-color-adjust",
		"gap",
		"glyph-orientation-horizontal",
		"glyph-orientation-vertical",
		"grid",
		"grid-area",
		"grid-auto-columns",
		"grid-auto-flow",
		"grid-auto-rows",
		"grid-column",
		"grid-column-end",
		"grid-column-start",
		"grid-gap",
		"grid-row",
		"grid-row-end",
		"grid-row-start",
		"grid-template",
		"grid-template-areas",
		"grid-template-columns",
		"grid-template-rows",
		"hanging-punctuation",
		"height",
		"hyphenate-character",
		"hyphenate-limit-chars",
		"hyphens",
		"icon",
		"image-orientation",
		"image-rendering",
		"image-resolution",
		"ime-mode",
		"initial-letter",
		"initial-letter-align",
		"inline-size",
		"inset",
		"inset-area",
		"inset-block",
		"inset-block-end",
		"inset-block-start",
		"inset-inline",
		"inset-inline-end",
		"inset-inline-start",
		"isolation",
		"justify-content",
		"justify-items",
		"justify-self",
		"kerning",
		"left",
		"letter-spacing",
		"lighting-color",
		"line-break",
		"line-height",
		"line-height-step",
		"list-style",
		"list-style-image",
		"list-style-position",
		"list-style-type",
		"margin",
		"margin-block",
		"margin-block-end",
		"margin-block-start",
		"margin-bottom",
		"margin-inline",
		"margin-inline-end",
		"margin-inline-start",
		"margin-left",
		"margin-right",
		"margin-top",
		"margin-trim",
		"marker",
		"marker-end",
		"marker-mid",
		"marker-start",
		"marks",
		"mask",
		"mask-border",
		"mask-border-mode",
		"mask-border-outset",
		"mask-border-repeat",
		"mask-border-slice",
		"mask-border-source",
		"mask-border-width",
		"mask-clip",
		"mask-composite",
		"mask-image",
		"mask-mode",
		"mask-origin",
		"mask-position",
		"mask-repeat",
		"mask-size",
		"mask-type",
		"masonry-auto-flow",
		"math-depth",
		"math-shift",
		"math-style",
		"max-block-size",
		"max-height",
		"max-inline-size",
		"max-width",
		"min-block-size",
		"min-height",
		"min-inline-size",
		"min-width",
		"mix-blend-mode",
		"nav-down",
		"nav-index",
		"nav-left",
		"nav-right",
		"nav-up",
		"none",
		"normal",
		"object-fit",
		"object-position",
		"offset",
		"offset-anchor",
		"offset-distance",
		"offset-path",
		"offset-position",
		"offset-rotate",
		"opacity",
		"order",
		"orphans",
		"outline",
		"outline-color",
		"outline-offset",
		"outline-style",
		"outline-width",
		"overflow",
		"overflow-anchor",
		"overflow-block",
		"overflow-clip-margin",
		"overflow-inline",
		"overflow-wrap",
		"overflow-x",
		"overflow-y",
		"overlay",
		"overscroll-behavior",
		"overscroll-behavior-block",
		"overscroll-behavior-inline",
		"overscroll-behavior-x",
		"overscroll-behavior-y",
		"padding",
		"padding-block",
		"padding-block-end",
		"padding-block-start",
		"padding-bottom",
		"padding-inline",
		"padding-inline-end",
		"padding-inline-start",
		"padding-left",
		"padding-right",
		"padding-top",
		"page",
		"page-break-after",
		"page-break-before",
		"page-break-inside",
		"paint-order",
		"pause",
		"pause-after",
		"pause-before",
		"perspective",
		"perspective-origin",
		"place-content",
		"place-items",
		"place-self",
		"pointer-events",
		"position",
		"position-anchor",
		"position-visibility",
		"print-color-adjust",
		"quotes",
		"r",
		"resize",
		"rest",
		"rest-after",
		"rest-before",
		"right",
		"rotate",
		"row-gap",
		"ruby-align",
		"ruby-position",
		"scale",
		"scroll-behavior",
		"scroll-margin",
		"scroll-margin-block",
		"scroll-margin-block-end",
		"scroll-margin-block-start",
		"scroll-margin-bottom",
		"scroll-margin-inline",
		"scroll-margin-inline-end",
		"scroll-margin-inline-start",
		"scroll-margin-left",
		"scroll-margin-right",
		"scroll-margin-top",
		"scroll-padding",
		"scroll-padding-block",
		"scroll-padding-block-end",
		"scroll-padding-block-start",
		"scroll-padding-bottom",
		"scroll-padding-inline",
		"scroll-padding-inline-end",
		"scroll-padding-inline-start",
		"scroll-padding-left",
		"scroll-padding-right",
		"scroll-padding-top",
		"scroll-snap-align",
		"scroll-snap-stop",
		"scroll-snap-type",
		"scroll-timeline",
		"scroll-timeline-axis",
		"scroll-timeline-name",
		"scrollbar-color",
		"scrollbar-gutter",
		"scrollbar-width",
		"shape-image-threshold",
		"shape-margin",
		"shape-outside",
		"shape-rendering",
		"speak",
		"speak-as",
		"src",
		"stop-color",
		"stop-opacity",
		"stroke",
		"stroke-dasharray",
		"stroke-dashoffset",
		"stroke-linecap",
		"stroke-linejoin",
		"stroke-miterlimit",
		"stroke-opacity",
		"stroke-width",
		"tab-size",
		"table-layout",
		"text-align",
		"text-align-all",
		"text-align-last",
		"text-anchor",
		"text-combine-upright",
		"text-decoration",
		"text-decoration-color",
		"text-decoration-line",
		"text-decoration-skip",
		"text-decoration-skip-ink",
		"text-decoration-style",
		"text-decoration-thickness",
		"text-emphasis",
		"text-emphasis-color",
		"text-emphasis-position",
		"text-emphasis-style",
		"text-indent",
		"text-justify",
		"text-orientation",
		"text-overflow",
		"text-rendering",
		"text-shadow",
		"text-size-adjust",
		"text-transform",
		"text-underline-offset",
		"text-underline-position",
		"text-wrap",
		"text-wrap-mode",
		"text-wrap-style",
		"timeline-scope",
		"top",
		"touch-action",
		"transform",
		"transform-box",
		"transform-origin",
		"transform-style",
		"transition",
		"transition-behavior",
		"transition-delay",
		"transition-duration",
		"transition-property",
		"transition-timing-function",
		"translate",
		"unicode-bidi",
		"unicode-range",
		"user-modify",
		"user-select",
		"vector-effect",
		"vertical-align",
		"view-timeline",
		"view-timeline-axis",
		"view-timeline-inset",
		"view-timeline-name",
		"view-transition-name",
		"visibility",
		"voice-balance",
		"voice-duration",
		"voice-family",
		"voice-pitch",
		"voice-range",
		"voice-rate",
		"voice-stress",
		"voice-volume",
		"white-space",
		"white-space-collapse",
		"widows",
		"width",
		"will-change",
		"word-break",
		"word-spacing",
		"word-wrap",
		"writing-mode",
		"x",
		"y",
		"z-index",
		"zoom"
	].sort().reverse();
	function css(hljs) {
		const regex = hljs.regex;
		const modes = MODES(hljs);
		const VENDOR_PREFIX = { begin: /-(webkit|moz|ms|o)-(?=[a-z])/ };
		const AT_MODIFIERS = "and or not only";
		const AT_PROPERTY_RE = /@-?\w[\w]*(-\w+)*/;
		const STRINGS = [hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE];
		return {
			name: "CSS",
			case_insensitive: true,
			illegal: /[=|'\$]/,
			keywords: { keyframePosition: "from to" },
			classNameAliases: { keyframePosition: "selector-tag" },
			contains: [
				modes.BLOCK_COMMENT,
				VENDOR_PREFIX,
				modes.CSS_NUMBER_MODE,
				{
					className: "selector-id",
					begin: /#[A-Za-z0-9_-]+/,
					relevance: 0
				},
				{
					className: "selector-class",
					begin: "\\.[a-zA-Z-][a-zA-Z0-9_-]*",
					relevance: 0
				},
				modes.ATTRIBUTE_SELECTOR_MODE,
				{
					className: "selector-pseudo",
					variants: [{ begin: ":(" + PSEUDO_CLASSES.join("|") + ")" }, { begin: ":(:)?(" + PSEUDO_ELEMENTS.join("|") + ")" }]
				},
				modes.CSS_VARIABLE,
				{
					className: "attribute",
					begin: "\\b(" + ATTRIBUTES.join("|") + ")\\b"
				},
				{
					begin: /:/,
					end: /[;}{]/,
					contains: [
						modes.BLOCK_COMMENT,
						modes.HEXCOLOR,
						modes.IMPORTANT,
						modes.CSS_NUMBER_MODE,
						modes.UNICODE_RANGE,
						...STRINGS,
						{
							begin: /(url|data-uri)\(/,
							end: /\)/,
							relevance: 0,
							keywords: { built_in: "url data-uri" },
							contains: [...STRINGS, {
								className: "string",
								begin: /[^)]/,
								endsWithParent: true,
								excludeEnd: true
							}]
						},
						modes.FUNCTION_DISPATCH
					]
				},
				{
					begin: regex.lookahead(/@/),
					end: "[{;]",
					relevance: 0,
					illegal: /:/,
					contains: [{
						className: "keyword",
						begin: AT_PROPERTY_RE
					}, {
						begin: /\s/,
						endsWithParent: true,
						excludeEnd: true,
						relevance: 0,
						keywords: {
							$pattern: /[a-z-]+/,
							keyword: AT_MODIFIERS,
							attribute: MEDIA_FEATURES.join(" ")
						},
						contains: [
							{
								begin: /[a-z-]+(?=:)/,
								className: "attribute"
							},
							...STRINGS,
							modes.CSS_NUMBER_MODE
						]
					}]
				},
				{
					className: "selector-tag",
					begin: "\\b(" + TAGS.join("|") + ")\\b"
				}
			]
		};
	}
	function xml(hljs) {
		const regex = hljs.regex;
		const TAG_NAME_RE = regex.concat(/[\p{L}_]/u, regex.optional(/[\p{L}0-9_.-]*:/u), /[\p{L}0-9_.-]*/u);
		const XML_IDENT_RE = /[\p{L}0-9._:-]+/u;
		const XML_ENTITIES = {
			className: "symbol",
			begin: /&[a-z]+;|&#[0-9]+;|&#x[a-f0-9]+;/
		};
		const XML_META_KEYWORDS = {
			begin: /\s/,
			contains: [{
				className: "keyword",
				begin: /#?[a-z_][a-z1-9_-]+/,
				illegal: /\n/
			}]
		};
		const XML_META_PAR_KEYWORDS = hljs.inherit(XML_META_KEYWORDS, {
			begin: /\(/,
			end: /\)/
		});
		const APOS_META_STRING_MODE = hljs.inherit(hljs.APOS_STRING_MODE, { className: "string" });
		const QUOTE_META_STRING_MODE = hljs.inherit(hljs.QUOTE_STRING_MODE, { className: "string" });
		const TAG_INTERNALS = {
			endsWithParent: true,
			illegal: /</,
			relevance: 0,
			contains: [{
				className: "attr",
				begin: XML_IDENT_RE,
				relevance: 0
			}, {
				begin: /=\s*/,
				relevance: 0,
				contains: [{
					className: "string",
					endsParent: true,
					variants: [
						{
							begin: /"/,
							end: /"/,
							contains: [XML_ENTITIES]
						},
						{
							begin: /'/,
							end: /'/,
							contains: [XML_ENTITIES]
						},
						{ begin: /[^\s"'=<>`]+/ }
					]
				}]
			}]
		};
		return {
			name: "HTML, XML",
			aliases: [
				"html",
				"xhtml",
				"rss",
				"atom",
				"xjb",
				"xsd",
				"xsl",
				"plist",
				"wsf",
				"svg"
			],
			case_insensitive: true,
			unicodeRegex: true,
			contains: [
				{
					className: "meta",
					begin: /<![a-z]/,
					end: />/,
					relevance: 10,
					contains: [
						XML_META_KEYWORDS,
						QUOTE_META_STRING_MODE,
						APOS_META_STRING_MODE,
						XML_META_PAR_KEYWORDS,
						{
							begin: /\[/,
							end: /\]/,
							contains: [{
								className: "meta",
								begin: /<![a-z]/,
								end: />/,
								contains: [
									XML_META_KEYWORDS,
									XML_META_PAR_KEYWORDS,
									QUOTE_META_STRING_MODE,
									APOS_META_STRING_MODE
								]
							}]
						}
					]
				},
				hljs.COMMENT(/<!--/, /-->/, { relevance: 10 }),
				{
					begin: /<!\[CDATA\[/,
					end: /\]\]>/,
					relevance: 10
				},
				XML_ENTITIES,
				{
					className: "meta",
					end: /\?>/,
					variants: [{
						begin: /<\?xml/,
						relevance: 10,
						contains: [QUOTE_META_STRING_MODE]
					}, { begin: /<\?[a-z][a-z0-9]+/ }]
				},
				{
					className: "tag",
					begin: /<style(?=\s|>)/,
					end: />/,
					keywords: { name: "style" },
					contains: [TAG_INTERNALS],
					starts: {
						end: /<\/style>/,
						returnEnd: true,
						subLanguage: "css"
					}
				},
				{
					className: "tag",
					begin: /<script(?=\s|>)/,
					end: />/,
					keywords: { name: "script" },
					contains: [TAG_INTERNALS],
					starts: {
						end: /<\/script>/,
						returnEnd: true,
						subLanguage: "javascript"
					}
				},
				{
					className: "tag",
					begin: /<>|<\/>/
				},
				{
					className: "tag",
					begin: regex.concat(/</, regex.lookahead(regex.concat(TAG_NAME_RE, regex.either(/\/>/, />/, /\s/)))),
					end: /\/?>/,
					contains: [{
						className: "name",
						begin: TAG_NAME_RE,
						relevance: 0,
						starts: TAG_INTERNALS
					}]
				},
				{
					className: "tag",
					begin: regex.concat(/<\//, regex.lookahead(regex.concat(TAG_NAME_RE, />/))),
					contains: [{
						className: "name",
						begin: TAG_NAME_RE,
						relevance: 0
					}, {
						begin: />/,
						relevance: 0,
						endsParent: true
					}]
				}
			]
		};
	}
	function sql(hljs) {
		const regex = hljs.regex;
		const COMMENT_MODE = hljs.COMMENT("--", "$");
		const STRING = {
			scope: "string",
			variants: [{
				begin: /'/,
				end: /'/,
				contains: [{ match: /''/ }]
			}]
		};
		const QUOTED_IDENTIFIER = {
			begin: /"/,
			end: /"/,
			contains: [{ match: /""/ }]
		};
		const LITERALS = [
			"true",
			"false",
			"unknown"
		];
		const MULTI_WORD_TYPES = [
			"double precision",
			"large object",
			"with timezone",
			"without timezone"
		];
		const TYPES = [
			"bigint",
			"binary",
			"blob",
			"boolean",
			"char",
			"character",
			"clob",
			"date",
			"dec",
			"decfloat",
			"decimal",
			"float",
			"int",
			"integer",
			"interval",
			"nchar",
			"nclob",
			"national",
			"numeric",
			"real",
			"row",
			"smallint",
			"time",
			"timestamp",
			"varchar",
			"varying",
			"varbinary"
		];
		const NON_RESERVED_WORDS = [
			"add",
			"asc",
			"collation",
			"desc",
			"final",
			"first",
			"last",
			"view"
		];
		const RESERVED_WORDS = [
			"abs",
			"acos",
			"all",
			"allocate",
			"alter",
			"and",
			"any",
			"are",
			"array",
			"array_agg",
			"array_max_cardinality",
			"as",
			"asensitive",
			"asin",
			"asymmetric",
			"at",
			"atan",
			"atomic",
			"authorization",
			"avg",
			"begin",
			"begin_frame",
			"begin_partition",
			"between",
			"bigint",
			"binary",
			"blob",
			"boolean",
			"both",
			"by",
			"call",
			"called",
			"cardinality",
			"cascaded",
			"case",
			"cast",
			"ceil",
			"ceiling",
			"char",
			"char_length",
			"character",
			"character_length",
			"check",
			"classifier",
			"clob",
			"close",
			"coalesce",
			"collate",
			"collect",
			"column",
			"commit",
			"condition",
			"connect",
			"constraint",
			"contains",
			"convert",
			"copy",
			"corr",
			"corresponding",
			"cos",
			"cosh",
			"count",
			"covar_pop",
			"covar_samp",
			"create",
			"cross",
			"cube",
			"cume_dist",
			"current",
			"current_catalog",
			"current_date",
			"current_default_transform_group",
			"current_path",
			"current_role",
			"current_row",
			"current_schema",
			"current_time",
			"current_timestamp",
			"current_path",
			"current_role",
			"current_transform_group_for_type",
			"current_user",
			"cursor",
			"cycle",
			"date",
			"day",
			"deallocate",
			"dec",
			"decimal",
			"decfloat",
			"declare",
			"default",
			"define",
			"delete",
			"dense_rank",
			"deref",
			"describe",
			"deterministic",
			"disconnect",
			"distinct",
			"double",
			"drop",
			"dynamic",
			"each",
			"element",
			"else",
			"empty",
			"end",
			"end_frame",
			"end_partition",
			"end-exec",
			"equals",
			"escape",
			"every",
			"except",
			"exec",
			"execute",
			"exists",
			"exp",
			"external",
			"extract",
			"false",
			"fetch",
			"filter",
			"first_value",
			"float",
			"floor",
			"for",
			"foreign",
			"frame_row",
			"free",
			"from",
			"full",
			"function",
			"fusion",
			"get",
			"global",
			"grant",
			"group",
			"grouping",
			"groups",
			"having",
			"hold",
			"hour",
			"identity",
			"in",
			"indicator",
			"initial",
			"inner",
			"inout",
			"insensitive",
			"insert",
			"int",
			"integer",
			"intersect",
			"intersection",
			"interval",
			"into",
			"is",
			"join",
			"json_array",
			"json_arrayagg",
			"json_exists",
			"json_object",
			"json_objectagg",
			"json_query",
			"json_table",
			"json_table_primitive",
			"json_value",
			"lag",
			"language",
			"large",
			"last_value",
			"lateral",
			"lead",
			"leading",
			"left",
			"like",
			"like_regex",
			"listagg",
			"ln",
			"local",
			"localtime",
			"localtimestamp",
			"log",
			"log10",
			"lower",
			"match",
			"match_number",
			"match_recognize",
			"matches",
			"max",
			"member",
			"merge",
			"method",
			"min",
			"minute",
			"mod",
			"modifies",
			"module",
			"month",
			"multiset",
			"national",
			"natural",
			"nchar",
			"nclob",
			"new",
			"no",
			"none",
			"normalize",
			"not",
			"nth_value",
			"ntile",
			"null",
			"nullif",
			"numeric",
			"octet_length",
			"occurrences_regex",
			"of",
			"offset",
			"old",
			"omit",
			"on",
			"one",
			"only",
			"open",
			"or",
			"order",
			"out",
			"outer",
			"over",
			"overlaps",
			"overlay",
			"parameter",
			"partition",
			"pattern",
			"per",
			"percent",
			"percent_rank",
			"percentile_cont",
			"percentile_disc",
			"period",
			"portion",
			"position",
			"position_regex",
			"power",
			"precedes",
			"precision",
			"prepare",
			"primary",
			"procedure",
			"ptf",
			"range",
			"rank",
			"reads",
			"real",
			"recursive",
			"ref",
			"references",
			"referencing",
			"regr_avgx",
			"regr_avgy",
			"regr_count",
			"regr_intercept",
			"regr_r2",
			"regr_slope",
			"regr_sxx",
			"regr_sxy",
			"regr_syy",
			"release",
			"result",
			"return",
			"returns",
			"revoke",
			"right",
			"rollback",
			"rollup",
			"row",
			"row_number",
			"rows",
			"running",
			"savepoint",
			"scope",
			"scroll",
			"search",
			"second",
			"seek",
			"select",
			"sensitive",
			"session_user",
			"set",
			"show",
			"similar",
			"sin",
			"sinh",
			"skip",
			"smallint",
			"some",
			"specific",
			"specifictype",
			"sql",
			"sqlexception",
			"sqlstate",
			"sqlwarning",
			"sqrt",
			"start",
			"static",
			"stddev_pop",
			"stddev_samp",
			"submultiset",
			"subset",
			"substring",
			"substring_regex",
			"succeeds",
			"sum",
			"symmetric",
			"system",
			"system_time",
			"system_user",
			"table",
			"tablesample",
			"tan",
			"tanh",
			"then",
			"time",
			"timestamp",
			"timezone_hour",
			"timezone_minute",
			"to",
			"trailing",
			"translate",
			"translate_regex",
			"translation",
			"treat",
			"trigger",
			"trim",
			"trim_array",
			"true",
			"truncate",
			"uescape",
			"union",
			"unique",
			"unknown",
			"unnest",
			"update",
			"upper",
			"user",
			"using",
			"value",
			"values",
			"value_of",
			"var_pop",
			"var_samp",
			"varbinary",
			"varchar",
			"varying",
			"versioning",
			"when",
			"whenever",
			"where",
			"width_bucket",
			"window",
			"with",
			"within",
			"without",
			"year"
		];
		const RESERVED_FUNCTIONS = [
			"abs",
			"acos",
			"array_agg",
			"asin",
			"atan",
			"avg",
			"cast",
			"ceil",
			"ceiling",
			"coalesce",
			"corr",
			"cos",
			"cosh",
			"count",
			"covar_pop",
			"covar_samp",
			"cume_dist",
			"dense_rank",
			"deref",
			"element",
			"exp",
			"extract",
			"first_value",
			"floor",
			"json_array",
			"json_arrayagg",
			"json_exists",
			"json_object",
			"json_objectagg",
			"json_query",
			"json_table",
			"json_table_primitive",
			"json_value",
			"lag",
			"last_value",
			"lead",
			"listagg",
			"ln",
			"log",
			"log10",
			"lower",
			"max",
			"min",
			"mod",
			"nth_value",
			"ntile",
			"nullif",
			"percent_rank",
			"percentile_cont",
			"percentile_disc",
			"position",
			"position_regex",
			"power",
			"rank",
			"regr_avgx",
			"regr_avgy",
			"regr_count",
			"regr_intercept",
			"regr_r2",
			"regr_slope",
			"regr_sxx",
			"regr_sxy",
			"regr_syy",
			"row_number",
			"sin",
			"sinh",
			"sqrt",
			"stddev_pop",
			"stddev_samp",
			"substring",
			"substring_regex",
			"sum",
			"tan",
			"tanh",
			"translate",
			"translate_regex",
			"treat",
			"trim",
			"trim_array",
			"unnest",
			"upper",
			"value_of",
			"var_pop",
			"var_samp",
			"width_bucket"
		];
		const POSSIBLE_WITHOUT_PARENS = [
			"current_catalog",
			"current_date",
			"current_default_transform_group",
			"current_path",
			"current_role",
			"current_schema",
			"current_transform_group_for_type",
			"current_user",
			"session_user",
			"system_time",
			"system_user",
			"current_time",
			"localtime",
			"current_timestamp",
			"localtimestamp"
		];
		const COMBOS = [
			"create table",
			"insert into",
			"primary key",
			"foreign key",
			"not null",
			"alter table",
			"add constraint",
			"grouping sets",
			"on overflow",
			"character set",
			"respect nulls",
			"ignore nulls",
			"nulls first",
			"nulls last",
			"depth first",
			"breadth first"
		];
		const FUNCTIONS = RESERVED_FUNCTIONS;
		const KEYWORDS = [...RESERVED_WORDS, ...NON_RESERVED_WORDS].filter((keyword) => {
			return !RESERVED_FUNCTIONS.includes(keyword);
		});
		const VARIABLE = {
			scope: "variable",
			match: /@[a-z0-9][a-z0-9_]*/
		};
		const OPERATOR = {
			scope: "operator",
			match: /[-+*/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?/,
			relevance: 0
		};
		const FUNCTION_CALL = {
			match: regex.concat(/\b/, regex.either(...FUNCTIONS), /\s*\(/),
			relevance: 0,
			keywords: { built_in: FUNCTIONS }
		};
		function kws_to_regex(list) {
			return regex.concat(/\b/, regex.either(...list.map((kw) => {
				return kw.replace(/\s+/, "\\s+");
			})), /\b/);
		}
		const MULTI_WORD_KEYWORDS = {
			scope: "keyword",
			match: kws_to_regex(COMBOS),
			relevance: 0
		};
		function reduceRelevancy(list, { exceptions, when } = {}) {
			const qualifyFn = when;
			exceptions = exceptions || [];
			return list.map((item) => {
				if (item.match(/\|\d+$/) || exceptions.includes(item)) return item;
				else if (qualifyFn(item)) return `${item}|0`;
				else return item;
			});
		}
		return {
			name: "SQL",
			case_insensitive: true,
			illegal: /[{}]|<\//,
			keywords: {
				$pattern: /\b[\w\.]+/,
				keyword: reduceRelevancy(KEYWORDS, { when: (x) => x.length < 3 }),
				literal: LITERALS,
				type: TYPES,
				built_in: POSSIBLE_WITHOUT_PARENS
			},
			contains: [
				{
					scope: "type",
					match: kws_to_regex(MULTI_WORD_TYPES)
				},
				MULTI_WORD_KEYWORDS,
				FUNCTION_CALL,
				VARIABLE,
				STRING,
				QUOTED_IDENTIFIER,
				hljs.C_NUMBER_MODE,
				hljs.C_BLOCK_COMMENT_MODE,
				COMMENT_MODE,
				OPERATOR
			]
		};
	}
	var codeHighlight = {
		id: "code-highlight",
		title: "代码语法高亮",
		group: "阅读",
		description: "内置 JS、TS、JSON、Shell、Python、CSS、HTML 和 SQL；未知语言保留原文，不加载外部脚本。",
		defaults: { enabled: true },
		mount(ctx) {
			for (const [name, language] of Object.entries({
				javascript: javascript$1,
				typescript,
				json,
				bash,
				python,
				css,
				xml,
				sql
			})) core_default.registerLanguage(name, language);
			const processed = new WeakSet();
			const restore = [];
			const stop = ctx.watch(() => {
				document.querySelectorAll(".post-content pre code, .comment-content pre code, .nsk-content pre code, .markdown-body pre code").forEach((code) => {
					if (processed.has(code) || code.dataset.highlighted) return;
					processed.add(code);
					const language = code.className.match(/(?:language|lang)-([\w-]+)/)?.[1];
					if (!language || !core_default.getLanguage(language) || (code.textContent?.length || 0) > 1e5) return;
					const original = code.innerHTML;
					const hadClass = code.classList.contains("hljs");
					code.innerHTML = core_default.highlight(code.textContent || "", {
						language,
						ignoreIllegals: true
					}).value;
					code.classList.add("hljs");
					restore.push(() => {
						code.innerHTML = original;
						if (!hadClass) code.classList.remove("hljs");
					});
				});
			});
			const style = document.createElement("style");
			style.textContent = `.hljs-keyword,.hljs-selector-tag,.hljs-built_in{color:#8250df}.hljs-string,.hljs-attr,.hljs-addition{color:#116329}.hljs-comment,.hljs-quote{color:#6e7781}.hljs-number,.hljs-literal{color:#0550ae}.hljs-title,.hljs-name{color:#953800}body.dark-layout .hljs-keyword,body.dark-layout .hljs-built_in{color:#d2a8ff}body.dark-layout .hljs-string,body.dark-layout .hljs-attr{color:#7ee787}body.dark-layout .hljs-comment{color:#9ba3ad}body.dark-layout .hljs-number,body.dark-layout .hljs-literal{color:#79c0ff}body.dark-layout .hljs-title,body.dark-layout .hljs-name{color:#ffa657}`;
			document.head.append(style);
			return () => {
				stop();
				style.remove();
				restore.forEach((fn) => fn());
			};
		}
	};
	var import_viewer = __toESM(__commonJSMin(((exports, module) => {
		(function(global, factory) {
			typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, global.Viewer = factory());
		})(exports, (function() {
			"use strict";
			function _classCallCheck(a, n) {
				if (!(a instanceof n)) throw new TypeError("Cannot call a class as a function");
			}
			function _defineProperties(e, r) {
				for (var t = 0; t < r.length; t++) {
					var o = r[t];
					o.enumerable = o.enumerable || !1, o.configurable = !0, "value" in o && (o.writable = !0), Object.defineProperty(e, _toPropertyKey(o.key), o);
				}
			}
			function _createClass(e, r, t) {
				return r && _defineProperties(e.prototype, r), t && _defineProperties(e, t), Object.defineProperty(e, "prototype", { writable: !1 }), e;
			}
			function _defineProperty(e, r, t) {
				return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
					value: t,
					enumerable: !0,
					configurable: !0,
					writable: !0
				}) : e[r] = t, e;
			}
			function ownKeys(e, r) {
				var t = Object.keys(e);
				if (Object.getOwnPropertySymbols) {
					var o = Object.getOwnPropertySymbols(e);
					r && (o = o.filter(function(r) {
						return Object.getOwnPropertyDescriptor(e, r).enumerable;
					})), t.push.apply(t, o);
				}
				return t;
			}
			function _objectSpread2(e) {
				for (var r = 1; r < arguments.length; r++) {
					var t = null != arguments[r] ? arguments[r] : {};
					r % 2 ? ownKeys(Object(t), !0).forEach(function(r) {
						_defineProperty(e, r, t[r]);
					}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function(r) {
						Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
					});
				}
				return e;
			}
			function _toPrimitive(t, r) {
				if ("object" != typeof t || !t) return t;
				var e = t[Symbol.toPrimitive];
				if (void 0 !== e) {
					var i = e.call(t, r || "default");
					if ("object" != typeof i) return i;
					throw new TypeError("@@toPrimitive must return a primitive value.");
				}
				return ("string" === r ? String : Number)(t);
			}
			function _toPropertyKey(t) {
				var i = _toPrimitive(t, "string");
				return "symbol" == typeof i ? i : i + "";
			}
			function _typeof(o) {
				"@babel/helpers - typeof";
				return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
					return typeof o;
				} : function(o) {
					return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
				}, _typeof(o);
			}
			var DEFAULTS = {
				backdrop: true,
				button: true,
				navbar: true,
				navigation: false,
				title: true,
				toolbar: true,
				className: "",
				container: "body",
				filter: null,
				fullscreen: true,
				inheritedAttributes: [
					"crossOrigin",
					"decoding",
					"isMap",
					"loading",
					"referrerPolicy",
					"sizes",
					"srcset",
					"useMap"
				],
				initialCoverage: .9,
				initialViewIndex: 0,
				inline: false,
				autoplay: true,
				interval: 5e3,
				keyboard: true,
				focus: true,
				loading: true,
				loop: true,
				preload: true,
				minWidth: 200,
				minHeight: 100,
				movable: true,
				magnifier: false,
				rotatable: true,
				rotateOnGesture: true,
				rotateOnTouch: true,
				scalable: true,
				zoomable: true,
				zoomOnTouch: true,
				zoomOnGesture: true,
				zoomOnWheel: true,
				slideOnTouch: true,
				slideOnWheel: true,
				toggleOnDblclick: true,
				tooltip: true,
				transition: true,
				zIndex: 2015,
				zIndexInline: 0,
				zoomRatio: .1,
				minZoomRatio: .01,
				maxZoomRatio: 100,
				url: "src",
				ready: null,
				show: null,
				shown: null,
				hide: null,
				hidden: null,
				view: null,
				viewed: null,
				move: null,
				moved: null,
				rotate: null,
				rotated: null,
				scale: null,
				scaled: null,
				zoom: null,
				zoomed: null,
				play: null,
				playing: null,
				stop: null
			};
			var TEMPLATE = "<div class=\"viewer-container\" tabindex=\"-1\" touch-action=\"none\"><div class=\"viewer-canvas\"></div><div class=\"viewer-magnifier\" aria-hidden=\"true\"><img class=\"viewer-magnifier-image\" alt=\"\"></div><div class=\"viewer-navigation\" aria-hidden=\"true\"><div class=\"viewer-prev\" data-viewer-action=\"prev\" role=\"button\" aria-label=\"Previous\"></div><div class=\"viewer-next\" data-viewer-action=\"next\" role=\"button\" aria-label=\"Next\"></div></div><div class=\"viewer-footer\" aria-hidden=\"true\"><div class=\"viewer-title\" aria-hidden=\"true\"></div><div class=\"viewer-toolbar\" aria-hidden=\"true\"></div><div class=\"viewer-navbar\" aria-hidden=\"true\"><ul class=\"viewer-list\" role=\"navigation\"></ul></div></div><div class=\"viewer-tooltip\" role=\"alert\" aria-hidden=\"true\"></div><div class=\"viewer-button\" data-viewer-action=\"mix\" role=\"button\" aria-hidden=\"true\"></div><div class=\"viewer-player\" aria-hidden=\"true\"></div></div>";
			var IS_BROWSER = typeof window !== "undefined" && typeof window.document !== "undefined";
			var WINDOW = IS_BROWSER ? window : {};
			var IS_TOUCH_DEVICE = IS_BROWSER && WINDOW.document.documentElement ? "ontouchstart" in WINDOW.document.documentElement : false;
			var HAS_POINTER_EVENT = IS_BROWSER ? "PointerEvent" in WINDOW : false;
			var NAMESPACE = "viewer";
			var ACTION_MOVE = "move";
			var ACTION_ROTATE = "rotate";
			var ACTION_SWITCH = "switch";
			var ACTION_TRANSFORM = "transform";
			var ACTION_ZOOM = "zoom";
			var CLASS_ACTIVE = "".concat(NAMESPACE, "-active");
			var CLASS_CLOSE = "".concat(NAMESPACE, "-close");
			var CLASS_FADE = "".concat(NAMESPACE, "-fade");
			var CLASS_FIXED = "".concat(NAMESPACE, "-fixed");
			var CLASS_FULLSCREEN = "".concat(NAMESPACE, "-fullscreen");
			var CLASS_FULLSCREEN_EXIT = "".concat(NAMESPACE, "-fullscreen-exit");
			var CLASS_HIDE = "".concat(NAMESPACE, "-hide");
			var CLASS_HIDE_MD_DOWN = "".concat(NAMESPACE, "-hide-md-down");
			var CLASS_HIDE_SM_DOWN = "".concat(NAMESPACE, "-hide-sm-down");
			var CLASS_HIDE_XS_DOWN = "".concat(NAMESPACE, "-hide-xs-down");
			var CLASS_IN = "".concat(NAMESPACE, "-in");
			var CLASS_INVISIBLE = "".concat(NAMESPACE, "-invisible");
			var CLASS_LOADING = "".concat(NAMESPACE, "-loading");
			var CLASS_MOVE = "".concat(NAMESPACE, "-move");
			var CLASS_OPEN = "".concat(NAMESPACE, "-open");
			var CLASS_SHOW = "".concat(NAMESPACE, "-show");
			var CLASS_TRANSITION = "".concat(NAMESPACE, "-transition");
			var EVENT_CLICK = "click";
			var EVENT_DBLCLICK = "dblclick";
			var EVENT_DRAG_START = "dragstart";
			var EVENT_FOCUSIN = "focusin";
			var EVENT_KEY_DOWN = "keydown";
			var EVENT_LOAD = "load";
			var EVENT_ERROR = "error";
			var EVENT_TOUCH_END = IS_TOUCH_DEVICE ? "touchend touchcancel" : "mouseup";
			var EVENT_TOUCH_MOVE = IS_TOUCH_DEVICE ? "touchmove" : "mousemove";
			var EVENT_POINTER_DOWN = HAS_POINTER_EVENT ? "pointerdown" : IS_TOUCH_DEVICE ? "touchstart" : "mousedown";
			var EVENT_POINTER_ENTER = HAS_POINTER_EVENT ? "pointerenter" : "mouseenter";
			var EVENT_POINTER_LEAVE = HAS_POINTER_EVENT ? "pointerleave" : "mouseleave";
			var EVENT_POINTER_MOVE = HAS_POINTER_EVENT ? "pointermove" : EVENT_TOUCH_MOVE;
			var EVENT_POINTER_UP = HAS_POINTER_EVENT ? "pointerup pointercancel" : EVENT_TOUCH_END;
			var EVENT_RESIZE = "resize";
			var EVENT_TRANSITION_END = "transitionend";
			var EVENT_WHEEL = "wheel";
			var EVENT_GESTURE = "gesturestart gesturechange gestureend";
			var EVENT_READY = "ready";
			var EVENT_SHOW = "show";
			var EVENT_SHOWN = "shown";
			var EVENT_HIDE = "hide";
			var EVENT_HIDDEN = "hidden";
			var EVENT_VIEW = "view";
			var EVENT_VIEWED = "viewed";
			var EVENT_MOVE = "move";
			var EVENT_MOVED = "moved";
			var EVENT_ROTATE = "rotate";
			var EVENT_ROTATED = "rotated";
			var EVENT_SCALE = "scale";
			var EVENT_SCALED = "scaled";
			var EVENT_ZOOM = "zoom";
			var EVENT_ZOOMED = "zoomed";
			var EVENT_PLAY = "play";
			var EVENT_PLAYING = "playing";
			var EVENT_STOP = "stop";
			var DATA_ACTION = "".concat(NAMESPACE, "Action");
			var REGEXP_SPACES = /\s+/;
			var BUTTONS = [
				"zoom-in",
				"zoom-out",
				"one-to-one",
				"reset",
				"prev",
				"play",
				"next",
				"rotate-left",
				"rotate-right",
				"flip-horizontal",
				"flip-vertical"
			];
			function isString(value) {
				return typeof value === "string";
			}
			var MODIFIER_KEY_PROPERTIES = {
				ctrl: "ctrlKey",
				shift: "shiftKey",
				alt: "altKey",
				meta: "metaKey"
			};
			function isWheelActionEnabled(option, event) {
				if (!option) return false;
				if (option === true) return true;
				return isString(option) && option.split("+").every(function(key) {
					return event[MODIFIER_KEY_PROPERTIES[key.trim().toLowerCase()]];
				});
			}
			var isNaN = Number.isNaN || WINDOW.isNaN;
			function isNumber(value) {
				return typeof value === "number" && !isNaN(value);
			}
			function isUndefined(value) {
				return typeof value === "undefined";
			}
			function isObject(value) {
				return _typeof(value) === "object" && value !== null;
			}
			var hasOwnProperty = Object.prototype.hasOwnProperty;
			function isPlainObject(value) {
				if (!isObject(value)) return false;
				try {
					var constructor = value.constructor;
					var prototype = constructor.prototype;
					return constructor && prototype && hasOwnProperty.call(prototype, "isPrototypeOf");
				} catch (error) {
					return false;
				}
			}
			function isFunction(value) {
				return typeof value === "function";
			}
			function forEach(data, callback) {
				if (data && isFunction(callback)) {
					if (Array.isArray(data) || isNumber(data.length)) {
						var length = data.length;
						var i = 0;
						for (; i < length; i += 1) if (callback.call(data, data[i], i, data) === false) break;
					} else if (isObject(data)) Object.keys(data).forEach(function(key) {
						callback.call(data, data[key], key, data);
					});
				}
				return data;
			}
			function inheritAttributes(image, originalImage, inheritedAttributes) {
				forEach(inheritedAttributes, function(name) {
					var value = originalImage.getAttribute(name);
					if (value !== null) image.setAttribute(name, value);
				});
			}
			function isTransitionEnabled(options, action) {
				var transition = options.transition;
				return transition && transition[action] !== false;
			}
			var assign = Object.assign || function assign(obj) {
				for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) args[_key - 1] = arguments[_key];
				if (isObject(obj) && args.length > 0) args.forEach(function(arg) {
					if (isObject(arg)) Object.keys(arg).forEach(function(key) {
						obj[key] = arg[key];
					});
				});
				return obj;
			};
			var REGEXP_SUFFIX = /^(?:width|height|left|top|marginLeft|marginTop)$/;
			function setStyle(element, styles) {
				var style = element.style;
				forEach(styles, function(value, property) {
					if (REGEXP_SUFFIX.test(property) && isNumber(value)) value += "px";
					style[property] = value;
				});
			}
			function escapeHTMLEntities(value) {
				return isString(value) ? value.replace(/&(?!amp;|quot;|#39;|lt;|gt;)/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : value;
			}
			function hasClass(element, value) {
				if (!element || !value) return false;
				return element.classList ? element.classList.contains(value) : element.className.split(REGEXP_SPACES).indexOf(value) > -1;
			}
			function addClass(element, value) {
				if (!element || !value) return;
				if (isNumber(element.length)) {
					forEach(element, function(elem) {
						addClass(elem, value);
					});
					return;
				}
				if (element.classList) {
					element.classList.add(value);
					return;
				}
				var className = element.className.trim();
				if (!className) element.className = value;
				else if (className.indexOf(value) < 0) element.className = "".concat(className, " ").concat(value);
			}
			function removeClass(element, value) {
				if (!element || !value) return;
				if (isNumber(element.length)) {
					forEach(element, function(elem) {
						removeClass(elem, value);
					});
					return;
				}
				if (element.classList) {
					element.classList.remove(value);
					return;
				}
				var className = element.className;
				if (className && className.indexOf(value) >= 0) element.className = className.split(REGEXP_SPACES).filter(function(item) {
					return item && item !== value;
				}).join(" ");
			}
			function toggleClass(element, value, added) {
				if (!value) return;
				if (isNumber(element.length)) {
					forEach(element, function(elem) {
						toggleClass(elem, value, added);
					});
					return;
				}
				if (added) addClass(element, value);
				else removeClass(element, value);
			}
			var REGEXP_HYPHENATE = /([a-z\d])([A-Z])/g;
			function hyphenate(value) {
				return value.replace(REGEXP_HYPHENATE, "$1-$2").toLowerCase();
			}
			function getData(element, name) {
				if (isObject(element[name])) return element[name];
				if (element.dataset) return element.dataset[name];
				return element.getAttribute("data-".concat(hyphenate(name)));
			}
			function setData(element, name, data) {
				if (isObject(data)) element[name] = data;
				else if (element.dataset) element.dataset[name] = data;
				else element.setAttribute("data-".concat(hyphenate(name)), data);
			}
			var onceSupported = function() {
				var supported = false;
				if (IS_BROWSER) {
					var once = false;
					var listener = function listener() {};
					var options = Object.defineProperty({}, "once", {
						get: function get() {
							supported = true;
							return once;
						},
						set: function set(value) {
							once = value;
						}
					});
					WINDOW.addEventListener("test", listener, options);
					WINDOW.removeEventListener("test", listener, options);
				}
				return supported;
			}();
			function removeListener(element, type, listener) {
				var options = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
				var handler = listener;
				type.trim().split(REGEXP_SPACES).forEach(function(event) {
					if (!onceSupported) {
						var listeners = element.listeners;
						if (listeners && listeners[event] && listeners[event][listener]) {
							handler = listeners[event][listener];
							delete listeners[event][listener];
							if (Object.keys(listeners[event]).length === 0) delete listeners[event];
							if (Object.keys(listeners).length === 0) delete element.listeners;
						}
					}
					element.removeEventListener(event, handler, options);
				});
			}
			function addListener(element, type, listener) {
				var options = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
				var _handler = listener;
				type.trim().split(REGEXP_SPACES).forEach(function(event) {
					if (options.once && !onceSupported) {
						var _element$listeners = element.listeners, listeners = _element$listeners === void 0 ? {} : _element$listeners;
						_handler = function handler() {
							delete listeners[event][listener];
							element.removeEventListener(event, _handler, options);
							for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) args[_key2] = arguments[_key2];
							listener.apply(element, args);
						};
						if (!listeners[event]) listeners[event] = {};
						if (listeners[event][listener]) element.removeEventListener(event, listeners[event][listener], options);
						listeners[event][listener] = _handler;
						element.listeners = listeners;
					}
					element.addEventListener(event, _handler, options);
				});
			}
			function dispatchEvent(element, type, data, options) {
				var event;
				if (isFunction(Event) && isFunction(CustomEvent)) event = new CustomEvent(type, _objectSpread2({
					bubbles: true,
					cancelable: true,
					detail: data
				}, options));
				else {
					event = document.createEvent("CustomEvent");
					event.initCustomEvent(type, true, true, data);
				}
				return element.dispatchEvent(event);
			}
			function getOffset(element) {
				var box = element.getBoundingClientRect();
				return {
					left: box.left + (window.pageXOffset - document.documentElement.clientLeft),
					top: box.top + (window.pageYOffset - document.documentElement.clientTop)
				};
			}
			function getTransforms(_ref) {
				var rotate = _ref.rotate, scaleX = _ref.scaleX, scaleY = _ref.scaleY, translateX = _ref.translateX, translateY = _ref.translateY;
				var values = [];
				if (isNumber(translateX) && translateX !== 0) values.push("translateX(".concat(translateX, "px)"));
				if (isNumber(translateY) && translateY !== 0) values.push("translateY(".concat(translateY, "px)"));
				if (isNumber(rotate) && rotate !== 0) values.push("rotate(".concat(rotate, "deg)"));
				if (isNumber(scaleX) && isNumber(scaleY) && (scaleX !== 1 || scaleY !== 1)) {
					values.push("scaleX(".concat(scaleX, ")"));
					values.push("scaleY(".concat(scaleY, ")"));
				}
				var transform = values.length ? values.join(" ") : "none";
				return {
					WebkitTransform: transform,
					msTransform: transform,
					transform
				};
			}
			function getImageNameFromURL(url) {
				return isString(url) ? decodeURIComponent(url.replace(/^.*\//, "").replace(/[?&#].*$/, "")) : "";
			}
			var IS_SAFARI = WINDOW.navigator && /Version\/\d+(\.\d+)+?\s+Safari/i.test(WINDOW.navigator.userAgent);
			function getImageNaturalSizes(image, options, callback) {
				var newImage = document.createElement("img");
				if (image.naturalWidth && !IS_SAFARI) {
					callback(image.naturalWidth, image.naturalHeight);
					return newImage;
				}
				var body = document.body || document.documentElement;
				newImage.onload = function() {
					callback(newImage.width, newImage.height);
					if (!IS_SAFARI) body.removeChild(newImage);
				};
				inheritAttributes(newImage, image, options.inheritedAttributes);
				newImage.src = image.src;
				if (!IS_SAFARI) {
					newImage.style.cssText = "left:0;max-height:none!important;max-width:none!important;min-height:0!important;min-width:0!important;opacity:0;position:absolute;top:0;z-index:-1;";
					body.appendChild(newImage);
				}
				return newImage;
			}
			function getResponsiveClass(type) {
				switch (type) {
					case 2: return CLASS_HIDE_XS_DOWN;
					case 3: return CLASS_HIDE_SM_DOWN;
					case 4: return CLASS_HIDE_MD_DOWN;
					default: return "";
				}
			}
			function getMaxZoomRatio(pointers) {
				var pointers2 = _objectSpread2({}, pointers);
				var ratios = [];
				forEach(pointers, function(pointer, pointerId) {
					delete pointers2[pointerId];
					forEach(pointers2, function(pointer2) {
						var x1 = Math.abs(pointer.startX - pointer2.startX);
						var y1 = Math.abs(pointer.startY - pointer2.startY);
						var x2 = Math.abs(pointer.endX - pointer2.endX);
						var y2 = Math.abs(pointer.endY - pointer2.endY);
						var z1 = Math.sqrt(x1 * x1 + y1 * y1);
						var ratio = (Math.sqrt(x2 * x2 + y2 * y2) - z1) / z1;
						ratios.push(ratio);
					});
				});
				ratios.sort(function(a, b) {
					return Math.abs(a) < Math.abs(b);
				});
				return ratios[0];
			}
			function getMaxRotateDegree(pointers) {
				var pointers2 = _objectSpread2({}, pointers);
				var degrees = [];
				forEach(pointers, function(pointer, pointerId) {
					delete pointers2[pointerId];
					forEach(pointers2, function(pointer2) {
						var start = Math.atan2(pointer2.startY - pointer.startY, pointer2.startX - pointer.startX);
						var radians = Math.atan2(pointer2.endY - pointer.endY, pointer2.endX - pointer.endX) - start;
						if (radians > Math.PI) radians -= Math.PI * 2;
						else if (radians < -Math.PI) radians += Math.PI * 2;
						degrees.push(radians * 180 / Math.PI);
					});
				});
				degrees.sort(function(a, b) {
					return Math.abs(b) - Math.abs(a);
				});
				return degrees[0] || 0;
			}
			function getPointer(_ref2, endOnly) {
				var pageX = _ref2.pageX, pageY = _ref2.pageY;
				var end = {
					endX: pageX,
					endY: pageY
				};
				return endOnly ? end : _objectSpread2({
					timeStamp: Date.now(),
					startX: pageX,
					startY: pageY
				}, end);
			}
			function getPointersCenter(pointers) {
				var pageX = 0;
				var pageY = 0;
				var count = 0;
				forEach(pointers, function(_ref3) {
					var startX = _ref3.startX, startY = _ref3.startY;
					pageX += startX;
					pageY += startY;
					count += 1;
				});
				pageX /= count;
				pageY /= count;
				return {
					pageX,
					pageY
				};
			}
			var render = {
				render: function render() {
					this.initContainer();
					this.initViewer();
					this.initList();
					this.renderViewer();
				},
				initBody: function initBody() {
					var ownerDocument = this.ownerDocument;
					var body = ownerDocument.body || ownerDocument.documentElement;
					this.body = body;
					this.scrollbarWidth = window.innerWidth - ownerDocument.documentElement.clientWidth;
					this.initialBodyPaddingRight = body.style.paddingRight;
					this.initialBodyComputedPaddingRight = window.getComputedStyle(body).paddingRight;
				},
				initContainer: function initContainer() {
					this.containerData = {
						width: window.innerWidth,
						height: window.innerHeight
					};
				},
				initViewer: function initViewer() {
					var options = this.options, parent = this.parent;
					var viewerData;
					if (options.inline) {
						viewerData = {
							width: Math.max(parent.offsetWidth, options.minWidth),
							height: Math.max(parent.offsetHeight, options.minHeight)
						};
						this.parentData = viewerData;
					}
					if (this.fulled || !viewerData) viewerData = this.containerData;
					this.viewerData = assign({}, viewerData);
				},
				renderViewer: function renderViewer() {
					if (this.options.inline && !this.fulled) setStyle(this.viewer, this.viewerData);
				},
				initList: function initList() {
					var _this = this;
					var viewIndex = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.index;
					var element = this.element, options = this.options, list = this.list;
					var items = [];
					var navbarOptions = isPlainObject(options.navbar) ? options.navbar : {};
					var probe = document.createElement("li");
					if (!this.containerData) this.initContainer();
					list.appendChild(probe);
					var itemWidth = probe.offsetWidth + parseInt(window.getComputedStyle(probe).marginLeft, 10);
					list.removeChild(probe);
					var visibleItemCount = isNumber(navbarOptions.visibleItemCount) ? Math.floor(navbarOptions.visibleItemCount) : Math.floor(this.containerData.width / itemWidth);
					visibleItemCount = Math.min(visibleItemCount, this.length);
					var start = visibleItemCount > 0 ? Math.min(Math.max(0, viewIndex - Math.floor(visibleItemCount / 2)), Math.max(0, this.length - visibleItemCount)) : 0;
					var end = visibleItemCount > 0 ? Math.min(this.length, start + visibleItemCount) : this.length;
					list.innerHTML = "";
					forEach(this.images, function(image, index) {
						if (visibleItemCount > 0 && (index < start || index >= end)) return;
						var src = image.src;
						var alt = image.alt || getImageNameFromURL(src);
						var url = _this.getImageURL(image);
						if (src || url) {
							var item = document.createElement("li");
							var img = document.createElement("img");
							inheritAttributes(img, image, options.inheritedAttributes);
							if (options.navbar) img.src = src || url;
							img.alt = alt;
							img.setAttribute("data-original-url", url || src);
							item.setAttribute("data-index", index);
							item.setAttribute("data-viewer-action", "view");
							item.setAttribute("role", "button");
							if (options.keyboard) item.setAttribute("tabindex", 0);
							item.appendChild(img);
							list.appendChild(item);
							items.push(item);
						}
					});
					this.items = items;
					if (this.viewed) {
						var activeItem = this.getItem(this.index);
						if (activeItem) {
							addClass(activeItem, CLASS_ACTIVE);
							activeItem.setAttribute("aria-selected", true);
						}
					}
					forEach(items, function(item) {
						var image = item.firstElementChild;
						var onLoad;
						var onError;
						setData(image, "filled", true);
						if (options.loading) addClass(item, CLASS_LOADING);
						addListener(image, EVENT_LOAD, onLoad = function onLoad(event) {
							removeListener(image, EVENT_ERROR, onError);
							if (options.loading) removeClass(item, CLASS_LOADING);
							_this.loadImage(event);
						}, { once: true });
						addListener(image, EVENT_ERROR, onError = function onError() {
							removeListener(image, EVENT_LOAD, onLoad);
							if (options.loading) removeClass(item, CLASS_LOADING);
						}, { once: true });
					});
					if (isTransitionEnabled(options, "view")) addListener(element, EVENT_VIEWED, function() {
						addClass(list, CLASS_TRANSITION);
					}, { once: true });
				},
				getItem: function getItem(index) {
					var item;
					forEach(this.items, function(candidate) {
						if (Number(getData(candidate, "index")) === index) {
							item = candidate;
							return false;
						}
						return true;
					});
					return item;
				},
				renderList: function renderList() {
					var index = this.index;
					var item = this.getItem(index);
					if (!item) return;
					var next = item.nextElementSibling;
					var gutter = parseInt(window.getComputedStyle(next || item).marginLeft, 10);
					var offsetWidth = item.offsetWidth;
					var outerWidth = offsetWidth + gutter;
					setStyle(this.list, assign({ width: outerWidth * this.items.length - gutter }, getTransforms({ translateX: (this.viewerData.width - offsetWidth) / 2 - item.offsetLeft })));
				},
				resetList: function resetList() {
					var list = this.list;
					list.innerHTML = "";
					removeClass(list, CLASS_TRANSITION);
					setStyle(list, assign({ width: 0 }, getTransforms({ translateX: 0 })));
				},
				initImage: function initImage(done) {
					var _this2 = this;
					var options = this.options, image = this.image, viewerData = this.viewerData;
					var footerHeight = this.footer.offsetHeight;
					var viewerWidth = viewerData.width;
					var viewerHeight = Math.max(viewerData.height - footerHeight, footerHeight);
					var oldImageData = this.imageData || {};
					var sizingImage;
					this.imageInitializing = { abort: function abort() {
						sizingImage.onload = null;
					} };
					sizingImage = getImageNaturalSizes(image, options, function(naturalWidth, naturalHeight) {
						var aspectRatio = naturalWidth / naturalHeight;
						var initialCoverage = Math.max(0, Math.min(1, options.initialCoverage));
						var width = viewerWidth;
						var height = viewerHeight;
						_this2.imageInitializing = false;
						if (viewerHeight * aspectRatio > viewerWidth) height = viewerWidth / aspectRatio;
						else width = viewerHeight * aspectRatio;
						initialCoverage = isNumber(initialCoverage) ? initialCoverage : .9;
						width = Math.min(width * initialCoverage, naturalWidth);
						height = Math.min(height * initialCoverage, naturalHeight);
						var left = (viewerWidth - width) / 2;
						var top = (viewerHeight - height) / 2;
						var imageData = {
							left,
							top,
							x: left,
							y: top,
							width,
							height,
							oldRatio: 1,
							ratio: width / naturalWidth,
							aspectRatio,
							naturalWidth,
							naturalHeight
						};
						var initialImageData = assign({}, imageData);
						if (options.rotatable) {
							imageData.rotate = oldImageData.rotate || 0;
							initialImageData.rotate = 0;
						}
						if (options.scalable) {
							imageData.scaleX = oldImageData.scaleX || 1;
							imageData.scaleY = oldImageData.scaleY || 1;
							initialImageData.scaleX = 1;
							initialImageData.scaleY = 1;
						}
						_this2.imageData = imageData;
						_this2.initialImageData = initialImageData;
						if (done) done();
					});
				},
				renderImage: function renderImage(done) {
					var _this3 = this;
					var image = this.image, imageData = this.imageData;
					setStyle(image, assign({
						width: imageData.width,
						height: imageData.height,
						marginLeft: imageData.x,
						marginTop: imageData.y
					}, getTransforms(imageData)));
					if (this.magnifierPoint) this.renderMagnifier();
					if (done) {
						var action = false;
						if (this.viewing) action = "view";
						else if (this.moving) action = "move";
						else if (this.rotating) action = "rotate";
						else if (this.scaling) action = "scale";
						else if (this.zooming) action = "zoom";
						if (action && isTransitionEnabled(this.options, action) && hasClass(image, CLASS_TRANSITION)) {
							var onTransitionEnd = function onTransitionEnd() {
								_this3.imageRendering = false;
								done();
							};
							this.imageRendering = { abort: function abort() {
								removeListener(image, EVENT_TRANSITION_END, onTransitionEnd);
							} };
							addListener(image, EVENT_TRANSITION_END, onTransitionEnd, { once: true });
						} else done();
					}
				},
				resetImage: function resetImage() {
					var image = this.image;
					if (image) {
						if (this.viewing) this.viewing.abort();
						image.parentNode.removeChild(image);
						this.image = null;
						this.title.innerHTML = "";
					}
				}
			};
			var events = {
				bind: function bind() {
					var options = this.options, viewer = this.viewer, canvas = this.canvas;
					var document = this.ownerDocument;
					addListener(viewer, EVENT_CLICK, this.onClick = this.click.bind(this));
					addListener(viewer, EVENT_DRAG_START, this.onDragStart = this.dragstart.bind(this));
					addListener(viewer, EVENT_POINTER_ENTER, this.onMagnifyEnter = this.magnify.bind(this));
					addListener(viewer, EVENT_POINTER_MOVE, this.onMagnify = this.magnify.bind(this));
					addListener(viewer, EVENT_POINTER_LEAVE, this.onMagnifierLeave = this.hideMagnifier.bind(this));
					addListener(canvas, EVENT_POINTER_DOWN, this.onPointerDown = this.pointerdown.bind(this));
					addListener(document, EVENT_POINTER_MOVE, this.onPointerMove = this.pointermove.bind(this));
					addListener(document, EVENT_POINTER_UP, this.onPointerUp = this.pointerup.bind(this));
					addListener(document, EVENT_KEY_DOWN, this.onKeyDown = this.keydown.bind(this));
					addListener(window, EVENT_RESIZE, this.onResize = this.resize.bind(this));
					if (options.zoomable && options.zoomOnWheel || options.slideOnWheel) addListener(viewer, EVENT_WHEEL, this.onWheel = this.wheel.bind(this), {
						passive: false,
						capture: true
					});
					if (options.zoomable && options.zoomOnGesture || options.rotatable && options.rotateOnGesture) addListener(viewer, EVENT_GESTURE, this.onGesture = this.gesture.bind(this), { passive: false });
					if (options.toggleOnDblclick) addListener(canvas, EVENT_DBLCLICK, this.onDblclick = this.dblclick.bind(this));
				},
				unbind: function unbind() {
					var options = this.options, viewer = this.viewer, canvas = this.canvas;
					var document = this.ownerDocument;
					removeListener(viewer, EVENT_CLICK, this.onClick);
					removeListener(viewer, EVENT_DRAG_START, this.onDragStart);
					removeListener(viewer, EVENT_POINTER_ENTER, this.onMagnifyEnter);
					removeListener(viewer, EVENT_POINTER_MOVE, this.onMagnify);
					removeListener(viewer, EVENT_POINTER_LEAVE, this.onMagnifierLeave);
					removeListener(canvas, EVENT_POINTER_DOWN, this.onPointerDown);
					removeListener(document, EVENT_POINTER_MOVE, this.onPointerMove);
					removeListener(document, EVENT_POINTER_UP, this.onPointerUp);
					removeListener(document, EVENT_KEY_DOWN, this.onKeyDown);
					removeListener(window, EVENT_RESIZE, this.onResize);
					if (options.zoomable && options.zoomOnWheel || options.slideOnWheel) removeListener(viewer, EVENT_WHEEL, this.onWheel, {
						passive: false,
						capture: true
					});
					if (options.zoomable && options.zoomOnGesture || options.rotatable && options.rotateOnGesture) removeListener(viewer, EVENT_GESTURE, this.onGesture, { passive: false });
					if (options.toggleOnDblclick) removeListener(canvas, EVENT_DBLCLICK, this.onDblclick);
				}
			};
			var handlers = {
				click: function click(event) {
					var options = this.options, imageData = this.imageData;
					var target = event.target;
					var action = getData(target, DATA_ACTION);
					if (!action && target.localName === "img" && target.parentElement.localName === "li") {
						target = target.parentElement;
						action = getData(target, DATA_ACTION);
					}
					if (IS_TOUCH_DEVICE && event.isTrusted && target === this.canvas) clearTimeout(this.clickCanvasTimeout);
					this.actionEvent = event;
					switch (action) {
						case "mix":
							if (this.played) this.stop();
							else if (options.inline) {
								if (this.fulled) this.exit();
								else this.full();
							} else this.hide();
							break;
						case "hide":
							if (!this.pointerMoved) this.hide();
							break;
						case "view":
							this.view(getData(target, "index"));
							break;
						case "zoom-in":
							this.zoom(.1, true);
							break;
						case "zoom-out":
							this.zoom(-.1, true);
							break;
						case "one-to-one":
							this.toggle();
							break;
						case "reset":
							this.reset();
							break;
						case "prev":
							this.prev(options.loop);
							break;
						case "play":
							this.play(options.fullscreen);
							break;
						case "next":
							this.next(options.loop);
							break;
						case "rotate-left":
							this.rotate(-90);
							break;
						case "rotate-right":
							this.rotate(90);
							break;
						case "flip-horizontal":
							this.scaleX(-imageData.scaleX || -1);
							break;
						case "flip-vertical":
							this.scaleY(-imageData.scaleY || -1);
							break;
						default: if (this.played) this.stop();
					}
				},
				dblclick: function dblclick(event) {
					event.preventDefault();
					if (this.viewed && event.target === this.image) {
						if (IS_TOUCH_DEVICE && event.isTrusted) clearTimeout(this.doubleClickImageTimeout);
						this.actionEvent = event.isTrusted ? event : event.detail && event.detail.originalEvent;
						this.toggle();
					}
				},
				load: function load() {
					var _this = this;
					if (this.timeout) {
						clearTimeout(this.timeout);
						this.timeout = false;
					}
					var element = this.element, options = this.options, image = this.image, index = this.index, viewerData = this.viewerData;
					removeClass(image, CLASS_INVISIBLE);
					if (options.loading) removeClass(this.canvas, CLASS_LOADING);
					image.style.cssText = "height:0;" + "margin-left:".concat(viewerData.width / 2, "px;") + "margin-top:".concat(viewerData.height / 2, "px;") + "max-width:none!important;position:relative;width:0;";
					this.initImage(function() {
						toggleClass(image, CLASS_MOVE, options.movable);
						toggleClass(image, CLASS_TRANSITION, isTransitionEnabled(options, "view"));
						_this.renderImage(function() {
							_this.viewed = true;
							_this.viewing = false;
							setTimeout(function() {
								toggleClass(image, CLASS_TRANSITION, options.transition);
							}, 300);
							if (isFunction(options.viewed)) addListener(element, EVENT_VIEWED, options.viewed, { once: true });
							dispatchEvent(element, EVENT_VIEWED, {
								originalImage: _this.images[index],
								index,
								image,
								originalEvent: _this.viewOriginalEvent || null
							}, { cancelable: false });
							_this.viewOriginalEvent = null;
						});
					});
				},
				loadImage: function loadImage(event) {
					var image = event.target;
					var parent = image.parentNode;
					var parentWidth = parent.offsetWidth || 30;
					var parentHeight = parent.offsetHeight || 50;
					var filled = !!getData(image, "filled");
					getImageNaturalSizes(image, this.options, function(naturalWidth, naturalHeight) {
						var aspectRatio = naturalWidth / naturalHeight;
						var width = parentWidth;
						var height = parentHeight;
						if (parentHeight * aspectRatio > parentWidth) {
							if (filled) width = parentHeight * aspectRatio;
							else height = parentWidth / aspectRatio;
						} else if (filled) height = parentWidth / aspectRatio;
						else width = parentHeight * aspectRatio;
						setStyle(image, assign({
							width,
							height
						}, getTransforms({
							translateX: (parentWidth - width) / 2,
							translateY: (parentHeight - height) / 2
						})));
					});
				},
				keydown: function keydown(event) {
					var options = this.options;
					if (!options.keyboard) return;
					var keyCode = event.keyCode || event.which || event.charCode;
					this.actionEvent = event;
					switch (keyCode) {
						case 13: if (this.viewer.contains(event.target)) this.click(event);
					}
					if (!this.fulled) return;
					switch (keyCode) {
						case 27:
							if (this.played) this.stop();
							else if (options.inline) {
								if (this.fulled) this.exit();
							} else this.hide();
							break;
						case 32:
							if (this.played) this.stop();
							break;
						case 37:
							if (this.played && this.playing) this.playing.prev();
							else this.prev(options.loop);
							break;
						case 38:
							event.preventDefault();
							this.zoom(options.zoomRatio, true);
							break;
						case 39:
							if (this.played && this.playing) this.playing.next();
							else this.next(options.loop);
							break;
						case 40:
							event.preventDefault();
							this.zoom(-options.zoomRatio, true);
							break;
						case 48:
						case 49: if (event.ctrlKey) {
							event.preventDefault();
							this.toggle();
						}
					}
				},
				dragstart: function dragstart(event) {
					if (event.target.localName === "img") event.preventDefault();
				},
				magnify: function magnify(event) {
					if (event.changedTouches || event.pointerType && event.pointerType !== "mouse") {
						this.hideMagnifier();
						return;
					}
					this.magnifierPoint = {
						clientX: event.clientX,
						clientY: event.clientY
					};
					this.renderMagnifier();
				},
				renderMagnifier: function renderMagnifier() {
					var options = this.options, imageData = this.imageData, magnifier = this.magnifier, magnifierImage = this.magnifierImage, viewer = this.viewer;
					var config = isPlainObject(options.magnifier) ? options.magnifier : {};
					var point = this.magnifierPoint;
					if (!options.magnifier || !this.fulled || !this.viewed || !magnifier || !magnifierImage || !point) {
						this.hideMagnifier();
						return;
					}
					var size = Math.max(1, Number(config.size) || 100);
					var zoomRatio = Math.max(1, Number(config.zoomRatio) || 2);
					var opacity = Number(config.opacity);
					var rect = viewer.getBoundingClientRect();
					var x = point.clientX - rect.left;
					var y = point.clientY - rect.top;
					var imageURL = this.image.currentSrc || this.image.src;
					var imageRect = this.image.getBoundingClientRect();
					if (point.clientX < imageRect.left || point.clientX > imageRect.right || point.clientY < imageRect.top || point.clientY > imageRect.bottom) {
						this.hideMagnifier();
						return;
					}
					var scaleX = isNumber(imageData.scaleX) ? imageData.scaleX : 1;
					var scaleY = isNumber(imageData.scaleY) ? imageData.scaleY : 1;
					var rotate = (imageData.rotate || 0) * Math.PI / 180;
					var cos = Math.cos(rotate);
					var sin = Math.sin(rotate);
					var matrixA = cos * scaleX;
					var matrixB = sin * scaleX;
					var matrixC = -sin * scaleY;
					var matrixD = cos * scaleY;
					var determinant = scaleX * scaleY;
					if (determinant === 0) {
						this.hideMagnifier();
						return;
					}
					var centerX = imageData.x + imageData.width / 2;
					var centerY = imageData.y + imageData.height / 2;
					var localX = (matrixD * (x - centerX) - matrixC * (y - centerY)) / determinant;
					var localY = (-matrixB * (x - centerX) + matrixA * (y - centerY)) / determinant;
					var sourceX = localX + imageData.width / 2;
					var sourceY = localY + imageData.height / 2;
					var magnifiedWidth = imageData.width * zoomRatio;
					var magnifiedHeight = imageData.height * zoomRatio;
					var transformedX = matrixA * (sourceX * zoomRatio - magnifiedWidth / 2) + matrixC * (sourceY * zoomRatio - magnifiedHeight / 2);
					var transformedY = matrixB * (sourceX * zoomRatio - magnifiedWidth / 2) + matrixD * (sourceY * zoomRatio - magnifiedHeight / 2);
					this.magnifierSourcePoint = {
						x: sourceX,
						y: sourceY
					};
					magnifier.style.width = "".concat(size, "px");
					magnifier.style.height = "".concat(size, "px");
					magnifier.style.opacity = "".concat(Math.max(0, Math.min(1, isNumber(opacity) ? opacity : 1)));
					magnifierImage.src = imageURL;
					magnifierImage.style.width = "".concat(magnifiedWidth, "px");
					magnifierImage.style.height = "".concat(magnifiedHeight, "px");
					magnifierImage.style.left = "".concat(size / 2 - magnifiedWidth / 2 - transformedX, "px");
					magnifierImage.style.top = "".concat(size / 2 - magnifiedHeight / 2 - transformedY, "px");
					magnifierImage.style.transform = "rotate(".concat(imageData.rotate || 0, "deg) scaleX(").concat(scaleX, ") scaleY(").concat(scaleY, ")");
					magnifier.removeAttribute("aria-hidden");
					addClass(magnifier, "viewer-show");
				},
				hideMagnifier: function hideMagnifier() {
					if (this.magnifier) {
						removeClass(this.magnifier, "viewer-show");
						this.magnifier.setAttribute("aria-hidden", true);
						this.magnifierPoint = null;
					}
				},
				pointerdown: function pointerdown(event) {
					var options = this.options, pointers = this.pointers;
					var buttons = event.buttons, button = event.button;
					this.pointerMoved = false;
					if (!this.viewed || this.showing || this.viewing || this.hiding || (event.type === "mousedown" || event.type === "pointerdown" && event.pointerType === "mouse") && (isNumber(buttons) && buttons !== 1 || isNumber(button) && button !== 0 || event.ctrlKey)) return;
					event.preventDefault();
					if (event.changedTouches) forEach(event.changedTouches, function(touch) {
						pointers[touch.identifier] = getPointer(touch);
					});
					else pointers[event.pointerId || 0] = getPointer(event);
					var action = options.movable ? ACTION_MOVE : false;
					if ((options.zoomable && options.zoomOnTouch || options.rotatable && options.rotateOnTouch) && Object.keys(pointers).length > 1) action = ACTION_TRANSFORM;
					else if (options.slideOnTouch && (event.pointerType === "touch" || event.type === "touchstart") && this.isSwitchable()) action = ACTION_SWITCH;
					if (action === ACTION_MOVE || action === ACTION_ZOOM || action === ACTION_ROTATE || action === ACTION_TRANSFORM) removeClass(this.image, CLASS_TRANSITION);
					this.action = action;
				},
				pointermove: function pointermove(event) {
					var pointers = this.pointers, action = this.action;
					if (!this.viewed || !action) return;
					event.preventDefault();
					if (event.changedTouches) forEach(event.changedTouches, function(touch) {
						assign(pointers[touch.identifier] || {}, getPointer(touch, true));
					});
					else assign(pointers[event.pointerId || 0] || {}, getPointer(event, true));
					this.change(event);
				},
				pointerup: function pointerup(event) {
					var _this2 = this;
					var options = this.options, action = this.action, pointers = this.pointers;
					var pointer;
					if (event.changedTouches) forEach(event.changedTouches, function(touch) {
						pointer = pointers[touch.identifier];
						delete pointers[touch.identifier];
					});
					else {
						pointer = pointers[event.pointerId || 0];
						delete pointers[event.pointerId || 0];
					}
					if (!action) return;
					event.preventDefault();
					if (action === ACTION_MOVE || action === ACTION_ZOOM || action === ACTION_ROTATE || action === ACTION_TRANSFORM) {
						var transition = action === ACTION_TRANSFORM ? isTransitionEnabled(options, ACTION_ZOOM) || isTransitionEnabled(options, ACTION_ROTATE) : isTransitionEnabled(options, action);
						toggleClass(this.image, CLASS_TRANSITION, transition);
					}
					this.action = false;
					if (IS_TOUCH_DEVICE && action !== ACTION_ZOOM && action !== ACTION_TRANSFORM && pointer && Date.now() - pointer.timeStamp < 500) {
						clearTimeout(this.clickCanvasTimeout);
						clearTimeout(this.doubleClickImageTimeout);
						if (options.toggleOnDblclick && this.viewed && event.target === this.image) {
							if (this.pointerMoved) this.imageClicked = false;
							else if (this.imageClicked) {
								this.imageClicked = false;
								this.doubleClickImageTimeout = setTimeout(function() {
									dispatchEvent(_this2.image, EVENT_DBLCLICK, { originalEvent: event });
								}, 50);
							} else {
								this.imageClicked = true;
								this.doubleClickImageTimeout = setTimeout(function() {
									_this2.imageClicked = false;
								}, 500);
							}
						} else {
							this.imageClicked = false;
							if (options.backdrop && options.backdrop !== "static" && event.target === this.canvas) this.clickCanvasTimeout = setTimeout(function() {
								dispatchEvent(_this2.canvas, EVENT_CLICK, { originalEvent: event });
							}, 50);
						}
					}
				},
				resize: function resize() {
					var _this3 = this;
					if (!this.isShown || this.hiding) return;
					if (this.fulled) {
						this.close();
						this.initBody();
						this.open();
					}
					this.initContainer();
					this.initViewer();
					this.renderViewer();
					if (isUndefined((isPlainObject(this.options.navbar) ? this.options.navbar : {}).visibleItemCount)) this.initList(this.index);
					this.renderList();
					if (this.viewed) this.initImage(function() {
						_this3.renderImage();
					});
					if (this.played) {
						if (this.options.fullscreen && this.fulled && !(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement)) {
							this.stop();
							return;
						}
						forEach(this.player.getElementsByTagName("img"), function(image) {
							addListener(image, EVENT_LOAD, _this3.loadImage.bind(_this3), { once: true });
							dispatchEvent(image, EVENT_LOAD);
						});
					}
				},
				wheel: function wheel(event) {
					var _this4 = this;
					var options = this.options, navbar = this.navbar;
					if (!this.viewed) return;
					event.preventDefault();
					if (this.gesturing) return;
					if (this.wheeling) return;
					this.wheeling = true;
					setTimeout(function() {
						_this4.wheeling = false;
					}, 50);
					var delta = 1;
					if (event.deltaY) delta = event.deltaY > 0 ? 1 : -1;
					else if (event.wheelDelta) delta = -event.wheelDelta / 120;
					else if (event.detail) delta = event.detail > 0 ? 1 : -1;
					if (!(navbar && navbar.contains(event.target)) && options.zoomable && isWheelActionEnabled(options.zoomOnWheel, event)) {
						var ratio = Number(options.zoomRatio) || .1;
						this.actionEvent = event;
						this.zoom(-delta * ratio, true);
						return;
					}
					if (isWheelActionEnabled(options.slideOnWheel, event)) {
						this.actionEvent = event;
						if (delta > 0) this.next(options.loop);
						else if (delta < 0) this.prev(options.loop);
					}
				},
				gesture: function gesture(event) {
					var options = this.options;
					if (!this.viewed || !options.zoomOnGesture && !options.rotateOnGesture) return;
					event.preventDefault();
					switch (event.type) {
						case "gesturestart":
							this.gesturing = true;
							this.gestureScale = event.scale || 1;
							this.gestureRotation = event.rotation || 0;
							break;
						case "gesturechange":
							var scale = event.scale || 1;
							var ratio = scale / (this.gestureScale || 1);
							var rotation = Number(event.rotation);
							var degree = rotation - (this.gestureRotation || 0);
							this.gestureScale = scale;
							if (options.zoomable && options.zoomOnGesture && ratio !== 1) {
								this.actionEvent = event;
								this.zoom(ratio >= 1 ? ratio - 1 : 1 - 1 / ratio);
							}
							if (options.rotatable && options.rotateOnGesture && isNumber(rotation)) {
								this.gestureRotation = rotation;
								if (degree !== 0) {
									this.actionEvent = event;
									this.rotate(degree);
								}
							}
							break;
						case "gestureend":
							this.gesturing = false;
							this.gestureScale = 1;
							this.gestureRotation = 0;
					}
				}
			};
			var methods = {
				show: function show() {
					var immediate = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : false;
					var element = this.element, options = this.options;
					if (options.inline || this.showing || this.isShown || this.showing) return this;
					if (!this.ready) {
						this.build();
						if (this.ready) this.show(immediate);
						return this;
					}
					var originalEvent = this.actionEvent || this.showOriginalEvent || this.viewOriginalEvent || null;
					this.actionEvent = null;
					this.showOriginalEvent = originalEvent;
					if (isFunction(options.show)) addListener(element, EVENT_SHOW, options.show, { once: true });
					if (dispatchEvent(element, EVENT_SHOW, { originalEvent }) === false || !this.ready) return this;
					if (this.hiding) this.transitioning.abort();
					this.showing = true;
					this.open();
					var viewer = this.viewer;
					removeClass(viewer, CLASS_HIDE);
					viewer.setAttribute("role", "dialog");
					viewer.setAttribute("aria-labelledby", this.title.id);
					viewer.setAttribute("aria-modal", true);
					viewer.removeAttribute("aria-hidden");
					if (isTransitionEnabled(options, "show") && !immediate) {
						var shown = this.shown.bind(this);
						this.transitioning = { abort: function abort() {
							removeListener(viewer, EVENT_TRANSITION_END, shown);
							removeClass(viewer, CLASS_IN);
						} };
						addClass(viewer, CLASS_TRANSITION);
						viewer.initialOffsetWidth = viewer.offsetWidth;
						addListener(viewer, EVENT_TRANSITION_END, shown, { once: true });
						addClass(viewer, CLASS_IN);
					} else {
						addClass(viewer, CLASS_IN);
						this.shown();
					}
					return this;
				},
				hide: function hide() {
					var _this = this;
					var immediate = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : false;
					var element = this.element, options = this.options;
					if (options.inline || this.hiding || !(this.isShown || this.showing)) return this;
					var originalEvent = this.actionEvent || this.hideOriginalEvent || null;
					this.actionEvent = null;
					this.hideOriginalEvent = originalEvent;
					if (isFunction(options.hide)) addListener(element, EVENT_HIDE, options.hide, { once: true });
					if (dispatchEvent(element, EVENT_HIDE, { originalEvent }) === false || this.destroyed) return this;
					if (this.showing) this.transitioning.abort();
					this.hiding = true;
					if (this.played) this.stop();
					else if (this.viewing) this.viewing.abort();
					var viewer = this.viewer, image = this.image;
					var hideImmediately = function hideImmediately() {
						removeClass(viewer, CLASS_IN);
						_this.hidden();
					};
					if (isTransitionEnabled(options, "hide") && !immediate) {
						var _onViewerTransitionEnd = function onViewerTransitionEnd(event) {
							if (event && event.target === viewer) {
								removeListener(viewer, EVENT_TRANSITION_END, _onViewerTransitionEnd);
								_this.hidden();
							}
						};
						var onImageTransitionEnd = function onImageTransitionEnd() {
							if (hasClass(viewer, CLASS_TRANSITION)) {
								addListener(viewer, EVENT_TRANSITION_END, _onViewerTransitionEnd);
								removeClass(viewer, CLASS_IN);
							} else hideImmediately();
						};
						this.transitioning = { abort: function abort() {
							if (_this.viewed && hasClass(image, CLASS_TRANSITION)) removeListener(image, EVENT_TRANSITION_END, onImageTransitionEnd);
							else if (hasClass(viewer, CLASS_TRANSITION)) removeListener(viewer, EVENT_TRANSITION_END, _onViewerTransitionEnd);
						} };
						if (this.viewed && hasClass(image, CLASS_TRANSITION)) {
							addListener(image, EVENT_TRANSITION_END, onImageTransitionEnd, { once: true });
							this.zoomTo(0, false, null, true);
						} else onImageTransitionEnd();
					} else hideImmediately();
					return this;
				},
				view: function view() {
					var _this2 = this;
					var index = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.options.initialViewIndex;
					var previousIndex = this.index;
					index = Number(index) || 0;
					if (this.hiding || this.played || index < 0 || index >= this.length || this.viewed && index === previousIndex) return this;
					var originalEvent = this.actionEvent || this.viewOriginalEvent || null;
					this.actionEvent = null;
					this.viewOriginalEvent = originalEvent;
					if (!this.isShown) {
						this.index = index;
						return this.show();
					}
					if (this.viewing) this.viewing.abort();
					var element = this.element, options = this.options, title = this.title, canvas = this.canvas;
					var item = this.getItem(index);
					if (!item) {
						this.initList(index);
						item = this.getItem(index);
					}
					var img = item.querySelector("img");
					var url = getData(img, "originalUrl");
					var alt = img.getAttribute("alt");
					var image = document.createElement("img");
					inheritAttributes(image, img, options.inheritedAttributes);
					image.src = url;
					image.alt = alt;
					if (isFunction(options.view)) addListener(element, EVENT_VIEW, options.view, { once: true });
					if (dispatchEvent(element, EVENT_VIEW, {
						originalImage: this.images[index],
						index,
						image,
						originalEvent
					}) === false || !this.isShown || this.hiding || this.played) return this;
					this.hideMagnifier();
					var activeItem = this.getItem(previousIndex);
					if (activeItem) {
						removeClass(activeItem, CLASS_ACTIVE);
						activeItem.removeAttribute("aria-selected");
					}
					addClass(item, CLASS_ACTIVE);
					item.setAttribute("aria-selected", true);
					if (options.focus) item.focus();
					this.image = image;
					this.viewed = false;
					this.index = index;
					this.imageData = {};
					addClass(image, CLASS_INVISIBLE);
					if (options.loading) addClass(canvas, CLASS_LOADING);
					canvas.innerHTML = "";
					canvas.appendChild(image);
					this.renderList();
					title.innerHTML = "";
					var onViewed = function onViewed() {
						var imageData = _this2.imageData;
						var render = Array.isArray(options.title) ? options.title[1] : options.title;
						title.innerHTML = escapeHTMLEntities(isFunction(render) ? render.call(_this2, image, imageData) : "".concat(alt, " (").concat(imageData.naturalWidth, " × ").concat(imageData.naturalHeight, ")"));
						if (options.preload) {
							var direction = index < previousIndex ? -1 : 1;
							var nextIndex = index + direction;
							if (nextIndex < 0 || nextIndex >= _this2.length) {
								if (options.loop) nextIndex = direction > 0 ? 0 : _this2.length - 1;
								else nextIndex = -1;
							}
							if (nextIndex !== index) {
								var nextImage = _this2.images[nextIndex];
								var preloadedImage = document.createElement("img");
								inheritAttributes(preloadedImage, nextImage, options.inheritedAttributes);
								preloadedImage.src = _this2.getImageURL(nextImage) || nextImage.src;
							}
						}
					};
					addListener(element, EVENT_VIEWED, onViewed, { once: true });
					var _loadImage = function loadImage() {
						var isFallback = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : false;
						var onLoad;
						var onError;
						var clean = function clean() {
							removeListener(image, EVENT_LOAD, onLoad);
							removeListener(image, EVENT_ERROR, onError);
							if (_this2.timeout) {
								clearTimeout(_this2.timeout);
								_this2.timeout = false;
							}
						};
						_this2.viewing = { abort: function abort() {
							removeListener(element, EVENT_VIEWED, onViewed);
							if (image.complete) {
								if (_this2.imageRendering) _this2.imageRendering.abort();
								else if (_this2.imageInitializing) _this2.imageInitializing.abort();
							} else {
								image.src = "";
								clean();
							}
						} };
						if (image.complete) _this2.load();
						else {
							addListener(image, EVENT_LOAD, onLoad = function onLoad() {
								clean();
								_this2.load();
							}, { once: true });
							addListener(image, EVENT_ERROR, onError = function onError() {
								clean();
								if (!isFallback) {
									var fallbackSrc = img.src;
									if (fallbackSrc && fallbackSrc !== image.src) {
										image.src = fallbackSrc;
										_loadImage(true);
										return;
									}
								}
								removeClass(image, CLASS_INVISIBLE);
								if (options.loading) removeClass(_this2.canvas, CLASS_LOADING);
							}, { once: true });
							if (_this2.timeout) clearTimeout(_this2.timeout);
							_this2.timeout = setTimeout(function() {
								removeClass(image, CLASS_INVISIBLE);
								_this2.timeout = false;
							}, 1e3);
						}
					};
					_loadImage();
					return this;
				},
				prev: function prev() {
					var loop = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : false;
					var index = this.index - 1;
					if (index < 0) index = loop ? this.length - 1 : 0;
					this.view(index);
					return this;
				},
				next: function next() {
					var loop = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : false;
					var maxIndex = this.length - 1;
					var index = this.index + 1;
					if (index > maxIndex) index = loop ? 0 : maxIndex;
					this.view(index);
					return this;
				},
				move: function move(x) {
					var y = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : x;
					var imageData = this.imageData;
					this.moveTo(isUndefined(x) ? x : imageData.x + Number(x), isUndefined(y) ? y : imageData.y + Number(y));
					return this;
				},
				moveTo: function moveTo(x) {
					var _this3 = this;
					var y = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : x;
					var element = this.element, options = this.options, imageData = this.imageData;
					x = Number(x);
					y = Number(y);
					if (this.viewed && !this.played && options.movable) {
						var oldX = imageData.x;
						var oldY = imageData.y;
						var changed = false;
						if (isNumber(x)) changed = true;
						else x = oldX;
						if (isNumber(y)) changed = true;
						else y = oldY;
						if (changed) {
							var originalEvent = this.actionEvent || null;
							this.actionEvent = null;
							if (isFunction(options.move)) addListener(element, EVENT_MOVE, options.move, { once: true });
							if (dispatchEvent(element, EVENT_MOVE, {
								x,
								y,
								oldX,
								oldY,
								originalEvent
							}) === false) return this;
							imageData.x = x;
							imageData.y = y;
							imageData.left = x;
							imageData.top = y;
							toggleClass(this.image, CLASS_TRANSITION, isTransitionEnabled(options, "move"));
							this.moving = true;
							this.renderImage(function() {
								_this3.moving = false;
								if (isFunction(options.moved)) addListener(element, EVENT_MOVED, options.moved, { once: true });
								dispatchEvent(element, EVENT_MOVED, {
									x,
									y,
									oldX,
									oldY,
									originalEvent
								}, { cancelable: false });
							});
						}
					}
					return this;
				},
				rotate: function rotate(degree) {
					this.rotateTo((this.imageData.rotate || 0) + Number(degree));
					return this;
				},
				rotateTo: function rotateTo(degree) {
					var _this4 = this;
					var element = this.element, options = this.options, imageData = this.imageData;
					degree = Number(degree);
					if (isNumber(degree) && this.viewed && !this.played && options.rotatable) {
						var oldDegree = imageData.rotate;
						var originalEvent = this.actionEvent || null;
						this.actionEvent = null;
						if (isFunction(options.rotate)) addListener(element, EVENT_ROTATE, options.rotate, { once: true });
						if (dispatchEvent(element, EVENT_ROTATE, {
							degree,
							oldDegree,
							originalEvent
						}) === false) return this;
						imageData.rotate = degree;
						toggleClass(this.image, CLASS_TRANSITION, isTransitionEnabled(options, "rotate"));
						this.rotating = true;
						this.renderImage(function() {
							_this4.rotating = false;
							if (isFunction(options.rotated)) addListener(element, EVENT_ROTATED, options.rotated, { once: true });
							dispatchEvent(element, EVENT_ROTATED, {
								degree,
								oldDegree,
								originalEvent
							}, { cancelable: false });
						});
					}
					return this;
				},
				scaleX: function scaleX(_scaleX) {
					this.scale(_scaleX, this.imageData.scaleY);
					return this;
				},
				scaleY: function scaleY(_scaleY) {
					this.scale(this.imageData.scaleX, _scaleY);
					return this;
				},
				scale: function scale(scaleX) {
					var _this5 = this;
					var scaleY = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : scaleX;
					var element = this.element, options = this.options, imageData = this.imageData;
					scaleX = Number(scaleX);
					scaleY = Number(scaleY);
					if (this.viewed && !this.played && options.scalable) {
						var oldScaleX = imageData.scaleX;
						var oldScaleY = imageData.scaleY;
						var changed = false;
						if (isNumber(scaleX)) changed = true;
						else scaleX = oldScaleX;
						if (isNumber(scaleY)) changed = true;
						else scaleY = oldScaleY;
						if (changed) {
							var originalEvent = this.actionEvent || null;
							this.actionEvent = null;
							if (isFunction(options.scale)) addListener(element, EVENT_SCALE, options.scale, { once: true });
							if (dispatchEvent(element, EVENT_SCALE, {
								scaleX,
								scaleY,
								oldScaleX,
								oldScaleY,
								originalEvent
							}) === false) return this;
							imageData.scaleX = scaleX;
							imageData.scaleY = scaleY;
							toggleClass(this.image, CLASS_TRANSITION, isTransitionEnabled(options, "scale"));
							this.scaling = true;
							this.renderImage(function() {
								_this5.scaling = false;
								if (isFunction(options.scaled)) addListener(element, EVENT_SCALED, options.scaled, { once: true });
								dispatchEvent(element, EVENT_SCALED, {
									scaleX,
									scaleY,
									oldScaleX,
									oldScaleY,
									originalEvent
								}, { cancelable: false });
							});
						}
					}
					return this;
				},
				zoom: function zoom(ratio) {
					var showTooltip = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : false;
					var pivot = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : null;
					var imageData = this.imageData;
					ratio = Number(ratio);
					if (ratio < 0) ratio = 1 / (1 - ratio);
					else ratio = 1 + ratio;
					this.zoomTo(imageData.width * ratio / imageData.naturalWidth, showTooltip, pivot);
					return this;
				},
				zoomTo: function zoomTo(ratio) {
					var _this6 = this;
					var showTooltip = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : false;
					var pivot = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : null;
					var _zoomable = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : false;
					var element = this.element, options = this.options, pointers = this.pointers, imageData = this.imageData;
					var x = imageData.x, y = imageData.y, width = imageData.width, height = imageData.height, naturalWidth = imageData.naturalWidth, naturalHeight = imageData.naturalHeight;
					ratio = Math.max(0, ratio);
					if (isNumber(ratio) && this.viewed && !this.played && (_zoomable || options.zoomable)) {
						if (!_zoomable) {
							var minZoomRatio = Math.max(.01, isFunction(options.minZoomRatio) ? options.minZoomRatio.call(this, this.image, imageData) : options.minZoomRatio);
							var maxZoomRatio = Math.min(100, isFunction(options.maxZoomRatio) ? options.maxZoomRatio.call(this, this.image, imageData) : options.maxZoomRatio);
							ratio = Math.min(Math.max(ratio, minZoomRatio), maxZoomRatio);
						}
						var originalEvent = this.actionEvent || null;
						this.actionEvent = null;
						if (originalEvent && originalEvent.type !== EVENT_CLICK) switch (originalEvent.type) {
							case "wheel":
								if (options.zoomRatio >= .055 && ratio > .95 && ratio < 1.05) ratio = 1;
								break;
							case "pointermove":
							case "touchmove":
							case "mousemove": if (ratio > .99 && ratio < 1.01) ratio = 1;
						}
						var newWidth = naturalWidth * ratio;
						var newHeight = naturalHeight * ratio;
						var offsetWidth = newWidth - width;
						var offsetHeight = newHeight - height;
						var oldRatio = imageData.ratio;
						if (isFunction(options.zoom)) addListener(element, EVENT_ZOOM, options.zoom, { once: true });
						if (dispatchEvent(element, EVENT_ZOOM, {
							ratio,
							oldRatio,
							originalEvent
						}) === false) return this;
						this.zooming = true;
						if (originalEvent && originalEvent.type !== EVENT_CLICK) {
							var offset = getOffset(this.viewer);
							var center = pointers && Object.keys(pointers).length > 0 ? getPointersCenter(pointers) : {
								pageX: originalEvent.pageX,
								pageY: originalEvent.pageY
							};
							imageData.x -= offsetWidth * ((center.pageX - offset.left - x) / width);
							imageData.y -= offsetHeight * ((center.pageY - offset.top - y) / height);
						} else if (isPlainObject(pivot) && isNumber(pivot.x) && isNumber(pivot.y)) {
							imageData.x -= offsetWidth * ((pivot.x - x) / width);
							imageData.y -= offsetHeight * ((pivot.y - y) / height);
						} else {
							imageData.x -= offsetWidth / 2;
							imageData.y -= offsetHeight / 2;
						}
						imageData.left = imageData.x;
						imageData.top = imageData.y;
						imageData.width = newWidth;
						imageData.height = newHeight;
						imageData.oldRatio = oldRatio;
						imageData.ratio = ratio;
						toggleClass(this.image, CLASS_TRANSITION, isTransitionEnabled(options, "zoom"));
						this.renderImage(function() {
							_this6.zooming = false;
							if (isFunction(options.zoomed)) addListener(element, EVENT_ZOOMED, options.zoomed, { once: true });
							dispatchEvent(element, EVENT_ZOOMED, {
								ratio,
								oldRatio,
								originalEvent
							}, { cancelable: false });
						});
						if (showTooltip) this.tooltip();
					}
					return this;
				},
				play: function play() {
					var _this7 = this;
					var fullscreen = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : false;
					if (!this.isShown || this.played) return this;
					var element = this.element, options = this.options;
					var originalEvent = this.actionEvent || null;
					this.actionEvent = null;
					if (isFunction(options.play)) addListener(element, EVENT_PLAY, options.play, { once: true });
					if (dispatchEvent(element, EVENT_PLAY, { originalEvent }) === false) return this;
					var player = this.player;
					var onLoad = this.loadImage.bind(this);
					var list = [];
					var total = 0;
					var index = 0;
					this.played = true;
					this.onLoadWhenPlay = onLoad;
					if (fullscreen) this.requestFullscreen(fullscreen);
					addClass(player, CLASS_SHOW);
					player.removeAttribute("aria-hidden");
					forEach(this.images, function(originalImage, i) {
						var image = document.createElement("img");
						image.src = _this7.getImageURL(originalImage) || originalImage.src;
						image.alt = originalImage.alt || "";
						image.referrerPolicy = originalImage.referrerPolicy;
						total += 1;
						addClass(image, CLASS_FADE);
						toggleClass(image, CLASS_TRANSITION, isTransitionEnabled(options, "play"));
						if (i === _this7.index) {
							addClass(image, CLASS_IN);
							index = i;
						}
						list.push(image);
						addListener(image, EVENT_LOAD, onLoad, { once: true });
						player.appendChild(image);
					});
					if (isNumber(options.interval) && options.interval > 0) {
						var _prev = function prev() {
							clearTimeout(_this7.playing.timeout);
							var currentOriginalEvent = _this7.actionEvent || null;
							_this7.actionEvent = null;
							var prevIndex = index - 1;
							prevIndex = prevIndex >= 0 ? prevIndex : total - 1;
							if (isFunction(options.playing)) addListener(element, EVENT_PLAYING, options.playing, { once: true });
							if (dispatchEvent(element, EVENT_PLAYING, {
								originalImage: _this7.images[prevIndex],
								index: prevIndex,
								image: list[prevIndex],
								originalEvent: currentOriginalEvent
							}) === false) {
								_this7.playing.timeout = options.autoplay ? setTimeout(_prev, options.interval) : null;
								return;
							}
							removeClass(list[index], CLASS_IN);
							index = prevIndex;
							addClass(list[index], CLASS_IN);
							_this7.playing.timeout = options.autoplay ? setTimeout(_prev, options.interval) : null;
						};
						var _next = function next() {
							clearTimeout(_this7.playing.timeout);
							var currentOriginalEvent = _this7.actionEvent || null;
							_this7.actionEvent = null;
							var nextIndex = index + 1;
							nextIndex = nextIndex < total ? nextIndex : 0;
							if (isFunction(options.playing)) addListener(element, EVENT_PLAYING, options.playing, { once: true });
							if (dispatchEvent(element, EVENT_PLAYING, {
								originalImage: _this7.images[nextIndex],
								index: nextIndex,
								image: list[nextIndex],
								originalEvent: currentOriginalEvent
							}) === false) {
								_this7.playing.timeout = options.autoplay ? setTimeout(_next, options.interval) : null;
								return;
							}
							removeClass(list[index], CLASS_IN);
							index = nextIndex;
							addClass(list[index], CLASS_IN);
							_this7.playing.timeout = options.autoplay ? setTimeout(_next, options.interval) : null;
						};
						if (total > 1) this.playing = {
							prev: _prev,
							next: _next,
							timeout: options.autoplay ? setTimeout(_next, options.interval) : null
						};
					}
					return this;
				},
				stop: function stop() {
					var _this8 = this;
					if (!this.played) return this;
					var element = this.element, options = this.options;
					var originalEvent = this.actionEvent || null;
					this.actionEvent = null;
					if (isFunction(options.stop)) addListener(element, EVENT_STOP, options.stop, { once: true });
					if (dispatchEvent(element, EVENT_STOP, { originalEvent }) === false) return this;
					var player = this.player;
					clearTimeout(this.playing.timeout);
					this.playing = false;
					this.played = false;
					forEach(player.getElementsByTagName("img"), function(image) {
						removeListener(image, EVENT_LOAD, _this8.onLoadWhenPlay);
					});
					removeClass(player, CLASS_SHOW);
					player.setAttribute("aria-hidden", true);
					player.innerHTML = "";
					this.exitFullscreen();
					return this;
				},
				full: function full() {
					var _this9 = this;
					var options = this.options, viewer = this.viewer, image = this.image, list = this.list;
					if (!this.isShown || this.played || this.fulled || !options.inline) return this;
					this.fulled = true;
					this.open();
					addClass(this.button, CLASS_FULLSCREEN_EXIT);
					removeClass(list, CLASS_TRANSITION);
					if (this.viewed) removeClass(image, CLASS_TRANSITION);
					addClass(viewer, CLASS_FIXED);
					viewer.setAttribute("role", "dialog");
					viewer.setAttribute("aria-labelledby", this.title.id);
					viewer.setAttribute("aria-modal", true);
					viewer.removeAttribute("style");
					setStyle(viewer, { zIndex: options.zIndex });
					if (options.focus) this.enforceFocus();
					this.initContainer();
					this.viewerData = assign({}, this.containerData);
					this.renderList();
					if (this.viewed) this.initImage(function() {
						_this9.renderImage();
					});
					return this;
				},
				exit: function exit() {
					var _this0 = this;
					var options = this.options, viewer = this.viewer, image = this.image, list = this.list;
					if (!this.isShown || this.played || !this.fulled || !options.inline) return this;
					this.fulled = false;
					this.close();
					removeClass(this.button, CLASS_FULLSCREEN_EXIT);
					removeClass(list, CLASS_TRANSITION);
					if (this.viewed) removeClass(image, CLASS_TRANSITION);
					if (options.focus) this.clearEnforceFocus();
					viewer.removeAttribute("role");
					viewer.removeAttribute("aria-labelledby");
					viewer.removeAttribute("aria-modal");
					removeClass(viewer, CLASS_FIXED);
					setStyle(viewer, { zIndex: options.zIndexInline });
					this.viewerData = assign({}, this.parentData);
					this.renderViewer();
					this.renderList();
					if (this.viewed) this.initImage(function() {
						_this0.renderImage();
					});
					return this;
				},
				tooltip: function tooltip() {
					var _this1 = this;
					var options = this.options, tooltipBox = this.tooltipBox, imageData = this.imageData;
					if (!this.viewed || this.played || !options.tooltip) return this;
					tooltipBox.textContent = "".concat(Math.round(imageData.ratio * 100), "%");
					if (!this.tooltipping) {
						if (isTransitionEnabled(options, "tooltip")) {
							if (this.fading) dispatchEvent(tooltipBox, EVENT_TRANSITION_END);
							addClass(tooltipBox, CLASS_SHOW);
							addClass(tooltipBox, CLASS_FADE);
							addClass(tooltipBox, CLASS_TRANSITION);
							tooltipBox.removeAttribute("aria-hidden");
							tooltipBox.initialOffsetWidth = tooltipBox.offsetWidth;
							addClass(tooltipBox, CLASS_IN);
						} else {
							addClass(tooltipBox, CLASS_SHOW);
							tooltipBox.removeAttribute("aria-hidden");
						}
					} else clearTimeout(this.tooltipping);
					this.tooltipping = setTimeout(function() {
						if (isTransitionEnabled(options, "tooltip")) {
							addListener(tooltipBox, EVENT_TRANSITION_END, function() {
								removeClass(tooltipBox, CLASS_SHOW);
								removeClass(tooltipBox, CLASS_FADE);
								removeClass(tooltipBox, CLASS_TRANSITION);
								tooltipBox.setAttribute("aria-hidden", true);
								_this1.fading = false;
							}, { once: true });
							removeClass(tooltipBox, CLASS_IN);
							_this1.fading = true;
						} else {
							removeClass(tooltipBox, CLASS_SHOW);
							tooltipBox.setAttribute("aria-hidden", true);
						}
						_this1.tooltipping = false;
					}, 1e3);
					return this;
				},
				toggle: function toggle() {
					if (this.imageData.ratio === 1) this.zoomTo(this.imageData.oldRatio, true);
					else this.zoomTo(1, true);
					return this;
				},
				reset: function reset() {
					if (this.viewed && !this.played) {
						this.imageData = assign({}, this.initialImageData);
						this.renderImage();
					}
					return this;
				},
				update: function update(updateOptions) {
					var _this10 = this;
					var element = this.element, options = this.options, isImg = this.isImg;
					if (isPlainObject(updateOptions)) assign(options, updateOptions);
					if (isImg && !element.parentNode) return this.destroy();
					var images = [];
					forEach(isImg ? [element] : element.querySelectorAll("img"), function(image) {
						if (isFunction(options.filter)) {
							if (options.filter.call(_this10, image)) images.push(image);
						} else if (_this10.getImageURL(image)) images.push(image);
					});
					if (!images.length) return this;
					this.images = images;
					this.length = images.length;
					if (this.ready) {
						var changedIndexes = [];
						forEach(this.items, function(item) {
							var img = item.querySelector("img");
							var index = Number(getData(item, "index"));
							var image = images[index];
							if (image && img) {
								if (image.src !== img.src || image.alt !== img.alt) changedIndexes.push(index);
							} else changedIndexes.push(index);
						});
						setStyle(this.list, { width: "auto" });
						this.initList();
						if (this.isShown) {
							if (this.length) {
								if (this.viewed) {
									var changedIndex = changedIndexes.indexOf(this.index);
									if (changedIndex >= 0) {
										this.viewed = false;
										this.view(Math.max(Math.min(this.index - changedIndex, this.length - 1), 0));
									} else {
										var activeItem = this.getItem(this.index);
										addClass(activeItem, CLASS_ACTIVE);
										activeItem.setAttribute("aria-selected", true);
									}
								}
							} else {
								this.image = null;
								this.viewed = false;
								this.index = 0;
								this.imageData = {};
								this.canvas.innerHTML = "";
								this.title.innerHTML = "";
							}
						}
					} else this.build();
					return this;
				},
				destroy: function destroy() {
					var element = this.element, options = this.options;
					if (!element[NAMESPACE]) return this;
					this.destroyed = true;
					if (this.ready) {
						if (this.played) this.stop();
						if (options.inline) {
							if (this.fulled) this.exit();
							this.unbind();
						} else if (this.isShown) {
							if (this.viewing) {
								if (this.imageRendering) this.imageRendering.abort();
								else if (this.imageInitializing) this.imageInitializing.abort();
							}
							if (this.hiding) this.transitioning.abort();
							this.hidden();
						} else if (this.showing) {
							this.transitioning.abort();
							this.hidden();
						}
						this.ready = false;
						this.viewer.parentNode.removeChild(this.viewer);
					} else if (options.inline) {
						if (this.delaying) this.delaying.abort();
						else if (this.initializing) this.initializing.abort();
					}
					if (!options.inline) {
						removeListener(element, EVENT_CLICK, this.onElementClick);
						removeListener(element, EVENT_KEY_DOWN, this.onElementKeyDown);
					}
					element[NAMESPACE] = void 0;
					return this;
				}
			};
			var others = {
				getImageURL: function getImageURL(image) {
					var url = this.options.url;
					if (isString(url)) url = image.getAttribute(url);
					else if (isFunction(url)) url = url.call(this, image);
					else url = "";
					return url;
				},
				enforceFocus: function enforceFocus() {
					var _this = this;
					this.clearEnforceFocus();
					addListener(document, EVENT_FOCUSIN, this.onFocusin = function(event) {
						var viewer = _this.viewer;
						var target = event.target;
						if (target === document || target === viewer || viewer.contains(target)) return;
						while (target) {
							if (target.getAttribute("tabindex") !== null || target.getAttribute("aria-modal") === "true") return;
							target = target.parentElement;
						}
						viewer.focus();
					});
				},
				clearEnforceFocus: function clearEnforceFocus() {
					if (this.onFocusin) {
						removeListener(document, EVENT_FOCUSIN, this.onFocusin);
						this.onFocusin = null;
					}
				},
				open: function open() {
					var body = this.body;
					addClass(body, CLASS_OPEN);
					if (this.scrollbarWidth > 0) body.style.paddingRight = "".concat(this.scrollbarWidth + (parseFloat(this.initialBodyComputedPaddingRight) || 0), "px");
				},
				close: function close() {
					var body = this.body;
					removeClass(body, CLASS_OPEN);
					if (this.scrollbarWidth > 0) body.style.paddingRight = this.initialBodyPaddingRight;
				},
				shown: function shown() {
					var element = this.element, options = this.options, viewer = this.viewer;
					this.fulled = true;
					this.isShown = true;
					this.render();
					this.bind();
					this.showing = false;
					if (options.focus) {
						viewer.focus();
						this.enforceFocus();
					}
					if (isFunction(options.shown)) addListener(element, EVENT_SHOWN, options.shown, { once: true });
					if (dispatchEvent(element, EVENT_SHOWN, { originalEvent: this.showOriginalEvent || null }) === false) return;
					this.showOriginalEvent = null;
					if (this.ready && this.isShown && !this.hiding) this.view(this.index);
				},
				hidden: function hidden() {
					var element = this.element, options = this.options, viewer = this.viewer;
					var activeElement = viewer.ownerDocument.activeElement;
					if (activeElement && viewer.contains(activeElement) && isFunction(activeElement.blur)) activeElement.blur();
					if (options.focus) this.clearEnforceFocus();
					this.close();
					this.unbind();
					addClass(viewer, CLASS_HIDE);
					viewer.removeAttribute("role");
					viewer.removeAttribute("aria-labelledby");
					viewer.removeAttribute("aria-modal");
					viewer.setAttribute("aria-hidden", true);
					this.resetList();
					this.resetImage();
					this.fulled = false;
					this.viewed = false;
					this.isShown = false;
					this.hiding = false;
					if (!this.destroyed) {
						if (isFunction(options.hidden)) addListener(element, EVENT_HIDDEN, options.hidden, { once: true });
						dispatchEvent(element, EVENT_HIDDEN, { originalEvent: this.hideOriginalEvent || null }, { cancelable: false });
						this.hideOriginalEvent = null;
					}
				},
				requestFullscreen: function requestFullscreen(options) {
					var document = this.ownerDocument;
					if (this.fulled && !(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement)) {
						var documentElement = document.documentElement;
						if (documentElement.requestFullscreen) {
							if (isPlainObject(options)) documentElement.requestFullscreen(options);
							else documentElement.requestFullscreen();
						} else if (documentElement.webkitRequestFullscreen) documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
						else if (documentElement.mozRequestFullScreen) documentElement.mozRequestFullScreen();
						else if (documentElement.msRequestFullscreen) documentElement.msRequestFullscreen();
					}
				},
				exitFullscreen: function exitFullscreen() {
					var document = this.ownerDocument;
					if (this.fulled && (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement)) {
						if (document.exitFullscreen) document.exitFullscreen();
						else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
						else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
						else if (document.msExitFullscreen) document.msExitFullscreen();
					}
				},
				change: function change(event) {
					var options = this.options, pointers = this.pointers;
					var pointer = pointers[Object.keys(pointers)[0]];
					if (!pointer) return;
					var offsetX = pointer.endX - pointer.startX;
					var offsetY = pointer.endY - pointer.startY;
					switch (this.action) {
						case ACTION_MOVE:
							if (offsetX !== 0 || offsetY !== 0) {
								this.pointerMoved = true;
								this.actionEvent = event;
								this.move(offsetX, offsetY);
							}
							break;
						case ACTION_ZOOM:
							if (options.zoomable && options.zoomOnTouch) {
								var zoomRatio = getMaxZoomRatio(pointers);
								if (zoomRatio !== 0) {
									this.actionEvent = event;
									this.zoom(zoomRatio);
								}
							}
							break;
						case ACTION_ROTATE:
							if (options.rotatable && options.rotateOnTouch) {
								var rotateDegree = getMaxRotateDegree(pointers);
								if (rotateDegree !== 0) {
									this.actionEvent = event;
									this.rotate(rotateDegree);
								}
							}
							break;
						case ACTION_TRANSFORM:
							if (options.zoomable && options.zoomOnTouch) {
								var _zoomRatio = getMaxZoomRatio(pointers);
								if (_zoomRatio !== 0) {
									this.actionEvent = event;
									this.zoom(_zoomRatio);
								}
							}
							if (options.rotatable && options.rotateOnTouch) {
								var _rotateDegree = getMaxRotateDegree(pointers);
								if (_rotateDegree !== 0) {
									this.actionEvent = event;
									this.rotate(_rotateDegree);
								}
							}
							break;
						case ACTION_SWITCH:
							this.action = "switched";
							var absoluteOffsetX = Math.abs(offsetX);
							if (absoluteOffsetX > 1 && absoluteOffsetX > Math.abs(offsetY)) {
								this.pointers = {};
								this.actionEvent = event;
								if (offsetX > 1) this.prev(options.loop);
								else if (offsetX < -1) this.next(options.loop);
							}
					}
					forEach(pointers, function(p) {
						p.startX = p.endX;
						p.startY = p.endY;
					});
				},
				isSwitchable: function isSwitchable() {
					var imageData = this.imageData, viewerData = this.viewerData;
					return this.length > 1 && imageData.x >= 0 && imageData.y >= 0 && imageData.width <= viewerData.width && imageData.height <= viewerData.height;
				}
			};
			var AnotherViewer = WINDOW.Viewer;
			var getUniqueID = function(id) {
				return function() {
					id += 1;
					return id;
				};
			}(-1);
			var Viewer = function() {
				function Viewer(element) {
					var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
					_classCallCheck(this, Viewer);
					if (!element || element.nodeType !== 1 && element.nodeType !== 11) throw new Error("The first argument is required and must be an element.");
					this.element = element;
					this.ownerDocument = element.ownerDocument || element.host.ownerDocument;
					this.options = assign({}, DEFAULTS, isPlainObject(options) && options);
					this.action = false;
					this.actionEvent = null;
					this.fading = false;
					this.fulled = false;
					this.hiding = false;
					this.imageClicked = false;
					this.imageData = {};
					this.index = this.options.initialViewIndex;
					this.isImg = false;
					this.isShown = false;
					this.length = 0;
					this.moving = false;
					this.played = false;
					this.playing = false;
					this.pointers = {};
					this.ready = false;
					this.rotating = false;
					this.scaling = false;
					this.showing = false;
					this.timeout = false;
					this.tooltipping = false;
					this.viewed = false;
					this.viewing = false;
					this.wheeling = false;
					this.zooming = false;
					this.pointerMoved = false;
					this.id = getUniqueID();
					this.init();
				}
				return _createClass(Viewer, [{
					key: "init",
					value: function init() {
						var _this = this;
						var element = this.element, options = this.options;
						if (element[NAMESPACE]) return;
						element[NAMESPACE] = this;
						if (options.focus && !options.keyboard) options.focus = false;
						var isImg = element.localName === "img";
						var images = [];
						forEach(isImg ? [element] : element.querySelectorAll("img"), function(image) {
							if (isFunction(options.filter)) {
								if (options.filter.call(_this, image)) images.push(image);
							} else if (_this.getImageURL(image)) images.push(image);
						});
						this.isImg = isImg;
						this.length = images.length;
						this.images = images;
						this.initBody();
						if (isUndefined(this.ownerDocument.createElement(NAMESPACE).style.transition)) options.transition = false;
						if (options.inline) {
							var count = 0;
							var progress = function progress() {
								count += 1;
								if (count === _this.length) {
									var timeout;
									_this.initializing = false;
									_this.delaying = { abort: function abort() {
										clearTimeout(timeout);
									} };
									timeout = setTimeout(function() {
										_this.delaying = false;
										_this.build();
									}, 0);
								}
							};
							this.initializing = { abort: function abort() {
								forEach(images, function(image) {
									if (!image.complete) {
										removeListener(image, EVENT_LOAD, progress);
										removeListener(image, EVENT_ERROR, progress);
									}
								});
							} };
							forEach(images, function(image) {
								if (image.complete) progress();
								else {
									var onLoad;
									var onError;
									addListener(image, EVENT_LOAD, onLoad = function onLoad() {
										removeListener(image, EVENT_ERROR, onError);
										progress();
									}, { once: true });
									addListener(image, EVENT_ERROR, onError = function onError() {
										removeListener(image, EVENT_LOAD, onLoad);
										progress();
									}, { once: true });
								}
							});
						} else {
							addListener(element, EVENT_CLICK, this.onElementClick = function(event) {
								var target = event.target;
								if (target.localName === "img" && (!isFunction(options.filter) || options.filter.call(_this, target))) {
									_this.actionEvent = event;
									_this.view(_this.images.indexOf(target));
								}
							});
							addListener(element, EVENT_KEY_DOWN, this.onElementKeyDown = function(event) {
								var target = event.target, key = event.key;
								if (target.localName === "img" && (key === "Enter" || key === " ")) {
									event.preventDefault();
									if (!isFunction(options.filter) || options.filter.call(_this, target)) {
										_this.actionEvent = event;
										_this.view(_this.images.indexOf(target));
									}
								}
							});
						}
					}
				}, {
					key: "build",
					value: function build() {
						if (this.ready) return;
						var element = this.element, options = this.options;
						var parent = element.parentNode;
						var template = document.createElement("div");
						template.innerHTML = TEMPLATE;
						var viewer = template.querySelector(".".concat(NAMESPACE, "-container"));
						var title = viewer.querySelector(".".concat(NAMESPACE, "-title"));
						var toolbar = viewer.querySelector(".".concat(NAMESPACE, "-toolbar"));
						var navbar = viewer.querySelector(".".concat(NAMESPACE, "-navbar"));
						var navigation = viewer.querySelector(".".concat(NAMESPACE, "-navigation"));
						var button = viewer.querySelector(".".concat(NAMESPACE, "-button"));
						var canvas = viewer.querySelector(".".concat(NAMESPACE, "-canvas"));
						this.parent = parent;
						this.viewer = viewer;
						this.title = title;
						this.toolbar = toolbar;
						this.navbar = navbar;
						this.navigation = navigation;
						this.button = button;
						this.canvas = canvas;
						this.footer = viewer.querySelector(".".concat(NAMESPACE, "-footer"));
						this.magnifier = viewer.querySelector(".".concat(NAMESPACE, "-magnifier"));
						this.magnifierImage = viewer.querySelector(".".concat(NAMESPACE, "-magnifier-image"));
						this.tooltipBox = viewer.querySelector(".".concat(NAMESPACE, "-tooltip"));
						this.player = viewer.querySelector(".".concat(NAMESPACE, "-player"));
						this.list = viewer.querySelector(".".concat(NAMESPACE, "-list"));
						viewer.id = "".concat(NAMESPACE).concat(this.id);
						title.id = "".concat(NAMESPACE, "Title").concat(this.id);
						addClass(title, !options.title ? CLASS_HIDE : getResponsiveClass(Array.isArray(options.title) ? options.title[0] : options.title));
						if (options.title) title.removeAttribute("aria-hidden");
						var navbarOptions = isPlainObject(options.navbar) ? options.navbar : {};
						var navbarShow = options.navbar;
						var navbarSize = !isUndefined(navbarOptions.size) ? navbarOptions.size : options.navbar;
						if (isPlainObject(options.navbar)) navbarShow = !isUndefined(navbarOptions.show) ? navbarOptions.show : true;
						addClass(navbar, !navbarShow ? CLASS_HIDE : getResponsiveClass(navbarShow));
						if (navbarShow) navbar.removeAttribute("aria-hidden");
						if ([
							"small",
							"medium",
							"large"
						].indexOf(navbarSize) !== -1) addClass(navbar, "".concat(NAMESPACE, "-").concat(navbarSize));
						if (isPlainObject(options.navigation)) forEach(navigation.querySelectorAll("[role=\"button\"]"), function(item) {
							var name = getData(item, DATA_ACTION);
							var value = options.navigation[name];
							var deep = isPlainObject(value);
							var show = deep && !isUndefined(value.show) ? value.show : value;
							var size = deep && !isUndefined(value.size) ? value.size : value;
							toggleClass(item, CLASS_HIDE, !show);
							if (isNumber(show)) addClass(item, getResponsiveClass(show));
							if (["small", "large"].indexOf(size) !== -1) addClass(item, "".concat(NAMESPACE, "-").concat(size));
						});
						else addClass(navigation, !options.navigation ? CLASS_HIDE : getResponsiveClass(options.navigation));
						if (options.navigation) navigation.removeAttribute("aria-hidden");
						toggleClass(button, CLASS_HIDE, !options.button);
						if (options.button) button.removeAttribute("aria-hidden");
						if (options.keyboard) {
							button.setAttribute("tabindex", 0);
							forEach(navigation.querySelectorAll("[role=\"button\"]"), function(item) {
								item.setAttribute("tabindex", 0);
							});
						}
						if (options.backdrop) {
							addClass(viewer, "".concat(NAMESPACE, "-backdrop"));
							if (!options.inline && options.backdrop !== "static") setData(canvas, DATA_ACTION, "hide");
						}
						if (isString(options.className) && options.className) options.className.split(REGEXP_SPACES).forEach(function(className) {
							addClass(viewer, className);
						});
						if (options.toolbar) {
							var list = document.createElement("ul");
							var custom = isPlainObject(options.toolbar);
							var zoomButtons = BUTTONS.slice(0, 3);
							var rotateButtons = BUTTONS.slice(7, 9);
							var scaleButtons = BUTTONS.slice(9);
							if (!custom) addClass(toolbar, getResponsiveClass(options.toolbar));
							toolbar.removeAttribute("aria-hidden");
							forEach(custom ? options.toolbar : BUTTONS, function(value, index) {
								var deep = custom && isPlainObject(value);
								var name = custom ? hyphenate(index) : value;
								var show = deep && !isUndefined(value.show) ? value.show : value;
								if (!show || !options.zoomable && zoomButtons.indexOf(name) !== -1 || !options.rotatable && rotateButtons.indexOf(name) !== -1 || !options.scalable && scaleButtons.indexOf(name) !== -1) return;
								var size = deep && !isUndefined(value.size) ? value.size : value;
								var click = deep && !isUndefined(value.click) ? value.click : value;
								var item = document.createElement("li");
								if (options.keyboard) item.setAttribute("tabindex", 0);
								item.setAttribute("role", "button");
								addClass(item, "".concat(NAMESPACE, "-").concat(name));
								if (!isFunction(click)) setData(item, DATA_ACTION, name);
								if (isNumber(show)) addClass(item, getResponsiveClass(show));
								if (["small", "large"].indexOf(size) !== -1) addClass(item, "".concat(NAMESPACE, "-").concat(size));
								else if (name === "play") addClass(item, "".concat(NAMESPACE, "-large"));
								if (isFunction(click)) addListener(item, EVENT_CLICK, click);
								list.appendChild(item);
							});
							toolbar.appendChild(list);
						} else addClass(toolbar, CLASS_HIDE);
						if (options.title || navbarShow || options.toolbar) this.footer.removeAttribute("aria-hidden");
						else addClass(this.footer, CLASS_HIDE);
						if (!options.rotatable) {
							var rotates = toolbar.querySelectorAll("li[class*=\"rotate\"]");
							addClass(rotates, CLASS_INVISIBLE);
							forEach(rotates, function(rotate) {
								toolbar.appendChild(rotate);
							});
						}
						if (options.inline) {
							addClass(button, CLASS_FULLSCREEN);
							setStyle(viewer, { zIndex: options.zIndexInline });
							if (window.getComputedStyle(parent).position === "static") setStyle(parent, { position: "relative" });
							parent.insertBefore(viewer, element.nextSibling);
						} else {
							addClass(button, CLASS_CLOSE);
							addClass(viewer, CLASS_FIXED);
							addClass(viewer, CLASS_FADE);
							addClass(viewer, CLASS_HIDE);
							setStyle(viewer, { zIndex: options.zIndex });
							var container = options.container;
							if (isString(container)) container = this.ownerDocument.querySelector(container);
							if (!container) container = this.body;
							container.appendChild(viewer);
						}
						if (options.inline) {
							this.render();
							this.bind();
							this.isShown = true;
						}
						this.ready = true;
						if (isFunction(options.ready)) addListener(element, EVENT_READY, options.ready, { once: true });
						if (dispatchEvent(element, EVENT_READY) === false) {
							this.ready = false;
							return;
						}
						if (this.ready && options.inline) this.view(this.index);
					}
				}], [
					{
						key: "create",
						value: function create(element, options) {
							return new Viewer(element, options);
						}
					},
					{
						key: "setDefaults",
						value: function setDefaults(options) {
							assign(DEFAULTS, isPlainObject(options) && options);
						}
					},
					{
						key: "noConflict",
						value: function noConflict() {
							window.Viewer = AnotherViewer;
							return Viewer;
						}
					}
				]);
			}();
			assign(Viewer.prototype, render, events, handlers, methods, others);
			return Viewer;
		}));
	}))(), 1);
	_css("/*!\n * Viewer.js v1.14.0\n * https://fengyuanchen.github.io/viewerjs\n *\n * Copyright 2015-present Chen Fengyuan\n * Released under the MIT license\n *\n * Date: 2026-09-12T12:12:27.170Z\n */\n.viewer-zoom-in:before,.viewer-zoom-out:before,.viewer-one-to-one:before,.viewer-reset:before,.viewer-prev:before,.viewer-play:before,.viewer-next:before,.viewer-rotate-left:before,.viewer-rotate-right:before,.viewer-flip-horizontal:before,.viewer-flip-vertical:before,.viewer-fullscreen:before,.viewer-fullscreen-exit:before,.viewer-close:before{color:#0000;background-image:url(\"data:image/svg+xml,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox%3D%220 0 560 40%22%3E%3Cpath fill%3D%22%23fff%22 d%3D%22M49.6 17.9h20.2v3.9H49.6zm123.1 2 10.9-11 2.7 2.8-8.2 8.2 8.2 8.2-2.7 2.7-10.9-10.9zm94 0-10.8-11-2.7 2.8 8.1 8.2-8.1 8.2 2.7 2.7 10.8-10.9zM212 9.3l20.1 10.6L212 30.5V9.3zm161.5 4.6-7.2 6 7.2 5.9v-4h12.4v4l7.3-5.9-7.3-6v4h-12.4v-4zm40.2 12.3 5.9 7.2 5.9-7.2h-4V13.6h4l-5.9-7.3-5.9 7.3h4v12.6h-4zm35.9-16.5h6.3v2h-4.3V16h-2V9.7Zm14 0h6.2V16h-2v-4.3h-4.2v-2Zm6.2 14V30h-6.2v-2h4.2v-4.3h2Zm-14 6.3h-6.2v-6.3h2v4.4h4.3v2Zm-438 .1v-8.3H9.6v-3.9h8.2V9.7h3.9v8.2h8.1v3.9h-8.1v8.3h-3.9zM93.6 9.7h-5.8v3.9h2V30h3.8V9.7zm16.1 0h-5.8v3.9h1.9V30h3.9V9.7zm-11.9 4.1h3.9v3.9h-3.9zm0 8.2h3.9v3.9h-3.9zm244.6-11.7 7.2 5.9-7.2 6v-3.6c-5.4-.4-7.8.8-8.7 2.8-.8 1.7-1.8 4.9 2.8 8.2-6.3-2-7.5-6.9-6-11.3 1.6-4.4 8-5 11.9-4.9v-3.1Zm147.2 13.4h6.3V30h-2v-4.3h-4.3v-2zm14 6.3v-6.3h6.2v2h-4.3V30h-1.9zm6.2-14h-6.2V9.7h1.9V14h4.3v2zm-13.9 0h-6.3v-2h4.3V9.7h2V16zm33.3 12.5 8.6-8.6-8.6-8.7 1.9-1.9 8.6 8.7 8.6-8.7 1.9 1.9-8.6 8.7 8.6 8.6-1.9 2-8.6-8.7-8.6 8.7-1.9-2zM297 10.3l-7.1 5.9 7.2 6v-3.6c5.3-.4 7.7.8 8.7 2.8.8 1.7 1.7 4.9-2.9 8.2 6.3-2 7.5-6.9 6-11.3-1.6-4.4-7.9-5-11.8-4.9v-3.1Zm-157.3-.6c2.3 0 4.4.7 6 2l2.5-3 1.9 9.2h-9.3l2.6-3.1a6.2 6.2 0 0 0-9.9 5.1c0 3.4 2.8 6.3 6.2 6.3 2.8 0 5.1-1.9 6-4.4h4c-1 4.7-5 8.3-10 8.3a10 10 0 0 1-10-10.2 10 10 0 0 1 10-10.2Z%22%2F%3E%3C%2Fsvg%3E\");background-repeat:no-repeat;background-size:280px;width:20px;height:20px;font-size:0;line-height:0;display:block}.viewer-zoom-in:before{content:\"Zoom In\";background-position:0 0}.viewer-zoom-out:before{content:\"Zoom Out\";background-position:-20px 0}.viewer-one-to-one:before{content:\"One to One\";background-position:-40px 0}.viewer-reset:before{content:\"Reset\";background-position:-60px 0}.viewer-prev:before{content:\"Previous\";background-position:-80px 0}.viewer-play:before{content:\"Play\";background-position:-100px 0}.viewer-next:before{content:\"Next\";background-position:-120px 0}.viewer-rotate-left:before{content:\"Rotate Left\";background-position:-140px 0}.viewer-rotate-right:before{content:\"Rotate Right\";background-position:-160px 0}.viewer-flip-horizontal:before{content:\"Flip Horizontal\";background-position:-180px 0}.viewer-flip-vertical:before{content:\"Flip Vertical\";background-position:-200px 0}.viewer-fullscreen:before{content:\"Enter Full Screen\";background-position:-220px 0}.viewer-fullscreen-exit:before{content:\"Exit Full Screen\";background-position:-240px 0}.viewer-close:before{content:\"Close\";background-position:-260px 0}.viewer-container{-webkit-tap-highlight-color:transparent;-ms-touch-action:none;touch-action:none;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;direction:ltr;font-size:0;line-height:0;position:absolute;inset:0;overflow:hidden}.viewer-container::-moz-selection{background-color:#0000}.viewer-container ::-moz-selection{background-color:#0000}.viewer-container::selection{background-color:#0000}.viewer-container ::selection{background-color:#0000}.viewer-container:focus{outline:0}.viewer-container img{width:100%;height:auto;display:block;min-width:0!important;max-width:none!important;min-height:0!important;max-height:none!important}.viewer-canvas{position:absolute;inset:0;overflow:hidden}.viewer-canvas>img{width:auto;height:auto;margin:15px auto;max-width:90%!important}.viewer-magnifier{box-sizing:border-box;pointer-events:none;z-index:2;background-color:#fff;background-repeat:no-repeat;border:2px solid #fff;border-radius:50%;display:none;position:absolute;top:16px;left:16px;overflow:hidden;box-shadow:0 1px 5px #00000080}.viewer-magnifier.viewer-show{display:block}.viewer-magnifier-image{transform-origin:50%;position:absolute;top:0;left:0;max-width:none!important}.viewer-navigation{position:absolute;top:50%;left:0;right:0}.viewer-navigation>.viewer-prev,.viewer-navigation>.viewer-next{cursor:pointer;background-color:#00000080;border-radius:50%;width:40px;height:40px;margin-top:-20px;position:absolute}.viewer-navigation>.viewer-prev:focus,.viewer-navigation>.viewer-next:focus,.viewer-navigation>.viewer-prev:hover,.viewer-navigation>.viewer-next:hover{background-color:#000c}.viewer-navigation>.viewer-prev:focus,.viewer-navigation>.viewer-next:focus{outline:0;box-shadow:0 0 3px #fff}.viewer-navigation>.viewer-prev:before,.viewer-navigation>.viewer-next:before{margin:10px}.viewer-navigation>.viewer-prev{left:15px}.viewer-navigation>.viewer-next{right:15px}.viewer-navigation>.viewer-large{width:48px;height:48px;margin-top:-24px}.viewer-navigation>.viewer-large:before{margin:14px}.viewer-navigation>.viewer-small{width:32px;height:32px;margin-top:-16px}.viewer-navigation>.viewer-small:before{margin:6px}.viewer-footer{text-align:center;position:absolute;bottom:0;left:0;right:0;overflow:hidden}.viewer-navbar{background-color:#00000080;overflow:hidden}.viewer-navbar.viewer-small>.viewer-list{height:40px}.viewer-navbar.viewer-small>.viewer-list>li{width:24px;height:40px}.viewer-navbar.viewer-large>.viewer-list{height:60px}.viewer-navbar.viewer-large>.viewer-list>li{width:36px;height:60px}.viewer-list{box-sizing:content-box;height:50px;margin:0;padding:1px 0;overflow:hidden}.viewer-list>li{color:#0000;cursor:pointer;float:left;opacity:.5;width:30px;height:50px;font-size:0;line-height:0;transition:opacity .15s;overflow:hidden}.viewer-list>li:focus,.viewer-list>li:hover{opacity:.75}.viewer-list>li:focus{outline:0}.viewer-list>li+li{margin-left:1px}.viewer-list>.viewer-loading{position:relative}.viewer-list>.viewer-loading:after{border-width:2px;width:20px;height:20px;margin-top:-10px;margin-left:-10px}.viewer-list>.viewer-active,.viewer-list>.viewer-active:focus,.viewer-list>.viewer-active:hover{opacity:1}.viewer-player{cursor:none;z-index:1;background-color:#000;display:none;position:absolute;inset:0}.viewer-player>img{position:absolute;top:0;left:0}.viewer-toolbar>ul{margin:0 auto 5px;padding:6px 3px;display:inline-block;overflow:hidden}.viewer-toolbar>ul>li{cursor:pointer;float:left;background-color:#00000080;border-radius:50%;width:24px;height:24px;transition:background-color .15s;overflow:hidden}.viewer-toolbar>ul>li:focus,.viewer-toolbar>ul>li:hover{background-color:#000c}.viewer-toolbar>ul>li:focus{z-index:1;outline:0;position:relative;box-shadow:0 0 3px #fff}.viewer-toolbar>ul>li:before{margin:2px}.viewer-toolbar>ul>li+li{margin-left:1px}.viewer-toolbar>ul>.viewer-small{width:18px;height:18px;margin-top:3px;margin-bottom:3px}.viewer-toolbar>ul>.viewer-small:before{margin:-1px}.viewer-toolbar>ul>.viewer-large{width:30px;height:30px;margin-top:-3px;margin-bottom:-3px}.viewer-toolbar>ul>.viewer-large:before{margin:5px}.viewer-tooltip{color:#fff;text-align:center;background-color:#000c;border-radius:10px;width:50px;height:20px;margin-top:-10px;margin-left:-25px;font-size:12px;line-height:20px;display:none;position:absolute;top:50%;left:50%}.viewer-title{color:#ccc;opacity:.8;text-overflow:ellipsis;white-space:nowrap;max-width:90%;min-height:14px;margin:5px 5%;font-size:12px;line-height:1.2;transition:opacity .15s;display:inline-block;overflow:hidden}.viewer-title:hover{opacity:1}.viewer-button{-webkit-app-region:no-drag;cursor:pointer;background-color:#00000080;border-radius:50%;width:80px;height:80px;transition:background-color .15s;position:absolute;top:-40px;right:-40px;overflow:hidden}.viewer-button:focus,.viewer-button:hover{background-color:#000c}.viewer-button:focus{outline:0;box-shadow:0 0 3px #fff}.viewer-button:before{position:absolute;bottom:15px;left:15px}.viewer-fixed{position:fixed}.viewer-open{overflow:hidden}.viewer-show{display:block}.viewer-hide{display:none}.viewer-backdrop{background-color:#00000080}.viewer-invisible{visibility:hidden}.viewer-move{cursor:move;cursor:grab}.viewer-fade{opacity:0}.viewer-in{opacity:1}.viewer-transition{transition:all .3s}@keyframes viewer-spinner{0%{transform:rotate(0)}to{transform:rotate(360deg)}}.viewer-loading:after{content:\"\";z-index:1;border:4px solid #ffffff1a;border-left-color:#ffffff80;border-radius:50%;width:40px;height:40px;margin-top:-20px;margin-left:-20px;animation:1s linear infinite viewer-spinner;display:inline-block;position:absolute;top:50%;left:50%}@media (width<=767px){.viewer-hide-xs-down{display:none}}@media (width<=991px){.viewer-hide-sm-down{display:none}}@media (width<=1199px){.viewer-hide-md-down{display:none}}");
	_css(".nspp-image-preview{--lightningcss-light: ;--lightningcss-dark:initial;color-scheme:dark;background:0 0;border:0;width:100%;max-width:none;height:100%;max-height:none;margin:0;padding:0;position:fixed;inset:0;overflow:hidden}.nspp-image-preview::backdrop{-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);background:#0b0e14eb}.nspp-image-preview .viewer-backdrop{background:0 0}.nspp-image-preview .viewer-footer{padding:0 12px max(20px, env(safe-area-inset-bottom));box-sizing:border-box}.nspp-image-preview .viewer-toolbar>ul{-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);background:#252a34e6;border:1px solid #ffffff26;border-radius:999px;gap:4px;padding:6px;display:inline-flex;box-shadow:0 8px 32px #0005}.nspp-image-preview .viewer-toolbar>ul>li{background:0 0;border-radius:50%;place-items:center;width:36px;height:36px;margin:0;padding:0;display:grid}.nspp-image-preview .viewer-toolbar>ul>li:hover,.nspp-image-preview .viewer-button:hover{background-color:#ffffff24}.nspp-image-preview .viewer-button{top:max(16px, env(safe-area-inset-top));right:max(16px, env(safe-area-inset-right));background:#252a34e6;border:1px solid #ffffff26;border-radius:50%;width:40px;height:40px}.nspp-image-preview .viewer-button:before{margin:9px;position:static}.nspp-image-preview .viewer-list{margin-top:12px}.nspp-image-preview .viewer-list>li{opacity:.5;border:2px solid #0000;border-radius:6px}.nspp-image-preview .viewer-list>.viewer-active{opacity:1;border-color:#fff}.nspp-image-preview [role=button]:focus-visible{outline-offset:3px;outline:2px solid #fff}.nspp-preview-content img{cursor:zoom-in}.nspp-preview-content img:focus-visible{outline:2px solid var(--link-color,#0969da);outline-offset:3px;border-radius:3px}");
	function openImagePreview(content, image, onClose) {
		const dialog = document.createElement("dialog");
		dialog.className = "nspp-image-preview";
		dialog.setAttribute("aria-label", "图片预览");
		document.body.append(dialog);
		dialog.showModal();
		let viewer;
		let closed = false;
		const close = () => {
			if (closed) return;
			closed = true;
			viewer?.destroy();
			dialog.close();
			dialog.remove();
			if (image.isConnected) image.focus({ preventScroll: true });
			onClose();
		};
		dialog.addEventListener("cancel", (event) => {
			event.preventDefault();
			event.stopPropagation();
			close();
		});
		const images = Array.from(content.querySelectorAll("img"));
		const multiple = images.length > 1;
		viewer = new import_viewer.default(content, {
			container: dialog,
			initialViewIndex: images.indexOf(image),
			title: false,
			navbar: multiple,
			toolbar: {
				zoomOut: true,
				zoomIn: true,
				oneToOne: true,
				reset: true,
				prev: multiple,
				next: multiple
			},
			fullscreen: false,
			rotatable: false,
			scalable: false,
			inheritedAttributes: ["referrerPolicy"],
			transition: !matchMedia("(prefers-reduced-motion: reduce)").matches,
			ready() {
				const labels = {
					"zoom-in": "放大",
					"zoom-out": "缩小",
					"one-to-one": "原始大小",
					reset: "适应窗口",
					prev: "上一张",
					next: "下一张",
					mix: "关闭预览"
				};
				dialog.querySelectorAll("[data-viewer-action]").forEach((control) => {
					const label = labels[control.dataset.viewerAction || ""];
					if (label) {
						control.title = label;
						control.setAttribute("aria-label", label);
					}
				});
				const container = dialog.querySelector(".viewer-container");
				container?.removeAttribute("aria-labelledby");
				container?.setAttribute("aria-label", "图片预览");
			},
			hidden: close
		});
		viewer.show();
		return close;
	}
	function readingContent(source, base) {
		const fragment = document.createDocumentFragment();
		const allowed = new Set([
			"P",
			"BR",
			"STRONG",
			"B",
			"EM",
			"I",
			"S",
			"DEL",
			"BLOCKQUOTE",
			"PRE",
			"CODE",
			"UL",
			"OL",
			"LI",
			"H1",
			"H2",
			"H3",
			"H4",
			"HR",
			"TABLE",
			"THEAD",
			"TBODY",
			"TR",
			"TH",
			"TD",
			"A",
			"IMG"
		]);
		const copy = (node, parent) => {
			if (node.nodeType === Node.TEXT_NODE) {
				parent.appendChild(document.createTextNode(node.textContent || ""));
				return;
			}
			if (!(node instanceof Element) || node.matches("script, style, iframe, object, embed, form, input, button, textarea, select, svg, math, link, meta, base")) return;
			if (!allowed.has(node.tagName)) {
				node.childNodes.forEach((child) => copy(child, parent));
				return;
			}
			const el = document.createElement(node.tagName.toLowerCase());
			if (node.tagName === "A" || node.tagName === "IMG") {
				const attribute = node.tagName === "A" ? "href" : "src";
				const raw = node.getAttribute(attribute);
				if (!raw) return;
				let url;
				try {
					url = new URL(raw, base);
				} catch {
					return;
				}
				if (!["http:", "https:"].includes(url.protocol)) return;
				el.setAttribute(attribute, url.href);
				if (el instanceof HTMLAnchorElement) {
					el.target = "_blank";
					el.rel = "noopener noreferrer";
				}
				if (el instanceof HTMLImageElement) {
					el.alt = node.getAttribute("alt") || "";
					el.loading = "lazy";
					el.tabIndex = 0;
					el.setAttribute("role", "button");
					el.setAttribute("aria-label", el.alt ? `查看大图：${el.alt}` : "查看大图");
				}
			}
			node.childNodes.forEach((child) => copy(child, el));
			parent.appendChild(el);
		};
		source.childNodes.forEach((node) => copy(node, fragment));
		return fragment;
	}
	function createPostPreview(ctx) {
		const view = document.createElement("dialog");
		view.className = "nspp-post-preview";
		view.hidden = true;
		view.setAttribute("role", "dialog");
		view.setAttribute("aria-label", "帖子预览");
		const header = document.createElement("header");
		const title = document.createElement("a");
		title.target = "_blank";
		title.rel = "noopener noreferrer";
		const status = document.createElement("p");
		status.setAttribute("role", "status");
		const content = document.createElement("div");
		content.className = "nspp-preview-content";
		const footer = document.createElement("footer");
		const original = document.createElement("a");
		original.textContent = "查看原帖与回复 ↗";
		original.target = "_blank";
		original.rel = "noopener noreferrer";
		footer.append(original);
		header.append(title);
		view.append(header, status, content, footer);
		document.body.append(view);
		let source;
		let current = "";
		let actionsObserver;
		const renderActions = () => {
			const bar = source?.closest(".post-list-item")?.querySelector(".nspp-list-actions");
			footer.replaceChildren();
			if (bar) {
				const actions = document.createElement("div");
				actions.className = "nspp-list-actions";
				bar.querySelectorAll("button").forEach((button) => {
					const copy = button.cloneNode(true);
					copy.removeAttribute("id");
					copy.addEventListener("click", () => {
						if (!button.isConnected || button.disabled) return;
						hide();
						button.click();
					}, { signal: ctx.signal });
					actions.append(copy);
				});
				footer.append(actions);
			}
			footer.append(original);
		};
		let request;
		const mobile = () => matchMedia("(max-width: 600px), (hover: none)").matches;
		let closeTimer;
		let closeImage;
		const keepOpen = () => clearTimeout(closeTimer);
		const hide = () => {
			closeImage?.();
			request?.abort();
			keepOpen();
			view.close();
			view.hidden = true;
		};
		const scheduleClose = () => {
			if (mobile() || closeImage) return;
			keepOpen();
			closeTimer = setTimeout(hide, 220);
		};
		view.addEventListener("mouseenter", keepOpen, { signal: ctx.signal });
		view.addEventListener("mouseleave", scheduleClose, { signal: ctx.signal });
		content.addEventListener("click", (event) => {
			if (!(event.target instanceof HTMLImageElement) || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
			event.preventDefault();
			event.stopPropagation();
			if (closeImage) return;
			keepOpen();
			closeImage = openImagePreview(content, event.target, () => {
				closeImage = void 0;
			});
		}, {
			capture: true,
			signal: ctx.signal
		});
		content.addEventListener("keydown", (event) => {
			if (!(event.target instanceof HTMLImageElement) || !["Enter", " "].includes(event.key)) return;
			event.preventDefault();
			event.stopPropagation();
			event.target.click();
		}, {
			capture: true,
			signal: ctx.signal
		});
		const position = () => {
			if (view.hidden || !source) return;
			if (mobile()) {
				view.style.removeProperty("left");
				view.style.removeProperty("top");
				return;
			}
			const anchor = source.getBoundingClientRect();
			const margin = 12, gap = 8;
			const width = view.getBoundingClientRect().width;
			const height = view.getBoundingClientRect().height;
			const below = innerHeight - anchor.bottom - gap - margin;
			const above = anchor.top - gap - margin;
			const top = below >= height || below >= above ? anchor.bottom + gap : anchor.top - height - gap;
			view.style.left = `${Math.max(margin, Math.min(anchor.left, innerWidth - width - margin))}px`;
			view.style.top = `${Math.max(margin, Math.min(top, innerHeight - height - margin))}px`;
		};
		view.addEventListener("cancel", (event) => {
			event.preventDefault();
			hide();
		}, { signal: ctx.signal });
		view.addEventListener("click", (event) => {
			if (!mobile() || event.target !== view) return;
			const box = view.getBoundingClientRect();
			if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) hide();
		}, { signal: ctx.signal });
		window.addEventListener("resize", position, { signal: ctx.signal });
		window.addEventListener("scroll", position, {
			capture: true,
			signal: ctx.signal
		});
		const resize = typeof ResizeObserver === "function" ? new ResizeObserver(position) : void 0;
		resize?.observe(view);
		async function load(url) {
			request?.abort();
			const controller = new AbortController();
			request = controller;
			status.textContent = "正在加载帖子…";
			status.setAttribute("aria-busy", "true");
			content.replaceChildren();
			try {
				const html = await ctx.request(url.href, {
					responseType: "text",
					signal: AbortSignal.any([ctx.signal, controller.signal])
				});
				if (controller.signal.aborted || ctx.signal.aborted) return;
				const doc = new DOMParser().parseFromString(html, "text/html");
				const body = doc.querySelector(".nsk-post .post-content, .nsk-post .nsk-content, .post-content, .nsk-post .markdown-body, .nsk-content");
				if (!body) throw new Error("未找到正文");
				const author = doc.querySelector(".nsk-post .author-info, .author-info");
				const meta = document.createElement("div");
				meta.className = "nspp-preview-meta";
				meta.textContent = author?.textContent?.trim() || "";
				const article = document.createElement("article");
				article.append(readingContent(body, url.href));
				content.append(meta, article);
				const comments = Array.from(doc.querySelectorAll(".comment-content")).filter((node) => !body.contains(node));
				if (comments.length) {
					const heading = document.createElement("h3");
					heading.textContent = "回复摘选（当前页前 5 条）";
					content.append(heading);
					for (const comment of comments.slice(0, 5)) {
						const item = document.createElement("section");
						item.className = "nspp-preview-comment";
						const name = document.createElement("strong");
						name.textContent = comment.closest("li, .comment-container")?.querySelector(".author-info, .info-author")?.textContent?.trim() || "回复";
						item.append(name, readingContent(comment, url.href));
						content.append(item);
					}
				}
				status.textContent = "";
			} catch {
				if (controller.signal.aborted || ctx.signal.aborted) return;
				current = "";
				status.textContent = "暂时无法读取正文，请打开原帖查看或完成登录验证。";
			} finally {
				if (!controller.signal.aborted) {
					status.removeAttribute("aria-busy");
					position();
				}
			}
		}
		return {
			open(link, action) {
				const url = new URL(link.href, location.origin);
				if (url.origin !== location.origin || !/^\/post-\d+(?:-\d+)?(?:\.html)?\/?$/.test(url.pathname)) return;
				if (action !== "preview") {
					window.open(url.href, "_blank", "noopener,noreferrer");
					return;
				}
				if (closeImage) return;
				keepOpen();
				if (!view.hidden && source === link) return;
				source = link;
				title.textContent = link.textContent?.trim() || "打开原帖";
				title.href = original.href = url.href;
				actionsObserver?.disconnect();
				renderActions();
				const row = source.closest(".post-list-item");
				if (row) {
					actionsObserver = new MutationObserver(renderActions);
					actionsObserver.observe(row, {
						childList: true,
						subtree: true,
						characterData: true,
						attributes: true,
						attributeFilter: [
							"disabled",
							"aria-busy",
							"data-blocked"
						]
					});
				}
				view.hidden = false;
				if (!view.open) {
					if (mobile()) view.showModal();
					else view.show();
				}
				if (current !== url.href) {
					current = url.href;
					load(url);
				}
				position();
			},
			keepOpen,
			scheduleClose,
			destroy() {
				closeImage?.();
				keepOpen();
				view.close();
				actionsObserver?.disconnect();
				resize?.disconnect();
				request?.abort();
				view.remove();
			}
		};
	}
	var postPreview = {
		id: "post-preview",
		title: "帖子卡片预览",
		group: "阅读",
		description: "桌面悬停打开卡片，移动端点击标题打开弹窗；点击图片放大，支持缩放和切换，可从卡片进入原帖。",
		defaults: { enabled: true },
		mount(ctx) {
			const preview = createPostPreview(ctx);
			const bound = new Map();
			let timer;
			const stop = ctx.watch(() => {
				for (const link of bound.keys()) if (!link.isConnected) bound.delete(link);
				document.querySelectorAll(".post-list-item .post-title a").forEach((link) => {
					if (bound.has(link)) return;
					const url = new URL(link.href, location.origin);
					if (url.origin !== location.origin || !/^\/post-\d+(?:-\d+)?(?:\.html)?\/?$/.test(url.pathname)) return;
					bound.set(link, link.getAttribute("title"));
					link.removeAttribute("title");
					link.addEventListener("mouseenter", () => {
						if (!matchMedia("(hover: hover)").matches) return;
						preview.keepOpen();
						clearTimeout(timer);
						timer = setTimeout(() => preview.open(link, "preview"), 400);
					}, { signal: ctx.signal });
					link.addEventListener("mouseleave", () => {
						clearTimeout(timer);
						preview.scheduleClose();
					}, { signal: ctx.signal });
					link.addEventListener("click", (event) => {
						if (!matchMedia("(max-width: 600px), (hover: none)").matches || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
						event.preventDefault();
						clearTimeout(timer);
						preview.open(link, "preview");
					}, { signal: ctx.signal });
				});
			});
			return () => {
				stop();
				clearTimeout(timer);
				bound.forEach((title, link) => {
					if (title !== null) link.setAttribute("title", title);
				});
				bound.clear();
				preview.destroy();
			};
		}
	};
	function createPostInteraction(ctx, update) {
		const view = document.createElement("li");
		view.className = "nspp-interaction";
		view.hidden = true;
		view.setAttribute("aria-label", "帖子互动");
		view.setAttribute("role", "region");
		const head = document.createElement("header");
		const title = document.createElement("a");
		title.target = "_blank";
		title.rel = "noopener noreferrer";
		const close = document.createElement("button");
		close.type = "button";
		close.textContent = "×";
		close.setAttribute("aria-label", "关闭互动");
		const status = document.createElement("p");
		status.setAttribute("role", "status");
		const form = document.createElement("form");
		const input = document.createElement("textarea");
		input.rows = 4;
		input.placeholder = "写下回复，支持 Markdown…";
		input.setAttribute("aria-label", "回复内容");
		const footer = document.createElement("div");
		footer.className = "nspp-reply-actions";
		const hint = document.createElement("span");
		hint.textContent = "Markdown · 草稿暂存在本页";
		const send = document.createElement("button");
		send.type = "submit";
		send.textContent = "发送回复";
		send.disabled = true;
		footer.append(hint, send);
		form.append(input, footer);
		head.append(title, close);
		view.append(head, status, form);
		const frame = document.createElement("iframe");
		frame.hidden = true;
		frame.tabIndex = -1;
		frame.setAttribute("aria-hidden", "true");
		frame.title = "互动连接";
		document.body.append(frame);
		let url = "", action = "回复", pending = false, sending = false;
		const drafts = new Map();
		let observer;
		let timeout;
		let scheduled;
		let previousCounts = [];
		let didSubmit = false;
		let quickText;
		let quickCompletion;
		const finishQuick = (message) => {
			const done = quickCompletion;
			quickCompletion = void 0;
			quickText = void 0;
			done?.(message);
		};
		const busy = (value) => {
			if (value) status.setAttribute("aria-busy", "true");
			else status.removeAttribute("aria-busy");
		};
		const save = () => {
			if (url) drafts.set(url, input.value);
		};
		input.addEventListener("input", save, { signal: ctx.signal });
		close.addEventListener("click", () => {
			save();
			pending = false;
			view.hidden = true;
		}, { signal: ctx.signal });
		view.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				save();
				pending = false;
				view.hidden = true;
			}
		}, { signal: ctx.signal });
		function native() {
			const doc = frame.contentDocument;
			if (!doc || doc.location.origin !== location.origin || postURL(doc.location.href, location.origin)?.href !== url) return;
			const host = doc.querySelector(".md-editor");
			const cm = (host?.querySelector(".CodeMirror"))?.CodeMirror;
			const ta = host?.querySelector("textarea");
			return {
				doc,
				cm,
				ta,
				submit: host?.querySelector("button.submit.btn.focus-visible, button[type=\"submit\"]"),
				read: () => cm ? cm.getValue() : ta?.value ?? ""
			};
		}
		function sync() {
			try {
				const state = native();
				if (!state) return;
				const { doc, cm, ta, submit, read } = state;
				const counts = reactionCounts(doc);
				update(url, counts);
				send.disabled = sending || !(cm || ta) || !submit || submit.disabled;
				const alert = Array.from(doc.querySelectorAll("[role=\"alert\"], .el-message--error, .el-notification--error")).map((el) => el.textContent?.trim()).filter(Boolean).join(" ");
				if (alert) {
					status.textContent = alert;
					busy(false);
					if (sending) {
						sending = false;
						send.disabled = true;
						status.textContent += "；草稿已保留，请打开原帖核实后再试。";
						finishQuick(status.textContent);
					}
				}
				if (sending && didSubmit && !submit?.disabled && read() === "") {
					sending = false;
					didSubmit = false;
					input.value = "";
					save();
					busy(false);
					clearTimeout(timeout);
					send.disabled = false;
					status.textContent = "回复已提交。";
					finishQuick("回复已提交。");
				}
				if (quickCompletion && quickText !== void 0 && !sending && (cm || ta) && submit && !submit.disabled && !alert) {
					input.value = quickText;
					quickText = void 0;
					pending = false;
					form.requestSubmit();
					return;
				}
				if (alert && quickCompletion && !sending) finishQuick(alert);
				if (!pending && action === "引用" && !input.value && read()) {
					input.value = read();
					save();
					busy(false);
					clearTimeout(timeout);
					status.textContent = "";
				}
				if (!pending || view.hidden || alert) return;
				const menu = doc.querySelector(".nsk-post .comment-menu, .comment-menu");
				if (action === "回复" && (cm || ta) && submit) {
					pending = false;
					busy(false);
					clearTimeout(timeout);
					status.textContent = "";
					send.disabled = !!submit.disabled;
					return;
				}
				const target = menu && Array.from(menu.querySelectorAll(".menu-item")).find((el) => el.title === action || el.textContent?.trim() === action);
				if (!target) return;
				pending = false;
				if (action === "引用" && input.value.trim()) {
					busy(false);
					status.textContent = "已保留当前草稿；清空后再引用。";
					return;
				}
				previousCounts = counts;
				target.click();
				if (action === "引用") scheduled = setTimeout(() => {
					const next = native();
					if (next?.read()) {
						input.value = next.read();
						save();
						busy(false);
						clearTimeout(timeout);
						status.textContent = "";
					}
				}, 100);
				else {
					busy(false);
					status.textContent = `${action}请求已交给论坛，正在确认结果…`;
				}
			} catch {
				busy(false);
				status.textContent = "连接暂不可用，草稿已保留。";
				finishQuick(status.textContent);
			}
		}
		frame.addEventListener("load", () => {
			observer?.disconnect();
			try {
				const state = native();
				if (!state) throw new Error("连接不可用");
				observer = new MutationObserver(() => {
					clearTimeout(scheduled);
					scheduled = setTimeout(() => {
						sync();
						if (!pending && !sending && action !== "回复" && action !== "引用") {
							const counts = reactionCounts(state.doc);
							if (counts.some((n, i) => n !== null && n !== previousCounts[i])) {
								clearTimeout(timeout);
								busy(false);
								status.textContent = `${action}状态已更新`;
								previousCounts = counts;
							}
						}
					}, 60);
				});
				observer.observe(state.doc.body, {
					childList: true,
					subtree: true,
					characterData: true,
					attributes: true,
					attributeFilter: ["class", "disabled"]
				});
				sync();
				if (pending) {
					busy(false);
					status.textContent = "正在等待互动连接；若需要登录或验证，请点击标题打开原帖。";
				}
			} catch {
				busy(false);
				status.textContent = "无法连接帖子，请检查登录状态后重试。";
				finishQuick(status.textContent);
			}
		}, { signal: ctx.signal });
		form.addEventListener("submit", (event) => {
			event.preventDefault();
			if (sending || send.disabled || !input.value.trim()) return;
			try {
				const state = native();
				if (!state?.submit || state.submit.disabled) return;
				if (state.cm) state.cm.setValue(input.value);
				else if (state.ta) {
					state.ta.value = input.value;
					state.ta.dispatchEvent(new Event("input", { bubbles: true }));
				}
				save();
				sending = true;
				didSubmit = false;
				send.disabled = true;
				busy(true);
				status.textContent = "正在发送回复…";
				state.submit.click();
				didSubmit = true;
				clearTimeout(timeout);
				timeout = setTimeout(() => {
					if (sending) {
						busy(false);
						status.textContent = "尚未确认发送结果，草稿已保留，请勿重复发送。";
						finishQuick(status.textContent);
					}
				}, 2e4);
			} catch {
				busy(false);
				status.textContent = "发送结果未确认，草稿已保留，请勿重复发送。";
				finishQuick(status.textContent);
			}
		}, { signal: ctx.signal });
		return {
			quickReply(link, text) {
				const target = postURL(link.href, location.origin);
				if (!target || !text.trim()) return Promise.resolve("回复内容或帖子地址无效。");
				if (sending || quickCompletion) return Promise.resolve("上一条回复正在发送或结果尚未确认，请勿重复发送。");
				save();
				link.closest(".post-list-item")?.after(view);
				view.hidden = true;
				form.hidden = false;
				action = "回复";
				pending = false;
				return new Promise((resolve) => {
					quickCompletion = resolve;
					quickText = text;
					clearTimeout(timeout);
					timeout = setTimeout(() => finishQuick("连接超时，未发送回复；请检查登录状态或站点验证。"), 2e4);
					if (url !== target.href) {
						url = target.href;
						observer?.disconnect();
						clearTimeout(scheduled);
						frame.src = url;
					} else sync();
				});
			},
			open(link, next) {
				const target = postURL(link.href, location.origin);
				if (!target) return;
				if (sending || quickCompletion) {
					view.hidden = false;
					ctx.notify("上一条回复的发送结果尚未确认，请先查看原帖。");
					return;
				}
				save();
				title.textContent = link.textContent?.trim() || "打开原帖";
				title.href = target.href;
				action = next;
				pending = true;
				form.hidden = next !== "回复" && next !== "引用";
				link.closest(".post-list-item")?.after(view);
				view.hidden = false;
				clearTimeout(timeout);
				busy(true);
				status.textContent = "正在连接帖子…";
				timeout = setTimeout(() => {
					pending = false;
					busy(false);
					status.textContent = "站点尚未确认操作，可能需要登录或额外验证。可点击标题打开原帖；草稿已保留。";
				}, 2e4);
				if (url !== target.href) {
					url = target.href;
					input.value = drafts.get(url) || "";
					send.disabled = true;
					observer?.disconnect();
					clearTimeout(scheduled);
					frame.src = url;
				} else sync();
				if (!form.hidden) input.focus();
			},
			destroy() {
				finishQuick("操作已取消。");
				pending = false;
				clearTimeout(timeout);
				clearTimeout(scheduled);
				observer?.disconnect();
				frame.remove();
				view.remove();
				drafts.clear();
			}
		};
	}
	var defaults = [
		"感谢分享！",
		"学习了，感谢楼主。",
		"收藏了，之后仔细看看。",
		"感谢解答，问题解决了。",
		"这个方法很实用，感谢。",
		"请问方便补充一下具体配置吗？",
		"请问目前还有吗？",
		"祝早出！"
	];
	function createQuickReplies(ctx, send) {
		const saved = ctx.get("quickReplies");
		let replies = Array.isArray(saved) ? saved.filter((item) => typeof item === "string" && !!item.trim()).slice(0, 200) : [...defaults];
		let target, page = 0, editing = -1, busy = false;
		const size = 6;
		const dialog = document.createElement("dialog");
		dialog.className = "nspp-quick-replies";
		dialog.setAttribute("aria-label", "快捷回复");
		const head = document.createElement("div");
		head.className = "nspp-quick-head";
		const heading = document.createElement("strong");
		heading.textContent = "快捷回复";
		const close = document.createElement("button");
		close.type = "button";
		close.textContent = "×";
		close.setAttribute("aria-label", "关闭快捷回复");
		head.append(heading, close);
		const title = document.createElement("p");
		title.className = "nspp-quick-target";
		const toolbar = document.createElement("div");
		toolbar.className = "nspp-quick-toolbar";
		const search = document.createElement("input");
		search.type = "search";
		search.placeholder = "查找回复";
		search.setAttribute("aria-label", "查找回复");
		const add = document.createElement("button");
		add.type = "button";
		add.textContent = "新增";
		add.className = "nspp-quick-primary";
		toolbar.append(search, add);
		const list = document.createElement("div");
		list.className = "nspp-quick-list";
		const editor = document.createElement("form");
		editor.hidden = true;
		const text = document.createElement("textarea");
		text.maxLength = 2e3;
		text.required = true;
		text.rows = 3;
		text.placeholder = "输入常用回复内容…";
		text.setAttribute("aria-label", "模板内容");
		const save = document.createElement("button");
		save.type = "submit";
		save.textContent = "保存";
		save.className = "nspp-quick-primary";
		const cancel = document.createElement("button");
		cancel.type = "button";
		cancel.textContent = "取消";
		editor.append(text, save, cancel);
		const footer = document.createElement("div");
		footer.className = "nspp-quick-pagination";
		const previous = document.createElement("button");
		previous.type = "button";
		previous.textContent = "上一页";
		const total = document.createElement("span");
		const next = document.createElement("button");
		next.type = "button";
		next.textContent = "下一页";
		footer.append(previous, total, next);
		const status = document.createElement("p");
		status.className = "nspp-quick-status";
		status.setAttribute("role", "status");
		status.textContent = "点击回复内容即直接发送";
		dialog.append(head, title, toolbar, list, editor, footer, status);
		document.body.append(dialog);
		const persist = () => ctx.set("quickReplies", replies);
		const startEdit = (index) => {
			editing = index;
			text.value = index < 0 ? "" : replies[index];
			editor.hidden = false;
			text.focus();
		};
		function render() {
			const query = search.value.trim().toLocaleLowerCase();
			const matches = replies.map((body, index) => ({
				body,
				index
			})).filter((item) => item.body.toLocaleLowerCase().includes(query));
			const pages = Math.max(1, Math.ceil(matches.length / size));
			page = Math.min(page, pages - 1);
			list.replaceChildren();
			for (const { body, index } of matches.slice(page * size, (page + 1) * size)) {
				const row = document.createElement("div");
				row.className = "nspp-quick-item";
				const reply = document.createElement("button");
				reply.type = "button";
				reply.className = "nspp-quick-send";
				reply.textContent = body;
				reply.title = `直接发送：${body}`;
				reply.disabled = busy;
				reply.addEventListener("click", async () => {
					if (busy || !target) return;
					const link = target;
					busy = true;
					status.textContent = "加载中";
					status.setAttribute("aria-busy", "true");
					render();
					try {
						const result = await send(link, body);
						if (!ctx.signal.aborted) {
							status.textContent = result;
							dialog.close();
							ctx.notify(result);
						}
					} catch {
						if (!ctx.signal.aborted) {
							status.textContent = "回复结果未确认，请勿重复发送。";
							dialog.close();
							ctx.notify(status.textContent);
						}
					} finally {
						busy = false;
						status.removeAttribute("aria-busy");
						if (!ctx.signal.aborted) render();
					}
				}, { signal: ctx.signal });
				const edit = document.createElement("button");
				edit.type = "button";
				edit.textContent = "修改";
				edit.disabled = busy;
				edit.addEventListener("click", () => startEdit(index), { signal: ctx.signal });
				const remove = document.createElement("button");
				remove.type = "button";
				remove.textContent = "删除";
				remove.className = "nspp-quick-delete";
				remove.disabled = busy;
				remove.addEventListener("click", () => {
					replies.splice(index, 1);
					persist();
					editor.hidden = true;
					render();
				}, { signal: ctx.signal });
				row.append(reply, edit, remove);
				list.append(row);
			}
			if (!matches.length) {
				const empty = document.createElement("p");
				empty.textContent = "暂无匹配回复";
				list.append(empty);
			}
			total.textContent = `${page + 1} / ${pages} · ${matches.length} 条`;
			previous.disabled = busy || page === 0;
			next.disabled = busy || page === pages - 1;
			add.disabled = busy || replies.length >= 200;
			search.disabled = busy;
			save.disabled = busy;
		}
		close.addEventListener("click", () => dialog.close(), { signal: ctx.signal });
		search.addEventListener("input", () => {
			page = 0;
			render();
		}, { signal: ctx.signal });
		add.addEventListener("click", () => startEdit(-1), { signal: ctx.signal });
		cancel.addEventListener("click", () => {
			editor.hidden = true;
		}, { signal: ctx.signal });
		editor.addEventListener("submit", (event) => {
			event.preventDefault();
			if (busy || !text.value.trim()) return;
			if (editing < 0) replies.push(text.value.trim());
			else replies[editing] = text.value.trim();
			persist();
			editor.hidden = true;
			render();
		}, { signal: ctx.signal });
		previous.addEventListener("click", () => {
			page--;
			render();
		}, { signal: ctx.signal });
		next.addEventListener("click", () => {
			page++;
			render();
		}, { signal: ctx.signal });
		return {
			open(link) {
				if (busy) {
					if (!dialog.open) dialog.showModal();
					return;
				}
				target = link;
				title.textContent = link.textContent?.trim() || "当前帖子";
				title.title = title.textContent;
				editor.hidden = true;
				status.textContent = "点击回复内容即直接发送";
				render();
				if (!dialog.open) dialog.showModal();
			},
			destroy() {
				dialog.remove();
			}
		};
	}
	async function readPostCounts(ctx, href) {
		const url = postURL(href, location.origin);
		if (!url || ctx.signal.aborted) throw new Error("计数读取已取消");
		const html = await ctx.request(url.href, { responseType: "text" });
		if (ctx.signal.aborted) throw new Error("计数读取已取消");
		return reactionCounts(new DOMParser().parseFromString(html, "text/html"));
	}
	var listInteractions = {
		id: "list-interactions",
		title: "原生列表增强",
		group: "阅读",
		description: "保留官网列表布局与分类位置，增强相对时间和悬停预览中的互动操作。",
		defaults: {
			enabled: true,
			automaticCounts: false
		},
		fields: { automaticCounts: {
			label: "自动预读列表互动计数（增加请求）",
			type: "text"
		} },
		mount(ctx) {
			const rows = new Map();
			const categoryGroups = [];
			const times = new Map();
			const refreshTimes = () => {
				times.forEach((original, el) => {
					if (!el.isConnected) {
						times.delete(el);
						return;
					}
					const result = forumTime(original.value);
					if (result) {
						if (el.textContent !== result.text) el.textContent = result.text;
						el.title = result.full;
					}
				});
			};
			const timeTimer = setInterval(refreshTimes, 6e4);
			const cache = new Map();
			const inflight = new Set();
			const queue = new Map();
			const revisions = new Map();
			let disposed = false;
			const apply = (url, values) => {
				values = values.map((value, i) => value ?? cache.get(url)?.[i] ?? null);
				if (!values.some((value) => value !== null)) return;
				cache.set(url, values);
				if (cache.size > 100) cache.delete(cache.keys().next().value);
				rows.forEach((row) => {
					if (row.url === url) row.counts.forEach((node, i) => {
						const value = values[i] == null ? "" : String(values[i]);
						if (node.textContent !== value) node.textContent = value;
					});
				});
			};
			const view = createPostInteraction(ctx, (url, values) => {
				if (values.some((value) => value !== null)) revisions.set(url, (revisions.get(url) || 0) + 1);
				apply(url, values);
			});
			const quickReplies = createQuickReplies(ctx, (link, text) => view.quickReply(link, text));
			const markBusy = (url, busy) => rows.forEach((row) => {
				if (row.url !== url) return;
				const label = row.bar.querySelector(".nspp-count-loading");
				if (label) {
					label.hidden = !busy;
					if (busy) label.setAttribute("aria-busy", "true");
					else label.removeAttribute("aria-busy");
				}
			});
			const drain = () => {
				while (!disposed && !ctx.signal.aborted && inflight.size < 2 && queue.size) {
					const [url, bar] = queue.entries().next().value;
					queue.delete(url);
					if (!bar.isConnected) continue;
					inflight.add(url);
					markBusy(url, true);
					const revision = revisions.get(url) || 0;
					readPostCounts(ctx, url).then((values) => {
						if (!disposed && !ctx.signal.aborted && revision === (revisions.get(url) || 0)) apply(url, values);
					}).catch(() => {}).finally(() => {
						inflight.delete(url);
						markBusy(url, false);
						drain();
					});
				}
			};
			const load = (url, bar) => {
				if (disposed || cache.get(url)?.every((value) => value !== null) || inflight.has(url) || queue.has(url)) return;
				queue.set(url, bar);
				markBusy(url, true);
				drain();
			};
			let hoverTimer;
			const visible = ctx.get("automaticCounts") && typeof IntersectionObserver === "function" ? new IntersectionObserver((entries) => {
				for (const entry of entries) if (entry.isIntersecting) {
					visible?.unobserve(entry.target);
					const state = rows.get(entry.target);
					if (state) load(state.url, state.bar);
				}
			}, { rootMargin: "0px" }) : null;
			const stop = ctx.watch(() => {
				for (const [row, state] of rows) if (!row.isConnected) {
					visible?.unobserve(row);
					state.bar.remove();
					rows.delete(row);
				}
				ctx.root.querySelectorAll(".post-list-item:not(.topic-carousel-item)").forEach((row) => {
					if (rows.has(row)) return;
					const link = row.querySelector(".post-title a");
					const content = row.querySelector(".post-list-content");
					if (!link || !content) return;
					const url = postURL(link.href, location.origin);
					if (!url) return;
					const bar = document.createElement("div");
					bar.className = "nspp-list-actions";
					bar.hidden = true;
					bar.setAttribute("aria-label", "帖子互动");
					const counts = [];
					reactions.forEach(({ title, icon }, index) => {
						const button = document.createElement("button");
						button.type = "button";
						button.title = title;
						button.setAttribute("aria-label", title);
						button.append(siteIcon(icon));
						const label = document.createElement("span");
						label.textContent = title;
						label.hidden = index < 4;
						button.append(label);
						if (index < 4) {
							const count = document.createElement("span");
							count.textContent = cache.get(url.href)?.[index] == null ? "" : String(cache.get(url.href)[index]);
							counts.push(count);
							button.append(count);
						}
						button.addEventListener("click", () => view.open(link, title), { signal: ctx.signal });
						bar.append(button);
					});
					const quick = document.createElement("button");
					quick.type = "button";
					quick.title = "快速回复";
					quick.setAttribute("aria-label", "快速回复");
					quick.textContent = "快速回复";
					quick.addEventListener("click", () => quickReplies.open(link), { signal: ctx.signal });
					bar.append(quick);
					const category = row.querySelector(".post-category");
					if (category) {
						const shortcut = quick.cloneNode(true);
						shortcut.className = "nspp-category-reply";
						const computed = getComputedStyle(category);
						for (const property of [
							"font",
							"color",
							"background-color",
							"border",
							"border-radius",
							"box-shadow",
							"padding",
							"line-height"
						]) shortcut.style.setProperty(property, computed.getPropertyValue(property));
						shortcut.addEventListener("click", () => quickReplies.open(link), { signal: ctx.signal });
						const group = document.createElement("span");
						group.className = "nspp-category-actions";
						for (const property of [
							"position",
							"top",
							"right",
							"bottom",
							"left",
							"transform",
							"float",
							"margin",
							"z-index"
						]) group.style.setProperty(property, computed.getPropertyValue(property));
						if (computed.position === "absolute" || computed.position === "fixed") group.style.left = "auto";
						const style = category.getAttribute("style");
						for (const [property, value] of Object.entries({
							position: "static",
							inset: "auto",
							transform: "none",
							float: "none",
							margin: "0",
							width: "auto",
							minWidth: "max-content",
							maxWidth: "none",
							flex: "0 0 auto"
						})) category.style.setProperty(property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`), value, "important");
						category.before(group);
						group.append(category, shortcut);
						categoryGroups.push({
							group,
							category,
							style
						});
					}
					const loading = document.createElement("span");
					loading.className = "nspp-count-loading";
					loading.textContent = "加载中";
					loading.setAttribute("role", "status");
					loading.hidden = true;
					bar.append(loading);
					content.append(bar);
					rows.set(row, {
						url: url.href,
						bar,
						counts
					});
					if (visible) visible.observe(row);
					row.addEventListener("mouseenter", () => {
						clearTimeout(hoverTimer);
						hoverTimer = setTimeout(() => load(url.href, bar), 500);
					}, { signal: ctx.signal });
					row.addEventListener("mouseleave", () => clearTimeout(hoverTimer), { signal: ctx.signal });
					bar.addEventListener("focusin", () => {
						load(url.href, bar);
					}, { signal: ctx.signal });
					const time = row.querySelector(".info-last-comment-time");
					if (time) {
						const text = time.textContent || "";
						const value = [
							time.getAttribute("datetime"),
							time.getAttribute("title"),
							text
						].find((value) => value && forumTime(value));
						if (value) {
							times.set(time, {
								value,
								text,
								title: time.getAttribute("title")
							});
							refreshTimes();
						}
					}
				});
			});
			return () => {
				clearTimeout(hoverTimer);
				categoryGroups.forEach(({ group, category, style }) => {
					group.before(category);
					if (style === null) category.removeAttribute("style");
					else category.setAttribute("style", style);
					group.remove();
				});
				clearInterval(timeTimer);
				times.forEach((original, el) => {
					el.textContent = original.text;
					if (original.title === null) el.removeAttribute("title");
					else el.title = original.title;
				});
				disposed = true;
				queue.clear();
				visible?.disconnect();
				stop();
				quickReplies.destroy();
				view.destroy();
				rows.forEach((state) => state.bar.remove());
			};
		}
	};
	function count(value) {
		if (typeof value !== "number" && !(typeof value === "string" && /^\d+$/.test(value))) return null;
		const number = Number(value);
		return Number.isSafeInteger(number) && number >= 0 ? number : null;
	}
	function discussionStats(root, postId) {
		const encoded = root.querySelector("#temp-script")?.textContent?.trim();
		if (!encoded) throw new Error("帖子数据不可用");
		const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
		const data = JSON.parse(new TextDecoder().decode(bytes))?.postData;
		if (!data || String(data.postId) !== postId) throw new Error("帖子数据不匹配");
		const page = count(data.postPage), lastPage = count(data.postPageCount);
		const floors = Array.isArray(data.comments) ? data.comments.map((comment) => count(comment?.floorIndex)).filter((floor) => floor !== null) : [];
		return {
			views: count(data.views),
			comments: page && page === lastPage && floors.length ? Math.max(...floors) : null,
			lastPage: lastPage && lastPage > 0 ? lastPage : null
		};
	}
	var discussionStatsFeature = {
		id: "discussion-stats",
		title: "主题帖浏览与评论数",
		group: "阅读",
		description: "个人主页主题帖列表显示浏览数和评论数；按可见行加载，每帖最多读取两页，结果缓存 5 分钟。",
		defaults: { enabled: true },
		mount(ctx) {
			if (!/^\/space\/\d+\/?$/.test(location.pathname)) return;
			const cache = new Map();
			const pending = new Map();
			const rows = new Map();
			let route = "", controller = new AbortController();
			const active = () => /^#\/discussions(?:\/\d+)?\/?(?:\?.*)?$/.test(location.hash);
			const read = (href) => {
				const cached = cache.get(href);
				if (cached && Date.now() - cached.time < 3e5) return Promise.resolve(cached);
				const existing = pending.get(href);
				if (existing) return existing;
				const signal = controller.signal;
				const promise = (async () => {
					const id = href.match(/\/post-(\d+)-1$/)[1];
					const page = async (url) => discussionStats(new DOMParser().parseFromString(await ctx.request(url, {
						responseType: "text",
						signal
					}), "text/html"), id);
					const first = await page(href);
					const counts = {
						views: first.views,
						comments: first.comments
					};
					if (first.lastPage && first.lastPage > 1) try {
						counts.comments = (await page(`/post-${id}-${first.lastPage}`)).comments;
					} catch {
						if (signal.aborted) throw new Error("读取已取消");
					}
					if (signal.aborted || ctx.signal.aborted) throw new Error("读取已取消");
					if (counts.views !== null && counts.comments !== null) {
						cache.delete(href);
						cache.set(href, {
							...counts,
							time: Date.now()
						});
						if (cache.size > 100) cache.delete(cache.keys().next().value);
					}
					return counts;
				})();
				pending.set(href, promise);
				promise.finally(() => {
					if (pending.get(href) === promise) pending.delete(href);
				}).catch(() => {});
				return promise;
			};
			const load = async (row) => {
				const entry = rows.get(row);
				if (!entry) return;
				observer.unobserve(row);
				try {
					const counts = await read(entry.href);
					if (ctx.signal.aborted || !row.isConnected || rows.get(row) !== entry || !active()) return;
					entry.stats.querySelectorAll("[data-count]").forEach((value) => {
						const key = value.dataset.count;
						value.parentElement.hidden = counts[key] === null;
						value.textContent = counts[key] === null ? "" : String(counts[key]);
						value.parentElement.title = `${key === "views" ? "浏览" : "评论"}：${counts[key]}`;
					});
					entry.stats.hidden = counts.views === null && counts.comments === null;
				} catch {}
			};
			const observer = new IntersectionObserver((entries) => {
				for (const entry of entries) if (entry.isIntersecting) load(entry.target);
			}, { rootMargin: "200px" });
			const remove = (row) => {
				observer.unobserve(row);
				rows.get(row)?.stats.remove();
				rows.delete(row);
				row.classList.remove("nspp-discussion-row");
			};
			const scan = () => {
				if (route !== location.href) {
					route = location.href;
					controller.abort();
					controller = new AbortController();
					pending.clear();
					for (const row of rows.keys()) remove(row);
				}
				for (const [row, entry] of rows) if (!row.isConnected || postURL(row.querySelector("a")?.href || "", location.origin)?.href !== entry.href) remove(row);
				if (!active()) return;
				document.querySelectorAll(".discussion-wrapper > div.discussion-item").forEach((row) => {
					if (rows.has(row)) return;
					const url = postURL(row.querySelector("a")?.href || "", location.origin);
					if (!url) return;
					const stats = document.createElement("span");
					stats.className = "nspp-discussion-stats";
					stats.hidden = true;
					for (const [key, icon] of [["views", "eyes"], ["comments", "comments"]]) {
						const item = document.createElement("span");
						item.hidden = true;
						const value = document.createElement("span");
						value.dataset.count = key;
						item.append(siteIcon(icon), value);
						stats.append(item);
					}
					row.classList.add("nspp-discussion-row");
					row.append(stats);
					rows.set(row, {
						href: url.href,
						stats
					});
					observer.observe(row);
				});
			};
			const stop = ctx.watch(scan);
			window.addEventListener("hashchange", scan, { signal: ctx.signal });
			window.addEventListener("popstate", scan, { signal: ctx.signal });
			return () => {
				stop();
				controller.abort();
				observer.disconnect();
				for (const row of rows.keys()) remove(row);
			};
		}
	};
	_css("#nspp-tools{z-index:999;flex-direction:column;align-items:flex-end;gap:.4rem;max-width:min(22rem,75vw);max-height:55dvh;padding:8px 8px 0 0;display:flex;position:fixed;bottom:4rem;right:calc(1rem - 8px);overflow-y:auto}.discussion-wrapper .discussion-item.nspp-discussion-row>a:first-child{overflow-wrap:anywhere;flex:1;min-width:0}.discussion-wrapper .discussion-item.nspp-discussion-row>:not(a:first-child){flex:none;margin-right:0}.discussion-wrapper .nspp-discussion-row>.nspp-discussion-stats{color:#ccc;font-variant-numeric:tabular-nums;white-space:nowrap;flex:none;gap:10px;margin:0 0 0 auto;padding-left:12px;font-size:12px;display:inline-flex}.nspp-discussion-stats[hidden],.nspp-discussion-stats>span[hidden]{display:none!important}.nspp-discussion-stats>span{align-items:center;gap:4px;display:inline-flex}.discussion-wrapper .discussion-item .nspp-discussion-stats .iconpark-icon{color:currentColor;flex:none;width:14px;height:14px}.discussion-wrapper .discussion-item .nspp-discussion-stats .iconpark-icon:hover{transform:none}#nspp-tools button,[data-nspp-resolve],.nspp-action{font:inherit;border:1px solid var(--border-color,#929a9380);color:var(--text-color,inherit);background:var(--bg-color,Canvas);cursor:pointer;border-radius:.4rem;padding:.35rem .6rem;font-size:.8rem}#nspp-tools a,[data-nspp-footprints] a{text-underline-offset:.2em}#nspp-tools a:hover,[data-nspp-footprints] a:hover{text-decoration:underline}#nspp-tools button:disabled,.nspp-compose button:disabled{opacity:1;cursor:wait}#nspp-tools :focus-visible{outline-offset:2px;outline:2px solid}@media (prefers-reduced-motion:reduce){[class*=nspp-]{scroll-behavior:auto!important}}.nspp-monitor{border:1px solid var(--border-color,#929a9380);background:var(--bg-color,Canvas);width:min(42rem,92vw);max-height:85dvh;color:var(--text-color,CanvasText);border-radius:.75rem;padding:1rem;overflow:auto}.nspp-monitor::backdrop{background:#0006}.nspp-monitor ul{padding-left:1.25rem}.nspp-monitor li{overflow-wrap:anywhere;margin:.4rem 0}.nspp-monitor a{text-underline-offset:.2em}.nspp-monitor a:hover{text-decoration:underline}.nspp-block-controls{flex-wrap:wrap;gap:.3rem;margin-left:.4rem;font-size:.75rem;display:inline-flex}.nspp-user-badges{vertical-align:baseline;white-space:nowrap;font-variant-numeric:tabular-nums;flex-wrap:nowrap;align-items:center;gap:5px;margin-inline-start:4px;font:10px/16px -apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,sans-serif;display:inline-flex}.nspp-user-badges>span{white-space:nowrap;background:0 0;border:0;padding:0}.nspp-level{color:var(--nspp-badge-color,#59636e);font-weight:600}.nspp-age{color:#59636e;cursor:help}.nspp-user-badges button{font:inherit;color:inherit;min-height:0;box-shadow:none;cursor:pointer;background:0 0;border:0;border-radius:2px;padding:0}.nspp-user-badges .nspp-trust{color:var(--nspp-badge-color,#59636e);font-weight:600}.nspp-user-badges .nspp-trust:hover{text-underline-offset:3px;text-decoration:underline}.nspp-user-badges button:focus-visible{outline-offset:2px;outline:2px solid #0969da}.nspp-level[data-level=\"0\"]{--nspp-badge-color:#66717e}.nspp-level[data-level=\"2\"]{--nspp-badge-color:#0969da}.nspp-level[data-level=\"3\"]{--nspp-badge-color:#087f8c}.nspp-level[data-level=\"4\"]{--nspp-badge-color:#218044}.nspp-level[data-level=\"5\"]{--nspp-badge-color:#a66b08}.dark-layout .nspp-level,.dark-layout .nspp-user-badges .nspp-trust{color:var(--nspp-badge-color,#9198a1)}.dark-layout .nspp-age{color:#9198a1}.dark-layout .nspp-level[data-level=\"0\"]{--nspp-badge-color:#a3adb8}.dark-layout .nspp-level[data-level=\"2\"]{--nspp-badge-color:#79b8ff}.dark-layout .nspp-level[data-level=\"3\"]{--nspp-badge-color:#56c8ce}.dark-layout .nspp-level[data-level=\"4\"]{--nspp-badge-color:#70cf91}.dark-layout .nspp-level[data-level=\"5\"]{--nspp-badge-color:#dfb653}.nspp-level[data-level=\"1\"],.nspp-trust[data-tier=danger]{--nspp-badge-color:#cf3434}.nspp-trust[data-tier=warning]{--nspp-badge-color:#a66b08}.nspp-trust[data-tier=success]{--nspp-badge-color:#218044}.dark-layout .nspp-level[data-level=\"1\"],.dark-layout .nspp-trust[data-tier=danger]{--nspp-badge-color:#ff8585}.dark-layout .nspp-trust[data-tier=warning]{--nspp-badge-color:#dfb653}.dark-layout .nspp-trust[data-tier=success]{--nspp-badge-color:#70cf91}.nspp-user-badges .nspp-trust[data-tier=perfect]{--nspp-badge-color:#ffe66d;background:#b82025;border-radius:3px;padding:0 4px}.nspp-user-badges .nspp-level[data-level=\"6\"]{--nspp-badge-color:#916008;background:#fff3cd;border-radius:3px;padding:0 4px;box-shadow:inset 0 0 0 1px #dfba6266}.dark-layout .nspp-user-badges .nspp-level[data-level=\"6\"]{--nspp-badge-color:#f0ce78;background:#3c321c;box-shadow:inset 0 0 0 1px #dfba6255}.role-tag[data-nspp-role]{color:#2463a0;box-shadow:none;letter-spacing:0;vertical-align:middle;white-space:nowrap;background:#eaf3fc;border:0;border-radius:3px;flex:none;align-items:center;gap:3px;padding:0 5px;font:600 10px/16px -apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,sans-serif;display:inline-flex}.role-tag[data-nspp-role]:before{content:\"\";clip-path:polygon(50% 0,95% 17%,88% 65%,50% 100%,12% 65%,5% 17%);background:currentColor;flex:none;width:9px;height:10px}.role-tag[data-nspp-role=founder]{color:#087f78;background:#e5f4ef}.role-tag[data-nspp-role=founder]:before{clip-path:polygon(50% 0,66% 34%,100% 50%,66% 66%,50% 100%,34% 66%,0 50%,34% 34%)}.role-tag[data-nspp-role=owner]{color:#4c596a;background:#eaf0f5}.role-tag[data-nspp-role=owner]:before{clip-path:polygon(0 15%,25% 40%,50% 0,75% 40%,100% 15%,88% 85%,12% 85%)}.dark-layout .role-tag[data-nspp-role=admin]{color:#9ac7f2;background:#23374b}.dark-layout .role-tag[data-nspp-role=founder]{color:#7cd4c1;background:#1e3b35}.dark-layout .role-tag[data-nspp-role=owner]{color:#c1ccd9;background:#303a47}.nspp-history{color:#1f2328;background:#fff;border:1px solid #d1d9e0;border-radius:8px;width:min(640px,100vw - 24px);max-width:none;max-height:80dvh;margin:auto;padding:0;font:13px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,sans-serif;box-shadow:0 8px 28px #1f232833}.nspp-history[open]{flex-direction:column;display:flex}.nspp-history::backdrop{background:#1f232866}.nspp-history *{box-sizing:border-box}.nspp-history header{box-shadow:none;background:0 0;border-bottom:0;flex:none;justify-content:space-between;align-items:center;padding:6px 12px;display:flex}.nspp-history h2{margin:0;font-size:14px;font-weight:600}.nspp-history button{min-height:26px;color:inherit;cursor:pointer;white-space:nowrap;background:#f6f8fa;border:1px solid #d1d9e0;border-radius:5px;padding:2px 8px;font-family:inherit;font-size:12px;line-height:20px}.nspp-history [hidden]{display:none!important}.nspp-history-toolbar{border-bottom:0;flex:none;gap:6px;padding:4px 12px 6px;display:flex}.nspp-history input{width:0;min-width:0;color:inherit;font:inherit;background:0 0;border:1px solid #d1d9e0;border-radius:5px;flex:1;padding:4px 8px}.nspp-history ol{overscroll-behavior:contain;min-height:60px;margin:0;padding:0 12px;list-style:none;overflow-y:auto}.nspp-history li{border:0;align-items:center;gap:8px;margin:0;padding:3px 0;display:flex}.nspp-history li button{background:0 0;border-color:#0000;min-height:24px;padding:1px 6px}.nspp-history li:hover{background:#818b980c}.nspp-history li a{color:#0969da;white-space:nowrap;text-overflow:ellipsis;flex:1;min-width:0;text-decoration:none;overflow:hidden}.nspp-history a:hover{text-underline-offset:2px;text-decoration:underline}.nspp-history time{color:#59636e;flex:none;font-size:11px}.nspp-history :focus-visible{outline-offset:2px;outline:2px solid #0969da}.dark-layout .nspp-history{color:#f0f6fc;background:#0d1117;border-color:#3d444d}.dark-layout .nspp-history header,.dark-layout .nspp-history button{background:#151b23}.dark-layout .nspp-history a{color:#79c0ff}@media (width<=600px){.nspp-history{width:calc(100vw - 16px)}.nspp-history-toolbar{flex-wrap:wrap}.nspp-history time{display:none}}.nspp-block-toggle{vertical-align:middle;color:#59636e;cursor:pointer;background:0 0;border:0;border-radius:4px;min-width:0;margin-left:5px;padding:0 2px;font:11px/18px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}.nspp-block-toggle[data-blocked=true]{color:#cf222e;border-color:#ff818280}.nspp-block-toggle:disabled{opacity:1;cursor:wait}.dark-layout .nspp-block-toggle{color:#9198a1;border-color:#3d444d}.nspp-user-badges[aria-busy=true]{color:#59636e;border-radius:4px;min-width:88px;min-height:16px}.nspp-trust-dialog{padding:16px}.nspp-trust-dialog p{white-space:pre-line;line-height:1.8}.nspp-trust-dialog button{align-self:flex-end}.nspp-post-preview{z-index:2147483644;border:1px solid var(--border-color,#929a9380);background:var(--bg-color,Canvas);width:min(340px,100vw - 24px);height:auto;max-height:min(320px,100dvh - 24px);color:var(--text-color,CanvasText);text-align:left;border-radius:6px;flex-direction:column;margin:0;padding:0;font:12px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,sans-serif;display:flex;position:fixed;overflow:hidden;box-shadow:0 3px 12px #00000018}.nspp-post-preview[hidden]{display:none}.nspp-post-preview header{border-bottom:1px solid #929a9350;flex-shrink:0;align-items:center;gap:8px;padding:5px 8px;font-size:12px;line-height:18px;display:flex;position:static;box-shadow:none!important;text-shadow:none!important}.nspp-post-preview header a{white-space:normal;overflow-wrap:anywhere;min-width:0;color:inherit;flex:1;font-weight:500;text-decoration:none;text-shadow:none!important;box-shadow:none!important}.nspp-post-preview button{width:20px;height:20px;min-height:0;color:inherit;cursor:pointer;background:0 0;border:0;border-radius:3px;flex:none;padding:0;font:16px/18px Arial,sans-serif}.nspp-post-preview>p{margin:0;padding:5px 8px;font-size:11px}.nspp-post-preview>p:empty{display:none}.nspp-preview-content{overscroll-behavior:contain;overflow-wrap:anywhere;flex:0 auto;min-height:0;padding:7px 8px;font-size:12px;line-height:1.5;overflow:auto}.nspp-preview-meta{opacity:.65;margin-bottom:5px;font-size:11px}.nspp-preview-content img{object-fit:contain;width:auto;max-width:100%;height:auto;max-height:120px}.nspp-preview-content pre{background:#818b9814;border-radius:6px;padding:6px;overflow:auto}.nspp-preview-content blockquote{border-left:3px solid #818b9850;margin:6px 0;padding-left:8px}.nspp-preview-content table{max-width:100%;display:block;overflow:auto}.nspp-preview-content h3{margin:6px 0;font-size:12px}.nspp-preview-comment{border-top:1px solid #818b9830;padding:6px 0}.nspp-preview-comment>strong{font-size:12px}.nspp-post-preview footer{background:0 0;border-top:1px solid #818b9830;flex-shrink:0;padding:4px 8px;font-size:11px;line-height:16px}.nspp-post-preview footer a,.nspp-preview-content a{color:var(--link-color,#0969da)}.nspp-preview-content article>:first-child{margin-top:0}.nspp-preview-content article>:last-child{margin-bottom:0}.nspp-post-preview,.nspp-post-preview *{box-sizing:border-box}.nspp-preview-content p{font-size:inherit;line-height:inherit;margin:5px 0}.nspp-preview-content :is(ul,ol){margin:5px 0;padding-left:18px}.nspp-preview-content :is(h1,h2,h4){margin:6px 0;font-size:13px;line-height:1.5}.nspp-post-preview button:hover{background:#818b981a}.nspp-post-preview footer a{color:inherit;opacity:.7;text-decoration:none}.nspp-post-preview footer a:hover{opacity:1;text-decoration:underline}.nspp-meta-label{opacity:.6;font-size:10px}.nspp-user-badges :is(.nspp-level,.nspp-age,.nspp-trust){align-items:center;gap:3px;display:inline-flex}.nspp-user-badges .iconpark-icon{flex:none;width:11px;height:11px}.nspp-list-actions{white-space:nowrap;color:var(--text-color,#777);flex-wrap:nowrap;align-items:center;gap:12px;padding-top:5px;font:11px/18px -apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,sans-serif;display:flex;overflow-x:auto}.nspp-list-actions button{color:inherit;font:inherit;cursor:pointer;opacity:.75;background:0 0;border:0;border-radius:0;align-items:center;gap:4px;margin:0;padding:0;display:inline-flex}.nspp-list-actions .iconpark-icon{width:13px;height:13px}.nspp-interaction{background:var(--bg-color,Canvas);color:var(--text-color,CanvasText);border:1px solid #818b9840;border-radius:6px;margin:4px 0 12px 52px;padding:0;font:12px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;list-style:none}.nspp-interaction[hidden],.nspp-interaction form[hidden]{display:none!important}.nspp-interaction header{border-bottom:1px solid #818b9820;align-items:center;gap:8px;padding:6px 10px;display:flex}.nspp-interaction header a{white-space:nowrap;text-overflow:ellipsis;min-width:0;color:inherit;flex:1;overflow:hidden}.nspp-interaction button{color:inherit;font:inherit;cursor:pointer;background:0 0;border:0}.nspp-interaction header button{font-size:18px}.nspp-interaction p{margin:0;padding:6px 10px;font-size:11px}.nspp-interaction p:empty{display:none}.nspp-interaction form{padding:8px 10px}.nspp-interaction textarea{box-sizing:border-box;resize:vertical;width:100%;min-height:84px;max-height:240px;font:inherit;color:inherit;background:0 0;border:1px solid #818b9850;border-radius:4px;padding:8px;display:block}.nspp-reply-actions{justify-content:space-between;align-items:center;gap:8px;margin-top:6px;display:flex}.nspp-reply-actions span{opacity:.6;font-size:10px}.nspp-reply-actions button{color:#fff;background:#238636;border-radius:4px;padding:3px 10px}.nspp-reply-actions button:disabled{opacity:.4;cursor:default}@media (width<=600px){.nspp-interaction{margin-left:0}.nspp-list-actions{gap:8px}}.nspp-list-actions [hidden]{display:none!important}.nspp-block-toggle{align-items:center;gap:3px;display:inline-flex}.nspp-block-toggle .iconpark-icon{width:11px;height:11px}.nspp-block-toggle[hidden],#nspp-tools button[hidden]{display:none!important}.nspp-action-category{color:inherit;opacity:.65;flex:none;margin-left:auto;text-decoration:none}.nspp-action-category:hover{text-underline-offset:3px;text-decoration:underline}.nspp-list-actions button{flex-shrink:0}.nspp-post-preview footer .nspp-list-actions{gap:10px;padding:2px 0 5px}.nspp-post-preview footer .nspp-list-actions button{width:auto;height:auto;font:inherit;line-height:18px}.nspp-post-preview footer .nspp-list-actions button:hover{text-underline-offset:3px;background:0 0;text-decoration:underline}.nspp-post-preview::backdrop{background:#0006}@media (width<=600px),(hover:none){.nspp-post-preview{width:100%;max-width:none;max-height:85dvh;padding-bottom:env(safe-area-inset-bottom);border-radius:14px 14px 0 0;inset:auto 0 0}.nspp-post-preview header{padding:10px 16px;font-size:14px}.nspp-post-preview header a{white-space:normal}.nspp-post-preview button{width:40px;height:40px;font-size:22px}.nspp-preview-content{padding:12px 16px;font-size:14px;line-height:1.7}.nspp-post-preview footer{padding:12px 16px;font-size:13px}.nspp-post-preview footer a{padding:8px 0;display:block}}.nspp-count-loading{flex:none;font-size:10px}.nspp-quick-replies{box-sizing:border-box;background:var(--bg-color,Canvas);width:min(440px,100vw - 24px);max-height:85dvh;color:var(--text-color,CanvasText);border:1px solid #818b9838;border-radius:12px;margin:auto;padding:0;font:13px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;overflow:hidden;box-shadow:0 16px 60px #0003}.nspp-quick-replies[open]{flex-direction:column;display:flex}.nspp-quick-replies::backdrop{background:#0005}.nspp-quick-replies [hidden]{display:none!important}.nspp-quick-head,.nspp-quick-pagination{color:inherit;background:0 0;flex:none;justify-content:space-between;align-items:center;gap:6px;padding:8px 12px;display:flex}.nspp-quick-head strong{font-size:14px}.nspp-quick-replies button{font:inherit;color:inherit;cursor:pointer;min-height:28px;box-shadow:none;background:0 0;border:1px solid #818b9840;border-radius:6px;padding:4px 8px}.nspp-quick-replies button:hover:not(:disabled){background:#818b9814}.nspp-quick-replies :is(button,input,textarea):focus-visible{outline:2px solid var(--link-color,#0969da);outline-offset:2px}.nspp-quick-replies button:disabled{opacity:.4;cursor:default}.nspp-quick-head button{border:0;width:28px;padding:0;font-size:18px}.nspp-quick-replies p{margin:0}.nspp-quick-replies .nspp-quick-target{white-space:nowrap;text-overflow:ellipsis;opacity:.65;flex:none;padding:0 12px 6px;font-size:12px;overflow:hidden}.nspp-quick-toolbar{flex:none;gap:6px;padding:2px 12px 8px;display:flex}.nspp-quick-replies input,.nspp-quick-replies textarea{box-sizing:border-box;min-width:0;font:inherit;color:inherit;background:0 0;border:1px solid #818b9850;border-radius:6px;padding:5px 8px}.nspp-quick-toolbar input{flex:1;width:0}.nspp-quick-replies .nspp-quick-primary{color:var(--link-color,#0969da);background:#0969da0c;border-color:#0969da40;flex:none}.nspp-quick-list{overscroll-behavior:contain;min-height:0;padding:0 12px;overflow-y:auto}.nspp-quick-item{border-bottom:1px solid #818b9820;align-items:center;gap:4px;padding:2px 0;display:flex}.nspp-quick-item:last-child{border-bottom:0}.nspp-quick-item .nspp-quick-send{text-align:left;white-space:pre-wrap;overflow-wrap:anywhere;border:0;flex:1;min-width:0;min-height:30px;padding:4px 6px}.nspp-quick-item button:not(.nspp-quick-send){border-color:#0000;flex:none;padding:4px 6px;font-size:11px}.nspp-quick-item .nspp-quick-delete:hover:not(:disabled){color:#cf3434;background:#cf343410}.nspp-quick-list>p{text-align:center;opacity:.6;padding:16px 6px}.nspp-quick-replies form{border-top:1px solid #818b9830;flex:none;padding:8px 12px}.nspp-quick-replies form button+button{margin-left:8px}.nspp-quick-replies textarea{resize:vertical;width:100%;max-height:22dvh;margin-bottom:8px;display:block}.nspp-quick-pagination{border-top:1px solid #818b9830;padding-top:6px;padding-bottom:6px;font-size:11px}.nspp-quick-replies .nspp-quick-status{opacity:.65;flex:none;padding:0 12px 6px;font-size:11px}@media (width<=600px){.nspp-quick-replies{width:100%;max-width:none;max-height:85dvh;padding-bottom:env(safe-area-inset-bottom);border-radius:14px 14px 0 0;margin:auto 0 0}.nspp-quick-replies button{min-height:34px}}#nspp-tools .nspp-tool-icon{flex:none;justify-content:center;align-items:center;width:34px;height:34px;padding:0;display:inline-flex}.nspp-user-badges .nspp-age,.nspp-profile-dialog .nspp-age{color:var(--nspp-age-color,#59636e)}.nspp-age[data-tone=new]{--nspp-age-color:#cf3434}.nspp-age[data-tone=recent]{--nspp-age-color:#a66b08}.nspp-age[data-tone=member]{--nspp-age-color:#0969da}.nspp-age[data-tone=longtime]{--nspp-age-color:#218044}.dark-layout .nspp-age[data-tone=new]{--nspp-age-color:#ff8585}.dark-layout .nspp-age[data-tone=recent]{--nspp-age-color:#dfb653}.dark-layout .nspp-age[data-tone=member]{--nspp-age-color:#79b8ff}.dark-layout .nspp-age[data-tone=longtime]{--nspp-age-color:#70cf91}.dark-layout .nspp-user-badges .nspp-age,.dark-layout .nspp-profile-dialog .nspp-age{color:var(--nspp-age-color,#9198a1)}.nspp-user-badges button.nspp-age{cursor:pointer}.nspp-user-badges button.nspp-age:hover{text-underline-offset:3px;text-decoration:underline}.nspp-profile-dialog{width:min(320px,100vw - 24px)}.nspp-profile-dialog header{justify-content:space-between;padding:10px 12px}.nspp-profile-summary{align-items:baseline;gap:8px;padding:4px 12px 10px;display:flex}.nspp-profile-summary strong{font-variant-numeric:tabular-nums;font-size:22px;line-height:1.3}.nspp-profile-summary span{font-size:11px}.nspp-profile-dialog dl{border-top:1px solid #818b9830;grid-template-columns:1fr auto;gap:6px 12px;margin:0;padding:10px 12px;display:grid}.nspp-profile-dialog dt{opacity:.65}.nspp-profile-dialog dd{font-variant-numeric:tabular-nums;margin:0}.nspp-profile-dialog>p{opacity:.75;margin:0;padding:0 12px 12px;font-size:11px}.post-title .nspp-readonly{vertical-align:middle;border-radius:3px;flex:none;align-items:center;color:#b52b32!important;box-shadow:none!important;background:#cf343410!important;border:0!important;margin-left:5px!important;padding:0 4px!important;font:500 10px/17px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif!important;display:inline-flex!important}.post-title .nspp-pinned{vertical-align:middle;flex:none;margin-left:4px;color:#768390!important;background:0 0!important;border:0!important;border-radius:0!important;width:13px!important;height:13px!important;padding:0!important}.post-title .nspp-pin-wrap{align-items:center;display:inline-flex;box-shadow:none!important;background:0 0!important;border:0!important;padding:0!important}.dark-layout .post-title .nspp-readonly{color:#ff8585!important;background:#ff858514!important}.dark-layout .post-title .nspp-pinned{color:#9198a1!important}.nspp-monitor{color:#1f2328;background:#fff;border:1px solid #818b9840;border-radius:10px;width:min(560px,100vw - 24px);max-height:80dvh;padding:0;font:12px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,PingFang SC,sans-serif}.nspp-monitor[open]{flex-direction:column;display:flex}.nspp-monitor *{box-sizing:border-box}.nspp-monitor header,.nspp-monitor footer{flex:none;align-items:center;gap:8px;padding:8px 12px;display:flex}.nspp-monitor header{border-bottom:1px solid #818b9828;justify-content:space-between}.nspp-monitor h3{margin:0;font-size:14px}.nspp-monitor button{min-height:28px;color:inherit;font:inherit;cursor:pointer;white-space:nowrap;background:0 0;border:1px solid #818b9838;border-radius:5px;padding:3px 8px}.nspp-monitor button:hover{background:#818b9814}.nspp-monitor button:disabled{opacity:1;cursor:wait}.nspp-monitor>p{opacity:.65;margin:0;padding:6px 12px;font-size:11px}.nspp-monitor-summary{flex-wrap:wrap;align-items:center;gap:2px 10px;display:flex}.nspp-monitor-results:empty{display:none}.nspp-monitor-results{overscroll-behavior:contain;min-height:0;padding:0 12px 8px;overflow:auto}.nspp-monitor-results section+section{border-top:1px solid #818b9828;margin-top:8px;padding-top:4px}.nspp-monitor h4{color:#768390;align-items:center;gap:6px;margin:5px 0;font-size:11px;display:flex}.nspp-monitor h4 small{background:#818b9814;border-radius:8px;padding:0 5px;font-size:10px}.nspp-monitor ul{margin:0;padding:0;list-style:none}.nspp-monitor li{margin:0;padding:4px 0}.nspp-monitor a{color:inherit;text-decoration:none}.nspp-monitor a:hover{color:#0969da;text-decoration:underline}.nspp-monitor section>p{opacity:.55;margin:6px 0;font-size:11px}.nspp-monitor footer{border-top:1px solid #818b9828;flex-wrap:wrap}.nspp-monitor footer span{opacity:.6;flex:1;font-size:10px}.nspp-monitor-tracked{flex-shrink:0;max-height:25dvh;padding:0 12px 8px;overflow:auto}.nspp-monitor-tracked[hidden]{display:none}.nspp-monitor-tracked>div{align-items:center;gap:8px;padding:3px 0;display:flex}.nspp-monitor-tracked a{flex:1;min-width:0}#nspp-tools button[data-unread=true]{color:#cf3434;background:#fff0f0;border-color:#cf3434}.dark-layout .nspp-monitor{color:#e6edf3;background:#161b22}@media (width<=600px){.nspp-monitor{width:100%;max-height:85dvh;padding-bottom:env(safe-area-inset-bottom);border-radius:12px 12px 0 0;margin:auto 0 0}.nspp-monitor button{min-height:34px}}[data-nspp-monitor-match=\"0\"]{background-color:#fff2c9!important}[data-nspp-monitor-match=\"1\"]{background-color:#dff3e7!important}[data-nspp-monitor-match=\"2\"]{background-color:#e2efff!important}[data-nspp-monitor-match=\"3\"]{background-color:#ffe8dc!important}.dark-layout [data-nspp-monitor-match=\"0\"]{background-color:#3c3420!important}.dark-layout [data-nspp-monitor-match=\"1\"]{background-color:#203a2c!important}.dark-layout [data-nspp-monitor-match=\"2\"]{background-color:#23344c!important}.dark-layout [data-nspp-monitor-match=\"3\"]{background-color:#432f26!important}.nspp-monitor header,.nspp-monitor footer,.nspp-monitor-results section+section{border:0}.nspp-monitor-results section+section{margin-top:12px}.nspp-monitor footer{background:#818b980a}#nspp-tools button[data-monitor-state]{position:relative}.nspp-monitor-badge{box-sizing:border-box;border:1px solid var(--bg-color,Canvas);color:#fff;text-align:center;pointer-events:none;background:#cf3434;border-radius:999px;min-width:16px;padding:0 3px;font:600 9px/14px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;position:absolute;top:-6px;right:-6px}.nspp-monitor-badge[hidden]{display:none}#nspp-tools button[data-monitor-state=running]{color:#218044;background:var(--bg-color,Canvas);border-color:#218044}.dark-layout #nspp-tools button[data-monitor-state=running]{color:#70cf91}.nspp-monitor-editor{flex-wrap:wrap;flex:none;align-items:flex-end;gap:6px;padding:4px 12px 8px;display:flex}.nspp-monitor-editor label{min-width:180px;color:inherit;flex:1;font-size:11px}.nspp-monitor-editor textarea{width:100%;color:inherit;font:inherit;resize:vertical;background:#818b9810;border:0;border-radius:6px;max-height:18dvh;margin-top:4px;padding:6px 8px;display:block}.nspp-monitor-editor>span{opacity:.65;flex-basis:100%;font-size:10px}.nspp-monitor-editor>span:empty{display:none}@media (prefers-reduced-motion:reduce){.nspp-monitor[data-checking=true]>p:before{animation:none}}.nspp-monitor-spinner{vertical-align:-2px;border:2px solid #0969da30;border-top-color:#0969da;border-radius:50%;width:10px;height:10px;margin-right:6px;display:inline-block}.nspp-monitor-spinner[hidden]{display:none}.nspp-regex-help{opacity:.65;border:1px solid;border-radius:50%;justify-content:center;align-items:center;width:16px;height:16px;margin-left:6px;font-size:10px;display:inline-flex;text-decoration:none!important}.nspp-regex-help:hover{opacity:1}.nspp-monitor button,.nspp-footprints-dialog button{justify-content:center;align-items:center;gap:4px;display:inline-flex}.nspp-monitor button svg,.nspp-footprints-dialog button svg{flex:none;width:13px;height:13px}.nspp-monitor-editor>small{opacity:.65;flex-basis:100%;font-size:10px;line-height:1.6}.nspp-monitor-editor textarea{min-height:56px}.nspp-footprints-dialog{border-radius:10px;width:min(600px,100vw - 24px);padding:8px}.nspp-footprints-dialog header{padding:4px 4px 10px}.nspp-footprints-toolbar{flex-wrap:wrap;align-items:center;gap:6px;padding:4px;display:flex}.nspp-footprints-toolbar [role=status]{opacity:.6;margin-left:auto;font-size:11px}.nspp-footprints-dialog>div:last-child{padding:8px 4px}.nspp-footprints-dialog a{color:inherit;border-radius:4px;padding:4px 6px;text-decoration:none}.nspp-footprints-dialog a:hover{background:#818b9810}.nspp-footprints-list{gap:4px;max-height:min(55dvh,400px);display:grid;overflow:auto}.nspp-footprints-list>a{align-items:baseline;gap:12px;min-width:0;display:flex}.nspp-footprint-title{overflow-wrap:anywhere;flex:1;min-width:0}.nspp-footprints-list small{opacity:.6;white-space:nowrap;flex:none;font-size:11px}.nspp-monitor>header h3{margin-right:auto}.nspp-monitor-config{width:min(420px,100vw - 24px)}.nspp-monitor-config .nspp-monitor-editor{flex-direction:column;align-items:stretch;gap:8px;padding:8px 14px 14px;display:flex;overflow:auto}.nspp-monitor-config .nspp-monitor-editor label{flex:none;min-width:0}.nspp-monitor-config .nspp-monitor-editor textarea{min-height:88px}.nspp-monitor-config input{width:100%;font:inherit;color:inherit;background:#818b9810;border:0;border-radius:6px;margin-top:5px;padding:7px 8px;display:block}.nspp-monitor-config .nspp-monitor-editor>small,.nspp-monitor-config .nspp-monitor-editor>span{flex-basis:auto}.nspp-monitor-config .nspp-monitor-editor>button{align-self:flex-end;min-width:72px}@media (width<=600px){.nspp-monitor-config{border-radius:12px 12px 0 0;width:100%;margin:auto 0 0}}.md-editor .nspp-upload-status{background:0 0;border:0;flex-wrap:wrap;align-items:center;gap:6px;margin-left:auto;padding:0 6px;font-size:11px;line-height:24px;display:inline-flex}.nspp-upload-status [hidden]{display:none!important}.nspp-upload-status [role=status]{opacity:.7;overflow-wrap:anywhere;font-size:11px}.nspp-upload-status a{color:inherit;font-size:11px;text-decoration:none}.nspp-upload-status a:hover{text-decoration:underline}.nspp-upload-status button{color:inherit;cursor:pointer;background:0 0;border:0;justify-content:center;align-items:center;padding:4px;display:inline-flex}.nspp-upload-status button svg{width:16px;height:16px}.nspp-ai-compose{flex-wrap:wrap;align-items:start;gap:8px;padding:8px;display:flex}.nspp-ai-compose textarea{min-width:180px;color:inherit;background:0 0;border:1px solid #8885;border-radius:6px;flex:1;padding:6px}.nspp-ai-compose small{opacity:.7;width:100%}.nspp-original-notification{display:none!important}.nspp-ecg-shine{display:none}#nspp-tools button[data-monitor-state=running] .nspp-ecg-shine{stroke:#8ce9aa;stroke-dasharray:18 118;animation:1.8s linear infinite nspp-ecg-scan;display:block}@keyframes nspp-ecg-scan{0%{stroke-dashoffset:18px}to{stroke-dashoffset:-118px}}@media (prefers-reduced-motion:reduce){#nspp-tools button[data-monitor-state=running] .nspp-ecg-shine{animation:none;display:none}}.user-stat .stat-block:has(>.nspp-notification-row)>:has(>.nspp-original-notification:only-child){display:none}.nspp-list-actions[hidden]{display:none!important}.nspp-user-hover{z-index:10010;box-sizing:border-box;border:1px solid var(--border-color,#818b9840);background:var(--bg-color,Canvas);width:260px;max-width:calc(100vw - 16px);max-height:calc(100dvh - 16px);color:var(--text-color,CanvasText);border-radius:8px;padding:12px;font:12px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;position:fixed;overflow:auto;box-shadow:0 6px 24px #0002}.nspp-user-hover[hidden]{display:none!important}.nspp-user-hover-name{color:inherit;font-weight:600;text-decoration:none}.nspp-user-hover dl{grid-template-columns:1fr auto;gap:4px 12px;margin:10px 0;display:grid}.nspp-user-hover dt{opacity:.65}.nspp-user-hover dd{font-variant-numeric:tabular-nums;margin:0}.nspp-user-hover>.nspp-block-toggle{font:inherit;color:inherit;background:0 0;border:1px solid #818b9840;border-radius:4px;margin:8px 0 0;padding:4px 8px;display:flex}.nspp-user-hover{border-radius:12px;width:280px;padding:12px;box-shadow:0 12px 36px #0002,0 2px 6px #0001}.nspp-user-hover .nspp-user-hover-header{align-items:center;gap:8px;margin-bottom:10px;display:flex}.nspp-user-hover .nspp-user-hover-header>div{flex-wrap:wrap;align-items:center;gap:6px;min-width:0;display:flex}.nspp-user-hover-name{overflow-wrap:anywhere;font-size:13px}.nspp-user-hover-monogram{color:#0969da;background:#0969da10;border-radius:10px;flex:0 0 36px;place-items:center;height:36px;font-size:18px;font-weight:600;display:grid}.nspp-user-hover .nspp-user-hover-rich{background:#818b9808;border:1px solid #818b9824;border-radius:8px;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 10px;padding:7px 6px;font-size:13px;line-height:22px;display:grid}.nspp-user-hover-rich>div{flex-direction:column;align-items:center;gap:4px;min-width:0;display:flex}.nspp-user-hover-rich small{opacity:.6;font-size:11px;line-height:16px}.nspp-user-hover-rich .iconpark-icon{width:13px;height:13px}.nspp-user-hover-rich .nspp-age{font-weight:600}.nspp-user-hover dl{gap:4px 10px;margin:0}.nspp-user-hover dd{text-align:right;font-weight:500}.nspp-user-hover>.nspp-block-toggle{border-radius:6px;justify-content:center;width:100%;margin-top:12px;padding:5px 8px}.nspp-user-hover>.nspp-block-toggle:hover{color:#cf3434;background:#cf343410;border-color:#cf343440}.dark-layout .nspp-user-hover{color:#e6edf3;background:#161b22}.dark-layout .nspp-user-hover-monogram{color:#79b8ff;background:#79b8ff18}.nspp-user-badges[hidden],.nspp-user-hover-tags[hidden]{display:none!important}.nspp-user-hover-tags{flex-wrap:wrap;gap:5px;width:100%;display:flex}.nspp-user-hover-avatar{object-fit:cover;border-radius:10px;flex:0 0 32px;width:32px;height:32px}.nspp-user-hover-avatar[hidden],.nspp-user-hover-monogram[hidden]{display:none!important}.nspp-user-hover-signature{color:inherit;opacity:.7;white-space:pre-wrap;overflow-wrap:anywhere;max-height:5.1em;margin:-2px 0 10px;font-size:11px;line-height:1.7;overflow:auto}.nspp-user-hover[data-trust=danger]{background:#fff3f3;border-color:#e9b9bf}.nspp-user-hover[data-trust=warning]{background:#fff9ed;border-color:#e7d5ae}.nspp-user-hover[data-trust=success]{background:#f0faf4;border-color:#b8ddc5}.nspp-user-hover[data-trust=perfect]{background:#fff8e3;border-color:#ddbc6a}.dark-layout .nspp-user-hover[data-trust=danger]{background:#2b1c22;border-color:#643740}.dark-layout .nspp-user-hover[data-trust=warning]{background:#29251b;border-color:#605234}.dark-layout .nspp-user-hover[data-trust=success]{background:#182820;border-color:#355c45}.dark-layout .nspp-user-hover[data-trust=perfect]{background:#2d2617;border-color:#756031}.nspp-user-hover .nspp-user-hover-header{width:auto;height:auto;min-height:0;box-shadow:none;background:0 0;border:0;padding:0;position:static}.nspp-copy-button{color:inherit;font:inherit;cursor:pointer;background:0 0;border:0;border-radius:4px;padding:2px 5px}.nspp-copy-button:hover{background:#818b9820}.nspp-user-hover .nspp-copy-button{opacity:.65;font-size:10px}.nspp-category-actions{white-space:nowrap;flex:none;align-items:center;gap:5px;width:max-content;max-width:none;display:inline-flex}.nspp-category-reply{cursor:pointer;white-space:nowrap;flex:none;margin:0;font-family:inherit;position:static}.nspp-copy-button{justify-content:center;align-items:center;gap:4px;display:inline-flex}.nspp-copy-button[data-copied=true]{color:#218044;opacity:1}.nspp-user-hover{width:260px;padding:9px;line-height:1.45}.nspp-user-hover .nspp-user-hover-header{gap:7px;margin-bottom:5px}.nspp-user-hover .nspp-user-hover-header>div{flex:1}.nspp-user-hover .nspp-user-hover-score{color:#768390;cursor:pointer;background:0 0;border:0;flex-direction:column;flex:none;align-items:center;gap:0;margin:0 0 0 auto;padding:0;display:flex}.nspp-user-hover-score strong{letter-spacing:-1px;font-variant-numeric:tabular-nums;font:700 26px/1 -apple-system,BlinkMacSystemFont,sans-serif}.nspp-user-hover-score small{opacity:.75;font-size:9px;line-height:16px}.nspp-user-hover[data-trust=danger] .nspp-user-hover-score{color:#c63849}.nspp-user-hover[data-trust=warning] .nspp-user-hover-score{color:#a66b08}.nspp-user-hover[data-trust=success] .nspp-user-hover-score{color:#218044}.nspp-user-hover[data-trust=perfect] .nspp-user-hover-score{color:#a56b00}.dark-layout .nspp-user-hover .nspp-user-hover-score{filter:brightness(1.5)}.nspp-user-hover dl{border-block:1px solid #818b9824;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 10px;padding:6px 0}.nspp-user-hover dl>div{justify-content:space-between;align-items:baseline;gap:6px;min-width:0;display:flex}.nspp-user-hover dt{opacity:.7;flex:none;align-items:center;gap:4px;font-size:11px;display:inline-flex}.nspp-user-hover dt .iconpark-icon{width:13px;height:13px}.nspp-user-hover dd{overflow-wrap:anywhere;min-width:0;font-size:12px}.nspp-user-hover .nspp-user-hover-rich{background:0 0;border:0;border-radius:0;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:3px 6px;margin:0;padding:5px 0 0;font-size:10px;line-height:18px;display:flex}.nspp-user-hover .nspp-user-hover-rich .nspp-age{background:color-mix(in srgb, currentColor 10%, transparent);border-radius:4px;gap:3px;padding:1px 4px;font-size:10px;font-weight:400}.nspp-user-hover .nspp-user-hover-rich .nspp-age strong{font-weight:700}.nspp-user-hover dd.nspp-user-badges{margin:0}.nspp-user-hover dd .nspp-level{background:color-mix(in srgb, currentColor 10%, transparent);border-radius:4px;padding:0 4px;font-size:11px;line-height:17px}.nspp-user-hover .nspp-user-hover-rich .iconpark-icon{width:11px;height:11px;display:inline-block}.nspp-user-hover-rich>span{opacity:.65}.nspp-user-hover>.nspp-block-toggle{margin-top:8px;padding:3px 6px}.nspp-user-hover-signature{color:#8d7832;opacity:1;max-height:3em;margin:0 0 5px;line-height:1.5}.dark-layout .nspp-user-hover-signature,.nspp-user-hover[data-trust=perfect] .nspp-user-hover-signature{color:#cdbb87}.nspp-user-hover-actions{gap:4px;margin-top:6px;display:flex}.nspp-user-hover-actions[hidden]{display:none!important}.nspp-user-hover-actions>:is(a,button){box-sizing:border-box;min-width:0;color:inherit;white-space:nowrap;cursor:pointer;background:0 0;border:1px solid #0000;border-radius:6px;flex:1;justify-content:center;align-items:center;gap:3px;margin:0;padding:3px;font-family:inherit;font-size:11px;line-height:18px;text-decoration:none;display:inline-flex}.nspp-user-hover-actions .iconpark-icon{width:12px;height:12px}.nspp-user-hover-actions>[data-action=transfer]{color:#fff;background:#218044}.nspp-user-hover-actions>[data-action=follow]{color:#fff;background:#0969da}.nspp-user-hover-actions>[data-action=message]{color:#fff;background:#8250df}.nspp-user-hover-actions>.nspp-block-toggle{color:#fff;background:#cf3434}.nspp-user-hover-actions>:hover{filter:brightness(.9)}.nspp-user-hover-actions>:disabled{opacity:.5;cursor:wait}.nspp-user-transfer{width:min(340px,100vw - 32px)}.nspp-user-transfer form{gap:12px;display:grid}.nspp-user-transfer label{gap:6px;display:grid}.nspp-user-transfer input{box-sizing:border-box;width:100%;color:inherit;font:inherit;background:0 0;border:1px solid #818b9840;border-radius:6px;padding:8px}.nspp-user-transfer [role=status]{overflow-wrap:anywhere;margin:0;font-size:12px}.nspp-user-transfer [role=status]:empty{display:none}.nspp-transfer-actions{justify-content:flex-end;gap:8px;display:flex}.nspp-user-hover[data-trust=perfect],.dark-layout .nspp-user-hover[data-trust=perfect]{color:#eee9df;--lightningcss-light: ;--lightningcss-dark:initial;color-scheme:dark;background:radial-gradient(at 100% 0,#c8a5651c,#0000 65%),linear-gradient(145deg,#26272b,#191a1e);border-color:#ac8e555c;border-radius:10px;padding:9px;box-shadow:inset 0 1px #e8ce9133,0 16px 40px #0004,0 3px 10px #0002}.nspp-user-hover[data-trust=perfect] .nspp-user-hover-header{margin-bottom:5px}.nspp-user-hover[data-trust=perfect] .nspp-user-hover-name{color:#f5efe2;font-weight:600}.nspp-user-hover[data-trust=perfect] :is(.nspp-user-hover-avatar,.nspp-user-hover-monogram){outline-offset:2px;border-radius:9px;outline:1px solid #d3b57566}.nspp-user-hover[data-trust=perfect] .nspp-user-hover-monogram{color:#e8ce96;background:#d3b57514}.nspp-user-hover[data-trust=perfect] .nspp-user-hover-score{color:#ebce91;filter:none}.nspp-user-hover[data-trust=perfect] .nspp-user-hover-score strong{letter-spacing:-1px;text-shadow:0 2px 14px #d6b46c20;font-size:26px;font-weight:600}.nspp-user-hover[data-trust=perfect] .nspp-user-hover-score small{color:#c6b899;opacity:1;font-size:9px}.nspp-user-hover[data-trust=perfect] dl{border-color:#d3b57526}.nspp-user-hover[data-trust=perfect] .nspp-user-hover-rich small{color:#b9b3a7;opacity:1}.nspp-user-hover[data-trust=perfect] .nspp-user-badges :is(.nspp-age,.nspp-level){--nspp-badge-color:#e5ce9c;--nspp-age-color:#b9d0be}.nspp-user-hover[data-trust=perfect] .nspp-user-badges .nspp-level[data-level=\"6\"]{background:#d3b57518;box-shadow:inset 0 0 0 1px #d3b57538}.nspp-user-hover[data-trust=perfect] dt{color:#b9b3a7;opacity:1}.nspp-user-hover[data-trust=perfect] dd{color:#eee6d6}.nspp-user-hover[data-trust=perfect] .nspp-copy-button{color:#cabb9c;opacity:1}.nspp-user-hover[data-trust=perfect] .nspp-copy-button[data-copied=true]{color:#9cd3ac}.nspp-user-hover[data-trust=perfect]>.nspp-block-toggle{color:#c7bcaa;background:0 0;border-color:#d3b57530}.nspp-user-hover[data-trust=perfect]>.nspp-block-toggle:hover{color:#ffb4b4;background:#c9787810;border-color:#c978785c}.nspp-user-hover[data-trust=perfect] :focus-visible{outline-offset:2px;outline:2px solid #e8ce96}.nspp-ai-dialog{box-sizing:border-box;width:min(600px,100vw - 32px);max-height:85dvh;color:var(--text-color,#24292f);background:var(--bg-color,#fff);border:1px solid #8884;border-radius:10px;padding:20px;font:13px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;overflow:auto;box-shadow:0 16px 48px #0002}.nspp-ai-dialog.nspp-ai-config{width:min(460px,100vw - 32px)}.nspp-ai-dialog::backdrop{background:#0005}.nspp-ai-dialog .nspp-ai-header{align-items:center;gap:8px;margin-bottom:8px;display:flex}.nspp-ai-dialog h2{margin:0;font-size:16px;font-weight:600;line-height:24px}.nspp-ai-dialog .nspp-ai-hint{opacity:.65;margin:0 0 18px;font-size:12px}.nspp-ai-dialog label{gap:6px;margin-bottom:14px;font-size:12px;font-weight:500;display:grid}.nspp-ai-dialog :is(input,textarea,select){box-sizing:border-box;color:inherit;font:inherit;background:0 0;border:1px solid #8885;border-radius:6px;padding:7px 10px;line-height:20px}.nspp-ai-dialog :is(input,textarea){width:100%}.nspp-ai-dialog textarea{resize:vertical}.nspp-ai-dialog input::placeholder,.nspp-ai-dialog textarea::placeholder{color:inherit;opacity:.4}.nspp-ai-dialog button{appearance:none;min-height:32px;color:inherit;font:inherit;cursor:pointer;background:#8881;border:1px solid #8885;border-radius:6px;padding:5px 12px}.nspp-ai-dialog button:hover{background:#8882}.nspp-ai-dialog :is(.nspp-ai-primary,[data-nspp-ai]){color:#fff;background:#24292f;border-color:#24292f}.nspp-ai-dialog :is(.nspp-ai-primary,[data-nspp-ai]):hover{background:#39414a}.nspp-ai-dialog :focus-visible{outline-offset:2px;outline:2px solid #5989ba}.nspp-ai-dialog .nspp-ai-actions{border-top:1px solid #8883;flex-wrap:wrap;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:14px;display:flex}.nspp-ai-dialog .nspp-ai-compose{gap:8px;padding:12px 0 0}.dark-layout .nspp-ai-dialog{color:#dce1e7;--lightningcss-light: ;--lightningcss-dark:initial;color-scheme:dark;background:#202428}.dark-layout .nspp-ai-dialog :is(.nspp-ai-primary,[data-nspp-ai]){color:#24292f;background:#e0e5eb;border-color:#e0e5eb}@media (width<=480px){.nspp-ai-dialog{padding:16px}.nspp-ai-dialog .nspp-ai-compose textarea{min-width:100%}}.nspp-history .nspp-history-day{color:#768390;justify-content:space-between;margin-top:8px;font-size:11px}.nspp-history button[aria-pressed=true]{color:#0969da;border-color:currentColor}.nspp-history-avatar{vertical-align:middle;border-radius:50%;width:20px;height:20px;margin-right:6px}.nspp-confirm-dialog{box-sizing:border-box;background:var(--bg-color,#fff);width:min(360px,100vw - 32px);max-width:none;max-height:calc(100dvh - 32px);color:var(--text-color,#24292f);border:1px solid #818b9840;border-radius:12px;margin:auto;padding:18px;font:13px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;overflow:auto;box-shadow:0 18px 48px #0003}.nspp-confirm-dialog::backdrop{background:#0006}.nspp-confirm-dialog h2{overflow-wrap:anywhere;margin:0;font-size:15px}.nspp-confirm-dialog p{opacity:.7;margin:8px 0 18px}.nspp-confirm-dialog form{justify-content:flex-end;gap:8px;display:flex}.nspp-confirm-dialog button{min-height:32px;color:inherit;font:inherit;cursor:pointer;background:0 0;border:1px solid #818b9840;border-radius:6px;padding:5px 14px}.nspp-confirm-dialog .nspp-confirm-danger{color:#fff;background:#cf3434;border-color:#cf3434}.nspp-confirm-dialog :focus-visible{outline-offset:2px;outline:2px solid #0969da}.dark-layout .nspp-confirm-dialog{color:#e6edf3;--lightningcss-light: ;--lightningcss-dark:initial;color-scheme:dark;background:#161b22}@media (width<=480px){.nspp-confirm-dialog{width:100%;max-height:85dvh;padding:18px 16px calc(16px + env(safe-area-inset-bottom));border-radius:14px 14px 0 0;margin:0;inset:auto 0 0}.nspp-confirm-dialog form>button{flex:1;min-height:38px}}");
	function main() {
		if (document.getElementById("nspp-settings")) return;
		const loadingStyle = document.createElement("style");
		loadingStyle.textContent = loading_default.replaceAll("[aria-busy=\"true\"]", ":is([class*=\"nspp-\"], [data-nspp-resolve], [data-nspp-copy], #nspp-tools *, .nspp-compose *, .nspp-monitor *, .nspp-history *, .nspp-post-preview *, .nspp-interaction *, .nspp-quick-replies *, [data-nspp-footprints] *, [data-nspp-ai], [data-nspp-ai-test])[aria-busy=\"true\"]");
		document.head.append(loadingStyle);
		const tools = document.createElement("div");
		tools.id = "nspp-tools";
		tools.setAttribute("aria-label", "NodeSeek++");
		document.body.append(tools);
		const features = [
			requestSettings$1,
			...readingFeatures,
			...filteringFeatures,
			...actionFeatures,
			...monitoringFeatures,
			...extraFeatures,
			...serviceFeatures,
			...relationshipFeatures,
			codeHighlight,
			postPreview,
			listInteractions,
			discussionStatsFeature
		];
		if (new Set(features.map((feature) => feature.id)).size !== features.length) throw new Error("重复功能 ID");
		const ui = mountSettings(features);
		GM_registerMenuCommand$1("NodeSeek++ 设置", ui.open);
		const stop = startFeatures(features, loadSettings(features), ui.notify);
		window.addEventListener("pagehide", (event) => {
			if (!event.persisted) stop();
		});
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main, { once: true });
	else main();
})();
