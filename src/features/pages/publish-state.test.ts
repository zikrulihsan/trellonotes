import { describe, expect, it } from 'vitest';
import type { Page } from '@/features/workspace/types';
import { publishState, visibility } from './publish-state';

const page = (published?: Page['published']): Page => ({
  id: 'p1',
  title: 'Catatan',
  content: '',
  updatedAt: 10,
  published,
});

describe('page visibility', () => {
  it('keeps pages published before unlisted pages existed on the public list', () => {
    expect(visibility(page({ slug: 'catatan', at: 10 }))).toBe('published');
  });

  it('tells drafts, listed and unlisted pages apart', () => {
    expect(visibility(page())).toBe('draft');
    expect(visibility(page({ slug: 'catatan', at: 10, unlisted: true }))).toBe('unlisted');
  });

  it('still notices unpublished changes on an unlisted page', () => {
    expect(publishState({ ...page({ slug: 'catatan', at: 5, unlisted: true }) })).toBe('changed');
  });
});
