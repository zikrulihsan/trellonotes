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
      'Notes that show your progress.',
    );
    expect(screen.getByText(/note-taking with a progress board/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Software Engineer Growth Community' }),
    ).toHaveAttribute('href', 'https://swegrowth.id');
    expect(
      screen.getByRole('img', { name: 'Posts plus resume equals your portfolio' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: "Write it down. See how far you've come." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'You did the work. Now tell the story.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Share how you think. Show what you did.' }),
    ).toBeInTheDocument();
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
    for (const link of screen.getAllByRole('link', { name: /Try the board/ })) {
      expect(link).toHaveAttribute('href', '/playground');
    }
    expect(screen.queryByRole('link', { name: /See sample pages/ })).not.toBeInTheDocument();
    for (const link of screen.getAllByRole('link', { name: /Try writing a post/ })) {
      expect(link).toHaveAttribute(
        'href',
        '/playground/page/the-boring-bug-that-cost-us-sales-storyche',
      );
    }
    for (const link of screen.getAllByRole('link', { name: /Try the portfolio editor/ })) {
      expect(link).toHaveAttribute('href', '/playground/landing');
    }
    expect(screen.getByRole('link', { name: 'See an example blog' })).toHaveAttribute(
      'href',
      '/playground/@alya?blog',
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
