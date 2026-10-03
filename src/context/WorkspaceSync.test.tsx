import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { seedWorkspace } from '@/features/workspace/seed';
import type { Workspace } from '@/features/workspace/types';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import {
  saveSyncBase,
  saveWorkspace,
  setUnsyncedChanges,
  workspaceStorageKey,
} from '@/lib/storage';
import { WorkspaceProvider } from './WorkspaceProvider';

/** An in-memory cloud row that, like the real one, rejects writes based on a stale version. */
const cloud = vi.hoisted(() => ({
  row: null as { workspace: unknown; version: string } | null,
  offline: false,
  writes: [] as unknown[],
  versions: 0,
  set(workspace: unknown) {
    this.row = { workspace: structuredClone(workspace), version: `v${++this.versions}` };
  },
}));

vi.mock('@/lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: {} }));
vi.mock('@/context/auth-context', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/lib/supabase/workspace-store', () => ({
  fetchCloudWorkspace: () =>
    cloud.offline
      ? Promise.reject(new Error('offline'))
      : Promise.resolve(cloud.row && structuredClone(cloud.row)),
  writeCloudWorkspace: (
    _client: unknown,
    _user: string,
    workspace: Workspace,
    version: string | null,
  ) => {
    if (cloud.offline) return Promise.reject(new Error('offline'));
    if ((cloud.row?.version ?? null) !== version) return Promise.resolve(null);
    cloud.set(workspace);
    cloud.writes.push(workspace);
    return Promise.resolve(cloud.row!.version);
  },
}));

const key = workspaceStorageKey('user-1');
const render = () =>
  renderHook(() => ({ ...useWorkspace(), ...useWorkspaceActions() }), {
    wrapper: WorkspaceProvider,
  });
const cloudWorkspace = () => cloud.row?.workspace as Workspace | undefined;

describe('cloud sync', () => {
  beforeEach(() => {
    cloud.row = null;
    cloud.offline = false;
    cloud.writes = [];
  });

  it('saves a newly created list to the cloud', async () => {
    cloud.set(seedWorkspace());
    const hook = render();
    await waitFor(() => expect(hook.result.current.syncStatus).toBe('synced'));
    act(() => hook.result.current.createList('writing-room', 'Drafts'));
    await waitFor(() =>
      expect(cloudWorkspace()?.boards[0].lists.map((l) => l.title)).toContain('Drafts'),
    );
    await waitFor(() => expect(hook.result.current.syncStatus).toBe('synced'));
  });

  it('keeps edits the cloud never received instead of loading the older cloud copy', async () => {
    cloud.set(seedWorkspace());
    saveSyncBase(key, { workspace: seedWorkspace(), version: cloud.row!.version });
    const local = seedWorkspace();
    local.cards[0].content = '<p>Written just before closing the tab.</p>';
    saveWorkspace(local, localStorage, key);
    setUnsyncedChanges(key, true);
    const hook = render();
    await waitFor(() => expect(hook.result.current.syncStatus).not.toBe('loading'));
    expect(hook.result.current.workspace.cards[0].content).toBe(
      '<p>Written just before closing the tab.</p>',
    );
    await waitFor(() =>
      expect(cloudWorkspace()?.cards[0].content).toBe(
        '<p>Written just before closing the tab.</p>',
      ),
    );
  });

  it('merges with edits another device saved in the meantime', async () => {
    cloud.set(seedWorkspace());
    const hook = render();
    await waitFor(() => expect(hook.result.current.syncStatus).toBe('synced'));
    // Another device adds a list after this one loaded.
    const other = seedWorkspace();
    other.boards[0].lists.push({ id: 'phone-list', title: 'From my phone' });
    cloud.set(other);
    act(() => hook.result.current.createList('writing-room', 'From my laptop'));
    const titles = (ws?: Workspace) => ws?.boards[0].lists.map((l) => l.title);
    await waitFor(() =>
      expect(titles(cloudWorkspace())).toEqual(
        expect.arrayContaining(['From my phone', 'From my laptop']),
      ),
    );
    await waitFor(() =>
      expect(titles(hook.result.current.workspace)).toEqual(
        expect.arrayContaining(['From my phone', 'From my laptop']),
      ),
    );
    expect(hook.result.current.syncStatus).toBe('synced');
  });

  it('loads the cloud copy when this device has nothing unsynced', async () => {
    const remote = seedWorkspace();
    remote.cards[0].title = 'Edited on another device';
    cloud.set(remote);
    saveWorkspace(seedWorkspace(), localStorage, key);
    const hook = render();
    await waitFor(() => expect(hook.result.current.syncStatus).toBe('synced'));
    expect(hook.result.current.workspace.cards[0].title).toBe('Edited on another device');
    expect(cloud.writes).toHaveLength(0);
  });

  it('picks up other devices’ edits when the tab is shown again', async () => {
    cloud.set(seedWorkspace());
    const hook = render();
    await waitFor(() => expect(hook.result.current.syncStatus).toBe('synced'));
    const remote = seedWorkspace();
    remote.cards[0].title = 'Written on my phone';
    cloud.set(remote);
    act(() => void window.dispatchEvent(new Event('focus')));
    await waitFor(() =>
      expect(hook.result.current.workspace.cards[0].title).toBe('Written on my phone'),
    );
  });

  it('does not overwrite the cloud copy when loading it fails', async () => {
    cloud.offline = true;
    const hook = render();
    await waitFor(() => expect(hook.result.current.syncStatus).toBe('error'));
    act(() => hook.result.current.createList('writing-room', 'Drafts'));
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(cloud.writes).toHaveLength(0);
  });

  it('waits for pending edits before reporting that it is safe to sign out', async () => {
    cloud.set(seedWorkspace());
    const hook = render();
    await waitFor(() => expect(hook.result.current.syncStatus).toBe('synced'));
    act(() => hook.result.current.createList('writing-room', 'Last thought'));
    let synced = false;
    await act(async () => {
      synced = await hook.result.current.finishSync();
    });
    expect(synced).toBe(true);
    expect(cloudWorkspace()?.boards[0].lists.map((l) => l.title)).toContain('Last thought');
    cloud.offline = true;
    act(() => hook.result.current.createList('writing-room', 'Offline thought'));
    await act(async () => {
      synced = await hook.result.current.finishSync();
    });
    expect(synced).toBe(false);
  });
});
