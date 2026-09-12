export function postPath(href: string, base: string): string | undefined {
    try {
        const url = new URL(href, base);
        if (url.origin !== new URL(base).origin)
            return;
        const id = url.pathname.match(/^\/post-(\d+)(?:-\d+)?(?:\.html)?\/?$/)?.[1];
        return id ? `/post-${id}-1` : undefined;
    }
    catch {
        return;
    }
}
export function directLink(href: string, base: string): string | undefined {
    try {
        let url = new URL(href, base);
        for (let i = 0; i < 3 && url.origin === new URL(base).origin && url.pathname === '/jump' && url.searchParams.has('to'); i++)
            url = new URL(url.searchParams.get('to')!, base);
        return /^https?:$/.test(url.protocol) ? url.href : undefined;
    }
    catch {
        return;
    }
}
export const filterLines = (value: unknown) => String(value || '').split(/\n|,/).map(s => s.trim()).filter(Boolean);
export function shouldFilter(title: string, author: string, keywords: string[], users: string[], level: number, required: number) {
    return keywords.some(k => title.toLowerCase().includes(k.toLowerCase())) || users.includes(author) || (level >= 0 && Number.isFinite(required) && required > level);
}
