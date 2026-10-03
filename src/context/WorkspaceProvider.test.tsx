import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceProvider } from './WorkspaceProvider';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { loadWorkspace } from '@/lib/storage';
describe('workspace context', () => {
  it('persists writing across provider remounts', () => {
    const first = renderHook(() => ({ ...useWorkspace(), ...useWorkspaceActions() }), {
      wrapper: WorkspaceProvider,
    });
    let noteId = '';
    act(() => {
      noteId = first.result.current.createNote('writing-room', 'ideas', 'A new note').id;
    });
    act(() =>
      first.result.current.updateNote(noteId, { content: '<p>Something to remember.</p>' }),
    );
    expect(loadWorkspace().cards.find((note) => note.id === noteId)?.content).toBe(
      '<p>Something to remember.</p>',
    );
    first.unmount();
    const second = renderHook(() => useWorkspace(), { wrapper: WorkspaceProvider });
    expect(second.result.current.workspace.cards.find((note) => note.id === noteId)?.content).toBe(
      '<p>Something to remember.</p>',
    );
  });
  it('reports a save failure while keeping editing available', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    try {
      const hook = renderHook(() => ({ ...useWorkspace(), ...useWorkspaceActions() }), {
        wrapper: WorkspaceProvider,
      });
      await waitFor(() => expect(hook.result.current.saveError).toBe(true));
      act(() => hook.result.current.updateNote('small', { title: 'Still editable' }));
      expect(hook.result.current.workspace.cards.find((note) => note.id === 'small')?.title).toBe(
        'Still editable',
      );
    } finally {
      spy.mockRestore();
    }
  });
});
