import { describe, expect, it } from 'vitest';
import { defaultLanding, hasAbout, normalizeLanding, socialPlatform, toLinkUrl } from './landing';

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

describe('social links', () => {
  it('keeps web and mail links, completing what the writer typed', () => {
    const landing = normalizeLanding({
      socials: ['github.com/zikrul', 'javascript:alert(1)', 'me@example.com', '/s/cv', ''],
    })!;
    expect(landing.socials).toEqual(['https://github.com/zikrul', 'mailto:me@example.com']);
  });

  it('names the network a link points to', () => {
    expect(socialPlatform('https://www.linkedin.com/in/zikrul')).toEqual({
      platform: 'linkedin',
      label: 'LinkedIn',
    });
    expect(socialPlatform('https://twitter.com/zikrul').platform).toBe('x');
    expect(socialPlatform('https://x.com/zikrul').label).toBe('X');
    expect(socialPlatform('mailto:me@example.com').platform).toBe('email');
    expect(socialPlatform('https://www.zikrul.dev')).toEqual({
      platform: 'website',
      label: 'zikrul.dev',
    });
  });
});

describe('about page', () => {
  it('is empty by default, so the menu leaves it out', () => {
    expect(hasAbout(defaultLanding('Zikrul').about)).toBe(false);
    expect(hasAbout(normalizeLanding({ about: 'nope' })!.about)).toBe(false);
  });

  it('trims lists, drops unsafe links and empty entries', () => {
    const { about } = normalizeLanding({
      about: {
        photo: 'http://insecure.example/me.jpg',
        stack: [' React ', '', 'Supabase'],
        now: ['Building Notis', '  '],
        stories: [
          { label: '2025', pageId: 'p1' },
          { label: '', pageId: null },
        ],
        experiences: [
          {
            title: 'Engineer',
            companyUrl: 'javascript:alert(1)',
            highlights: ['Shipped', ''],
          },
          { title: '' },
        ],
      },
    })!;
    expect(about.photo).toBe('');
    expect(about.stack).toEqual(['React', 'Supabase']);
    expect(about.now).toEqual(['Building Notis']);
    expect(about.stories).toHaveLength(1);
    expect(about.experiences).toHaveLength(1);
    expect(about.experiences[0].companyUrl).toBe('');
    expect(about.experiences[0].highlights).toEqual(['Shipped']);
    expect(hasAbout(about)).toBe(true);
  });
});
