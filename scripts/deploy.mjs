import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const capture = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });
try {
  if (capture('branch', '--show-current') !== 'main') throw new Error('请在 main 分支发布。');
  if (!/github\.com[:/]rirh\/nodeseek-plus(?:\.git)?$/.test(capture('remote', 'get-url', 'origin'))) throw new Error('origin 不是预期的发布仓库。');
  if (capture('ls-files', '--unmerged')) throw new Error('请先解决合并冲突，再运行 make deploy。');
  run('git', ['fetch', 'origin', 'main']);
  run('git', ['merge-base', '--is-ancestor', 'origin/main', 'HEAD']);
  const skipChecks = process.env.SKIP_CHECKS === '1';
  if (skipChecks) console.log('已跳过类型检查与测试，仅构建并发布。');
  else run('pnpm', ['run', 'typecheck']);
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', year: '2-digit', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map(x => [x.type, x.value]));
  const candidate = `${parts.year}.${Number(parts.month)}${Number(parts.day)}.${parts.hour}${parts.minute}`;
  const compare = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
  pkg.version = compare(candidate, pkg.version) > 0 ? candidate : `${pkg.version}.1`;
  writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  run('pnpm', ['run', 'build']);
  if (!skipChecks) run('pnpm', ['run', 'test']);
  run('git', ['add', '--all', '--', '.']);
  run('git', ['commit', '-m', `release: ${pkg.version}`]);
  run('git', ['push', 'origin', 'HEAD:main']);
  console.log(`GitHub 已发布 ${pkg.version}。`);
  console.log('油叉由 GitHub push Webhook 异步同步；本命令不把推送成功当作油叉同步成功。');
  console.log('同步源：https://raw.githubusercontent.com/rirh/nodeseek-plus/main/dist/nodeseek-plus-plus.user.js');
} catch (error) {
  console.error(error instanceof Error ? error.message : '发布失败');
  console.error('发布未全部完成。保留当前文件与提交，请检查后重试；不会强制推送或重置。');
  process.exitCode = 1;
}
