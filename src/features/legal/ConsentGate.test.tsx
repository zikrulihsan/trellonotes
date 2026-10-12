import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { rememberConsent } from '@/lib/consent';
import { ConsentGate } from './ConsentGate';

describe('consent gate', () => {
  afterEach(() => window.localStorage.clear());

  it('asks a signed-in account to agree before continuing', async () => {
    const onAccept = vi.fn(() => Promise.resolve());
    const onSignOut = vi.fn(() => Promise.resolve());
    render(<ConsentGate onAccept={onAccept} onSignOut={onSignOut} />);
    const proceed = screen.getByRole('button', { name: 'Continue' });
    expect(proceed).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
    fireEvent.click(screen.getByRole('checkbox', { name: /agree to the Privacy Policy/ }));
    fireEvent.click(proceed);
    await waitFor(() => expect(onAccept).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('records consent ticked before sign-in without asking again', async () => {
    rememberConsent();
    const onAccept = vi.fn(() => Promise.resolve());
    render(<ConsentGate onAccept={onAccept} onSignOut={() => Promise.resolve()} />);
    expect(screen.queryByRole('checkbox')).toBeNull();
    await waitFor(() => expect(onAccept).toHaveBeenCalledTimes(1));
  });
});
