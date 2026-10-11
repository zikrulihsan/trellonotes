import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PublicReader } from './PublicReader';

const AUTHOR = '0d4278c6-6483-4035-bbe5-fb027b17ac7f';

vi.mock('@/lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: {} }));
vi.mock('@/lib/supabase/profiles', () => ({
  getProfile: (_client: unknown, by: { handle?: string; userId?: string }) =>
    Promise.resolve(
      by.handle === 'zikrul' || by.userId === AUTHOR
        ? { user_id: AUTHOR, handle: 'zikrul', display_name: 'Zikrul Ihsan' }
        : null,
    ),
}));
const page = (id: string, slug: string, title: string, published_at: string) => ({
  id,
  slug,
  title,
  content: `<p>${'word '.repeat(600)}</p>`,
  author_name: 'Zikrul Ihsan',
  published_at,
  updated_at: published_at,
});
// Listed pages only, the way the database query returns them.
const LISTED = [
  page('p-note', 'catatan-rilis', 'Catatan rilis', '2026-09-04T00:00:00Z'),
  page('p-project', 'folio-story', 'How Folio was built', '2026-08-01T00:00:00Z'),
];
let landing: unknown = null;
vi.mock('@/lib/supabase/landing', async (original) => {
  const actual = await original<typeof import('@/lib/supabase/landing')>();
  // Normalized, the way getLanding reads it from the database.
  return {
    ...actual,
    getLanding: () => Promise.resolve(landing && actual.normalizeLanding(landing)),
  };
});
vi.mock('@/lib/supabase/published-pages', async (original) => ({
  ...(await original<object>()),
  listPublishedPages: (_client: unknown, userId: string) =>
    Promise.resolve(userId === AUTHOR ? LISTED : []),
  resolveShortCode: (_client: unknown, code: string) =>
    Promise.resolve(code === 'k7m2xq9' ? { userId: AUTHOR, slug: 'rahasia' } : null),
  getPublishedPage: (_client: unknown, userId: string, slug: string) =>
    Promise.resolve(
      userId === AUTHOR && (slug === 'catatan-rilis' || slug === 'rahasia')
        ? {
            unlisted: slug === 'rahasia',
            id: 'p1',
            slug,
            title: 'Catatan rilis',
            content:
              '<p>Isi tulisan.</p><img src=x onerror="window.hacked=1"><script>window.hacked=1</script>',
            author_name: 'Zikrul Ihsan',
            published_at: '2026-10-04T00:00:00Z',
            updated_at: '2026-10-04T00:00:00Z',
          }
        : null,
    ),
}));

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PublicReader />
    </MemoryRouter>,
  );

