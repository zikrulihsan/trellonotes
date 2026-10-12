import type { Note, Page, Workspace } from '@/features/workspace/types';
import { formatDate } from '@/features/editor/slash-commands';
import { nowTitles, weekId } from '@/features/journal/journal';
import { defaultAbout, defaultLanding, type Landing } from '@/lib/supabase/landing';
import { writerPath, type PublicAuthor, type PublishedPage } from '@/lib/supabase/published-pages';

/** The made-up writer whose workspace and website the playground shows. */
export const PLAYGROUND_AUTHOR: PublicAuthor & { name: string } = {
  userId: 'playground',
  handle: 'alya',
  name: 'Alya Rahman',
};

/**
 * The ids the playground's picker opens. Links find items by an id's first 8 letters,
 * so every sample id starts differently.
 */
export const PLAYGROUND_IDS = {
  board: 'work-board',
  initiative: 'checkout-redesign',
  story: 'story-checkout',
} as const;

const HOUR = 3_600_000,
  DAY = 24 * HOUR;

/** An initiative's updates, newest last, each under its date as `/date` writes it. */
const updates = (now: number, entries: [daysAgo: number, html: string][]) =>
  entries.map(([ago, html]) => `<h3>${formatDate(new Date(now - ago * DAY))}</h3>${html}`).join('');

const STORY = `<p>Last week our checkout lost carts at the address step, and nobody knew why. The fix took ten minutes. Finding it took two days.</p>
<h2>What happened</h2>
<p>Carts were dropping right after people typed their address. Nothing in the error logs, nothing odd in the payment provider. On the second day, pairing with Rana, we tried a promo code halfway through the form, and the address fields went blank.</p>
<p>The promo field re-rendered the whole form and threw away what people had typed. Most of them didn't type it again.</p>
<h2>What we changed</h2>
<ul><li><p>Kept the address in its own state, so nothing else can reset it.</p></li><li><p>Added a test that fills the form in the order real people do, promo code included.</p></li></ul>
<p>We shipped it after lunch. Two days later, finished checkouts were up 12%.</p>
<h2>What I took from it</h2>
<p>We test the happy path and the scary path. The boring path, the one people take every day, is where this one hid. Test the boring paths too.</p>`;

/**
 * The playground's starting workspace: one board of initiatives, the checkout one with a
 * few dated updates, a story drafted from it, and two posts already on the website.
 * Dates are relative to `now`, so the work journal always has this week to show.
 */
export function playgroundWorkspace(now = Date.now()): Workspace {
  const board = PLAYGROUND_IDS.board;
  const card = (
    id: string,
    listId: string,
    title: string,
    content: string,
    ago: number,
    done = false,
  ): Note => ({
    id,
    boardId: board,
    listId,
    title,
    content,
    tag: '',
    updatedAt: now - ago,
    ...(done && { doneAt: now - ago }),
  });
  const page = (id: string, title: string, content: string, ago: number, slug?: string): Page => ({
    id,
    title,
    content,
    updatedAt: now - ago,
    ...(slug && { published: { slug, at: now - ago } }),
  });
  return {
    boards: [
      {
        id: board,
        title: 'My work',
        description: 'Initiatives I am driving, with updates as they move.',
        color: '#a78bfa',
        lists: [
          { id: 'todo', title: 'To do' },
          { id: 'doing', title: 'Doing' },
          { id: 'done', title: 'Done', done: true },
        ],
      },
    ],
    cards: [
      card(
        'pricing-copy',
        'todo',
        'Pricing page copy',
        '<p>Rewrite the plans so the difference fits in one line each.</p>',
        3 * DAY,
      ),
      card(
        'interview-dimas',
        'todo',
        'Interview Dimas about onboarding',
        '<ul><li><p>Where did he get stuck in the first week?</p></li><li><p>What did he wish someone told him?</p></li></ul>',
        2 * DAY,
      ),
      // On the landing page's "What I'm working on", as picked from the board.
      {
        ...card(
          PLAYGROUND_IDS.initiative,
          'doing',
          'Checkout redesign',
          `<p>Goal: get more carts through checkout without adding steps.</p>${updates(now, [
            [3, '<p>Carts are dropping at the address step. No idea why yet.</p>'],
            [
              2,
              '<p>Found it: the promo field resets the address form. Fixed it with Rana, shipped after lunch.</p>',
            ],
            [0, '<p>Checkouts back up 12%. Lesson: test the boring paths too.</p>'],
          ])}`,
          HOUR,
        ),
        nowAt: now - DAY,
      },
      card(
        'waitlist-launch',
        'done',
        'Launch the waitlist',
        updates(now, [[1, '<p>Live. 140 sign-ups on the first day, mostly from one post.</p>']]),
        DAY,
        true,
      ),
      card(
        'alert-cleanup',
        'done',
        'Quieter error alerts',
        updates(now, [[0, '<p>Grouped repeats, muted the noisy ones. Half as many pings.</p>']]),
        2 * HOUR,
        true,
      ),
    ],
    labels: [],
    pages: [
      page(PLAYGROUND_IDS.story, 'The boring bug that cost us sales', STORY, HOUR),
      page(
        'post-waitlist',
        'Shipping a waitlist in a week',
        '<p>We had a landing page, a form and one week. Here is what we cut to make it, and what we would cut again.</p><p>The form asked for an email and nothing else. Every extra field we tested lost people, so we kept it to one.</p>',
        9 * DAY,
        'shipping-a-waitlist-in-a-week',
      ),
      page(
        'post-alerts',
        'Half the alerts, none of the misses',
        '<p>Our on-call channel pinged forty times a day, and we had learned to ignore it. Grouping repeats and muting the known-noisy checks cut it in half without missing a real incident.</p>',
        20 * DAY,
        'half-the-alerts-none-of-the-misses',
      ),
    ],
    todos: [],
    journal: [
      {
        id: weekId(now),
        content: 'The checkout fix was the big one. Next: pricing page copy.',
        updatedAt: now - HOUR,
      },
    ],
  };
}

