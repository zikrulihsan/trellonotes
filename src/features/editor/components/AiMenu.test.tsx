import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import { AiMenu } from './AiMenu';

vi.mock('@/hooks/useWorkspace', () => ({ useWorkspace: () => ({ cloudEnabled: true }) }));
vi.mock('@/hooks/useUI', () => ({ useUI: () => ({ openDialog: vi.fn() }) }));
vi.mock('@/features/playground/playground-context', () => ({ usePlayground: () => null }));
vi.mock('@/lib/supabase/client', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } },
}));

// jsdom draws nothing, so give ranges and nodes the empty boxes the editor and menu measure.
const noRects = () => Object.assign([], { item: () => null }) as unknown as DOMRectList;
const noBox = () => new DOMRect();
for (const proto of [Range.prototype, Element.prototype, Text.prototype] as object[])
  Object.assign(proto, {
    getClientRects: (proto as { getClientRects?: unknown }).getClientRects ?? noRects,
    getBoundingClientRect:
      (proto as { getBoundingClientRect?: unknown }).getBoundingClientRect ?? noBox,
  });
document.elementFromPoint ??= () => null;

const harness: { editor: Editor | null } = { editor: null };
function Harness() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>We fixd the bug quick.</p><p>Second paragraph.</p>',
    shouldRerenderOnTransaction: true,
    onCreate: ({ editor }) => {
      harness.editor = editor;
    },
  });
  return (
    <>
      <EditorContent editor={editor} />
      <AiMenu editor={editor} />
    </>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  harness.editor = null;
});

describe('Edit with AI', () => {
  it('suggests a rewrite of the selection and replaces it only when accepted', async () => {
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      expect(JSON.parse(String(init.body))).toEqual({
        action: 'fix',
        text: 'We fixd the bug quick.',
      });
      return new Response(
        JSON.stringify({ rewrite: { markdown: 'We fixed the bug **quickly**.' } }),
      );
    });
    vi.stubGlobal('fetch', fetch);
    render(<Harness />);
    await waitFor(() => expect(harness.editor).not.toBeNull());
    act(() => {
      harness.editor!.chain().focus().setTextSelection({ from: 1, to: 23 }).run();
    });
    fireEvent.click(await screen.findByRole('button', { name: /Edit with AI/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Fix spelling and grammar' }));
    expect(await screen.findByLabelText('AI suggestion')).toHaveTextContent(
      'We fixed the bug quickly.',
    );
    expect(harness.editor!.getHTML()).toContain('We fixd the bug quick.');
    fireEvent.click(screen.getByRole('button', { name: /Replace/ }));
    expect(harness.editor!.getHTML()).toBe(
      '<p>We fixed the bug <strong>quickly</strong>.</p><p>Second paragraph.</p>',
    );
  });

  it('points to an own key when the free requests are used up', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: "You have used today's 10 free AI requests. Add your own Gemini API key.",
              code: 'ai-quota',
            }),
            { status: 429 },
          ),
      ),
    );
    render(<Harness />);
    await waitFor(() => expect(harness.editor).not.toBeNull());
    act(() => {
      harness.editor!.chain().focus().setTextSelection({ from: 1, to: 10 }).run();
    });
    fireEvent.click(await screen.findByRole('button', { name: /Edit with AI/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Improve writing' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/free AI requests/);
    expect(screen.getByRole('button', { name: 'Add your key' })).toBeInTheDocument();
  });
});
