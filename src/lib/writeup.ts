import type { SupabaseClient } from '@supabase/supabase-js';
import type { Note, Workspace } from '@/features/workspace/types';
import { isDoneList, type JournalWeek } from '@/features/journal/journal';
import { markdownToHtml } from '@/features/editor/markdown';
import { WRITEUP_MAX_CHARS, type WriteupKind } from '@/lib/writeup-prompt';

const BLOCKS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE']);

/**
 * A card's or list's notes as plain lines Gemini can follow: headings, bullets, and
 * checklist items marked [x] or [ ], nested lists indented.
 */
export function notesText(html: string): string {
  const lines: string[] = [];
  const inline = (node: Node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim();
  const isList = (node: Node): node is Element =>
    node instanceof Element && (node.tagName === 'UL' || node.tagName === 'OL');
  const list = (element: Element, depth: number) => {
    for (const item of Array.from(element.children)) {
      const own = Array.from(item.childNodes)
        .filter((child) => !isList(child))
        .map(inline)
        .filter(Boolean)
        .join(' ');
      const mark =
        item.getAttribute('data-type') !== 'taskItem'
          ? '-'
          : item.getAttribute('data-checked') === 'true'
            ? '[x]'
            : '[ ]';
      if (own) lines.push(`${'  '.repeat(depth)}${mark} ${own}`);
      Array.from(item.childNodes)
        .filter(isList)
        .forEach((nested) => list(nested, depth + 1));
    }
  };
  const walk = (parent: Node) => {
    parent.childNodes.forEach((node) => {
      if (isList(node)) list(node, 0);
      else if (!(node instanceof Element) || BLOCKS.has(node.tagName)) {
        const text = inline(node);
        if (text)
          lines.push(node instanceof Element && /^H\d$/.test(node.tagName) ? `# ${text}` : text);
      } else walk(node);
    });
  };
  walk(new DOMParser().parseFromString(html, 'text/html').body);
  return lines.join('\n');
}

/** One card with its board, its list and its notes, the material for its write-up. */
export function cardNotes(workspace: Workspace, note: Note) {
  const board = workspace.boards.find((board) => board.id === note.boardId);
  const list = board?.lists.find((list) => list.id === note.listId);
  const status = list && isDoneList(list) ? 'finished' : list ? `in "${list.title}"` : '';
  const notes = notesText(note.content);
  return [
    `### ${note.title.trim() || 'Untitled card'}`,
    [board && `Board: ${board.title}`, status && `Status: ${status}`].filter(Boolean).join(' · '),
    notes,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Everything in a week the writer can include in its write-up, by id. */
export function weekChoices(week: JournalWeek) {
  return [
    ...week.finished.map((note) => ({ id: note.id, title: note.title, group: 'Finished' })),
    ...week.progress.map((note) => ({ id: note.id, title: note.title, group: 'In progress' })),
    ...week.todos.map((todo) => ({ id: todo.id, title: todo.title, group: 'To-do lists' })),
    ...week.pages.map((page) => ({ id: page.id, title: page.title, group: 'Written' })),
  ];
}

/**
 * The notes for one week's write-up: the cards, to-do lists and pages the writer picked,
 * then their own notes on the week. Pages go by title only; they are already written.
 */
export function weekNotes(workspace: Workspace, week: JournalWeek, picked: Set<string>) {
  const section = (heading: string, blocks: string[]) =>
    blocks.length ? [`## ${heading}`, ...blocks].join('\n\n') : '';
  return [
    section(
      'Finished this week',
      week.finished.filter((note) => picked.has(note.id)).map((note) => cardNotes(workspace, note)),
    ),
    section(
      'Worked on, not finished',
      week.progress.filter((note) => picked.has(note.id)).map((note) => cardNotes(workspace, note)),
    ),
    section(
      'To-do lists',
      week.todos
        .filter((todo) => picked.has(todo.id))
        .map((todo) => [`### ${todo.title.trim() || 'To-do'}`, notesText(todo.content)].join('\n')),
    ),
    section(
      'Pages I wrote',
      week.pages
        .filter((page) => picked.has(page.id))
        .map((page) => `- ${page.title.trim() || 'Untitled page'}`),
    ),
    section('My notes on the week', week.notes.trim() ? [week.notes.trim()] : []),
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** A draft page from Gemini's answer: its title, and its Markdown body as editor HTML. */
export function draftPage(draft: unknown, fallbackTitle: string) {
  const read = (typeof draft === 'object' && draft ? draft : {}) as Record<string, unknown>;
  const title = typeof read.title === 'string' && read.title.trim() ? read.title.trim() : '';
  const markdown = typeof read.markdown === 'string' ? read.markdown.trim() : '';
  if (!markdown) throw new Error('Gemini came back without a draft. Try again.');
  return { title: title || fallbackTitle, content: markdownToHtml(markdown) };
}

/** Asks Gemini (through the app's edge function) to draft a page from private notes. */
export async function writeUp(
  client: SupabaseClient,
  kind: WriteupKind,
  notes: string,
  fallbackTitle: string,
) {
  if (!notes.trim()) throw new Error('There is nothing to write from yet.');
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in to write with Gemini.');
  const response = await fetch('/api/writeup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind, notes: notes.slice(0, WRITEUP_MAX_CHARS) }),
  });
  const result = (await response.json().catch(() => null)) as {
    draft?: unknown;
    error?: string;
  } | null;
  if (!response.ok || !result?.draft)
    throw new Error(result?.error ?? `Gemini could not write the draft (${response.status}).`);
  return draftPage(result.draft, fallbackTitle);
}
