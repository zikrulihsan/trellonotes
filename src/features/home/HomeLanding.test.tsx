import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeLanding } from './HomeLanding';

describe('signed-out home page', () => {
  it('says what Notis is and asks how to sign in only after Start writing', () => {
    const onGoogle = vi.fn();
    const onSwegrowth = vi.fn();
    render(
      <HomeLanding redirecting={false} error="" onGoogle={onGoogle} onSwegrowth={onSwegrowth} />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Write your thoughts. Track your work.',
    );
    expect(screen.getByText('stories, a personal blog, a professional page')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Software Engineer Growth Community' }),
    ).toHaveAttribute('href', 'https://swegrowth.id');
    expect(
      screen.getByRole('img', { name: 'Posts plus resume equals your professional page' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Each task holds its own notes.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Publish your writing as a blog page/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /your professional profile/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'You choose what you share.' })).toBeInTheDocument();
    expect(screen.getByText(/I walked before opening the laptop/)).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'A sourdough loaf on a wooden board' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Service the AC')).toBeInTheDocument();
    expect(screen.getAllByText('Only you can see this')).toHaveLength(3);
    expect(screen.getAllByText('Public post')).toHaveLength(3);
    expect(screen.getByText('Learning Go')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next examples' })).toBeInTheDocument();
    expect(screen.getByText('Why not Notion or Trello?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Try it first, no login/ })).toHaveAttribute(
      'href',
      '/playground',
    );
    expect(screen.getByRole('link', { name: /Try the board/ })).toHaveAttribute(
      'href',
      '/playground',
    );
    expect(screen.getByRole('link', { name: /See sample pages/ })).toHaveAttribute(
      'href',
      '/playground/pages',
    );
    expect(screen.getByRole('link', { name: /See an example blog/ })).toHaveAttribute(
      'href',
      '/playground/@alya?blog',
    );
    expect(screen.getByRole('link', { name: /Try the page editor/ })).toHaveAttribute(
      'href',
      '/playground/landing',
    );
    expect(screen.getByRole('heading', { name: 'Start your first board.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
    const starts = screen.getAllByRole('button', { name: /Start writing/ });
    expect(starts).toHaveLength(3);
    fireEvent.click(starts[0]);
    expect(screen.getByRole('dialog', { name: 'Start writing in Notis' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    fireEvent.click(screen.getByRole('checkbox', { name: /agree to the Privacy Policy/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue with SWE Growth' }));
    expect(onGoogle).toHaveBeenCalledTimes(1);
    expect(onSwegrowth).toHaveBeenCalledTimes(1);
  });

  it('opens the sign-in choices with the error after a failed sign-in', () => {
    render(
      <HomeLanding redirecting error="Popup blocked" onGoogle={() => {}} onSwegrowth={() => {}} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Popup blocked');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Opening Google…' })).toBeDisabled();
  });
});