describe('public reader', () => {
  it('shows a published page at its handle address, without running scripts', async () => {
    renderAt('/@zikrul/catatan-rilis');
    expect(await screen.findByText('Isi tulisan.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Catatan rilis' })).toBeInTheDocument();
    expect(document.querySelector('script, img[onerror]')).toBeNull();
    expect((window as { hacked?: number }).hacked).toBeUndefined();
  });

  it('moves older account-id links to the handle address', async () => {
    renderAt(`/read/${AUTHOR}/catatan-rilis`);
    expect(await screen.findByText('Isi tulisan.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Me' })).toHaveAttribute('href', '/@zikrul');
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('href', '/@zikrul?blog');
  });

  it('does not lead from an unlisted page to the public list', async () => {
    renderAt('/@zikrul/rahasia');
    expect(await screen.findByText('Isi tulisan.')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('ends a listed page with more to read and a way back to the Blog', async () => {
    renderAt('/@zikrul/catatan-rilis');
    expect(await screen.findByRole('heading', { name: 'Keep reading' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /How Folio was built/ })).toHaveAttribute(
      'href',
      '/@zikrul/folio-story',
    );
    // The page being read isn't suggested again.
    expect(screen.queryByRole('link', { name: /Catatan rilis/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Back to Blog' })).toHaveAttribute(
      'href',
      '/@zikrul?blog',
    );
  });

  it('keeps an unlisted page to itself, without suggestions', async () => {
    renderAt('/@zikrul/rahasia');
    expect(await screen.findByText('Isi tulisan.')).toBeInTheDocument();
    expect(screen.queryByText('Keep reading')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Back to Blog' })).toBeNull();
  });

  it('opens the page a short link points to, keeping the short address', async () => {
    renderAt('/s/k7m2xq9');
    expect(await screen.findByText('Isi tulisan.')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('says so when a short link points nowhere', async () => {
    renderAt('/s/zzzzzzz');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });

  it('says so when the handle does not exist', async () => {
    renderAt('/@nobody/catatan-rilis');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });

  it('shows the landing page the writer set up, linking projects to their pages', async () => {
    landing = {
      greeting: 'Hi, Zikrul Here',
      tagline: 'Delivering Impact Through Software',
      links: [
        { label: 'Contact', url: 'mailto:me@example.com' },
        { label: 'CV', url: '/s/cv' },
      ],
      socials: ['https://github.com/zikrul', 'mailto:me@example.com'],
      helpsHeading: 'Helps People to:',
      helps: [{ title: 'Build Impactful Software', subtitle: 'as engineer' }],
      projectsHeading: 'Curious on what i did?',
      projects: [
        { id: 'a', title: 'Folio', category: 'Software', year: '2026', pageId: 'p-project' },
        // Its page is unlisted (not in the listed pages), so the card must not link to it.
        {
          id: 'b',
          title: 'Secret client',
          category: 'Business',
          year: '2026',
          pageId: 'p-unlisted',
        },
      ],
      notesHeading: 'Want to know what i think of?',
      notesCount: 5,
    };
    renderAt('/@zikrul');
    expect(await screen.findByRole('heading', { name: 'Hi, Zikrul Here' })).toBeInTheDocument();
    expect(screen.getByText('Delivering Impact Through Software')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      'mailto:me@example.com',
    );
    expect(screen.getByRole('link', { name: 'CV' })).toHaveAttribute('href', '/s/cv');
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/zikrul',
    );
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute(
      'href',
      'mailto:me@example.com',
    );
    expect(screen.getByRole('link', { name: /Folio/ })).toHaveAttribute(
      'href',
      '/@zikrul/folio-story',
    );
    expect(screen.getByText('Secret client').closest('a')).toBeNull();
    expect(screen.getByText('Software · 2026')).toBeInTheDocument();
    // The project's write-up isn't repeated in the notes list.
    expect(screen.getByRole('link', { name: /Catatan rilis/ })).toHaveTextContent('3 min');
    expect(screen.queryByRole('link', { name: /How Folio was built/ })).toBeNull();
    expect(screen.getByRole('link', { name: /See all/ })).toHaveAttribute('href', '/@zikrul?blog');
    expect(screen.getByRole('link', { name: 'Me' })).toHaveAttribute('aria-current', 'page');
  });

  it('greets by name and lists notes when no landing page is set up', async () => {
    landing = null;
    renderAt('/@zikrul');
    expect(await screen.findByRole('heading', { name: 'Hi, Zikrul Here' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /How Folio was built/ })).toBeInTheDocument();
  });

  it('lists every listed page on the Blog page', async () => {
    renderAt('/@zikrul?blog');
    expect(await screen.findByRole('heading', { name: 'Blog' })).toBeInTheDocument();
    expect(screen.getByText('Everything Zikrul Ihsan has written.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How Folio was built' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('aria-current', 'page');
  });

  it('still opens the Blog page from the older ?notes address', async () => {
    renderAt('/@zikrul?notes');
    expect(await screen.findByRole('heading', { name: 'Blog' })).toBeInTheDocument();
  });

  it('shows the About page the writer filled in, linking stories to listed pages only', async () => {
    landing = {
      about: {
        role: 'Software Engineer',
        intro: 'I build things.\n\nI also write.',
        stack: ['React', 'Supabase'],
        now: ['Building Notis'],
        stories: [
          { id: 's1', label: '2026', pageId: 'p-note' },
          { id: 's2', label: '2025', pageId: 'p-unlisted' },
        ],
        experiences: [
          {
            id: 'e1',
            period: '2024 – Present',
            title: 'Engineer',
            company: 'Acme',
            companyUrl: 'acme.com',
            location: 'Remote',
            description: 'Shipped the app.',
            highlights: ['Led the redesign'],
          },
        ],
      },
    };
    renderAt('/@zikrul?about');
    expect(await screen.findByRole('heading', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('I also write.')).toBeInTheDocument();
    expect(screen.getByText('Supabase')).toBeInTheDocument();
    expect(screen.getByText('Building Notis')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /2026/ })).toHaveAttribute(
      'href',
      '/@zikrul/catatan-rilis',
    );
    expect(screen.queryByText('2025')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Engineer' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Acme' })).toHaveAttribute('href', 'https://acme.com');
    expect(screen.getByText('Led the redesign')).toBeInTheDocument();
  });

  it('leaves About out of the menu until it has content', async () => {
    landing = null;
    renderAt('/@zikrul');
    expect(await screen.findByRole('link', { name: 'Me' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'About' })).toBeNull();
  });
});
