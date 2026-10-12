import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, X } from 'lucide-react';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { pagePath } from '@/lib/app-paths';
import { weekChoices, weekNotes, writeUp } from '@/lib/writeup';
import type { JournalWeek } from './journal';

/**
 * Drafts a page about one week with Gemini, from the cards, lists and notes the writer
 * picks. Unpicked items never leave the app, and the draft stays private until published.
 */
export function WeekWriteup({
  week,
  title,
  onClose,
}: {
  week: JournalWeek;
  title: string;
  onClose: () => void;
}) {
  const { workspace } = useWorkspace(),
    { createPage } = useWorkspaceActions(),
    navigate = useNavigate();
  const choices = weekChoices(week);
  const [picked, setPicked] = useState(() => new Set(choices.map((choice) => choice.id)));
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({});
  const notes = weekNotes(workspace, week, picked);
  const groups = [...new Set(choices.map((choice) => choice.group))];

  async function run() {
    if (!supabase) return;
    setState({ busy: true });
    try {
      const page = await writeUp(supabase, 'week', notes, title);
      navigate(pagePath({ id: createPage(page), title: page.title }));
    } catch (reason) {
      setState({ error: reason instanceof Error ? reason.message : 'Could not write the draft.' });
    }
  }

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (!next.delete(id)) next.add(id);
    setPicked(next);
  };

  return (
    <section className="journal-writeup" aria-labelledby="journal-writeup">
      <div className="journal-writeup-head">
        <h2 id="journal-writeup">
          <Sparkles size={16} /> Write it up with Gemini
        </h2>
        <button className="icon-button" aria-label="Close" onClick={onClose}>
          <X size={17} />
        </button>
      </div>
      <p>
        Gemini reads the notes inside the cards and lists you tick, plus your notes on the week, and
        drafts a post in your words. It only uses what your notes say.
      </p>
      {groups.map((group) => (
        <fieldset key={group}>
          <legend>{group}</legend>
          {choices
            .filter((choice) => choice.group === group)
            .map((choice) => (
              <label key={choice.id}>
                <input
                  type="checkbox"
                  checked={picked.has(choice.id)}
                  onChange={() => toggle(choice.id)}
                />
                {choice.title || 'Untitled'}
              </label>
            ))}
        </fieldset>
      ))}
      <div className="journal-writeup-actions">
        <Button variant="primary" onClick={run} disabled={state.busy || !notes.trim()}>
          {state.busy ? 'Writing…' : 'Write the draft'}
        </Button>
        <span className="journal-private">
          <Lock size={13} /> You get a private page to edit. Nothing is published.
        </span>
      </div>
      {state.error && (
        <p className="publish-error" role="alert">
          {state.error}
        </p>
      )}
    </section>
  );
}
