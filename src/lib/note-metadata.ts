import type { Label, Note, Workspace } from '@/features/workspace/types';
export const LABEL_COLORS = [
  { id: 'green', name: 'Green', value: '#77a993' },
  { id: 'yellow', name: 'Yellow', value: '#c7a16b' },
  { id: 'coral', name: 'Coral', value: '#d3939f' },
  { id: 'orange', name: 'Orange', value: '#c89369' },
  { id: 'blue', name: 'Blue', value: '#8ba8d4' },
  { id: 'purple', name: 'Purple', value: '#aa87d9' },
];
export function labelColorValue(colorId: string): string {
  return LABEL_COLORS.find((color) => color.id === colorId)?.value ?? LABEL_COLORS[5].value;
}
export function noteLabel(workspace: Workspace, note: Note): Label | undefined {
  return note.labelId ? workspace.labels?.find((label) => label.id === note.labelId) : undefined;
}
export function editedLabel(timestamp: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'Edited just now';
  if (minutes < 60) return `Edited ${minutes}m ago`;
  if (minutes < 1440) return `Edited ${Math.floor(minutes / 60)}h ago`;
  return (
    'Edited ' +
    new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  );
}
