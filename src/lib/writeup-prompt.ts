// What Gemini is asked when a writer turns private work notes into a draft page. Shared by
// the edge function that calls Gemini (netlify/edge-functions/writeup.ts) and the app, so it
// has no imports.

/** The most note text one write-up sends. */
export const WRITEUP_MAX_CHARS = 30000;

/** What is being written up: one week of the work journal, or one card. */
export type WriteupKind = 'week' | 'card';

const RULES = `You turn a professional's private work notes into a draft they can edit and then publish on their own blog.
The notes are rough: fragments, checklists ([x] done, [ ] not done), shorthand, mixed languages.
Write in the first person, plain and specific, like a person telling peers what they did. No hype, no buzzwords, no emoji.
Write in the language most of the notes are written in.
Use only what the notes say. Never invent results, numbers, dates, names, tools or reasons; if the notes do not say why or how something went, leave it out.
Items marked [ ] or listed as in progress are not finished: say so, or leave them out.
Leave out anything that looks secret or private: passwords, keys, internal links, personal data, money owed.
Format the body as Markdown: short paragraphs, "## " section headings, "- " bullet lists. No title heading in the body, no tables, no images.
The title is short and plain, under 10 words, with no date in it.`;

export const WRITEUP_PROMPTS: Record<WriteupKind, string> = {
  week: `${RULES}
This is one week of work: cards finished, cards still in progress, pages written, to-do lists, and the writer's own notes on the week.
Write a short weekly update of 150 to 400 words: one opening paragraph on what the week was about, then what got done, grouped by theme rather than by board, then what is still in progress or next if the notes say. Mention lessons only if the writer's notes mention them.`,
  card: `${RULES}
This is one piece of work: a board card and its notes, often a long checklist.
Write a short write-up of 200 to 500 words that someone outside the work can follow: what it is and the problem it solves, what I did, and where it stands now. Add a section on what I learned only if the notes say something about it. Use only the sections the notes give material for.`,
};

const text = { type: 'STRING' };

/** Gemini's response schema, so the answer is always this JSON shape. */
export const WRITEUP_SCHEMA = {
  type: 'OBJECT',
  properties: { title: text, markdown: text },
  required: ['title', 'markdown'],
};
