import { Fragment, useState, type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { LegalFooter } from '@/features/legal/LegalPage';
import {
  ArrowRight,
  CircleCheck,
  ExternalLink,
  Feather,
  FileText,
  Globe,
  KanbanSquare,
  ListChecks,
  LoaderCircle,
  Lock,
  NotebookPen,
  PenLine,
  Send,
  Sparkles,
} from 'lucide-react';

interface HomeLandingProps {
  redirecting: boolean;
  error: string;
  onGoogle: () => void;
  onSwegrowth: () => void;
}

/** A real Notis website to point visitors at. */
const EXAMPLE_SITE = 'https://notis.swegrowth.id/@zikrul-ihsan-md';

const COMPARE: { kind: string; text: string; ours?: boolean }[] = [
  {
    kind: 'Task apps',
    text: 'Finished work disappears into a Done column and is forgotten.',
  },
  {
    kind: 'Blogs and notes apps',
    text: 'You have to stop and write it all from scratch, so it never happens.',
  },
  {
    kind: 'Notis',
    text: 'Note as you work, publish when it is worth telling.',
    ours: true,
  },
];

const FEATURES: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <KanbanSquare size={18} />,
    title: 'Boards',
    text: 'Lists and cards for any kind of work.',
  },
  {
    icon: <NotebookPen size={18} />,
    title: 'Work journal',
    text: 'Every week of finished work, kept for you.',
  },
  {
    icon: <ListChecks size={18} />,
    title: 'To-do lists',
    text: 'Checklists for the days and the weeks.',
  },
  {
    icon: <FileText size={18} />,
    title: 'Pages',
    text: 'Long-form writing, ready to publish.',
  },
  {
    icon: <Globe size={18} />,
    title: 'Your own site',
    text: 'A home page, blog and About under one handle.',
  },
  {
    icon: <Sparkles size={18} />,
    title: 'AI from your resume',
    text: 'Upload your CV and AI fills in your public page.',
  },
];

