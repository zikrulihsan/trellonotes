import { Fragment, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ConsentCheckbox } from '@/features/legal/ConsentCheckbox';
import { LegalFooter } from '@/features/legal/LegalPage';
import { PLAYGROUND_IDS } from '@/features/playground/sample';
import { pagePath } from '@/lib/app-paths';
import { rememberConsent } from '@/lib/consent';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  Feather,
  LoaderCircle,
  Lock,
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
    a: 'No. Your notes are private. Only the posts you publish appear on your page, and you can unpublish them any time.',
  },
  {
    q: 'Why not Notion or Trello?',
    a: 'In Trello a task is a few fields. In Notis it is a page you write. And Notis turns that writing into posts, which Notion does not.',
  },
  {
    q: 'Why not LinkedIn or Medium?',
    a: 'Those are where you post. Notis is where the writing starts, and you can still share your link there.',
  },
  {
    q: 'What does uploading my resume do?',
    a: 'It drafts your professional page: headline, projects and story. You review it before anything goes live.',
  },
  {
    q: 'What happens to my data?',
    a: 'We do not sell it or show ads. You can ask for a copy, or delete your account and everything in it, at any time.',
  },
];

/** The playground: the app on a sample workspace, to try without signing in. */
const PLAYGROUND = '/playground';
/** The sample post from the Notis Pages mockup, open in the playground's editor. */
const EXAMPLE_WRITING = `${PLAYGROUND}${pagePath({
  id: PLAYGROUND_IDS.story,
  title: 'The boring bug that cost us sales',
})}`;
/** The sample workspace's landing page editor, with its live preview. */
const EXAMPLE_LANDING_EDITOR = `${PLAYGROUND}/landing`;

/**
 * Notes from different parts of life, each written its own way: a log, a paragraph, a
 * photo, a checklist. Some stay private; for the others AI drafts a post the writer can
 * choose to publish.
 */
const USES: {
  label: string;
  title: string;
  body: ReactNode;
  /** The post AI drafted from the notes; none means the note stays private. */
  post?: string;
}[] = [
  {
    label: 'Work',
    title: 'API performance',
    body: (
      <>
        <div className="home-note-entry">
          <time>Mon, 6 Oct</time>
          <p>p95 on /orders is 1.8s. Suspect the N+1 on order items.</p>
        </div>
        <div className="home-note-entry">
          <time>Wed, 8 Oct</time>
          <p>Added the index and batched the query. p95 down to 320ms.</p>
        </div>
      </>
    ),
    post: 'How one index took our p95 from 1.8s to 320ms',
  },
  {
    label: 'Journal',
    title: 'A slower Tuesday',
    body: (
      <p className="home-uses-prose">
        I walked before opening the laptop today, and the whole morning felt quieter. No rushing to
        answer anything. I think I&apos;ll keep doing this, at least until the rain starts.
      </p>
    ),
  },
  {
    label: 'Hobby',
    title: 'Sourdough',
    body: (
      <figure className="home-uses-photo">
        <LoafArt />
        <figcaption>Loaf #4. Better crumb this time. The crust is still too pale.</figcaption>
      </figure>
    ),
    post: 'Four loaves in: what sourdough taught me about patience',
  },
  {
    label: 'Learning',
    title: 'Learning Go',
    body: (
      <>
        <div className="home-note-entry">
          <time>Sat, 4 Oct</time>
          <p>Goroutines finally clicked: a channel is just a queue with manners.</p>
        </div>
        <div className="home-note-entry">
          <time>Sun, 12 Oct</time>
          <p>Rewrote the CSV importer with a worker pool. 40s down to 6s.</p>
        </div>
      </>
    ),
    post: 'Rewriting a slow importer in Go, as a beginner',
  },
  {
    label: 'Reading',
    title: 'Notes on Deep Work',
    body: (
      <>
        <blockquote className="home-uses-quote">
          Clarity about what matters provides clarity about what does not.
        </blockquote>
        <p className="home-uses-prose">
          Try two mornings a week with no meetings and no chat. See if the hard tickets move.
        </p>
      </>
    ),
  },
  {
    label: 'Home',
    title: 'House to-dos',
    body: (
      <>
        <p className="home-uses-prose">Before the rainy season starts.</p>
        <ul className="home-uses-checklist">
          {[
            { text: 'Service the AC', done: true },
            { text: 'Clean the gutters', done: true },
            { text: 'Fix the leaking roof tile', done: false },
            { text: 'Call the plumber about the tap', done: false },
          ].map((item) => (
            <li key={item.text} className={item.done ? 'is-done' : undefined}>
              {item.done ? <CircleCheck size={16} /> : <Circle size={16} />}
              {item.text}
            </li>
          ))}
        </ul>
      </>
    ),
  },
];

