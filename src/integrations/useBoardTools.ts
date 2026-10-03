import { useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
interface Tool {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown;
}
interface ModelContext {
  registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void>;
}
export function useBoardTools() {
  const { workspace } = useWorkspace(),
    actions = useWorkspaceActions(),
    state = useRef(workspace);
  useLayoutEffect(() => {
    state.current = workspace;
  }, [workspace]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Tool) => {
      try {
        Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {});
      } catch {
        /* Browser tools are optional. */
      }
    };
    register({
      name: 'read_writing_boards',
      description: 'Read writing boards, lists, and card titles on this device.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => ({
        boards: state.current.boards,
        cards: state.current.cards.map(({ id, boardId, listId, title }) => ({
          id,
          boardId,
          listId,
          title,
        })),
      }),
    });
    register({
      name: 'create_writing_card',
      description: 'Create a blank writing card in an existing board list, saved on this device.',
      inputSchema: {
        type: 'object',
        properties: {
          boardId: { type: 'string' },
          listId: { type: 'string' },
          title: { type: 'string', minLength: 1, maxLength: 150 },
        },
        required: ['boardId', 'listId', 'title'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: (input: unknown) => {
        if (!input || typeof input !== 'object') throw new Error('Expected a card object');
        const value = input as Record<string, unknown>;
        if (
          typeof value.boardId !== 'string' ||
          typeof value.listId !== 'string' ||
          typeof value.title !== 'string'
        )
          throw new Error('Expected boardId, listId, and title');
        let result;
        flushSync(() => {
          const note = actions.createNote(
            value.boardId as string,
            value.listId as string,
            value.title as string,
          );
          result = { id: note.id, title: note.title, listId: note.listId };
        });
        return result;
      },
    });
    return () => lifecycle.abort();
  }, [actions]);
}
