import type { Page } from '@/features/workspace/types';
import type { usePageVisibility } from './usePageVisibility';
import { VISIBILITY_HINTS, VISIBILITY_LABELS, type Visibility } from './publish-state';

/** Draft, Published or Unlisted, changed in place. */
export function VisibilitySelect({
  page,
  control: { shown, busy, choose },
}: {
  page: Page;
  control: ReturnType<typeof usePageVisibility>;
}) {
  return (
    <select
      className={`publish-visibility publish-visibility-${shown}`}
      aria-label={`Visibility of ${page.title || 'Untitled'}`}
      title={VISIBILITY_HINTS[shown]}
      value={shown}
      disabled={busy}
      onChange={(event) => void choose(event.target.value as Visibility)}
    >
      {(Object.keys(VISIBILITY_LABELS) as Visibility[]).map((option) => (
        <option key={option} value={option}>
          {VISIBILITY_LABELS[option]}
        </option>
      ))}
    </select>
  );
}