/** What signed-out visitors see: what Notis is, and the way in. */
export function HomeLanding({ redirecting, error, onGoogle, onSwegrowth }: HomeLandingProps) {
  // The sign-in choices open only once the visitor asks to start; a failed sign-in reopens them.
  const [asked, setAsked] = useState(false),
    [dismissedError, setDismissedError] = useState('');
  const signingIn = asked || Boolean(error && error !== dismissedError);
  const setSigningIn = (open: boolean) => {
    setAsked(open);
    if (!open) setDismissedError(error);
  };
  const start = (
    <button className="home-button is-primary" type="button" onClick={() => setSigningIn(true)}>
      Start writing <ArrowRight size={18} />
    </button>
  );
  return (
    <div className="home">
      <header className="home-nav">
        <span className="home-logo">
          <span className="home-logo-mark">
            <Feather size={16} />
          </span>
          Notis
        </span>
        <button className="home-nav-link" type="button" onClick={() => setSigningIn(true)}>
          Sign in
        </button>
      </header>

      <main>
        <section className="home-hero">
          <p className="eyebrow">YOUR NOTES, YOUR PUBLIC PRESENCE</p>
          <h1>
            Write notes,
            <br /> <mark>get noticed</mark>.
          </h1>
          <p className="home-lead">
            A notes and writing app for professionals that turns everyday notes into a public
            professional presence.
          </p>
          <div className="home-signin">
            {start}
            <a className="home-button" href={EXAMPLE_SITE} target="_blank" rel="noreferrer">
              See an example page
            </a>
          </div>
          <Equation
            label="Write notes, publish, get noticed"
            parts={[
              { title: 'Write notes', caption: 'while you work', art: <NotesArt /> },
              {
                op: <ArrowRight size={30} />,
                title: 'Publish',
                caption: 'when it is worth telling',
                art: <PostArt />,
              },
              {
                op: <ArrowRight size={30} />,
                title: 'Get noticed',
                caption: 'on your own website',
                art: <SiteArt />,
                result: true,
              },
            ]}
          />
        </section>

        <section className="home-resume" aria-labelledby="home-resume">
          <h2 id="home-resume">
            Notes + resume = <mark>your own website</mark>.
          </h2>
          <p className="home-section-lead">
            Upload your resume once and your website is ready in minutes. Every note you publish
            keeps it growing.
          </p>
          <Equation
            label="Notes plus resume equals your own website"
            parts={[
              { title: 'Notes', caption: 'on your work', art: <NotesArt /> },
              { op: '+', title: 'Resume', caption: 'upload once', art: <ResumeArt /> },
              {
                op: '=',
                title: 'Your own website',
                caption: 'ready in minutes',
                art: <SiteArt />,
                result: true,
              },
            ]}
          />
          <a
            className="home-button is-primary"
            href={EXAMPLE_SITE}
            target="_blank"
            rel="noreferrer"
          >
            See a real one <ExternalLink size={16} />
          </a>
        </section>

        <section className="home-different" aria-labelledby="home-different">
          <p className="eyebrow">WHAT MAKES NOTIS DIFFERENT</p>
          <h2 id="home-different">
            Your work deserves to be <mark>seen</mark>.
          </h2>
          <p className="home-different-lead">
            Notis keeps a journal of what you finish, ready to turn into a post. A brag document
            that writes itself.
          </p>
          <div className="home-different-grid">
            <ul className="home-compare">
              {COMPARE.map((item) => (
                <li key={item.kind} className={item.ours ? 'is-ours' : undefined}>
                  <strong>{item.kind}</strong>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
            <JournalSketch />
          </div>
        </section>

        <section className="home-features" aria-labelledby="home-features">
          <h2 id="home-features">One place, from first note to published page.</h2>
          <ul>
            {FEATURES.map((feature) => (
              <li key={feature.title}>
                <span className="home-feature-icon">{feature.icon}</span>
                <strong>{feature.title}</strong>
                <span>{feature.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="home-private">
          <Lock size={20} />
          <div>
            <h2>Private by default.</h2>
            <p>
              Boards, cards and to-do lists are yours alone. Only the pages you publish are public,
              and you can take them down at any time.
            </p>
          </div>
        </section>

        <section className="home-start" id="start" aria-labelledby="home-start">
          <h2 id="home-start">Start with one note.</h2>
          <p>Sign in and your first board is ready.</p>
          <div className="home-signin">{start}</div>
        </section>
      </main>

      {signingIn && (
        <Modal
          title="Start writing in Notis"
          className="home-signin-dialog"
          onClose={() => !redirecting && setSigningIn(false)}
        >
          <p>Sign in and your first board is ready. Nothing is public until you publish it.</p>
          <div className="home-signin-options">
            <button
              className="home-button is-primary"
              type="button"
              onClick={onGoogle}
              disabled={redirecting}
            >
              {redirecting ? <LoaderCircle size={18} className="auth-spinner" /> : <GoogleMark />}
              {redirecting ? 'Opening Google…' : 'Continue with Google'}
            </button>
            <button
              className="home-button"
              type="button"
              onClick={onSwegrowth}
              disabled={redirecting}
            >
              Continue with SWE Growth
            </button>
          </div>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}

      <LegalFooter />
    </div>
  );
}

/** A week in the work journal, the thing no task app or notes app keeps for you. */
function JournalSketch() {
  return (
    <div className="home-journal" aria-hidden="true">
      <span className="home-sketch-label">Work journal · This week</span>
      <div className="home-journal-stats">
        <span>
          <b>5</b> finished
        </span>
        <span>
          <b>3</b> in progress
        </span>
        <span>
          <b>1</b> written
        </span>
      </div>
      <span className="home-journal-board">Clients</span>
      <span className="home-journal-item">
        <CircleCheck size={15} /> Sent the redesign to Studio Rana
      </span>
      <span className="home-journal-item">
        <CircleCheck size={15} /> Invoiced October
      </span>
      <span className="home-journal-board">Side project</span>
      <span className="home-journal-item">
        <CircleCheck size={15} /> Launched the waitlist
      </span>
      <span className="home-journal-draft">
        <PenLine size={14} /> Draft a page from this week
      </span>
    </div>
  );
}

interface EquationPart {
  op?: ReactNode;
  title: string;
  caption: string;
  art: ReactNode;
  result?: boolean;
}

/** A picture read left to right: labelled drawings joined by +, = or arrows. */
function Equation({ label, parts }: { label: string; parts: EquationPart[] }) {
  return (
    <div className="home-sketch" role="img" aria-label={label}>
      {parts.map((part) => (
        <Fragment key={part.title}>
          {part.op && (
            <span className="home-sketch-op" aria-hidden="true">
              {part.op}
            </span>
          )}
          <figure className={part.result ? 'is-result' : undefined}>
            <div className="home-sketch-art" aria-hidden="true">
              {part.art}
            </div>
            <figcaption>
              <strong>{part.result ? <mark>{part.title}</mark> : part.title}</strong>
              <span>{part.caption}</span>
            </figcaption>
          </figure>
        </Fragment>
      ))}
    </div>
  );
}

const NotesArt = () =>
  [0, 1, 2, 3, 4].map((line) => (
    <span key={line} className="home-sketch-note">
      <CircleCheck size={14} />
      <span className={line % 2 ? 'home-sketch-bar is-short' : 'home-sketch-bar'} />
    </span>
  ));

const ResumeArt = () => (
  <>
    <span className="home-sketch-tag">CV</span>
    <span className="home-sketch-face" />
    <span className="home-sketch-bar is-dark is-short" />
    <span className="home-sketch-bar" />
    <span className="home-sketch-bar" />
    <span className="home-sketch-bar is-short" />
  </>
);

/** A written post with its publish button. */
const PostArt = () => (
  <>
    <span className="home-sketch-bar is-dark is-short" />
    <span className="home-sketch-bar" />
    <span className="home-sketch-bar" />
    <span className="home-sketch-bar is-short" />
    <span className="home-sketch-publish">
      <Send size={14} />
    </span>
  </>
);

const SiteArt = () => (
  <>
    <span className="home-sketch-browser">
      <i />
      <i />
      <i />
    </span>
    <span className="home-sketch-site">
      <span className="home-sketch-tabs">
        <i />
        <i />
        <i />
      </span>
      <span className="home-sketch-face" />
      <span className="home-sketch-bar is-dark" />
      <span className="home-sketch-bar is-short" />
      <span className="home-sketch-posts">
        <i />
        <i />
      </span>
    </span>
  </>
);

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
