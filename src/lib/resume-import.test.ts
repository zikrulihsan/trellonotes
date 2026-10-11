import { describe, expect, it } from 'vitest';
import { applyResume, readResume } from './resume-import';
import { defaultLanding } from './supabase/landing';

const resume = {
  greeting: 'Hi, Zikrul Here',
  tagline: 'Software engineer building AI products',
  contactEmail: 'me@example.com',
  socials: ['linkedin.com/in/zikrul', 'tel:+62123', 'javascript:alert(1)'],
  helps: [{ title: 'Build Reliable AI Products', subtitle: 'as engineer at Hukumonline' }],
  projects: [
    { title: 'SWE Growth', summary: 'A community', category: 'Community', year: '', pageId: 'x' },
  ],
  about: {
    role: 'Senior Engineer',
    intro: 'I build things.',
    stack: ['Python', 'React'],
    now: ['Building Notis'],
    experiences: [
      { period: '2024 – Present', title: 'Engineer', company: 'Hukumonline', highlights: ['Fast'] },
    ],
  },
};

describe('filling the landing page from a resume', () => {
  it('fills the hero, helps, projects and About, adding a contact button', () => {
    const start = defaultLanding('Zikrul Ihsan');
    const landing = applyResume(start, resume);
    expect(landing.tagline).toBe('Software engineer building AI products');
    expect(landing.links).toEqual([{ label: 'Contact', url: 'mailto:me@example.com' }]);
    // Only web and mail links become social icons.
    expect(landing.socials).toEqual(['https://linkedin.com/in/zikrul', 'mailto:me@example.com']);
    expect(landing.helps[0].title).toBe('Build Reliable AI Products');
    // A project read from a resume never claims a page.
    expect(landing.projects[0]).toMatchObject({ title: 'SWE Growth', pageId: null });
    expect(landing.about.experiences[0]).toMatchObject({ company: 'Hukumonline' });
    expect(landing.about.experiences[0].id).toBeTruthy();
    expect(landing.about.stack).toEqual(['Python', 'React']);
  });

  it('keeps what the writer already set up and the resume leaves out', () => {
    const start = {
      ...defaultLanding('Zikrul'),
      links: [{ label: 'CV', url: '/s/cv' }],
      about: { ...defaultLanding('Zikrul').about, photo: 'https://example.com/me.jpg' },
    };
    const landing = applyResume(start, { tagline: 'New line', helps: [] });
    expect(landing.links).toEqual([{ label: 'CV', url: '/s/cv' }]);
    expect(landing.about.photo).toBe('https://example.com/me.jpg');
    expect(landing.greeting).toBe(start.greeting);
    expect(landing.tagline).toBe('New line');
  });

  it('ignores an answer that is not an object', () => {
    const start = defaultLanding('Zikrul');
    expect(applyResume(start, 'nope')).toEqual(start);
  });

  it('turns away Word files and empty text before calling Gemini', async () => {
    const client = {} as never;
    const word = new File(['x'], 'cv.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    await expect(readResume(client, { file: word })).rejects.toThrow(/paste its text/);
    await expect(readResume(client, { text: '  ' })).rejects.toThrow(/Paste your resume/);
  });
});
