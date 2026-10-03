import { useState, type FormEvent } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { HANDLE_PATTERN, suggestHandle } from '@/lib/supabase/profiles';
import { writerPath } from '@/lib/supabase/published-pages';
import { useProfile } from './useProfile';

/** Shows the writer's public page address (/@handle) and lets them change the handle. */
export function PublicAddress() {
  const { profile, author, displayName, save } = useProfile();
  const [editing, setEditing] = useState(false),
    [value, setValue] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  if (!author || profile === undefined) return null;
  const host = window.location.host;
  function start() {
    setValue(profile?.handle ?? suggestHandle(displayName));
    setError('');
    setEditing(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await save(value);
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this address.');
    } finally {
      setBusy(false);
    }
  }
  if (editing)
    return (
      <form className="public-address" onSubmit={submit}>
        <label htmlFor="public-handle">{host}/@</label>
        <input
          id="public-handle"
          autoFocus
          maxLength={30}
          value={value}
          onChange={(event) => setValue(event.target.value.toLowerCase().replace(/\s+/g, '-'))}
          aria-describedby="public-handle-help"
        />
        <Button type="submit" variant="primary" disabled={busy || !HANDLE_PATTERN.test(value)}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        <Button onClick={() => setEditing(false)}>Cancel</Button>
        <p id="public-handle-help" className={error ? 'public-address-error' : ''}>
          {error ||
            (profile
              ? 'Links with your old address will stop working.'
              : '3–30 lowercase letters, numbers or dashes.')}
        </p>
      </form>
    );
  return (
    <div className="public-address">
      <span>Public page</span>
      {profile ? (
        <a href={writerPath(author)} target="_blank" rel="noreferrer">
          {host}/@{profile.handle}
          <ExternalLink size={13} />
        </a>
      ) : (
        <span className="public-address-muted">Not chosen yet</span>
      )}
      <button className="public-address-change" onClick={start}>
        {profile ? 'Change' : 'Choose address'}
      </button>
    </div>
  );
}
