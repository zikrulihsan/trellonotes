import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { workspaceStorageKey } from '@/lib/storage';
import { Playground } from './Playground';

// jsdom has no scrolling; opening a page or the website scrolls to the top.
// The landing form's preview measures itself, which jsdom can't either.
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('playground', () => {
  it('opens on the sample board with Board, Look back, Pages and Landing page', () => {
    window.history.replaceState(null, '', '/playground');
    render(<Playground />);
    expect(window.location.pathname).toMatch(/^\/playground\/board\//);
    expect(screen.getByRole('heading', { level: 1, name: 'My work' })).toBeInTheDocument();
    const sections = within(screen.getByRole('navigation', { name: 'Sections' }));
    expect(sections.getAllByRole('button').map((item) => item.textContent)).toEqual([
      'Board',
      'Look back',
      'Pages3',
      'Landing page',
    ]);
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

  it('shows the AI write-up but asks to sign in to run it', () => {
    window.history.replaceState(null, '', '/playground/journal');
    render(<Playground />);
    fireEvent.click(screen.getByRole('button', { name: /Write it up/ }));
    const dialog = screen.getByRole('dialog', { name: 'Sign in to use AI' });
    expect(within(dialog).getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/?start',
    );
  });

  it('edits the landing page in the form and shows it on the live page', () => {
    window.history.replaceState(null, '', '/playground/landing');
    render(<Playground />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Tagline' }), {
      target: { value: 'I write down what I fix.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save landing page' }));
    fireEvent.click(screen.getByRole('link', { name: /View page/ }));
    expect(screen.getByText('I write down what I fix.')).toBeInTheDocument();
    expect(screen.getByText('Checkout redesign')).toBeInTheDocument();
  });

  it('shows the sample landing page with the posts already published', () => {
    window.history.replaceState(null, '', '/playground/@alya?blog');
    render(<Playground />);
    expect(screen.getByRole('link', { name: 'Blog' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Shipping a waitlist in a week')).toBeInTheDocument();
    // The story is still a draft until the visitor publishes it.
    expect(screen.queryByText('The boring bug that cost us sales')).toBeNull();
    expect(screen.getByRole('link', { name: 'Make your own' })).toHaveAttribute('href', '/?start');
  });
});
