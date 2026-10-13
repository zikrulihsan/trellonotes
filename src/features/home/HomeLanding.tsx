import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ConsentCheckbox } from '@/features/legal/ConsentCheckbox';
import { LegalFooter } from '@/features/legal/LegalPage';
import { rememberConsent } from '@/lib/consent';
import {
  ArrowRight,
  Circle,
  CircleCheck,
  ExternalLink,
  Feather,
  LoaderCircle,
  MousePointer2,
  NotebookPen,
  Sparkles,
  ArrowDown,
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
    q: 'Is everything public?',
    a: 'No. Your board, cards and updates are private by default. Only the posts you publish appear on your professional page, and you can unpublish them at any time.',
  },
  {
    q: 'Do I need to be an engineer?',
    a: 'No. Notis started with software engineers, but a board of written updates works for anything you are working on: a project at work, a community event, or something you are learning.',
  },
  {
    q: 'Why not Notion or Trello?',
    a: 'In Trello a card is a title, a few fields and a comment thread. In Notis a card is a page you write freely, and that writing is what becomes your posts. Notion can hold the writing, but it does not turn it into posts and a professional page for you.',
  },
  {
    q: 'Why not LinkedIn or Medium?',
    a: 'Those are places to post once something is written. Notis is where the writing starts: you add a few lines as you work, AI drafts the post, and it lives on a page you own next to your resume. You can still share the link anywhere.',
  },
  {
    q: 'What does uploading my resume do?',
    a: 'It drafts your professional page from your resume: your headline, what you help with, your projects and your story. You review it before anything goes live.',
  },
];

/** A real Notis profile to point visitors at. */
const EXAMPLE_SITE = 'https://notis.swegrowth.id/@zikrul-ihsan-md';

/** Boards for things other than code, each with a line or two of its log. */
const USES: { label: string; title: string; log: { date: string; text: string }[] }[] = [
  {
    label: 'Work',
    title: 'API performance',
    log: [
      { date: 'Mon, 6 Oct', text: 'p95 on /orders is 1.8s. Suspect the N+1 on order items.' },
      { date: 'Wed, 8 Oct', text: 'Added the index and batched the query. p95 down to 320ms.' },
    ],
  },
  {
    label: 'Community',
    title: 'Monthly meetup',
    log: [
      { date: 'Tue, 7 Oct', text: 'Venue confirmed for the 25th. 40 RSVPs so far.' },
      { date: 'Fri, 10 Oct', text: 'Still need one talk on testing. Asked Rana.' },
    ],
  },
  {
    label: 'Learning',
    title: 'Learning English',
    log: [
      {
        date: 'Thu, 9 Oct',
        text: 'Gave my standup update in English without notes. Past tense still slips.',
      },
    ],
  },
];

