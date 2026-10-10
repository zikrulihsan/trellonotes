import { describe, expect, it } from 'vitest';
import { firstImage, summarize, withPreview } from './link-preview';

const APP_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta
      name="description"
      content="A home for your ideas."
    />
    <title>Folio — Your writing room</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

describe('link previews', () => {
  it('shows the page title and summary instead of the app name', () => {
    const html = withPreview(APP_HTML, {
      title: 'Catatan "rilis" <2.0>',
      description: 'Isi tulisan.',
      url: 'https://folio.example/s/cv-2026',
      type: 'article',
    });
    expect(html).toContain('<title>Catatan &quot;rilis&quot; &lt;2.0&gt;</title>');
    expect(html).toContain(
      '<meta property="og:title" content="Catatan &quot;rilis&quot; &lt;2.0&gt;" />',
    );
    expect(html).toContain('<meta name="description" content="Isi tulisan." />');
    expect(html).toContain('<meta name="twitter:card" content="summary" />');
    expect(html).not.toContain('Your writing room');
    expect(html).not.toContain('A home for your ideas');
  });

  it('adds a large picture when the page has an image', () => {
    const html = withPreview(APP_HTML, {
      title: 'Foto',
      description: '',
      url: 'https://folio.example/@zikrul/foto',
      image: 'https://cdn.example/a.png?x=1&y=2',
      type: 'article',
    });
    expect(html).toContain(
      '<meta property="og:image" content="https://cdn.example/a.png?x=1&amp;y=2" />',
    );
    expect(html).toContain('summary_large_image');
  });

  it('summarizes HTML as plain text, cut at a word', () => {
    expect(summarize('<h1>Judul</h1><p>Satu &amp; dua</p><script>x()</script>')).toBe(
      'Judul Satu & dua',
    );
    const long = summarize(`<p>${'kata '.repeat(100)}</p>`, 50);
    expect(long.length).toBeLessThanOrEqual(50);
    expect(long.endsWith('kata…')).toBe(true);
  });

  it('finds the first web image', () => {
    expect(
      firstImage('<p>x</p><img alt="" src="https://a.example/1.png"><img src="https://b">'),
    ).toBe('https://a.example/1.png');
    expect(firstImage('<img src="data:image/png;base64,xx">')).toBeUndefined();
  });
});
