import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { isLegalPath } from '@/lib/app-paths';
import { LegalPage } from './LegalPage';

describe('terms and privacy pages', () => {
  it('shows the page for each address', () => {
    render(<LegalPage pathname="/privacy" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Privacy Policy');
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms');
  });

  it('knows which addresses are legal pages', () => {
    expect(isLegalPath('/terms')).toBe(true);
    expect(isLegalPath('/privacy/')).toBe(true);
    expect(isLegalPath('/@terms')).toBe(false);
  });
});
