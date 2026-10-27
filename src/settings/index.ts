import { toolIcon } from "../lib/tool-icon";
import { hasStorage } from "../lib/userscript";
import css from "./style.css?inline";
import loadingCss from "../loading.css?inline";
import sheetCss from "../views/sheet.css?inline";
import { parseSettings, normalizeSettings, exportSettings } from "../core/config";
import { clearCaches, loadSettings, saveSettings } from "../core/runtime";
import type { Feature, Settings } from "../core/types";
import { createUpdateChecker } from "../lib/script-update";
import { aboutContent } from "./about";
import { SHARE_TEXT } from "../features/share";

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
};

const categoryOrder = ["浏览", "用户", "工具", "其他"];
const categories: Record<string, string> = { 阅读: "浏览", 外观: "浏览", 导航: "浏览", 过滤: "用户", 用户: "用户", 操作辅助: "工具", 监控: "工具", 编辑: "工具", 网络: "其他" };
const categoryOf = (feature: Feature) => categories[feature.group] || "其他";
// Options that only matter in a particular mode stay hidden until that mode is chosen.
const dependsOn: Record<string, (settings: Settings[string]) => boolean> = {
  "user-level.levelColor": settings => settings.colors === "custom",
  "user-level.trustColor": settings => settings.colors === "custom",
  "user-level.roleColor": settings => settings.colors === "custom",
  "image-upload.base": settings => settings.provider !== "NodeImage",
  "reading-focus.height": settings => settings.collapse === true,
};

