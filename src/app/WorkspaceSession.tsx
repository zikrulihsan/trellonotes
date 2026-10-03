import { useState, type FormEvent, type PropsWithChildren } from 'react';
import { Feather, LoaderCircle, Mail } from 'lucide-react';
import { WorkspaceProvider } from '@/context/WorkspaceProvider';
import { useAuth } from '@/context/auth-context';

export function WorkspaceSession({ children }: PropsWithChildren) {
  const { configured, loading, session, sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await sendMagicLink(email.trim());
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not send the sign-in link.');
    } finally {
      setSending(false);
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
        <p className="auth-intro">Sign in to open your boards and keep your writing in sync.</p>
        {sent ? (
          <div className="auth-success" role="status">
            <Mail size={18} />
            <span>
              Check <strong>{email}</strong> for your sign-in link.
            </span>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" disabled={sending}>
              {sending ? <LoaderCircle size={17} className="auth-spinner" /> : <Mail size={17} />}
              {sending ? 'Sending…' : 'Send a sign-in link'}
            </button>
          </form>
        )}
        <p className="auth-footnote">
          No password needed. Your writing is private to your account.
        </p>
      </section>
    </main>
  );
}
