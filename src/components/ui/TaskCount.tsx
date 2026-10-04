import { ListChecks } from 'lucide-react';
import { taskProgress } from '@/lib/tasks';

/** "2/5" for writing with a checklist; nothing otherwise. */
export function TaskCount({ content }: { content: string }) {
  const { done, total } = taskProgress(content);
  if (!total) return null;
  return (
    <span
      className={`task-count ${done === total ? 'is-done' : ''}`}
      title={`${done} of ${total} done`}
    >
      <ListChecks size={14} />
      {done}/{total}
    </span>
  );
}