/** A drawn photo of a sourdough loaf on a board, for the hobby note. */
function LoafArt() {
  return (
    <svg viewBox="0 0 240 120" role="img" aria-label="A sourdough loaf on a wooden board">
      <rect width="240" height="120" fill="#f6ead8" />
      <path
        d="M58 22c2-8 8-8 10 0s8 8 10 0"
        stroke="#d9c2a3"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M150 18c2-8 8-8 10 0s8 8 10 0"
        stroke="#d9c2a3"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="28" y="92" width="184" height="14" rx="7" fill="#b98552" />
      <path d="M44 94c0-34 34-58 76-58s76 24 76 58z" fill="#c9874a" />
      <path d="M52 92c4-26 32-46 68-46s64 20 68 46" fill="#d99a5b" />
      <path
        d="M82 60c14-10 32-14 52-10"
        stroke="#f1d3a6"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M96 76c12-7 28-9 44-6"
        stroke="#f1d3a6"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A step's way to see the real thing in the playground: a text link, not a button. */
function BeatLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="home-beat-link" href={href}>
      {children} <ArrowUpRight size={16} />
    </a>
  );
}

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
  const usesRef = useAutoSlide<HTMLDivElement>();
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
          <p className="home-hero-tag">
            <AiMark>AI</AiMark> note-taking with a progress board
          </p>
          <h1>
            Notes that <mark>show your progress.</mark>
          </h1>
          <p className="home-lead">Write your thoughts. Track your goals. Share your story.</p>
          <div className="home-signin">
            {start}
            <a className="home-button is-quiet" href={PLAYGROUND}>
              Try it first, no login <ArrowUpRight size={18} />
            </a>
          </div>
          <p className="home-micro">
            Powered by{' '}
            <a href="https://swegrowth.id" target="_blank" rel="noreferrer">
              Software Engineer Growth Community
            </a>
          </p>
          <a className="home-hero-next" href="#how" onClick={scrollToSteps}>
            See how it works <ArrowDown size={16} />
          </a>
        </section>

        <section id="how" className="home-beat is-board" aria-labelledby="home-beat-write">
          <div className="home-beat-text">
            <p className="eyebrow">1 · NOTIS BOARD</p>
            <h2 id="home-beat-write">
              Write it down. <mark>See how far you&apos;ve come.</mark>
            </h2>
            <p>
              Each task holds its own notes. No more switching between a task board and a notes app.
            </p>
            <BeatLink href={PLAYGROUND}>Try the board</BeatLink>
          </div>
          <div className="home-hero-board">
            <BoardSketch />
          </div>
        </section>

        <section className="home-beat is-wide" aria-labelledby="home-beat-summarize">
          <div className="home-beat-text">
            <p className="eyebrow">2 · NOTIS PAGES</p>
            <h2 id="home-beat-summarize">
              You did the work. <mark>Now tell the story.</mark>
            </h2>
            <p>
              Write a post yourself or let <AiMark>AI draft</AiMark> it from your notes. Every post
              you publish shows up on your own blog.
            </p>
          </div>
          <div className="home-publish">
            <WriteSketch />
            <span className="home-publish-step" aria-hidden="true">
              <ArrowRight size={18} />
              Published
            </span>
            <BlogSketch />
          </div>
          <BeatLink href={EXAMPLE_WRITING}>Try writing a post</BeatLink>
        </section>

        <section className="home-beat is-wide" aria-labelledby="home-beat-show">
          <div className="home-beat-text">
            <p className="eyebrow">3 · NOTIS PORTFOLIO</p>
            <h2 id="home-beat-show">
              Share how you think. <mark>Show what you did.</mark>
            </h2>
            <p>
              Pair your posts with your resume, and <AiMark>AI</AiMark> builds a portfolio you can
              share with one link.
            </p>
          </div>
          <Equation
            animate
            label="Posts plus resume equals your portfolio"
            parts={[
              { title: 'Posts', caption: 'you choose to publish', art: <PostArt /> },
              { op: '+', title: 'Resume', caption: 'uploaded once', art: <ResumeArt /> },
              {
                op: '=',
                title: 'Your portfolio',
                caption: 'one link to share',
                art: <SiteArt />,
                result: true,
              },
            ]}
          />
          <BeatLink href={EXAMPLE_LANDING_EDITOR}>Try the portfolio editor</BeatLink>
        </section>

        <section className="home-uses" aria-labelledby="home-uses">
          <p className="eyebrow">PRIVATE BY DEFAULT</p>
          <h2 id="home-uses">You choose what you share.</h2>
          <p className="home-uses-lead">
            Write about anything. Your notes stay private. When something is worth sharing,{' '}
            <AiMark>AI</AiMark> helps turn it into a post you can publish.
          </p>
          <div className="home-uses-nav">
            <button
              type="button"
              className="home-uses-arrow"
              aria-label="Previous examples"
              onClick={() => slideBy(usesRef.current, -1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="home-uses-arrow"
              aria-label="Next examples"
              onClick={() => slideBy(usesRef.current, 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="home-uses-list" ref={usesRef}>
            {USES.map((use) => (
              <div key={use.title} className="home-paper">
                <span className="home-sketch-label">{use.label}</span>
                <strong className="home-paper-title">{use.title}</strong>
                {use.body}
                {use.post ? (
                  <p className="home-uses-post">
                    <Sparkles size={14} />
                    <span>
                      <span className="home-uses-tag">Public post</span> {use.post}
                    </span>
                  </p>
                ) : (
                  <p className="home-uses-post is-private">
                    <Lock size={14} />
                    <span>
                      <span className="home-uses-tag">Private</span> Only you can see this
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="home-signin">{start}</div>
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
          <h2 id="home-start">Start your first board.</h2>
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

/** An AI feature named in the copy ("AI draft", "AI-powered"), marked so it stands out. */
function AiMark({ children }: { children: ReactNode }) {
  return (
    <span className="home-ai">
      <Sparkles size={12} aria-hidden="true" />
      {children}
    </span>
  );
}

/** Glides down to the first step instead of jumping, unless the visitor asked for less motion. */
function scrollToSteps(event: MouseEvent<HTMLAnchorElement>) {
  const steps = document.getElementById('how');
  if (!steps) return;
  event.preventDefault();
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  steps.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
}

/** Scrolls a sliding row one card to the left (-1) or right (1), wrapping at the ends. */
function slideBy(row: HTMLElement | null, direction: -1 | 1) {
  const first = row?.firstElementChild as HTMLElement | null;
  if (!row || !first) return;
  const step = first.offsetWidth + parseFloat(getComputedStyle(row).columnGap || '0');
  const max = row.scrollWidth - row.clientWidth;
  const atStart = row.scrollLeft <= 2,
    atEnd = row.scrollLeft >= max - 2;
  const left =
    direction > 0 && atEnd
      ? 0
      : direction < 0 && atStart
        ? max
        : Math.round(row.scrollLeft / step + direction) * step;
  row.scrollTo({ left, behavior: 'smooth' });
}

/** How long each card of a sliding row stays before the next one slides in. */
const SLIDE_MS = 2000;
/** How long a sliding row waits after the visitor touches it before it moves on its own again. */
const SLIDE_IDLE_MS = 4000;

/**
 * Moves a sideways-scrolling row on to its next card every few seconds while it is on
 * screen, and back to the first after the last. It only moves when the row actually
 * scrolls (on phones), never with reduced motion, and waits while the visitor uses it.
 */
function useAutoSlide<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const row = ref.current;
    if (
      !row ||
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    )
      return;
    let visible = false,
      touchedAt = 0;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(row);
    const touched = () => {
      touchedAt = Date.now();
    };
    const events = ['pointerdown', 'touchstart', 'wheel', 'focusin'] as const;
    events.forEach((name) => row.addEventListener(name, touched, { passive: true }));
    const timer = window.setInterval(() => {
      const cards = Array.from(row.children) as HTMLElement[];
      if (!visible || row.scrollWidth <= row.clientWidth + 1 || cards.length < 2) return;
      if (Date.now() - touchedAt < SLIDE_IDLE_MS) return;
      const inset = cards[0].offsetLeft;
      const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 2;
      const next = cards.find((card) => card.offsetLeft - inset > row.scrollLeft + 2);
      const left = atEnd || !next ? 0 : next.offsetLeft - inset;
      row.scrollTo({ left, behavior: 'smooth' });
    }, SLIDE_MS);
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
      events.forEach((name) => row.removeEventListener(name, touched));
    };
  }, []);
  return ref;
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

/** The task that opens on the board in the Plan and write section. */
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

/** A post written from a blank page, the way it would be on a blog. */
const BLOG: Block[] = [
  {
    kind: 'text',
    text: 'For two weeks our checkout lost people at the address step, and only on mobile.',
  },
  { kind: 'heading', text: 'Test the boring paths' },
  {
    kind: 'text',
    text: (
      <>
        The bug was in the promo field, the one place <mark>nobody thought to test</mark>.
      </>
    ),
  },
];
// Frames: the blocks one by one, the publish button, then a pause.
const BLOG_FRAMES = BLOG.length + 3;

const STORY_POINTS = [
  'Promo field reset the address form',
  'Fixed and shipped the same day',
  'Test the boring paths too',
];
const STORY_FRAMES = STORY_POINTS.length + 3;

/** Points get picked from the notes one by one, then AI writes the story from them. */
function StoryScene({ step }: { step: number }) {
  const points = STORY_POINTS.length;
  return (
    <>
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
    </>
  );
}

/** A post written by hand: its paragraphs appear in turn, then it is ready to publish. */
function BlogScene({ step }: { step: number }) {
  return (
    <>
      <span className="home-sketch-label">Blank page</span>
      <strong className="home-paper-title">The boring bug that cost us sales</strong>
      {BLOG.map((block, index) => (
        <PageBlock key={index} block={block} className={shownFrom(index, step)} />
      ))}
      <span className={`home-post-publish${shownFrom(BLOG.length, step)}`}>
        <Send size={14} /> Publish
      </span>
    </>
  );
}

/**
 * The two ways to write a post, taking turns: by hand on a blank page, then drafted by AI from
 * the week's notes. Without motion, both are shown one above the other.
 */
function WriteSketch() {
  const { ref, step, animated } = useLoop(BLOG_FRAMES + STORY_FRAMES);
  const byHand = animated && step < BLOG_FRAMES;
  const scene = (current: boolean) => `home-write-scene${current ? ' is-current' : ''}`;
  return (
    <div
      ref={ref}
      className={`home-paper home-story home-write${animated ? ' is-animated' : ''}`}
      aria-hidden="true"
    >
      {animated && (
        <div className="home-write-tabs">
          <span className={byHand ? 'is-active' : ''}>Write it yourself</span>
          <span className={byHand ? '' : 'is-active'}>Draft with AI</span>
        </div>
      )}
      <div className="home-write-scenes">
        <div className={scene(byHand)}>
          <BlogScene step={animated ? step : BLOG_FRAMES} />
        </div>
        <div className={scene(!byHand)}>
          <StoryScene step={byHand ? 0 : step - (animated ? BLOG_FRAMES : 0)} />
        </div>
      </div>
    </div>
  );
}

/** Published posts, newest first, listed the way the real blog page lists them. */
const BLOG_POSTS = [
  {
    date: '14 October 2026 · 4 min',
    title: 'The boring bug that cost us sales',
    excerpt: 'For two weeks our checkout lost people at the address step, and only on mobile.',
  },
  {
    date: '2 October 2026 · 3 min',
    title: 'How one index took our p95 from 1.8s to 320ms',
    excerpt: 'The orders page was slow for months. The fix took one afternoon.',
  },
  {
    date: '22 September 2026 · 5 min',
    title: 'What rewriting a CLI taught me about Go',
    excerpt: 'I rewrote a small tool to learn Go. Goroutines finally clicked.',
  },
];

/** Someone's blog page, as readers see it: its posts appear one by one from the top. */
function BlogSketch() {
  const posts = BLOG_POSTS.length;
  const { ref, step, animated } = useLoop(posts + 2);
  return (
    <div
      ref={ref}
      className={`home-paper home-note home-blog${animated ? ' is-animated' : ''}`}
      aria-hidden="true"
    >
      <div className="home-blog-head">
        <strong className="home-paper-title">
          <mark>Blog</mark>
        </strong>
        <span>Everything Rana has written.</span>
      </div>
      {BLOG_POSTS.map((post, index) => (
        <div key={post.title} className={`home-note-entry${shownFrom(index, step)}`}>
          <time>{post.date}</time>
          <strong className="home-paper-title">{post.title}</strong>
          <p>{post.excerpt}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * A board whose cards are pages. The pointer drags a card from To do to Doing, then clicks
 * another; its page opens and what was written appears block by block. Then it starts again.
 */
function BoardSketch() {
  // Frames: 0 board, 1 pointer grabs a card, 2 drags it, 3 drops it in Doing, 4 pointer on the
  // card to open, 5 page open, 6-9 blocks, 10 hold.
  const { ref, step, animated } = useLoop(11);
  const dropped = step >= 3;
  const lists = [
    {
      title: 'To do',
      cards: dropped ? ['Interview Dimas'] : ['Pricing page copy', 'Interview Dimas'],
    },
    {
      title: 'Doing',
      cards: dropped ? ['Checkout redesign', 'Pricing page copy'] : ['Checkout redesign'],
    },
    { title: 'Done', cards: ['Fix cart drop', 'Launch waitlist'] },
  ];
  const open = step >= 5;
  const pointer =
    step === 1
      ? ' is-on-todo'
      : step === 2 || step === 3
        ? ' is-dragging'
        : step === 4
          ? ' is-on-card'
          : '';
  const cardClass = (card: string) => {
    if (card === 'Checkout redesign') {
      return `home-board-card${step === 4 ? ' is-pressed' : ''}`;
    }
    if (card === 'Pricing page copy' && !dropped && step >= 1) {
      return `home-board-card is-grabbed${step === 2 ? ' is-dragging' : ''}`;
    }
    return 'home-board-card';
  };
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
            <span key={card} className={cardClass(card)}>
              {card}
              {card === 'Checkout redesign' && (
                <span className="home-board-meta">
                  <NotebookPen size={12} /> 3 updates
                </span>
              )}
            </span>
          ))}
        </div>
      ))}
      {animated && <MousePointer2 className={`home-board-pointer${pointer}`} size={20} />}
      <div className="home-board-panel">
        <span className="home-sketch-label">Doing</span>
        <strong className="home-paper-title">Checkout redesign</strong>
        {REDESIGN.map((block, index) => (
          <PageBlock key={index} block={block} className={shownFrom(index + 6, step)} />
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
