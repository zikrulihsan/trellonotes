export function plainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc
    .querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,br')
    .forEach((el) => el.appendChild(doc.createTextNode(' ')));
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}
export const wordCount = (html: string) =>
  plainText(html).trim().split(/\s+/).filter(Boolean).length;
