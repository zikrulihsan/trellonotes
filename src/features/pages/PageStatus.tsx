import type { Page } from '@/features/workspace/types';
import { publishState, type PublishState } from './publish-state';

const LABELS: Record<PublishState, string> = {
  draft: 'Draft',
  published: 'Published',
  changed: 'Unpublished changes',
};

export function PageStatus({ page }: { page: Page }) {
  const state = publishState(page);
  return <span className={`page-status page-status-${state}`}>{LABELS[state]}</span>;
}
