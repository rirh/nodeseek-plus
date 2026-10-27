import { GM_registerMenuCommand, needsStoragePreparation, prepareStorage } from "./lib/userscript";
import { requestSettings } from "./features/request-settings";
import { startFeatures, loadSettings } from "./core/runtime";
import { mountSettings } from "./settings";
import { readingFeatures } from "./features/reading";
import { filteringFeatures } from "./features/filtering";
import { actionFeatures } from "./features/actions";
import { monitoringFeatures } from "./features/monitoring";
import { extraFeatures } from "./features/extras";
import { serviceFeatures } from "./features/services";
import { relationshipFeatures } from "./features/relationships";
import { codeHighlight } from "./features/code-highlight";
import { postPreview } from "./features/post-preview";
import { listInteractions } from "./features/list-interactions";
import { discussionStatsFeature } from "./features/discussion-stats";
import { messagesFeature } from "./features/messages";
import { floatingReply } from "./features/floating-reply";
import { hotRankings } from "./features/hot-rankings";
import { mountFastNav } from "./features/fast-nav";
import { share } from "./features/share";
import "./styles/base.css";
import "./styles/history-preview.css";
import "./styles/tools-monitor.css";
import "./styles/user-hover.css";
import "./styles/dialogs.css";
import "./styles/hot-rankings-mobile.css";
import "./styles/share.css";
import "./views/sheet.css";
import loadingCss from "./loading.css?inline";

const MENU_COMMANDS = [
  ["attendance", "签到", "[data-nspp-attendance]", "登录后才能签到"],
  ["hot-rankings", "NodeSeek 热榜", "[data-nspp-hot-launcher]", "热榜暂不可用"],
  ["monitor", "帖子监控", "[data-nspp-monitor-launcher]", "帖子监控暂不可用"],
  ["reading-history", "阅读历史", "[data-nspp-history-launcher]", "阅读历史暂不可用"],
  ["footprints", "回帖足迹", "[data-nspp-footprints-launcher]", "登录后才能查看回帖足迹"],
] as const;

function main() {
  if (document.getElementById("nspp-settings")) return;
  const loadingStyle = document.createElement("style");
  loadingStyle.textContent = loadingCss.replaceAll(
    '[aria-busy="true"]',
    ':is([class*="nspp-"], [data-nspp-resolve], [data-nspp-copy], #nspp-tools *, .nspp-compose *, .nspp-monitor *, .nspp-history *, .nspp-post-preview *, .nspp-interaction *, .nspp-quick-replies *, [data-nspp-footprints] *, [data-nspp-ai], [data-nspp-ai-test])[aria-busy="true"]',
  );
  document.head.append(loadingStyle);
  const tools = document.createElement("div");
  tools.id = "nspp-tools";
  tools.setAttribute("aria-label", "NodeSeek++");
  document.body.append(tools);
  const stopFastNav = mountFastNav(tools);
  const features = [
    requestSettings,
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
    discussionStatsFeature,
    messagesFeature,
    floatingReply,
    hotRankings,
    share,
  ];
  if (new Set(features.map((feature) => feature.id)).size !== features.length)
    throw new Error("重复功能 ID");
  const ui = mountSettings(features);
  GM_registerMenuCommand("NodeSeek++ 设置", ui.open);
  const settings = loadSettings(features);
  // Mirror the toolbar in the userscript manager menu; each command clicks its launcher so behaviour stays in one place.
  for (const [id, label, selector, missing] of MENU_COMMANDS) {
    if (!settings[id]?.enabled) continue;
    GM_registerMenuCommand(label, () => {
      const launcher = tools.querySelector<HTMLElement>(selector);
      if (launcher) launcher.click(); else ui.notify(missing);
    });
  }
  const stop = startFeatures(features, settings, ui.notify);
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) { stop(); ui.stopUpdates(); stopFastNav(); }
  });
}

function boot() {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", main, { once: true });
  else main();
}

// Async-only managers (iOS Userscripts) need their stored values loaded before features read settings.
if (needsStoragePreparation()) void prepareStorage().then(boot);
else boot();
