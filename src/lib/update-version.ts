export const UPDATE_URL = 'https://raw.githubusercontent.com/rirh/nodeseek-plus/main/dist/nodeseek-plus-plus.user.js';
export const UPDATE_META_URL = UPDATE_URL.replace(/\.user\.js$/, '.meta.js');
export const REPOSITORY_URL = 'https://github.com/rirh/nodeseek-plus';
const NAMESPACE = 'nodeseek-plus-plus';

export function readUpdateVersion(source: string): string {
  const header = source.match(/^\s*\/\/ ==UserScript==\r?\n([\s\S]*?)^\/\/ ==\/UserScript==/m)?.[1];
  const version = header?.match(/^\/\/\s+@version\s+(\d+(?:\.\d+)+)\s*$/m)?.[1];
  if (!version) throw new Error('更新源未返回有效版本信息');
  // Only trust metadata that identifies this script, so a wrong or hijacked file cannot announce updates.
  if (header!.match(/^\/\/\s+@namespace\s+(\S+)\s*$/m)?.[1] !== NAMESPACE) throw new Error('更新源脚本标识不匹配');
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
