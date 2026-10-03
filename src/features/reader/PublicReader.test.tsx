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
vi.mock('@/lib/supabase/published-pages', async (original) => ({
  ...(await original<object>()),
  getPublishedPage: (_client: unknown, userId: string, slug: string) =>
    Promise.resolve(
      userId === AUTHOR && slug === 'catatan-rilis'
        ? {
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
    expect(screen.getByRole('link', { name: /More from Zikrul Ihsan/ })).toHaveAttribute(
      'href',
      '/@zikrul',
    );
  });

  it('says so when the handle does not exist', async () => {
    renderAt('/@nobody/catatan-rilis');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});
