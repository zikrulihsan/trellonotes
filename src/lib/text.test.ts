import { describe, expect, it } from 'vitest';
import { plainText, wordCount } from './text';
import { isAllowedLink } from './links';
describe('writing helpers', () => {
  it('counts words across paragraphs, headings, and nested lists', () => {
    const html = '<p>First thought</p><h2>Another idea</h2><ul><li><p>Keep writing</p></li></ul>';
    expect(plainText(html)).toBe('First thought Another idea Keep writing');
    expect(wordCount(html)).toBe(6);
    expect(wordCount('<p></p>')).toBe(0);
  });
  it('allows ordinary links and rejects executable schemes', () => {
    expect(isAllowedLink('https://example.com')).toBe(true);
    expect(isAllowedLink('mailto:hello@example.com')).toBe(true);
    expect(isAllowedLink('javascript:alert(1)')).toBe(false);
    expect(isAllowedLink('data:text/html,hello')).toBe(false);
  });
});
