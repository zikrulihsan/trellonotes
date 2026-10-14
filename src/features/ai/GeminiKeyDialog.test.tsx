import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadGeminiKey } from '@/lib/gemini-key';
import { GeminiKeyDialog } from './GeminiKeyDialog';

describe('Gemini key dialog', () => {
  afterEach(() => localStorage.clear());

  it('saves the key in this browser, then removes it', () => {
    const onClose = vi.fn();
    const { unmount } = render(<GeminiKeyDialog onClose={onClose} />);
    expect(screen.getByRole('link', { name: /Google AI Studio/ })).toHaveAttribute(
      'href',
      'https://aistudio.google.com/apikey',
    );
    expect(screen.getByRole('button', { name: 'Save key' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Remove key' })).toBeNull();
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: ' AIza-test ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save key' }));
    expect(loadGeminiKey()).toBe('AIza-test');
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();

    render(<GeminiKeyDialog onClose={onClose} />);
    expect(screen.getByLabelText('API key')).toHaveValue('AIza-test');
    fireEvent.click(screen.getByRole('button', { name: 'Remove key' }));
    expect(loadGeminiKey()).toBe('');
  });
});