/** The workspace's listed, published pages as the website shows them, newest first. */
export function playgroundPosts(workspace: Workspace): PublishedPage[] {
  return (workspace.pages ?? [])
    .filter((page) => page.published && !page.published.unlisted)
    .sort((a, b) => b.published!.at - a.published!.at)
    .map((page) => ({
      id: page.id,
      slug: page.published!.slug,
      title: page.title || 'Untitled',
      content: page.content,
      author_name: PLAYGROUND_AUTHOR.name,
      published_at: new Date(page.published!.at).toISOString(),
      updated_at: new Date(page.updatedAt).toISOString(),
    }));
}

/** Alya's landing page, with "What I'm working on" taken from the cards picked on the board. */
export function playgroundLanding(workspace: Workspace): Landing {
  const working = nowTitles(workspace);
  return {
    ...defaultLanding(PLAYGROUND_AUTHOR.name),
    tagline: 'Product engineer who fixes the boring parts that cost money.',
    links: [{ label: 'Read my blog', url: `${writerPath(PLAYGROUND_AUTHOR)}?blog` }],
    helps: [
      { title: 'Ship checkout and payment flows', subtitle: 'at a growing online store' },
      { title: 'Turn messy bugs into clear fixes', subtitle: 'by writing down what I find' },
      { title: 'Grow as engineers', subtitle: 'by sharing what each project taught me' },
    ],
    working,
    projects: [
      {
        id: 'playground-project-waitlist',
        title: 'Waitlist launch',
        summary: '140 sign-ups on day one with a one-field form',
        category: 'Product',
        year: '2026',
        image: '',
        pageId: 'post-waitlist',
        url: '',
      },
      {
        id: 'playground-project-alerts',
        title: 'Quieter on-call',
        summary: 'Half the alerts without missing an incident',
        category: 'Reliability',
        year: '2026',
        image: '',
        pageId: 'post-alerts',
        url: '',
      },
    ],
    notesHeading: 'Lately I wrote about',
    about: {
      ...defaultAbout(),
      role: 'Product Engineer · Checkout',
      intro:
        'I build the parts of an online store people only notice when they break: checkout, payments and the alerts that wake us up.\n\nI keep a short note on every initiative as I work. Most of what is on this site started as one of those notes.',
      stack: ['Fix the cause, not the symptom.', 'Write it down while it is fresh.'],
      now: working,
      experiences: [
        {
          id: 'playground-exp-store',
          period: '2024 – Present',
          title: 'Product Engineer',
          company: 'A growing online store',
          companyUrl: '',
          location: 'Jakarta',
          description: 'Checkout, payments and on-call.',
          highlights: ['Lifted finished checkouts 12%', 'Halved on-call alerts'],
        },
      ],
    },
  };
}
