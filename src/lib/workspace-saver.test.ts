import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seedWorkspace } from '@/features/workspace/seed';
import type { Workspace } from '@/features/workspace/types';
import { createWorkspaceSaver } from './workspace-saver';

function deferred() {
  let resolve!: () => void, reject!: (reason: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('workspace saver', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('waits for a pause in editing and saves only the newest workspace', async () => {
    const save = vi.fn((workspace: Workspace) => Promise.resolve(workspace));
    const onSaved = vi.fn();
    const saver = createWorkspaceSaver({ save, onSaved, onError: vi.fn() });
    const first = seedWorkspace(),
      second = seedWorkspace();
    saver.queue(first);
    await vi.advanceTimersByTimeAsync(300);
    saver.queue(second);
    await vi.advanceTimersByTimeAsync(500);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(second);
    expect(onSaved).toHaveBeenCalledWith(second, second);
  });

  it('never overlaps saves, so an older save cannot land after a newer one', async () => {
    const calls: { workspace: Workspace; done: ReturnType<typeof deferred> }[] = [];
    const save = vi.fn((workspace: Workspace) => {
      const done = deferred();
      calls.push({ workspace, done });
      return done.promise.then(() => workspace);
    });
    const saver = createWorkspaceSaver({ save, onSaved: vi.fn(), onError: vi.fn() });
    const first = seedWorkspace(),
      second = seedWorkspace();
    saver.queue(first);
    saver.flush();
    saver.queue(second);
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
    calls[0].done.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(2);
    expect(calls[1].workspace).toBe(second);
  });

  it('retries a failed save', async () => {
    const save = vi
      .fn<(workspace: Workspace) => Promise<Workspace>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementation((workspace) => Promise.resolve(workspace));
    const onSaved = vi.fn(),
      onError = vi.fn();
    const saver = createWorkspaceSaver({ save, onSaved, onError, retryDelay: 1000 });
    const workspace = seedWorkspace();
    saver.queue(workspace);
    saver.flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(onError).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(2);
    expect(onSaved).toHaveBeenCalledWith(workspace, workspace);
  });

  it('reports when all queued edits have been stored', async () => {
    const save = vi
      .fn<(workspace: Workspace) => Promise<Workspace>>()
      .mockImplementation((workspace) => Promise.resolve(workspace));
    const saver = createWorkspaceSaver({ save, onSaved: vi.fn(), onError: vi.fn() });
    saver.queue(seedWorkspace());
    await expect(saver.whenIdle()).resolves.toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    save.mockRejectedValueOnce(new Error('offline'));
    saver.queue(seedWorkspace());
    await expect(saver.whenIdle()).resolves.toBe(false);
    saver.dispose();
  });
});
