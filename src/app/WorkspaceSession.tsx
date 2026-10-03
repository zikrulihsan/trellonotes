import { useState, type PropsWithChildren } from 'react';
import { Feather, LoaderCircle } from 'lucide-react';
import { WorkspaceProvider } from '@/context/WorkspaceProvider';
import { useAuth } from '@/context/auth-context';

export function WorkspaceSession({ children }: PropsWithChildren) {
  const { configured, loading, session, signInWithGoogle } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState('');

  if (!configured || session) {
    return <WorkspaceProvider key={session?.user.id ?? 'local'}>{children}</WorkspaceProvider>;
  }

  if (loading) {
    return (
      <div className="auth-loading" role="status">
        <LoaderCircle size={22} className="auth-spinner" />
        <span>Opening your writing room…</span>
      </div>
    );
  }

  async function handleGoogleSignIn() {
    setRedirecting(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start Google sign-in.');
      setRedirecting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-mark">
          <Feather size={19} />
        </div>
        <p className="eyebrow">A QUIET PLACE TO WRITE</p>
        <h1>Welcome to Folio</h1>
        <p className="auth-intro">
          Sign in with your Google account to open your boards and sync your writing.
        </p>
        <button
          className="google-signin"
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={redirecting}
        >
          {redirecting ? <LoaderCircle size={18} className="auth-spinner" /> : <GoogleMark />}
          {redirecting ? 'Opening Google…' : 'Continue with Google'}
        </button>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <p className="auth-footnote">Folio only uses your Google account to sign you in.</p>
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" width="19" height="19">
      <path
        fill="#4285F4"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.8-3.5 6.1-8.7 6.1-15Z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"
      />
      <path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z" />
      <path
        fill="#EA4335"
        d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9A19.8 19.8 0 0 0 24 4 20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z"
      />
    </svg>
  );
}
