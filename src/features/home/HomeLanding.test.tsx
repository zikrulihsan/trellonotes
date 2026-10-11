import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeLanding } from './HomeLanding';

describe('signed-out home page', () => {
  it('says what Notis is and signs in from the top and the bottom', () => {
    const onGoogle = vi.fn();
    const onSwegrowth = vi.fn();
    render(
      <HomeLanding redirecting={false} error="" onGoogle={onGoogle} onSwegrowth={onSwegrowth} />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Getting noticed, from daily notes.',
    );
    expect(
      screen.getByRole('heading', { name: 'Everything starts with a note.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /deserves to be seen/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /See a real one/ })).toHaveAttribute(
      'href',
      'https://notis.swegrowth.id/@zikrul-ihsan-md',
    );
    const google = screen.getAllByRole('button', { name: 'Continue with Google' });
    expect(google).toHaveLength(2);
    fireEvent.click(google[1]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Continue with SWE Growth' })[0]);
    expect(onGoogle).toHaveBeenCalledTimes(1);
    expect(onSwegrowth).toHaveBeenCalledTimes(1);
  });

  it('shows a sign-in error', () => {
    render(
      <HomeLanding redirecting error="Popup blocked" onGoogle={() => {}} onSwegrowth={() => {}} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Popup blocked');
    expect(screen.getAllByRole('button', { name: 'Opening Google…' })[0]).toBeDisabled();
  });
});
