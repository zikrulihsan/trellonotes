import { render, screen, within } from '@testing-library/react';
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
  it('opens on the sample board with only Board, Pages and Landing page', () => {
    window.history.replaceState(null, '', '/playground');
    render(<Playground />);
    expect(window.location.pathname).toMatch(/^\/playground\/board\//);
    expect(screen.getByRole('heading', { level: 1, name: 'My work' })).toBeInTheDocument();
    const sections = within(screen.getByRole('navigation', { name: 'Sections' }));
    expect(sections.getAllByRole('button').map((item) => item.textContent)).toEqual([
      'Board',
      'Pages3',
      'Landing page',
    ]);
    expect(screen.getByRole('link', { name: 'See the live page' })).toHaveAttribute(
      'href',
      '/playground/@alya',
    );
    for (const link of screen.getAllByRole('link', { name: 'Make your own' }))
      expect(link).toHaveAttribute('href', '/?start');
  });

  it('edits the sample without saving it', async () => {
    window.history.replaceState(null, '', '/playground/initiative/checkout-redesign');
    render(<Playground />);
    expect(await screen.findByRole('textbox', { name: 'Title' })).toHaveValue('Checkout redesign');
    expect(screen.getByText('Not saved · playground')).toBeInTheDocument();
    expect(localStorage.getItem(workspaceStorageKey())).toBeNull();
  });

  it('shows the sample landing page with the posts already published', () => {
    window.history.replaceState(null, '', '/playground/@alya?blog');
    render(<Playground />);
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Shipping a waitlist in a week')).toBeInTheDocument();
    // The story is still a draft until the visitor publishes it.
    expect(screen.queryByText('The boring bug that cost us sales')).toBeNull();
    expect(screen.getByRole('link', { name: 'Back to the app' })).toBeInTheDocument();
  });
});
