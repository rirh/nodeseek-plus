import { GM_registerMenuCommand } from "./lib/userscript";
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
import "./style.css";
import loadingCss from "./loading.css?inline";

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
  const features = [
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
  ];
  if (new Set(features.map((feature) => feature.id)).size !== features.length)
    throw new Error("重复功能 ID");
  const ui = mountSettings(features);
  GM_registerMenuCommand("NodeSeek++ 设置", ui.open);
  const stop = startFeatures(features, loadSettings(features), ui.notify);
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) stop();
  });
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", main, { once: true });
else main();
