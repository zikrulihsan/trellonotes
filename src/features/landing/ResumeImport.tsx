import { useState } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase/client';
import { readResume, RESUME_ACCEPT } from '@/lib/resume-import';
import { RESUME_MAX_CHARS } from '@/lib/resume-prompt';
import { usePlayground } from '@/features/playground/playground-context';
import { SignInPrompt } from '@/features/playground/SignInPrompt';

/** Reads a resume with Gemini and hands the result to the editor below for review. */
export function ResumeImport({ onRead }: { onRead: (resume: unknown) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [state, setState] = useState<{ busy?: boolean; error?: string; done?: boolean }>({});
  const playground = usePlayground();
  const [askSignIn, setAskSignIn] = useState(false);

  async function run() {
    // The playground shows the resume import; reading one needs an account.
    if (playground) return setAskSignIn(true);
    if (!supabase) return;
    setState({ busy: true });
    try {
      onRead(await readResume(supabase, file ? { file } : { text }));
      setState({ done: true });
    } catch (reason) {
      setState({ error: reason instanceof Error ? reason.message : 'Could not read the resume.' });
    }
  }

  return (
    <section className="landing-fieldset landing-resume" aria-labelledby="landing-resume">
      <h2 id="landing-resume">
        <Sparkles size={16} /> Start from your resume
      </h2>
      <p className="landing-admin-hint">
        Gemini reads your resume and fills the hero, what you help with, projects and the About page
        below. Nothing is published until you review it and press Save.
      </p>
      <div className="landing-resume-pick">
        <label className="landing-resume-file">
          <FileText size={16} />
          <span>{file ? file.name : 'Choose a PDF, image or text file'}</span>
          <input
            type="file"
            accept={RESUME_ACCEPT}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setState({});
            }}
          />
        </label>
        <Button onClick={run} disabled={state.busy || (!playground && !file && !text.trim())}>
          {state.busy ? 'Reading…' : 'Fill with Gemini'}
        </Button>
      </div>
      {!file && (
        <details className="landing-resume-paste">
          <summary>Or paste its text</summary>
          <textarea
            aria-label="Resume text"
            rows={6}
            maxLength={RESUME_MAX_CHARS}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setState({});
            }}
          />
        </details>
      )}
      {askSignIn && (
        <SignInPrompt
          feature="Filling your page from a resume"
          onClose={() => setAskSignIn(false)}
        />
      )}
      {state.error && (
        <p className="publish-error" role="alert">
          {state.error}
        </p>
      )}
      {state.done && (
        <p className="landing-admin-note" role="status">
          Filled from your resume. Check each section below, then save.
        </p>
      )}
    </section>
  );
}
