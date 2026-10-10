import type { Page } from '@/features/workspace/types';
import { publishState, visibility, VISIBILITY_LABELS } from './publish-state';

export function PageStatus({ page }: { page: Page }) {
  const shown = visibility(page);
  return (
    <>
      <span className={`page-status page-status-${shown}`}>{VISIBILITY_LABELS[shown]}</span>
      {publishState(page) === 'changed' && (
        <span className="page-status page-status-changed">Unpublished changes</span>
      )}
    </>
  );
}
