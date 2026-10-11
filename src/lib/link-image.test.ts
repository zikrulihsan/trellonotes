import { describe, expect, it } from 'vitest';
import { isPublicWebUrl, previewImage } from './link-image';

describe('link preview images', () => {
  it('only fetches public web pages', () => {
    expect(isPublicWebUrl('https://flipcard.id')).not.toBeNull();
    for (const url of [
      'http://localhost:3000',
      'http://127.0.0.1',
      'http://10.0.0.5',
      'http://192.168.1.1',
      'http://169.254.169.254/latest',
      'http://[::1]/',
      'ftp://example.com',
      'https://user:pass@example.com',
      'not a url',
    ])
      expect(isPublicWebUrl(url)).toBeNull();
  });

  it('reads the Open Graph image, made absolute and https', () => {
    const html =
      '<head><meta property="og:title" content="x"><meta property="og:image" content="/cover.png?a=1&amp;b=2"></head>';
    expect(previewImage(html, 'https://flipcard.id/deck')).toBe(
      'https://flipcard.id/cover.png?a=1&b=2',
    );
  });

  it('falls back to the Twitter card and ignores pages without one', () => {
    expect(
      previewImage(
        `<meta content='http://cdn.example.com/c.jpg' name='twitter:image'>`,
        'https://example.com',
      ),
    ).toBe('https://cdn.example.com/c.jpg');
    expect(previewImage('<title>No image</title>', 'https://example.com')).toBeNull();
  });
});
