import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import packageJson from './package.json' with { type: 'json' };
import { readFileSync } from 'node:fs';

const notices = ['THIRD_PARTY_NOTICES.md', 'references/highlight.js.LICENSE']
  .map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n\n');

export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __APP_ENV__: JSON.stringify(mode === 'stage' ? 'stage' : mode === 'development' ? 'dev' : 'prod'),
    __BUILD_TIME__: JSON.stringify(new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })),
  },
  plugins: [monkey({
    entry: 'src/main.ts',
    userscript: {
      name: mode === 'stage' ? 'NodeSeek++ (Stage)' : 'NodeSeek++',
      namespace: 'nodeseek-plus-plus',
      version: packageJson.version,
      description: '模块化论坛增强：阅读、过滤、回复、签到、交易与关键词监控，一个功能一套实现。',
      match: ['https://www.nodeseek.com/*', 'https://www.deepflood.com/*'],
      grant: ['GM_getValue', 'GM_setValue', 'GM_registerMenuCommand', 'unsafeWindow'],
      license: 'GPL-3.0-only',
      'run-at': 'document-end',
      noframes: true,
    },
    build: { fileName: 'nodeseek-plus-plus.user.js', metaFileName: true },
  })],
  build: {
    outDir: mode === 'stage' ? 'dist-stage' : 'dist',
    minify: false,
    rolldownOptions: { output: { banner: `/*!\n${notices.replaceAll('*/', '* /')}\n*/` } },
  },
}));
