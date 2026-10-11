import { describe, expect, it } from 'vitest';
import { defaultLanding, normalizeLanding, toLinkUrl } from './landing';

describe('landing page links', () => {
  it('turns what a writer types into a safe link', () => {
    expect(toLinkUrl('me@example.com')).toBe('mailto:me@example.com');
    expect(toLinkUrl('cv.example.com/2026')).toBe('https://cv.example.com/2026');
    expect(toLinkUrl('/s/cv')).toBe('/s/cv');
    expect(toLinkUrl('+62 812-3456-789')).toBe('tel:+628123456789');
    expect(toLinkUrl('https://example.com')).toBe('https://example.com');
  });

  it('refuses links that could run code or leave through a protocol-relative path', () => {
    expect(toLinkUrl('javascript:alert(1)')).toBe('');
    expect(toLinkUrl('data:text/html,hi')).toBe('');
    expect(toLinkUrl('//evil.example')).toBe('');
  });
});

describe('normalizeLanding', () => {
  it('rejects anything that is not an object', () => {
    expect(normalizeLanding(null)).toBeNull();
    expect(normalizeLanding([])).toBeNull();
    expect(normalizeLanding('hi')).toBeNull();
  });

  it('drops empty entries, unsafe links and non-https images, and caps lists', () => {
    const landing = normalizeLanding({
      greeting: '  Hi, Zikrul Here  ',
      links: [
        { label: 'Contact', url: 'me@example.com' },
        { label: 'Bad', url: 'javascript:alert(1)' },
        { label: '', url: 'https://example.com' },
      ],
      helps: [{ title: 'Build software', subtitle: 'as engineer' }, { title: '' }],
      projects: [
        { id: 'a', title: 'Folio', image: 'http://insecure.example/x.png', pageId: 'p1' },
        { title: '' },
        ...Array.from({ length: 20 }, (_, i) => ({ id: `x${i}`, title: `P${i}` })),
      ],
      notesCount: 99,
    })!;
    expect(landing.greeting).toBe('Hi, Zikrul Here');
    expect(landing.links).toEqual([{ label: 'Contact', url: 'mailto:me@example.com' }]);
    expect(landing.helps).toEqual([{ title: 'Build software', subtitle: 'as engineer' }]);
    expect(landing.projects[0]).toMatchObject({ id: 'a', title: 'Folio', image: '', pageId: 'p1' });
    expect(landing.projects).toHaveLength(12);
    expect(landing.notesCount).toBe(20);
  });

  it('greets with the first name by default', () => {
    expect(defaultLanding('Zikrul Ihsan').greeting).toBe('Hi, Zikrul Here');
  });
});
