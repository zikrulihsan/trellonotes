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
      'Write notes, get noticed.',
    );
    expect(
      screen.getByRole('img', { name: 'Write notes, turn them into stories, show your work' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Stories plus resume equals your personal website' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Every story is part of/ })).toBeInTheDocument();
    expect(screen.getByText('Is everything I write public?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See a real one' })).toHaveAttribute(
      'href',
      'https://notis.swegrowth.id/@zikrul-ihsan-md',
    );
    expect(screen.getByRole('link', { name: 'See an example page' })).toHaveAttribute(
      'href',
      'https://notis.swegrowth.id/@zikrul-ihsan-md',
    );
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
    const starts = screen.getAllByRole('button', { name: /Start writing/ });
    expect(starts).toHaveLength(2);
    fireEvent.click(starts[0]);
    expect(screen.getByRole('dialog', { name: 'Start writing in Notis' })).toBeInTheDocument();
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
