// What Gemini is asked when a writer rewrites a passage they selected in the editor. Shared
// by the edge function that calls Gemini (netlify/edge-functions/rewrite.ts) and the app, so
// it has no imports.

/** The most selected text one rewrite sends. */
export const REWRITE_MAX_CHARS = 8000;

/** What the writer asked for. */
export type RewriteAction = 'improve' | 'shorten' | 'fix' | 'translate';

export const REWRITE_ACTIONS: { action: RewriteAction; label: string }[] = [
  { action: 'improve', label: 'Improve writing' },
  { action: 'shorten', label: 'Make shorter' },
  { action: 'fix', label: 'Fix spelling and grammar' },
  { action: 'translate', label: 'Translate English ↔ Indonesian' },
];

const RULES = `You edit one passage a writer selected in their own notes or blog draft. Answer with the passage rewritten, nothing else: no preface, no quotes around it, no notes on what you changed.
Keep the writer's voice, person and meaning. Never add facts, numbers, names, examples or claims the passage does not have.
Keep the writer's formatting as Markdown: paragraphs, "- " bullets, "1. " numbered items, "- [ ] " and "- [x] " checklist items, **bold**, *italics*, \`code\` and [links](url). Keep the same kind of blocks: a list stays a list, one paragraph stays one paragraph.
No emoji unless the passage has them.`;

export const REWRITE_PROMPTS: Record<RewriteAction, string> = {
  improve: `${RULES}
Make it clearer and read more smoothly: plainer words, tighter sentences, a better order where it helps. Keep it about the same length, in the same language.`,
  shorten: `${RULES}
Make it noticeably shorter, about half the length, keeping every point that matters. Same language.`,
  fix: `${RULES}
Only fix spelling, grammar and punctuation. Change nothing else, and keep the same language.`,
  translate: `${RULES}
Translate it: Indonesian into natural English, or any other language into natural Indonesian. Keep names, code and links as they are.`,
};

/** Gemini's response schema, so the answer is always this JSON shape. */
export const REWRITE_SCHEMA = {
  type: 'OBJECT',
  properties: { markdown: { type: 'STRING' } },
  required: ['markdown'],
};
