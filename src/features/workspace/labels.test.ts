import { describe, expect, it } from 'vitest';
import { legacyLabelId, withLabels } from './labels';
import { mergeWorkspaces } from './merge';
import { workspaceReducer } from './reducer';
import { seedWorkspace } from './seed';

describe('labels', () => {
  it('turns legacy note tags into managed labels with the same ids on every device', () => {
    const legacy = seedWorkspace();
    legacy.cards[0].labelColor = 'coral';
    const migrated = withLabels(legacy);
    const essay = migrated.labels?.find((label) => label.name === legacy.cards[0].tag);
    expect(essay).toMatchObject({ id: legacyLabelId(legacy.cards[0].tag), color: 'coral' });
    expect(migrated.cards[0].labelId).toBe(essay?.id);
    // Another device migrating the same notes arrives at the same label ids.
    expect(withLabels(seedWorkspace()).labels?.map((label) => label.id)).toEqual(
      migrated.labels?.map((label) => label.id),
    );
    expect(withLabels(migrated)).toBe(migrated);
  });

  it('removes a deleted label from its notes', () => {
    const state = withLabels(seedWorkspace());
    const labelId = state.cards[0].labelId!;
    const next = workspaceReducer(state, { type: 'label/delete', labelId });
    expect(next.labels?.some((label) => label.id === labelId)).toBe(false);
    expect(next.cards.some((note) => note.labelId === labelId)).toBe(false);
  });

  it('renames a label everywhere at once and ignores blank names', () => {
    const state = withLabels(seedWorkspace());
    const labelId = state.cards[0].labelId!;
    const renamed = workspaceReducer(state, {
      type: 'label/update',
      labelId,
      patch: { name: '  Laporan  ' },
    });
    expect(renamed.labels?.find((label) => label.id === labelId)?.name).toBe('Laporan');
    expect(workspaceReducer(renamed, { type: 'label/update', labelId, patch: { name: ' ' } })).toBe(
      renamed,
    );
  });

  it('merges labels and pages created on different devices', () => {
    const base = withLabels(seedWorkspace());
    const local = workspaceReducer(base, {
      type: 'label/create',
      label: { id: 'weekly', name: 'Weekly', color: 'blue' },
    });
    const remote = workspaceReducer(base, {
      type: 'page/create',
      page: { id: 'page-1', title: 'Rilis', content: '', updatedAt: 1 },
    });
    const merged = mergeWorkspaces(base, local, remote);
    expect(merged.labels?.some((label) => label.id === 'weekly')).toBe(true);
    expect(merged.pages?.map((page) => page.id)).toEqual(['page-1']);
  });
});
