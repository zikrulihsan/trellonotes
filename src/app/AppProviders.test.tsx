import { act, fireEvent, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useUI } from '@/hooks/useUI';
import { AppProviders } from './AppProviders';

let mounts = 0;
function Probe() {
  const { dialog, openDialog } = useUI(),
    navigate = useNavigate();
  useEffect(() => {
    mounts++;
  }, []);
  return (
    <>
      <span data-testid="dialog">{dialog?.kind ?? 'none'}</span>
      <button onClick={() => openDialog({ kind: 'create-board' })}>open</button>
      <button onClick={() => navigate('/pages')}>pages</button>
      <button onClick={() => navigate('/board/writing-room')}>board</button>
    </>
  );
}

describe('app shell', () => {
  it('keeps the app mounted when moving between screens, and closes open dialogs', () => {
    mounts = 0;
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );
    act(() => fireEvent.click(screen.getByText('open')));
    expect(screen.getByTestId('dialog')).toHaveTextContent('create-board');
    act(() => fireEvent.click(screen.getByText('pages')));
    act(() => fireEvent.click(screen.getByText('board')));
    expect(screen.getByTestId('dialog')).toHaveTextContent('none');
    expect(mounts).toBe(1);
  });
});
