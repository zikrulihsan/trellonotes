import { useState, type PropsWithChildren } from 'react';
import { LoaderCircle } from 'lucide-react';
import { WorkspaceProvider } from '@/context/WorkspaceProvider';
import { useAuth } from '@/context/auth-context';
import { HomeLanding } from '@/features/home/HomeLanding';
import { ConsentGate } from '@/features/legal/ConsentGate';
import { hasAcceptedTerms } from '@/lib/consent';

export function WorkspaceSession({ children }: PropsWithChildren) {
  const {
    configured,
    loading,
    session,
    signInWithGoogle,
    signInWithSwegrowth,
    acceptTerms,
    signOut,
  } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState('');

  if (configured && session && !hasAcceptedTerms(session.user)) {
    return <ConsentGate onAccept={acceptTerms} onSignOut={signOut} />;
  }

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
    <HomeLanding
      redirecting={redirecting}
      error={error}
      onGoogle={() => void handleGoogleSignIn()}
      onSwegrowth={signInWithSwegrowth}
    />
  );
}
