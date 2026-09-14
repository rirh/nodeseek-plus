import { marked } from 'marked';
import { readingContent } from './post-preview';

export function renderMessageMarkdown(text: string, markdown = true): DocumentFragment {
  if (!markdown) { const result = document.createDocumentFragment(); result.append(document.createTextNode(text)); return result; }
  const html = marked.parse(text, { async: false, gfm: true, breaks: true });
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const result = readingContent(doc.body, location.origin);
  result.querySelectorAll('img').forEach(image => {
    image.removeAttribute('role'); image.removeAttribute('tabindex'); image.referrerPolicy = 'no-referrer';
    if (!image.closest('a')) {
      const link = document.createElement('a'); link.href = image.src; link.target = '_blank'; link.rel = 'noopener noreferrer';
      image.replaceWith(link); link.append(image);
    }
  });
  if (text.trim() && !result.textContent?.trim() && !result.querySelector('img, hr, table')) {
    result.replaceChildren(document.createTextNode(text));
  }
  return result;
}
