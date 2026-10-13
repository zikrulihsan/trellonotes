import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { BrowserRouter, Link, Navigate, useLocation } from 'react-router-dom';
import { App } from '@/app/App';
import { AuthContext, type AuthContextValue } from '@/context/auth-context';
import { UIProvider } from '@/context/UIProvider';
import { WorkspaceProvider } from '@/context/WorkspaceProvider';
import { FocusProvider } from '@/features/focus/FocusProvider';
import { SampleSite } from '@/features/reader/PublicReader';
import { useWorkspace } from '@/hooks/useWorkspace';
import { boardPath } from '@/lib/app-paths';
import { nowTitles } from '@/features/journal/journal';
import type { Landing } from '@/lib/supabase/landing';
import { PlaygroundContext, usePlayground } from './playground-context';
import {
  PLAYGROUND_AUTHOR,
  playgroundLanding,
  playgroundPosts,
  playgroundWorkspace,
} from './sample';

/** Where the landing page opens its sign-in choices. */
const SIGN_IN_URL = '/?start';

/** Nobody is signed in here; anything that would need an account goes to the sign-in page. */
const GUEST: AuthContextValue = {
  configured: false,
  loading: false,
  session: null,
  user: null,
  async signInWithGoogle() {
    window.location.assign(SIGN_IN_URL);
  },
  signInWithSwegrowth() {
    window.location.assign(SIGN_IN_URL);
  },
  async signOut() {},
  async acceptTerms() {},
};

/**
 * The playground (/playground): the real app on a sample workspace held in memory, so
 * visitors can try boards, writing, stories and the website without an account. Nothing
 * is saved and nothing is published; closing or reloading the tab starts over.
 */
export function Playground() {
  const [landing, saveLanding] = useState<Landing>(() => playgroundLanding(playgroundWorkspace()));
  const playground = useMemo(() => ({ landing, saveLanding }), [landing]);
  return (
    <BrowserRouter basename="/playground">
      <AuthContext.Provider value={GUEST}>
        <PlaygroundContext.Provider value={playground}>
          <UIProvider>
            <FocusProvider>
              <WorkspaceProvider initial={playgroundWorkspace}>
                <PlaygroundRoutes />
              </WorkspaceProvider>
            </FocusProvider>
          </UIProvider>
        </PlaygroundContext.Provider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
}

function PlaygroundRoutes() {
  const { pathname } = useLocation();
  const { workspace } = useWorkspace();
  // The playground opens on the sample board, like a signed-in workspace does.
  if (pathname === '/') return <Navigate to={boardPath(workspace.boards[0])} replace />;
  if (pathname.startsWith('/@'))
    return (
      <div className="playground-site">
        <PlaygroundSite />
        <PlaygroundBar
          tip="A sample landing page: what visitors see on Notis."
          back={{ label: 'Back to the app', to: boardPath(workspace.boards[0]) }}
        />
      </div>
    );
  return (
    <>
      <App />
      <PlaygroundBar tip={tipFor(pathname)} />
    </>
  );
}

/** The landing page as last saved in the form, with the cards picked on the board. */
function PlaygroundSite() {
  const { workspace } = useWorkspace();
  const { landing } = usePlaygroundValue();
  return (
    <SampleSite
      author={PLAYGROUND_AUTHOR}
      pages={playgroundPosts(workspace)}
      landing={{ ...landing, working: nowTitles(workspace) }}
    />
  );
}

const usePlaygroundValue = () => usePlayground()!;

/** A hint for the next step of the flow, from the screen the visitor is on. */
function tipFor(pathname: string) {
  if (pathname.startsWith('/board/')) return 'Open “Checkout redesign” to see its updates.';
  if (pathname.startsWith('/initiative/') || pathname.startsWith('/card/'))
    return 'Add an update, then try ··· › Write it up.';
  if (pathname.startsWith('/page/')) return 'Publish it to see it on your website.';
  if (pathname === '/journal') return 'Your week, gathered from the board, ready to write up.';
  if (pathname === '/landing') return 'Edit the form, save, then press View page.';
  if (pathname === '/pages') return 'Published pages make up the blog on your landing page.';
  return 'Sample data. Nothing you change is saved.';
}

/**
 * On every playground screen: what this is, the next thing to try, and the way on, to an
 * account of one's own. The sample website, outside the app, also gets a way `back` into it.
 */
function PlaygroundBar({ tip, back }: { tip: string; back?: { label: string; to: string } }) {
  return (
    <aside className="playground-bar" aria-label="Playground">
      <span className="playground-bar-text">
        <strong>Playground</strong>
        <span>{tip}</span>
      </span>
      {back && (
        <Link className="playground-bar-link" to={back.to}>
          {back.label}
        </Link>
      )}
      <a className="playground-bar-link is-primary" href={SIGN_IN_URL}>
        Make your own <ArrowRight size={15} aria-hidden="true" />
      </a>
    </aside>
  );
}
