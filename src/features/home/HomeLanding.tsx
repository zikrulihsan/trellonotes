import { Fragment, useState, type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { LegalFooter } from '@/features/legal/LegalPage';
import {
  ArrowRight,
  CircleCheck,
  ExternalLink,
  Feather,
  LoaderCircle,
  PenLine,
  Send,
} from 'lucide-react';

interface HomeLandingProps {
  redirecting: boolean;
  error: string;
  onGoogle: () => void;
  onSwegrowth: () => void;
}

/** Questions people ask before they start. */
const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is everything I write public?',
    a: 'No. Notes, boards, to-do lists and your work journal are private by default. Only the pages you publish appear on your website, and you can unpublish them at any time.',
  },
  {
    q: 'Do I have to write long articles?',
    a: 'No. A post can be a short recap of what you finished this week. Notis starts it from your notes, so most of the writing is already done.',
  },
  {
    q: 'What is on my website?',
    a: 'A home page with who you are, your projects and what you are up to now, a blog of everything you publish, and an About page. It lives at notis.swegrowth.id/@yourname.',
  },
  {
    q: 'What does uploading my resume do?',
    a: 'It drafts your website from your resume: your headline, what you help with, your projects and your story. You review it before anything goes live.',
  },
  {
    q: 'Can I use Notis just for notes?',
    a: 'Yes. Boards, to-do lists and free writing work for any kind of work, and you never have to publish anything.',
  },
];

/** A real Notis website to point visitors at. */
const EXAMPLE_SITE = 'https://notis.swegrowth.id/@zikrul-ihsan-md';

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

        <section className="home-beat" aria-labelledby="home-beat-notes">
          <div className="home-beat-text">
            <p className="eyebrow">1 · WRITE NOTES</p>
            <h2 id="home-beat-notes">Note your work while it is fresh.</h2>
            <p>
              A line is enough: what you planned, what moved, what shipped. Notis gathers it into a
              weekly work journal, so you never have to remember what you did.
            </p>
          </div>
          <JournalSketch />
        </section>

        <section className="home-beat is-flipped" aria-labelledby="home-beat-publish">
          <div className="home-beat-text">
            <p className="eyebrow">2 · PUBLISH</p>
            <h2 id="home-beat-publish">Your notes are already the first draft.</h2>
            <p>
              When something is worth sharing, turn a week or a project into a post, starting from
              what you already wrote. No blank page.
            </p>
          </div>
          <PostSketch />
        </section>

        <section className="home-beat is-wide" aria-labelledby="home-beat-noticed">
          <div className="home-beat-text">
            <p className="eyebrow">3 · GET NOTICED</p>
            <h2 id="home-beat-noticed">Every post lands on your own website.</h2>
            <p>
              Upload your resume once and your website is ready in minutes. Each note you publish
              keeps it growing.
            </p>
          </div>
          <Equation
            label="Notes plus resume equals your own website"
            parts={[
              { title: 'Notes', caption: 'you published', art: <NotesArt /> },
              { op: '+', title: 'Resume', caption: 'uploaded once', art: <ResumeArt /> },
              {
                op: '=',
                title: 'Your website',
                caption: 'at /@yourname',
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

        <section className="home-faq" aria-labelledby="home-faq">
          <h2 id="home-faq">Questions</h2>
          <div className="home-faq-list">
            {FAQ.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
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

/** A post drafted from the week's notes, one click from going live. */
function PostSketch() {
  return (
    <div className="home-journal home-post" aria-hidden="true">
      <span className="home-sketch-label">New page · from this week</span>
      <strong className="home-post-title">What I shipped this week</strong>
      <span className="home-journal-item">
        <CircleCheck size={15} /> Sent the redesign to Studio Rana
      </span>
      <span className="home-journal-item">
        <CircleCheck size={15} /> Launched the waitlist
      </span>
      <span className="home-post-line" />
      <span className="home-post-line is-short" />
      <span className="home-post-publish">
        <Send size={14} /> Publish
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
