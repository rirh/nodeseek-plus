import { toolIcon } from '../lib/tool-icon';
import { GM_getValue, GM_setValue } from '../lib/userscript';

const KEY = 'nspp:tools-collapsed';

// Phones get a toggle at the bottom of the floating toolbar; collapsed, only the toggle stays visible.
// The choice is remembered across pages. On desktop the toggle is hidden by CSS and the toolbar is always open.
export function mountToolsCollapse(tools: HTMLElement): () => void {
  const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'nspp-tool-icon nspp-tools-toggle';
  const apply = (collapsed: boolean) => {
    tools.toggleAttribute('data-collapsed', collapsed);
    toggle.replaceChildren(toolIcon(collapsed ? 'up' : 'down'));
    toggle.title = collapsed ? '展开工具栏' : '收起工具栏';
    toggle.setAttribute('aria-label', toggle.title);
    toggle.setAttribute('aria-expanded', String(!collapsed));
  };
  apply(GM_getValue<boolean>(KEY, false) === true);
  toggle.addEventListener('click', () => {
    const collapsed = !tools.hasAttribute('data-collapsed');
    apply(collapsed);
    try { GM_setValue(KEY, collapsed); } catch { /* Still toggles for this page. */ }
  });
  tools.append(toggle);
  return () => { toggle.remove(); tools.removeAttribute('data-collapsed'); };
}
