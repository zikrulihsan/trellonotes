import { describe, expect, it } from 'vitest';
import { isPublicWebUrl, siteIcon } from './link-image';

describe('site icons', () => {
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

  it('picks the largest icon a page declares, made absolute and https', () => {
    const html = `<head>
      <link rel="icon" href="/favicon-32.png" sizes="32x32">
      <link rel="apple-touch-icon" href="http://cdn.example.com/touch.png?a=1&amp;b=2">
      <link rel="stylesheet" href="/site.css">
    </head>`;
    expect(siteIcon(html, 'https://flipcard.id/deck')).toBe(
      'https://cdn.example.com/touch.png?a=1&b=2',
    );
    expect(siteIcon(`<link href='/i.svg' rel='shortcut icon'>`, 'https://a.id')).toBe(
      'https://a.id/i.svg',
    );
  });

  it("falls back to the site's /favicon.ico", () => {
    expect(siteIcon('<title>No icon</title>', 'http://example.com/a/b')).toBe(
      'https://example.com/favicon.ico',
    );
  });
});
