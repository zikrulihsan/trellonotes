import type { Workspace } from './types';

const LEGACY_TAG_COLORS: Record<string, string> = {
  Essay: 'purple',
  Personal: 'orange',
  Notes: 'blue',
  Guide: 'green',
  Work: 'orange',
  Ideas: 'purple',
  'Free writing': 'purple',
};

/** Same tag, same id on every device, so devices migrating separately still agree. */
export const legacyLabelId = (tag: string) =>
  `label-${tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;

/**
 * Workspaces saved before label management stored a free-text tag on each note.
 * Turns those tags into managed labels once; later workspaces pass through unchanged.
 */
export function withLabels(workspace: Workspace): Workspace {
  if (workspace.labels) return workspace;
  const labels = new Map<string, { id: string; name: string; color: string }>();
  for (const note of workspace.cards) {
    const name = note.tag.trim();
    if (!name || labels.has(name)) continue;
    const color =
      note.labelColor && note.labelColor !== 'none'
        ? note.labelColor
        : (LEGACY_TAG_COLORS[name] ?? 'purple');
    labels.set(name, { id: legacyLabelId(name), name, color });
  }
  return {
    ...workspace,
    labels: [...labels.values()],
    cards: workspace.cards.map((note) =>
      note.tag.trim() && !note.labelId ? { ...note, labelId: legacyLabelId(note.tag) } : note,
    ),
  };
}
