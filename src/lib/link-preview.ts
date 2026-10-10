/**
 * Link previews for shared pages. Chat apps and social sites read the page's HTML
 * without running scripts, so the Netlify edge function `link-preview` writes the
 * page's title and summary into the HTML before it is sent. Kept free of app imports
 * so the edge function can use it as is.
 */

export interface Preview {
  title: string;
  description: string;
  url: string;
  image?: string;
  type: 'article' | 'profile';
}

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  nbsp: ' ',
};

/** The opening words of a page's HTML as plain text, for the preview's description. */
export function summarize(html: string, maxLength = 200): string {
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|h[1-6]|li|blockquote|pre)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name: string) => ENTITIES[name])
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > maxLength / 2 ? cut.lastIndexOf(' ') : cut.length)}…`;
}

/** The first web image in the page, used as the preview picture. */
export function firstImage(html: string): string | undefined {
  const src = /<img\b[^>]*\bsrc=["'](https:\/\/[^"']+)["']/i.exec(html)?.[1];
  return src?.replace(/&amp;/g, '&');
}

/** Puts the page's title, description and Open Graph tags into the app's HTML. */
export function withPreview(html: string, preview: Preview): string {
  const title = escape(preview.title),
    description = escape(preview.description);
  const tags = [
    `<meta property="og:type" content="${preview.type}" />`,
    `<meta property="og:site_name" content="Folio" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${escape(preview.url)}" />`,
    preview.image && `<meta property="og:image" content="${escape(preview.image)}" />`,
    `<meta name="twitter:card" content="${preview.image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    preview.image && `<meta name="twitter:image" content="${escape(preview.image)}" />`,
  ].filter(Boolean);
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${description}" />`,
    )
    .replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
}
