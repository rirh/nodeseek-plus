/** Locate the site's notification panel through its own three notification tabs. */
export function findNotificationContainer(): HTMLElement | undefined {
  const tabs = new Map<string, HTMLElement[]>();
  for (const node of document.querySelectorAll<HTMLElement>('a, button, li, span')) {
    if (node.closest('.nspp-messages, .nspp-message-native-toolbar, #nspp-settings, #nspp-tools, .user-card, .user-panel, .user-stat, aside')) continue;
    let kind: string | undefined;
    if (node instanceof HTMLAnchorElement) {
      const url = new URL(node.href, location.href);
      if (url.origin === location.origin && url.pathname === '/notification') kind = url.hash.match(/^#\/(atMe|reply|message)(?:\?|$)/)?.[1];
    }
    const label = node.textContent?.replace(/\s+/g, '') || '';
    kind ||= /^@我\d*$/.test(label) ? 'atMe' : /^回复主题\d*$/.test(label) ? 'reply' : /^私信\d*$/.test(label) ? 'message' : undefined;
    if (kind) tabs.set(kind, [...(tabs.get(kind) || []), node]);
  }
  for (const mention of tabs.get('atMe') || []) {
    let group = mention.parentElement;
    while (group && group !== document.body && group !== document.documentElement) {
      if ((tabs.get('reply') || []).some(tab => group!.contains(tab)) && (tabs.get('message') || []).some(tab => group!.contains(tab))) {
        const hasBody = !!group.querySelector('.md-editor, .comment-content') || Array.from(group.children).some(child => !child.contains(mention) && !!child.querySelector('img'));
        const container = hasBody ? group : group.parentElement;
        if (container && container !== document.body && container !== document.documentElement && !container.matches('header, nav, aside, footer')) return container;
        break;
      }
      group = group.parentElement;
    }
  }
}
