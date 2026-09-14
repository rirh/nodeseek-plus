export function notificationAvatar(kind: 'atMe' | 'reply' | 'system'): string {
  const content = kind === 'atMe'
    ? '<text x="24" y="33" text-anchor="middle" font-family="Arial,sans-serif" font-size="32" font-weight="bold" fill="white">@</text>'
    : kind === 'reply'
      ? '<path d="M12 13h24v18H23l-7 6v-6h-4z" fill="white"/><path d="M17 19h14M17 24h10" stroke="#269c68" stroke-width="2" stroke-linecap="round"/>'
      : '<path d="M15 21a9 9 0 0 1 18 0v6l3 5H12l3-5z" fill="white"/><path d="M20 35a4 4 0 0 0 8 0" fill="white"/><path d="M24 10v3" stroke="white" stroke-width="3" stroke-linecap="round"/>';
  const color = { atMe: '#5287db', reply: '#269c68', system: '#d99a32' }[kind];
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="9" fill="${color}"/>${content}</svg>`)}`;
}
