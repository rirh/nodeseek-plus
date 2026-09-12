import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import sql from 'highlight.js/lib/languages/sql';
import type { Feature } from '../core/types';

export const codeHighlight: Feature = {
  id: 'code-highlight', title: '代码语法高亮', group: '阅读',
  description: '内置 JS、TS、JSON、Shell、Python、CSS、HTML 和 SQL；未知语言保留原文，不加载外部脚本。',
  defaults: { enabled: true },
  mount(ctx) {
    for (const [name, language] of Object.entries({ javascript, typescript, json, bash, python, css, xml, sql })) hljs.registerLanguage(name, language);
    const processed = new WeakSet<Element>();
    const restore: (() => void)[] = [];
    const stop = ctx.watch(() => {
      document.querySelectorAll<HTMLElement>('.post-content pre code, .comment-content pre code, .nsk-content pre code, .markdown-body pre code').forEach(code => {
        if (processed.has(code) || code.dataset.highlighted) return;
        processed.add(code);
        const language = code.className.match(/(?:language|lang)-([\w-]+)/)?.[1];
        if (!language || !hljs.getLanguage(language) || (code.textContent?.length || 0) > 100_000) return;
        const original = code.innerHTML;
        const hadClass = code.classList.contains('hljs');
        // highlight.js escapes input before adding its own fixed token markup.
        code.innerHTML = hljs.highlight(code.textContent || '', { language, ignoreIllegals: true }).value;
        code.classList.add('hljs');
        restore.push(() => { code.innerHTML = original; if (!hadClass) code.classList.remove('hljs'); });
      });
    });
    const style = document.createElement('style');
    style.textContent = `.hljs-keyword,.hljs-selector-tag,.hljs-built_in{color:#8250df}.hljs-string,.hljs-attr,.hljs-addition{color:#116329}.hljs-comment,.hljs-quote{color:#6e7781}.hljs-number,.hljs-literal{color:#0550ae}.hljs-title,.hljs-name{color:#953800}body.dark-layout .hljs-keyword,body.dark-layout .hljs-built_in{color:#d2a8ff}body.dark-layout .hljs-string,body.dark-layout .hljs-attr{color:#7ee787}body.dark-layout .hljs-comment{color:#9ba3ad}body.dark-layout .hljs-number,body.dark-layout .hljs-literal{color:#79c0ff}body.dark-layout .hljs-title,body.dark-layout .hljs-name{color:#ffa657}`;
    document.head.append(style);
    return () => { stop(); style.remove(); restore.forEach(fn => fn()); };
  },
};
