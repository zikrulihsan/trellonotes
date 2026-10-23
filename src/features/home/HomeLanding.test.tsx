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
      'Write notes. Publish the good ones.',
    );
    expect(screen.getByText(/An open source note-taking app/)).toHaveTextContent(
      'An open source note-taking app where any note can become a public post. Your notes stay private until you choose to share one.',
    );
    expect(
      screen.getByRole('link', { name: 'Software Engineer Growth Community' }),
    ).toHaveAttribute('href', 'https://swegrowth.id');
    expect(
      screen.getByRole('img', { name: 'Posts plus resume equals your portfolio' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Notes for things in progress.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'A good note deserves readers.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Share how you think. Show what you did.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Note anything. You choose what to share.' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/I walked before opening the laptop/)).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'A sourdough loaf on a wooden board' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Service the AC')).toBeInTheDocument();
    expect(screen.getAllByText('Only you can see this')).toHaveLength(3);
    expect(screen.getAllByText('Public post')).toHaveLength(3);
    expect(screen.getByText('Learning Go')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next examples' })).toBeInTheDocument();
    expect(screen.getByText('Why not Notion or Obsidian?')).toBeInTheDocument();
    expect(screen.getByText('Open source')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Note-taking and public writing in one app/ }),
    ).toHaveAttribute('href', 'https://github.com/zikrulihsan/trellonotes');
    expect(
      screen.getByRole('heading', { name: 'Built in the open. Come build it with us.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /How to contribute/ })).toHaveAttribute(
      'href',
      'https://github.com/zikrulihsan/trellonotes/blob/main/CONTRIBUTING.md',
    );
    expect(screen.getByText('Is Notis open source?')).toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: 'Try Notis, no login' })).toHaveAttribute(
      'href',
      '/playground',
    );
    expect(screen.getByRole('heading', { name: 'Write your first note.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
    const starts = screen.getAllByRole('button', { name: /Start writing/ });
    expect(starts).toHaveLength(2);
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
