import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppProviders } from '@/app/AppProviders';
import { useWorkspace } from '@/hooks/useWorkspace';
import { JournalPage } from './JournalPage';

function PageCount() {
  const { workspace } = useWorkspace();
  return <span data-testid="pages">{workspace.pages?.length ?? 0}</span>;
}

describe('work journal page', () => {
  it('explains how cards get there, keeps notes, and drafts a private page', () => {
    localStorage.clear();
    render(
      <AppProviders>
        <JournalPage />
        <PageCount />
      </AppProviders>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This week');
    expect(screen.getByText(/Move a card to a done list/)).toBeInTheDocument();
    const draft = screen.getByRole('button', { name: 'Draft a page from this week' });
    expect(draft).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Notes on the week' }), {
      target: { value: 'Shipped the landing page.' },
    });
    expect(draft).toBeEnabled();
    fireEvent.click(draft);
    expect(screen.getByTestId('pages')).toHaveTextContent('1');
  });
});