/** What signed-out visitors see: what Notis is, and the way in. */
export function HomeLanding({ redirecting, error, onGoogle, onSwegrowth }: HomeLandingProps) {
  // The sign-in choices open only once the visitor asks to start (here, or from the
  // playground with ?start); a failed sign-in reopens them.
  const [asked, setAsked] = useState(() =>
      new URLSearchParams(window.location.search).has('start'),
    ),
    [dismissedError, setDismissedError] = useState(''),
    [agreed, setAgreed] = useState(false);
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
          <h1>
            Track progress by <mark>writing</mark>.
          </h1>
          <p className="home-lead">
            A writing app with a progress board. Every card is a page you write freely, and it
            becomes posts and a professional page when you&apos;re ready.
          </p>
          <div className="home-signin">
            {start}
            <a className="home-button" href={EXAMPLE_SITE} target="_blank" rel="noreferrer">
              See a real profile <ArrowRight size={18} />
            </a>
          </div>
          <p className="home-micro">Free · Private by default</p>
          <div className="home-hero-board">
            <BoardSketch />
          </div>
        </section>

        <section className="home-beat" aria-labelledby="home-beat-write">
          <div className="home-beat-text">
            <p className="eyebrow">1 · WRITE</p>
            <h2 id="home-beat-write">Every card is a page, not a form.</h2>
            <p>
              Open a card and just write: headings, code, tables, screenshots, half-formed thoughts.
              No fields to fill, no statuses to pick.
            </p>
          </div>
          <NoteSketch />
        </section>

        <section className="home-beat is-flipped" aria-labelledby="home-beat-summarize">
          <div className="home-beat-text">
            <p className="eyebrow">2 · SUMMARIZE</p>
            <h2 id="home-beat-summarize">
              From scattered notes to <mark>a story worth sharing</mark>.
            </h2>
            <p>
              AI turns a week of updates into a draft: a recap, a lesson, or a project write-up. You
              edit before anything goes out.
            </p>
          </div>
          <StorySketch />
        </section>

        <section className="home-beat is-wide" aria-labelledby="home-beat-show">
          <div className="home-beat-text">
            <p className="eyebrow">3 · SHOW</p>
            <h2 id="home-beat-show">
              One link for <mark>your resume and your writing</mark>.
            </h2>
            <p>
              Upload your resume and Notis builds your professional page, filled with the posts you
              choose to publish.
            </p>
          </div>
          <Equation
            animate
            label="Posts plus resume equals your professional page"
            parts={[
              { title: 'Posts', caption: 'you choose to publish', art: <PostArt /> },
              { op: '+', title: 'Resume', caption: 'uploaded once', art: <ResumeArt /> },
              {
                op: '=',
                title: 'Your page',
                caption: 'one link to share',
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
            See a real profile <ExternalLink size={16} />
          </a>
        </section>

        <section className="home-uses" aria-labelledby="home-uses">
          <p className="eyebrow">NOT JUST CODE</p>
          <h2 id="home-uses">For anything you&apos;re working on.</h2>
          <div className="home-uses-list">
            {USES.map((use) => (
              <div key={use.title} className="home-paper">
                <span className="home-sketch-label">Card · {use.label}</span>
                <strong className="home-paper-title">{use.title}</strong>
                {use.log.map((entry) => (
                  <div key={entry.date} className="home-note-entry">
                    <time>{entry.date}</time>
                    <p>{entry.text}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
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
          <h2 id="home-start">Start with one update.</h2>
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
          <ConsentCheckbox checked={agreed} onChange={setAgreed} />
          <div className="home-signin-options">
            <button
              className="home-button is-primary"
              type="button"
              onClick={() => {
                rememberConsent();
                onGoogle();
              }}
              disabled={redirecting || !agreed}
            >
              {redirecting ? <LoaderCircle size={18} className="auth-spinner" /> : <GoogleMark />}
              {redirecting ? 'Opening Google…' : 'Continue with Google'}
            </button>
            <button
              className="home-button"
              type="button"
              onClick={() => {
                rememberConsent();
                onSwegrowth();
              }}
              disabled={redirecting || !agreed}
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

/** How long each step of an animated picture stays before the next one. */
const STEP_MS = 700;

/**
 * Steps through `length` frames while the picture is on screen, then starts over; a picture
 * starts from its first frame each time it scrolls into view. Without motion (or without
 * IntersectionObserver), it rests on the last frame, where everything is shown.
 */
function useLoop(length: number) {
  const ref = useRef<HTMLDivElement>(null);
  const still =
    typeof IntersectionObserver === 'undefined' ||
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (still || !node) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setStep(0);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [still]);
  useEffect(() => {
    if (still || !visible) return;
    const timer = window.setInterval(() => setStep((current) => (current + 1) % length), STEP_MS);
    return () => window.clearInterval(timer);
  }, [length, still, visible]);
  return { ref, step: still ? length - 1 : step, animated: !still };
}

const shownFrom = (from: number, step: number) => (step >= from ? ' is-shown' : '');

/** One block of a card's page: whatever was written, in whatever shape. */
type Block =
  | { kind: 'date'; date: string; text: ReactNode }
  | { kind: 'text'; text: ReactNode }
  | { kind: 'code'; code: string }
  | { kind: 'heading'; text: string }
  | { kind: 'checks'; items: [done: boolean, text: string][] };

function PageBlock({ block, className }: { block: Block; className: string }) {
  const name = `home-block is-${block.kind}${className}`;
  switch (block.kind) {
    case 'date':
      return (
        <div className={name}>
          <time>{block.date}</time>
          <p>{block.text}</p>
        </div>
      );
    case 'text':
      return <p className={name}>{block.text}</p>;
    case 'code':
      return <code className={name}>{block.code}</code>;
    case 'heading':
      return <strong className={name}>{block.text}</strong>;
    case 'checks':
      return (
        <ul className={name}>
          {block.items.map(([done, text]) => (
            <li key={text} className={done ? 'is-done' : ''}>
              {done ? <CircleCheck size={14} /> : <Circle size={14} />}
              {text}
            </li>
          ))}
        </ul>
      );
  }
}

/** The card from the Write section: notes, code, a finding and a checklist on one page. */
const CHECKOUT: Block[] = [
  { kind: 'date', date: 'Mon, 13 Oct', text: 'Carts drop at the address step. Only on mobile?' },
  { kind: 'code', code: 'promo.onChange → resetForm(address)' },
  {
    kind: 'text',
    text: (
      <>
        Found it: <mark>the promo field resets the address form</mark>. Fixed with Rana.
      </>
    ),
  },
  {
    kind: 'checks',
    items: [
      [true, 'Patch the form state'],
      [true, 'Ship after lunch'],
      [false, 'Test the boring paths too'],
    ],
  },
];

/** The card that opens on the hero board. */
const REDESIGN: Block[] = [
  { kind: 'heading', text: 'Plan' },
  {
    kind: 'checks',
    items: [
      [true, 'Map the old flow'],
      [true, 'One-page prototype'],
      [false, 'Roll out to everyone'],
    ],
  },
  {
    kind: 'text',
    text: (
      <>
        Rana tested it on mobile: <mark>two taps fewer</mark> to pay.
      </>
    ),
  },
  { kind: 'code', code: 'rollout: one_page_checkout = 10%' },
];

/** One card, written as a page: each block appears in turn. */
function NoteSketch() {
  const { ref, step, animated } = useLoop(CHECKOUT.length + 1);
  return (
    <div
      ref={ref}
      className={`home-paper home-note${animated ? ' is-animated' : ''}`}
      aria-hidden="true"
    >
      <span className="home-sketch-label">Card · Checkout</span>
      <strong className="home-paper-title">Why carts were dropping</strong>
      {CHECKOUT.map((block, index) => (
        <PageBlock key={index} block={block} className={shownFrom(index, step)} />
      ))}
    </div>
  );
}

const STORY_POINTS = [
  'Promo field reset the address form',
  'Fixed and shipped the same day',
  'Test the boring paths too',
];

/** Points get picked from the notes one by one, then AI writes the story from them. */
function StorySketch() {
  const points = STORY_POINTS.length;
  const { ref, step, animated } = useLoop(points + 3);
  return (
    <div
      ref={ref}
      className={`home-paper home-story${animated ? ' is-animated' : ''}`}
      aria-hidden="true"
    >
      <span className="home-sketch-label">From your notes</span>
      <ul className="home-story-points">
        {STORY_POINTS.map((point, index) => (
          <li key={point} className={shownFrom(index, step).trim()}>
            <mark>{point}</mark>
          </li>
        ))}
      </ul>
      <span className={`home-story-ai${shownFrom(points, step)}`}>
        <ArrowDown size={16} /> <Sparkles size={14} /> AI writes it up
      </span>
      <div className={`home-story-result${shownFrom(points + 1, step)}`}>
        <span className="home-sketch-label">Story</span>
        <strong className="home-paper-title">The boring bug that cost us sales</strong>
        <span className="home-post-line" />
        <span className="home-post-line is-short" />
        <span className="home-post-publish">
          <Send size={14} /> Publish
        </span>
      </div>
    </div>
  );
}

/**
 * A board whose cards are pages. The pointer clicks one, its page opens, and what was written
 * appears block by block; then it closes and starts again.
 */
function BoardSketch() {
  const lists = [
    { title: 'To do', cards: ['Pricing page copy', 'Interview Dimas'] },
    { title: 'Doing', cards: ['Checkout redesign'], open: true },
    { title: 'Done', cards: ['Fix cart drop', 'Launch waitlist'] },
  ];
  // Frames: 0 board, 1 pointer on the card, 2 page open, 3-6 blocks, 7 hold.
  const { ref, step, animated } = useLoop(8);
  const open = step >= 2;
  return (
    <div
      ref={ref}
      className={`home-board${animated ? ' is-animated' : ''}${open ? ' is-open' : ''}`}
      aria-hidden="true"
    >
      {lists.map((list) => (
        <div key={list.title} className="home-board-list">
          <span className="home-sketch-label">{list.title}</span>
          {list.cards.map((card) => (
            <span
              key={card}
              className={
                list.open
                  ? `home-board-card is-target${step === 1 ? ' is-pressed' : ''}`
                  : 'home-board-card'
              }
            >
              {card}
              {list.open && (
                <span className="home-board-meta">
                  <NotebookPen size={12} /> 3 updates
                </span>
              )}
            </span>
          ))}
        </div>
      ))}
      {animated && (
        <MousePointer2
          className={`home-board-pointer${step >= 1 && step < 2 ? ' is-on-card' : ''}`}
          size={20}
        />
      )}
      <div className="home-board-panel">
        <span className="home-sketch-label">Card · Doing</span>
        <strong className="home-paper-title">Checkout redesign</strong>
        {REDESIGN.map((block, index) => (
          <PageBlock key={index} block={block} className={shownFrom(index + 3, step)} />
        ))}
      </div>
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

/** A picture read left to right: labelled drawings joined by +, = or arrows, played in turn. */
function Equation({
  label,
  parts,
  animate = false,
}: {
  label: string;
  parts: EquationPart[];
  animate?: boolean;
}) {
  const { ref, step: frame, animated } = useLoop(parts.length * 2);
  const step = animate ? frame : Infinity;
  const shown = (index: number) => (index <= step ? ' is-shown' : '');
  return (
    <div
      ref={ref}
      className={animate && animated ? 'home-sketch is-animated' : 'home-sketch'}
      role="img"
      aria-label={label}
    >
      {parts.map((part, index) => (
        <Fragment key={part.title}>
          {part.op && (
            <span className={`home-sketch-op${shown(index * 2 - 1)}`} aria-hidden="true">
              {part.op}
            </span>
          )}
          <figure className={`${part.result ? 'is-result' : ''}${shown(index * 2)}`}>
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
