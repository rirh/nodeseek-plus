// Which forum the script runs on. NodeSeek and DeepFlood share one engine; linux.do (Discourse) and V2EX only get 摸鱼模式.

export type SiteKind = 'nodeseek' | 'linuxdo' | 'v2ex';

export function siteKind(host: string): SiteKind {
  if (/(?:^|\.)linux\.do$/i.test(host)) return 'linuxdo';
  if (/(?:^|\.)v2ex\.com$/i.test(host)) return 'v2ex';
  return 'nodeseek';
}

export const SITE: SiteKind = siteKind(typeof location === 'undefined' ? '' : location.hostname);

/**
 * Whether the page is the forum itself rather than a Cloudflare check or an error page, so the script only loads on
 * pages it can work with. linux.do and V2EX must also show their own app; NodeSeek pages vary too much to require one.
 */
export function pageHealthy(kind: SiteKind, doc: Document = document) {
  if (doc.querySelector('#challenge-form, #challenge-running, #challenge-stage, #cf-error-details, .cf-error-details, #cf-wrapper')) return false;
  if (/^(?:Just a moment|Attention Required|请稍候|Checking your browser)/i.test(doc.title.trim())) return false;
  if (kind === 'linuxdo') return !!doc.querySelector('#data-preloaded, #main, .ember-application');
  if (kind === 'v2ex') return !!doc.querySelector('#Wrapper #Main, #Wrapper');
  return true;
}
