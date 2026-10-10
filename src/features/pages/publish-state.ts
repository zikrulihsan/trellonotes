import type { Page } from '@/features/workspace/types';

export type PublishState = 'draft' | 'published' | 'changed';

export function publishState(page: Page): PublishState {
  if (!page.published) return 'draft';
  return page.updatedAt > page.published.at ? 'changed' : 'published';
}

/** Who can find the page: nobody, everyone on the public list, or only people with the link. */
export type Visibility = 'draft' | 'published' | 'unlisted';

export function visibility(page: Page): Visibility {
  if (!page.published) return 'draft';
  return page.published.unlisted ? 'unlisted' : 'published';
}

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  draft: 'Draft',
  published: 'Published',
  unlisted: 'Unlisted',
};

export const VISIBILITY_HINTS: Record<Visibility, string> = {
  draft: 'Only you can see this page',
  published: 'Anyone can find this page on your public writing page',
  unlisted: 'Anyone with the link can read this page, but it is not on your public list',
};
