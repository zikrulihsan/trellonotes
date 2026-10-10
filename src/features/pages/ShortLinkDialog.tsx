import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useWorkspaceActions } from '@/hooks/useWorkspace';
import { supabase } from '@/lib/supabase/client';
import {
  SHORT_CODE_PATTERN,
  setShortCode,
  shortUrl,
  toShortCode,
} from '@/lib/supabase/published-pages';
import type { Page } from '@/features/workspace/types';

/** Lets the writer pick the page's short link, such as /s/cv-2026. */
export function ShortLinkDialog({ page, onClose }: { page: Page; onClose: () => void }) {
  const { setPagePublished } = useWorkspaceActions();
  const current = page.published?.code;
  const [value, setValue] = useState(current ?? toShortCode(page.title)),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  const host = window.location.host,
    valid = SHORT_CODE_PATTERN.test(value);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !page.published) return;
    setBusy(true);
    setError('');
    try {
      const code = await setShortCode(supabase, page.id, value);
      setPagePublished(page.id, { ...page.published, code });
      await navigator.clipboard.writeText(shortUrl(code)).then(
        () => setCopied(true),
        () => {
          /* Saved either way; copying is a convenience. */
        },
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this short link.');
    } finally {
      setBusy(false);
    }
  }
  const saved = copied && value === page.published?.code;
  return (
    <Modal title="Short link" onClose={onClose}>
      <form className="short-link-form" onSubmit={submit}>
        <label htmlFor="short-code">{host}/s/</label>
        <input
          id="short-code"
          autoFocus
          maxLength={40}
          value={value}
          onChange={(event) => {
            setCopied(false);
            setValue(event.target.value.toLowerCase().replace(/[\s_]+/g, '-'));
          }}
          aria-describedby="short-code-help"
        />
        <p id="short-code-help" className={error || (!valid && value) ? 'short-link-error' : ''}>
          {error ||
            (saved
              ? 'Saved and copied.'
              : !valid && value
                ? 'Use 3–40 lowercase letters or numbers, with dashes between words.'
                : current && value !== current
                  ? `/s/${current} will stop working.`
                  : 'Anyone with this link can open the page.')}
        </p>
        <div className="modal-actions">
          <Button onClick={onClose}>{saved ? 'Done' : 'Cancel'}</Button>
          <Button type="submit" variant="primary" disabled={busy || !valid || value === current}>
            {busy ? 'Saving…' : 'Save and copy'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
