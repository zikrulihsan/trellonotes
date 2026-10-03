import type { Page } from '@/features/workspace/types';

export type PublishState = 'draft' | 'published' | 'changed';

export function publishState(page: Page): PublishState {
  if (!page.published) return 'draft';
  return page.updatedAt > page.published.at ? 'changed' : 'published';
}
