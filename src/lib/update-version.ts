export const UPDATE_URL = 'https://update.greasyfork.org/scripts/595488/NodeSeek%2B%2B.user.js';
export const UPDATE_META_URL = UPDATE_URL.replace(/\.user\.js$/, '.meta.js');

export function readUpdateVersion(source: string): string {
  const header = source.match(/^\s*\/\/ ==UserScript==\r?\n([\s\S]*?)^\/\/ ==\/UserScript==/m)?.[1];
  const version = header?.match(/^\/\/\s+@version\s+(\d+(?:\.\d+)+)\s*$/m)?.[1];
  if (!version) throw new Error('更新源未返回有效版本信息');
  return version;
}

export function isNewerVersion(candidate: string, current: string): boolean {
  if (![candidate, current].every(version => /^\d+(?:\.\d+)+$/.test(version))) return false;
  const left = candidate.split('.').map(BigInt), right = current.split('.').map(BigInt);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const a = left[i] ?? 0n, b = right[i] ?? 0n;
    if (a !== b) return a > b;
  }
  return false;
}