export function mountSettings(features: Feature[]) {
  const host = element("div");
  host.id = "nspp-settings";
  host.toggleAttribute("data-dark", document.body.classList.contains("dark-layout"));
  const shadow = host.attachShadow({ mode: "open" });
  const style = element("style", css + sheetCss + loadingCss);
  const launch = element("button");
  launch.type = "button"; launch.append(toolIcon("settings"));
  launch.className = "nspp-tool-icon";
  launch.dataset.nsppSettingsLauncher = "";
  launch.title = "打开 NodeSeek++ 设置";
  launch.setAttribute("aria-label", launch.title);
  const dialog = element("dialog");
  dialog.className = "nspp-sheet";
  dialog.setAttribute("aria-labelledby", "nspp-title");
  const header = element("header");
  const heading = element("div");
  const title = element("h2", "NodeSeek++");
  title.id = "nspp-title";
  heading.className = "heading";
  heading.append(title, element("small", `v${__APP_VERSION__}`));
  const close = element("button", "关闭");
  close.type = "button";
  close.className = "settings-close";
  const search = element("input");
  search.type = "search";
  search.placeholder = "搜索功能…";
  search.setAttribute("aria-label", "搜索功能");
  const searchBar = element("div");
  searchBar.className = "search-bar";
  searchBar.append(search);
  header.append(heading, searchBar);
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
  reset.title = "所有功能恢复默认，保存后生效。";
  exportButton.title = "导出为 JSON，不含密钥和历史。";
  [reset, clearCache, exportButton, importButton].forEach(button => button.type = "button");
  const file = element("input");
  file.type = "file";
  file.accept = ".json,application/json";
  file.hidden = true;
  const dataTools = element("div");
  dataTools.className = "data-tools";
  dataTools.append(exportButton, importButton, clearCache, reset, file);
  actions.append(close, save);
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
  shadow.append(style, dialog, toast);
  (document.getElementById("nspp-tools") || document.body).append(launch);
  document.body.append(host);
  let draft: Settings = loadSettings(features);
  let toastTimer: ReturnType<typeof setTimeout>;
  const dismissToast = () => {
    clearTimeout(toastTimer);
    toast.hidePopover?.();
    toast.hidden = true;
  };
  toastClose.addEventListener("click", dismissToast);
  const notify = (message: string, type: "info" | "success" | "error" = "info") => {
    host.toggleAttribute("data-dark", document.body.classList.contains("dark-layout"));
    toast.dataset.type = type;
    toastIcon.textContent = { info: "i", success: "✓", error: "!" }[type];
    toastMessage.textContent = message;
    toast.hidden = false;
    toast.hidePopover?.();
    toast.showPopover?.();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(dismissToast, 6000);
  };
  const updates = createUpdateChecker(notify, () => !document.hidden && !dialog.open && !document.querySelector('dialog[open]'));

  let sections: HTMLElement[] = [];
  let links: HTMLAnchorElement[] = [];
  function activate(index: number) {
    links.forEach((link, i) => {
      if (i === index) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  function syncCategory() {
    if (!sections.length) return;
    const top = content.getBoundingClientRect().top;
    let current = 0;
    sections.forEach((section, index) => { if (section.getBoundingClientRect().top <= top + 24) current = index; });
    if (content.scrollTop > 0 && content.scrollTop + content.clientHeight >= content.scrollHeight - 2) current = sections.length - 1;
    activate(current);
  }
  content.addEventListener("scroll", syncCategory, { passive: true });
  function addSection(name: string) {
    const group = element("section");
    const index = sections.length;
    group.id = `nspp-category-${index}`;
    const link = element("a", name);
    link.href = `#${group.id}`;
    link.addEventListener("click", event => {
      event.preventDefault();
      content.scrollTo({ top: content.scrollTop + group.getBoundingClientRect().top - content.getBoundingClientRect().top, behavior: "instant" });
      activate(index);
    });
    sections.push(group); links.push(link); navigation.append(link);
    group.append(element("h3", name));
    content.append(group);
    return group;
  }
  function renderFeature(feature: Feature) {
    const settings = draft[feature.id];
    const row = element("article");
    const label = element("label");
    label.className = "feature-heading";
    label.title = feature.description;
    const toggle = element("input");
    toggle.type = "checkbox";
    toggle.checked = settings.enabled === true;
    label.append(element("strong", feature.title), toggle);
    row.append(label);
    const options = Object.keys(feature.defaults).filter(key => key !== "enabled");
    if (!options.length) return row;
    const details = element("div");
    details.className = "feature-options";
    const conditional: [HTMLElement, () => boolean][] = [];
    const sync = () => {
      details.hidden = !toggle.checked;
      for (const [field, visible] of conditional) field.hidden = !visible();
    };
    toggle.addEventListener("change", () => { settings.enabled = toggle.checked; sync(); });
    for (const key of options) {
      const metadata = feature.fields?.[key];
      const value = settings[key];
      const field = element("label");
      field.className = "field";
      field.append(element("span", metadata?.label || key));
      let control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (metadata?.type === "select") {
        control = element("select");
        for (const option of metadata.options || []) {
          const item = element("option", option.label);
          item.value = option.value;
          control.append(item);
        }
      } else if (metadata?.type === "textarea") {
        control = element("textarea");
        control.rows = 3;
      } else {
        control = element("input");
        control.type = metadata?.type === "color" ? "color" : typeof value === "boolean" ? "checkbox" : typeof value === "number" ? "number" : /^(api[-_]?key|token|password|secret|access[-_]?token)$/i.test(key) ? "password" : "text";
      }
      if (typeof value === "boolean" && control instanceof HTMLInputElement) control.checked = value;
      else if (feature.id === 'request-settings' && control instanceof HTMLInputElement) { control.min = key === 'maxConcurrent' ? '1' : '0'; control.max = key === 'maxConcurrent' ? '10' : '5000'; control.step = '1'; control.value = String(value); }
      else control.value = String(value);
      control.addEventListener("input", () => {
        settings[key] = typeof value === "boolean" ? (control as HTMLInputElement).checked
          : typeof value === "number" ? Number(control.value) : control.value;
        sync();
      });
      field.append(control);
      details.append(field);
      const visible = dependsOn[`${feature.id}.${key}`];
      if (visible) conditional.push([field, () => visible(settings)]);
    }
    sync();
    row.append(details);
    return row;
  }
  function render() {
    content.replaceChildren();
    navigation.replaceChildren();
    sections = []; links = [];
    const query = search.value.toLocaleLowerCase().trim();
    const groups = new Map<string, HTMLElement>();
    const ordered = [...features].sort((a, b) => categoryOrder.indexOf(categoryOf(a)) - categoryOrder.indexOf(categoryOf(b)));
    for (const feature of ordered) {
      const category = categoryOf(feature);
      if (query && !`${feature.title} ${feature.description} ${feature.group} ${category} ${Object.values(feature.fields || {}).map(field => field.label).join(' ')}`.toLocaleLowerCase().includes(query)) continue;
      let group = groups.get(category);
      if (!group) { group = addSection(category); groups.set(category, group); }
      group.append(renderFeature(feature));
    }
    const showData = !query || '数据 导出 导入 配置 缓存 恢复默认 备份'.includes(query);
    const showAbout = !query || '关于 nodeseek++ github 项目地址 下载 安装 更新 版本 使用说明 反馈 greasy fork 开源 许可证'.includes(query);
    if (showData || showAbout) {
      const group = groups.get("其他") || addSection("其他");
      groups.set("其他", group);
      if (showData) {
        const row = element("article");
        row.append(element("strong", "数据"), dataTools);
        group.append(row);
      }
      if (showAbout) group.append(aboutContent(() => updates.check(), () => {
        const launcher = document.querySelector<HTMLButtonElement>('[data-nspp-share-launcher]');
        if (!launcher) { void navigator.clipboard?.writeText(SHARE_TEXT).then(() => notify('已复制分享文案和安装地址', 'success'), () => notify('复制失败，请手动复制项目地址', 'error')); return; }
        dialog.close(); launcher.click();
      }));
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
    document.documentElement.setAttribute('data-nspp-settings-open', '');
    close.focus();
  };
  launch.addEventListener("click", open);
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) {
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  } });
  dialog.addEventListener("close", () => { document.documentElement.removeAttribute('data-nspp-settings-open'); launch.focus(); });
  search.addEventListener("input", render);
  form.addEventListener("submit", event => {
    event.preventDefault();
    save.disabled = true;
    save.setAttribute("aria-busy", "true");
    save.textContent = "正在保存…";
    try { saveSettings(features, draft); location.reload(); }
    catch { save.disabled = false; save.removeAttribute("aria-busy"); save.textContent = "保存并刷新"; notify("保存失败，请检查油猴存储权限后重试。", "error"); }
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
    try { clearCaches(); location.reload(); }
    catch {
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
      if (selected.size > 1_000_000) throw new Error("配置文件不能超过 1 MB");
      draft = parseSettings(features, await selected.text());
      render();
      notify("已导入，保存后生效。", "success");
    } catch (error) { notify(error instanceof Error ? error.message : "导入失败", "error"); }
    finally { file.value = ""; importButton.disabled = false; importButton.removeAttribute("aria-busy"); importButton.textContent = "导入配置"; }
  });
  return { open, notify, stopUpdates: updates.stop };
}
