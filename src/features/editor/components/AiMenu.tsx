import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { EditorState } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Check, LoaderCircle, RotateCcw, Sparkles, X } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePlayground } from '@/features/playground/playground-context';
import { SignInPrompt } from '@/features/playground/SignInPrompt';
import { useUI } from '@/hooks/useUI';
import { supabase } from '@/lib/supabase/client';
import { rewriteText } from '@/lib/rewrite';
import { REWRITE_ACTIONS, type RewriteAction } from '@/lib/rewrite-prompt';
import { markdownToHtml, renderInline } from '../markdown';
import { blocksToMarkdown, inlineToMarkdown, type DocNode } from '../selection-markdown';

type Step =
  | { kind: 'closed' }
  | { kind: 'actions' }
  | { kind: 'busy'; action: RewriteAction }
  | { kind: 'done'; action: RewriteAction; html: string }
  | { kind: 'failed'; action: RewriteAction; error: string };

/** What was selected when the writer asked: where it is, and whether it sits in one line. */
interface Passage {
  from: number;
  to: number;
  inline: boolean;
  markdown: string;
}

function selectedPassage(editor: Editor): Passage {
  const { from, to, $from, $to } = editor.state.selection;
  const inline = $from.sameParent($to) && $from.parent.isTextblock;
  const slice = editor.state.doc.slice(from, to).content.toJSON() as DocNode[] | null;
  return {
    from,
    to,
    inline,
    markdown: inline ? inlineToMarkdown(slice ?? []) : blocksToMarkdown(slice ?? []),
  };
}

/** The suggestion as the editor will take it: one line stays inline, more becomes blocks. */
function suggestionHtml(markdown: string, inline: boolean) {
  return inline ? renderInline(markdown.replace(/\s*\n+\s*/g, ' ')) : markdownToHtml(markdown);
}

/** Where the menu sits under the selection; one object, so the menu is not set up again. */
const MENU_OPTIONS = { placement: 'bottom-start', offset: 8 } as const;

/**
 * The AI menu over selected text: improve, shorten, fix or translate it. The answer shows
 * as a suggestion that replaces the selection only when the writer says so.
 */
export function AiMenu({ editor }: { editor: Editor | null }) {
  const { cloudEnabled } = useWorkspace(),
    playground = usePlayground(),
    { openDialog } = useUI();
  const [step, setStep] = useState<Step>({ kind: 'closed' }),
    [passage, setPassage] = useState<Passage | null>(null),
    [askSignIn, setAskSignIn] = useState(false);
  // The menu asks whether to show on every change; it reads the step through a ref so its
  // question stays one function, and the menu is not set up again on every render.
  const open = useRef(false);
  useLayoutEffect(() => {
    open.current = step.kind !== 'closed';
  });
  const shouldShow = useCallback(
    ({ editor, state }: { editor: Editor; state: EditorState }) =>
      open.current || (!state.selection.empty && editor.isEditable),
    [],
  );
  // AI needs an account: signed-in writers use it, the playground shows where it lives.
  if (!editor || !(cloudEnabled || playground)) return null;

  const close = () => {
    setStep({ kind: 'closed' });
    setPassage(null);
  };
  async function run(action: RewriteAction, from = passage ?? selectedPassage(editor!)) {
    if (playground) {
      close();
      return setAskSignIn(true);
    }
    if (!supabase) return;
    setPassage(from);
    setStep({ kind: 'busy', action });
    try {
      const markdown = await rewriteText(supabase, action, from.markdown);
      setStep({ kind: 'done', action, html: suggestionHtml(markdown, from.inline) });
    } catch (reason) {
      setStep({
        kind: 'failed',
        action,
        error: reason instanceof Error ? reason.message : 'Could not edit the passage.',
      });
    }
  }
  function accept(html: string) {
    if (!passage) return;
    editor!.chain().focus().insertContentAt({ from: passage.from, to: passage.to }, html).run();
    close();
  }
  const keep = (event: React.MouseEvent) => event.preventDefault();

  return (
    <>
      <BubbleMenu
        editor={editor}
        pluginKey="ai-menu"
        options={MENU_OPTIONS}
        shouldShow={shouldShow}
        className="ai-menu"
      >
        {step.kind === 'closed' && (
          <button
            type="button"
            className="ai-menu-open"
            onMouseDown={keep}
            onClick={() => setStep({ kind: 'actions' })}
          >
            <Sparkles size={15} /> Edit with AI
          </button>
        )}
        {step.kind === 'actions' && (
          <div className="ai-menu-panel" role="menu" aria-label="Edit with AI">
            {REWRITE_ACTIONS.map(({ action, label }) => (
              <button
                key={action}
                type="button"
                role="menuitem"
                onMouseDown={keep}
                onClick={() => void run(action, selectedPassage(editor))}
              >
                {label}
              </button>
            ))}
            <button type="button" className="ai-menu-dismiss" onMouseDown={keep} onClick={close}>
              Cancel
            </button>
          </div>
        )}
        {step.kind === 'busy' && (
          <div className="ai-menu-panel" role="status">
            <p className="ai-menu-status">
              <LoaderCircle size={15} className="ai-menu-spinner" /> Gemini is editing…
            </p>
          </div>
        )}
        {step.kind === 'done' && (
          <div className="ai-menu-panel is-result" aria-label="AI suggestion">
            <div
              className="ai-menu-suggestion"
              // Rendered from Gemini's Markdown, which escapes HTML; links are not followed here.
              dangerouslySetInnerHTML={{ __html: step.html }}
            />
            <div className="ai-menu-actions">
              <button
                type="button"
                className="is-primary"
                onMouseDown={keep}
                onClick={() => accept(step.html)}
              >
                <Check size={15} /> Replace
              </button>
              <button type="button" onMouseDown={keep} onClick={() => void run(step.action)}>
                <RotateCcw size={15} /> Try again
              </button>
              <button type="button" onMouseDown={keep} onClick={close}>
                <X size={15} /> Discard
              </button>
            </div>
          </div>
        )}
        {step.kind === 'failed' && (
          <div className="ai-menu-panel" role="alert">
            <p className="ai-menu-error">{step.error}</p>
            <div className="ai-menu-actions">
              {/quota|own Gemini/i.test(step.error) && (
                <button
                  type="button"
                  className="is-primary"
                  onMouseDown={keep}
                  onClick={() => {
                    close();
                    openDialog({ kind: 'gemini-key' });
                  }}
                >
                  Add your key
                </button>
              )}
              <button type="button" onMouseDown={keep} onClick={() => void run(step.action)}>
                <RotateCcw size={15} /> Try again
              </button>
              <button type="button" onMouseDown={keep} onClick={close}>
                Close
              </button>
            </div>
          </div>
        )}
      </BubbleMenu>
      {askSignIn && <SignInPrompt feature="Edit with AI" onClose={() => setAskSignIn(false)} />}
    </>
  );
}
