import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { takeRememberedConsent } from '@/lib/consent';
import { ConsentCheckbox } from './ConsentCheckbox';

type ConsentGateProps = {
  onAccept: () => Promise<void>;
  onSignOut: () => Promise<void>;
};

/**
 * Shown once to a signed-in account that has not agreed to the Terms and the Privacy Policy,
 * such as one arriving straight from swegrowth.id. Consent ticked before sign-in is recorded
 * without asking again.
 */
export function ConsentGate({ onAccept, onSignOut }: ConsentGateProps) {
  const [remembered] = useState(takeRememberedConsent);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(remembered);
  const [error, setError] = useState('');

  async function accept() {
    setSaving(true);
    setError('');
    try {
      await onAccept();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save your agreement.');
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!remembered) return;
    onAccept().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Could not save your agreement.');
      setSaving(false);
    });
  }, [remembered, onAccept]);

  if (remembered && saving) {
    return (
      <div className="auth-loading" role="status">
        <LoaderCircle size={22} className="auth-spinner" />
        <span>Opening your writing room…</span>
      </div>
    );
  }

  return (
    <div className="home home-consent-gate">
      <section className="home-consent-card" aria-labelledby="home-consent-title">
        <h1 id="home-consent-title">Before you start</h1>
        <p>Please read how Notis works with your account and your writing.</p>
        <ConsentCheckbox checked={agreed} onChange={setAgreed} />
        <div className="home-signin-options">
          <button
            className="home-button is-primary"
            type="button"
            disabled={!agreed || saving}
            onClick={() => void accept()}
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
          <button className="home-button" type="button" onClick={() => void onSignOut()}>
            Sign out
          </button>
        </div>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
