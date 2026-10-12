import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { workspaceStorageKey } from '@/lib/storage';
import { Playground } from './Playground';

// jsdom has no scrolling; opening a page or the website scrolls to the top.
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('playground', () => {
  it('lets visitors pick what to try, and keeps the sample out of storage', async () => {
    window.history.replaceState(null, '', '/playground');
    render(<Playground />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Try Notis, no sign.up\./);
    expect(
      screen.getByRole('link', { name: /Build your website from your resume/ }),
    ).toHaveAttribute('href', '/?start');
    fireEvent.click(screen.getByRole('link', { name: /Updates on an initiative/ }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Checkout redesign'),
    );
    expect(window.location.pathname).toMatch(/^\/playground\/initiative\/checkout-redesign/);
    expect(screen.getByText('Not saved · playground')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Checkout redesign, round two' },
    });
    expect(localStorage.getItem(workspaceStorageKey())).toBeNull();
  });

  it('shows the sample website with the posts already published', () => {
    window.history.replaceState(null, '', '/playground/@alya?blog');
    render(<Playground />);
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Shipping a waitlist in a week')).toBeInTheDocument();
    // The story is still a draft until the visitor publishes it.
    expect(screen.queryByText('The boring bug that cost us sales')).toBeNull();
  });
});
