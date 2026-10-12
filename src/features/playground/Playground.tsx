import type { ReactNode } from 'react';
import { BrowserRouter, Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Feather,
  FileUser,
  Globe,
  LayoutGrid,
  Lock,
  NotebookPen,
  Sparkles,
} from 'lucide-react';
import { App } from '@/app/App';
import { AuthContext, type AuthContextValue } from '@/context/auth-context';
import { UIProvider } from '@/context/UIProvider';
import { WorkspaceProvider } from '@/context/WorkspaceProvider';
import { FocusProvider } from '@/features/focus/FocusProvider';
import { SampleSite } from '@/features/reader/PublicReader';
import { useWorkspace } from '@/hooks/useWorkspace';
import { boardPath, findByRef, initiativePath, pagePath } from '@/lib/app-paths';
import { writerPath } from '@/lib/supabase/published-pages';
import { PlaygroundContext } from './playground-context';
import {
  PLAYGROUND_AUTHOR,
  PLAYGROUND_IDS,
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
};

/**
 * The playground (/playground): the real app on a sample workspace held in memory, so
 * visitors can try boards, writing, stories and the website without an account. Nothing
 * is saved and nothing is published; closing or reloading the tab starts over.
 */
export function Playground() {
  return (
    <BrowserRouter basename="/playground">
      <AuthContext.Provider value={GUEST}>
        <PlaygroundContext.Provider value>
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
  if (pathname === '/') return <Picker />;
  if (pathname.startsWith('/@'))
    return (
      <div className="playground-site">
        <PlaygroundSite />
        <PlaygroundBar tip="This is what visitors see. In the playground, none of it is public." />
      </div>
    );
  return (
    <>
      <App />
      <PlaygroundBar tip={tipFor(pathname)} />
    </>
  );
}

function PlaygroundSite() {
  const { workspace } = useWorkspace();
  return (
    <SampleSite
      author={PLAYGROUND_AUTHOR}
      pages={playgroundPosts(workspace)}
      landing={playgroundLanding(workspace)}
    />
  );
}

/** A hint for the next step of the flow, from the screen the visitor is on. */
function tipFor(pathname: string) {
  if (pathname.startsWith('/board/')) return 'Open “Checkout redesign” to see its updates.';
  if (pathname.startsWith('/initiative/') || pathname.startsWith('/card/'))
    return 'Add an update, then try ··· › Write it up.';
  if (pathname.startsWith('/page/')) return 'Publish it to see it on your website.';
  if (pathname === '/journal') return 'Your week, gathered from the board.';
  return 'Sample data. Nothing you change is saved.';
}

function PlaygroundBar({ tip }: { tip: string }) {
  return (
    <aside className="playground-bar" aria-label="Playground">
      <span className="playground-bar-text">
        <strong>Playground</strong>
        <span>{tip}</span>
      </span>
      <Link className="playground-bar-link" to="/">
        Try something else
      </Link>
      <a className="playground-bar-link is-primary" href={SIGN_IN_URL}>
        Start yours
      </a>
    </aside>
  );
}

/** The playground's first screen: pick which part of Notis to try. */
function Picker() {
  const { workspace } = useWorkspace();
  const board = workspace.boards.find((item) => item.id === PLAYGROUND_IDS.board);
  const initiative = findByRef(workspace.cards, PLAYGROUND_IDS.initiative);
  const story = findByRef(workspace.pages ?? [], PLAYGROUND_IDS.story);
  return (
    <div className="home playground">
      <header className="home-nav">
        <a className="home-logo" href="/">
          <span className="home-logo-mark">
            <Feather size={16} />
          </span>
          Notis
        </a>
        <a className="home-nav-link" href={SIGN_IN_URL}>
          Sign in
        </a>
      </header>
      <main>
        <section className="playground-intro">
          <p className="eyebrow">PLAYGROUND</p>
          <h1>
            Try Notis, <mark>no sign&#8209;up</mark>.
          </h1>
          <p className="home-lead">
            Pick what to try. It all runs on sample data in this tab: nothing you change is saved,
            and nothing is published.
          </p>
        </section>
        <ol className="playground-options">
          <Option
            to={board ? boardPath(board) : '/board'}
            icon={<LayoutGrid size={20} />}
            step="1"
            title="A board of initiatives"
            text="Move work across To do, Doing and Done, and open a card to see its updates."
          />
          <Option
            to={initiative ? initiativePath(initiative) : '/board'}
            icon={<NotebookPen size={20} />}
            step="2"
            title="Updates on an initiative"
            text="Add a dated update to the checkout redesign, the way you would at the end of a day."
          />
          <Option
            to={story ? pagePath(story) : '/pages'}
            icon={<Sparkles size={20} />}
            step="3"
            title="The story it turns into"
            text="Read the post drafted from those updates, edit it, and publish it."
          />
          <Option
            to={writerPath(PLAYGROUND_AUTHOR)}
            icon={<Globe size={20} />}
            step="4"
            title="Your public website"
            text="A home page, blog and About page, with what you’re working on taken from the board."
          />
        </ol>
        <a className="playground-option is-locked" href={SIGN_IN_URL}>
          <span className="playground-option-icon">
            <FileUser size={20} />
          </span>
          <span className="playground-option-text">
            <strong>
              Build your website from your resume
              <span className="playground-badge">
                <Lock size={12} /> Sign-in needed
              </span>
            </strong>
            <span>
              Upload your resume and AI drafts your website. It uses your own details, so it needs
              an account.
            </span>
          </span>
          <ArrowRight size={18} className="playground-option-go" />
        </a>
        <p className="playground-back">
          <a href="/">← Back to how Notis works</a>
        </p>
      </main>
    </div>
  );
}

function Option({
  to,
  icon,
  step,
  title,
  text,
}: {
  to: string;
  icon: ReactNode;
  step: string;
  title: string;
  text: string;
}) {
  return (
    <li>
      <Link className="playground-option" to={to}>
        <span className="playground-option-icon">{icon}</span>
        <span className="playground-option-text">
          <small>{step}</small>
          <strong>{title}</strong>
          <span>{text}</span>
        </span>
        <ArrowRight size={18} className="playground-option-go" />
      </Link>
    </li>
  );
}
