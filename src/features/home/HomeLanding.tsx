import type { ReactNode } from 'react';
import {
  ArrowRight,
  CircleCheck,
  Feather,
  FileText,
  Globe,
  KanbanSquare,
  ListChecks,
  LoaderCircle,
  Lock,
  NotebookPen,
  PenLine,
  Sparkles,
} from 'lucide-react';

interface HomeLandingProps {
  redirecting: boolean;
  error: string;
  onGoogle: () => void;
  onSwegrowth: () => void;
}

const STEPS = [
  ['Have a plan?', 'Note it.'],
  ['Making progress?', 'Note it.'],
  ['Got a result?', 'Note it.'],
  ['Then', 'publish it.'],
] as const;

const PILLARS: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <KanbanSquare size={20} />,
    title: 'Note',
    text: 'Plans on boards, steps on to-do lists, thoughts on a free writing sheet. All of it private, for you.',
  },
  {
    icon: <NotebookPen size={20} />,
    title: 'Look back',
    text: 'Your work journal gathers what you finished each week, so you never start from a blank page.',
  },
  {
    icon: <PenLine size={20} />,
    title: 'Write',
    text: 'Turn what you noted into a page in a calm, focused editor, when it is worth telling.',
  },
  {
    icon: <Globe size={20} />,
    title: 'Show',
    text: 'Publish to your own page at /@you, with Me, Blog and About, so people see what you do.',
  },
];

const COMPARE: { kind: string; text: string; ours?: boolean }[] = [
  {
    kind: 'Task apps',
    text: 'Finished work disappears into a Done column. A month later, nobody remembers it, not even you.',
  },
  {
    kind: 'Blogs and notes apps',
    text: 'You have to stop, remember and write it all from scratch. So it never gets written.',
  },
  {
    kind: 'Notis',
    text: 'Work, document and publish in one flow. Every week of your work becomes professional history you can share.',
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
    title: 'Start from your resume',
    text: 'Fill your page from your CV in one step.',
  },
];

/** What signed-out visitors see: what Notis is, and the way in. */
export function HomeLanding({ redirecting, error, onGoogle, onSwegrowth }: HomeLandingProps) {
  const signIn = (
    <div className="home-signin">
      <button
        className="home-button is-primary"
        type="button"
        onClick={onGoogle}
        disabled={redirecting}
      >
        {redirecting ? <LoaderCircle size={18} className="auth-spinner" /> : <GoogleMark />}
        {redirecting ? 'Opening Google…' : 'Continue with Google'}
      </button>
      <button className="home-button" type="button" onClick={onSwegrowth} disabled={redirecting}>
        Continue with SWE Growth
      </button>
    </div>
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
        <a className="home-nav-link" href="#start">
          Sign in
        </a>
      </header>

      <main>
        <section className="home-hero">
          <p className="eyebrow">YOUR NOTES, YOUR PUBLIC PRESENCE</p>
          <h1>
            From notes to <mark>getting noticed</mark>.
          </h1>
          <p className="home-lead">
            Note your plans and progress. Notis keeps a journal of what you finish each week, and
            turns it into writing and a page of your own that gets you noticed.
          </p>
          {signIn}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <p className="home-footnote">
            <Lock size={13} /> Private until you choose to publish.
          </p>
          <HeroSketch />
        </section>

        <section className="home-different" aria-labelledby="home-different">
          <p className="eyebrow">WHAT MAKES NOTIS DIFFERENT</p>
          <h2 id="home-different">
            Your work deserves to be <mark>seen</mark>.
          </h2>
          <p className="home-different-lead">
            Don't wait until you find time to write about it. As you work, Notis keeps a journal of
            what you finish, and turns each week into a page for your public profile. A brag
            document that writes itself.
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

        <section className="home-flow" aria-labelledby="home-flow">
          <h2 id="home-flow">Everything starts with a note.</h2>
          <ol>
            {STEPS.map(([ask, answer]) => (
              <li key={ask}>
                <span>{ask}</span>
                <strong>{answer}</strong>
              </li>
            ))}
          </ol>
          <p>And along the way, you build a public presence.</p>
        </section>

        <section className="home-pillars" aria-label="How Notis works">
          {PILLARS.map((pillar, index) => (
            <article key={pillar.title}>
              <span className="home-pillar-icon">{pillar.icon}</span>
              <span className="home-pillar-step">0{index + 1}</span>
              <h3>{pillar.title}</h3>
              <p>{pillar.text}</p>
            </article>
          ))}
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
          {signIn}
        </section>
      </main>

      <footer className="home-footer">
        <span>Notis</span>
        <span>From notes to getting noticed.</span>
      </footer>
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

/** A small picture of the idea: a card on a board becomes a page people can read. */
function HeroSketch() {
  return (
    <div className="home-sketch" aria-hidden="true">
      <div className="home-sketch-board">
        <span className="home-sketch-label">Board · In progress</span>
        <span className="home-sketch-card">Launch the landing page</span>
        <span className="home-sketch-card is-dim">Write about the launch</span>
        <span className="home-sketch-card is-dim">Ask for feedback</span>
      </div>
      <ArrowRight className="home-sketch-arrow" size={22} />
      <div className="home-sketch-page">
        <span className="home-sketch-url">notis.swegrowth.id/@you</span>
        <strong>
          Hi, <mark>I'm Ayu</mark>
        </strong>
        <span className="home-sketch-line" />
        <span className="home-sketch-line is-short" />
        <span className="home-sketch-post">How I launched in a week</span>
      </div>
    </div>
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
