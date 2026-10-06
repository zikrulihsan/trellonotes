import type { Editor } from '@tiptap/react';

export interface SlashCommand {
  id: string;
  title: string;
  /** Extra words that find this command, e.g. typing "/today" finds Date. */
  keywords: string[];
  /** A short preview shown next to the title. */
  preview: (now: Date) => string;
  run: (editor: Editor, range: { from: number; to: number }, now: Date) => void;
}

// Dates follow the reader's own language and conventions (e.g. "Minggu, 4 Oktober 2026").
export const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
export const formatTime = (date: Date) =>
  date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const formatNow = (date: Date) => `${formatDate(date)}, ${formatTime(date)}`;

/** Monday to Sunday of the week containing `date`, e.g. "28 Sep – 4 Oct 2026". */
export function formatWeek(date: Date): string {
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const short = { day: 'numeric', month: 'short' } as const;
  return `${monday.toLocaleDateString(undefined, short)} – ${sunday.toLocaleDateString(undefined, { ...short, year: 'numeric' })}`;
}

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A heading followed by bold section names, each with one empty bullet to fill in. */
function report(heading: string, sections: string[]): string {
  return (
    `<h2>${escape(heading)}</h2>` +
    sections.map((name) => `<p><strong>${name}</strong></p><ul><li><p></p></li></ul>`).join('')
  );
}

function insertText(editor: Editor, range: { from: number; to: number }, text: string) {
  editor.chain().focus().deleteRange(range).insertContent(escape(text)).run();
}

/** Inserts a template and puts the cursor in its first empty bullet. */
function insertTemplate(editor: Editor, range: { from: number; to: number }, html: string) {
  editor.chain().focus().deleteRange(range).insertContent(html).run();
  let target: number | null = null;
  editor.state.doc.nodesBetween(range.from, editor.state.selection.to, (node, pos) => {
    if (target !== null) return false;
    if (node.type.name === 'listItem' && !node.textContent) target = pos + 2;
  });
  if (target !== null) editor.chain().focus().setTextSelection(target).run();
}

/** A block command: "/" and its name are removed, then the block is applied. */
function block(
  id: string,
  title: string,
  keywords: string[],
  preview: string,
  apply: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>,
): SlashCommand {
  return {
    id,
    title,
    keywords,
    preview: () => preview,
    run: (editor, range) => apply(editor.chain().focus().deleteRange(range)).run(),
  };
}

export const SLASH_COMMANDS: SlashCommand[] = [
  block('text', 'Plain text', ['paragraph', 'body', 'teks', 'paragraf'], 'Aa', (chain) =>
    chain.setParagraph(),
  ),
  block('h1', 'Heading', ['heading1', 'title', 'judul'], 'H1', (chain) =>
    chain.setHeading({ level: 1 }),
  ),
  block('h2', 'Subheading', ['heading2', 'subjudul'], 'H2', (chain) =>
    chain.setHeading({ level: 2 }),
  ),
  block('h3', 'Small heading', ['heading3', 'subjudul'], 'H3', (chain) =>
    chain.setHeading({ level: 3 }),
  ),
  block('bullet', 'Bullet list', ['ul', 'unordered', 'poin', 'daftar'], '• List', (chain) =>
    chain.toggleBulletList(),
  ),
  block(
    'number',
    'Numbered list',
    ['ol', 'ordered', 'numbering', 'angka', 'nomor'],
    '1. List',
    (chain) => chain.toggleOrderedList(),
  ),
  block(
    'todo',
    'Checklist',
    ['checklist', 'task', 'checkbox', 'tugas', 'daftar'],
    '☐ To-do',
    (chain) => chain.toggleTaskList(),
  ),
  block('table', 'Table', ['tabel', 'grid', 'kolom', 'baris'], '3 × 3', (chain) =>
    chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
  ),
  block('quote', 'Quote', ['blockquote', 'kutipan'], '❝', (chain) => chain.toggleBlockquote()),
  block('highlight', 'Highlight', ['mark', 'stabilo', 'sorot', 'tandai'], 'Marked', (chain) =>
    chain.toggleHighlight(),
  ),
  block('code', 'Code block', ['snippet', 'shell', 'terminal', 'command', 'kode'], '```', (chain) =>
    chain.setCodeBlock(),
  ),
  block('divider', 'Divider', ['line', 'hr', 'separator', 'garis'], '———', (chain) =>
    chain.setHorizontalRule(),
  ),
  {
    id: 'date',
    title: 'Date',
    keywords: ['today', 'tanggal', 'hari'],
    preview: formatDate,
    run: (editor, range, now) => insertText(editor, range, formatDate(now)),
  },
  {
    id: 'now',
    title: 'Date and time',
    keywords: ['datetime', 'timestamp', 'sekarang'],
    preview: formatNow,
    run: (editor, range, now) => insertText(editor, range, formatNow(now)),
  },
  {
    id: 'time',
    title: 'Time',
    keywords: ['clock', 'jam', 'waktu'],
    preview: formatTime,
    run: (editor, range, now) => insertText(editor, range, formatTime(now)),
  },
  {
    id: 'log',
    title: 'Log entry',
    keywords: ['entry', 'note', 'catatan'],
    preview: (now) => `${formatTime(now)} — …`,
    run: (editor, range, now) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(`<p><strong>${escape(formatNow(now))}</strong> — </p>`)
        .run(),
  },
  {
    id: 'update',
    title: 'Progress update',
    keywords: ['progress', 'daily', 'standup', 'report', 'harian', 'laporan'],
    preview: () => 'Done · In progress · Blockers · Next',
    run: (editor, range, now) =>
      insertTemplate(
        editor,
        range,
        report(`Progress update · ${formatDate(now)}`, ['Done', 'In progress', 'Blockers', 'Next']),
      ),
  },
  {
    id: 'weekly',
    title: 'Weekly report',
    keywords: ['week', 'report', 'mingguan', 'laporan'],
    preview: formatWeek,
    run: (editor, range, now) =>
      insertTemplate(
        editor,
        range,
        report(`Weekly report · ${formatWeek(now)}`, [
          'Highlights',
          'Progress',
          'Issues and risks',
          'Plan for next week',
        ]),
      ),
  },
];

export function matchSlashCommands(query: string): SlashCommand[] {
  const q = query.toLowerCase();
  return SLASH_COMMANDS.filter(
    (command) =>
      command.id.startsWith(q) ||
      command.title.toLowerCase().startsWith(q) ||
      command.keywords.some((word) => word.startsWith(q)),
  );
}

/** Finds a "/query" typed right before the cursor, at the start of a line or after a space. */
export function findSlashQuery(editor: Editor): { from: number; to: number; query: string } | null {
  const { selection } = editor.state;
  const { $from } = selection;
  if (!selection.empty || $from.parent.type.spec.code) return null;
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
  const match = /(?:^|\s)\/([\p{L}\d-]{0,24})$/u.exec(before);
  if (!match) return null;
  return { from: $from.pos - match[1].length - 1, to: $from.pos, query: match[1] };
}
