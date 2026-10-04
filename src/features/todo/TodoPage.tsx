import { useNavigate } from 'react-router-dom';
import { ListX, MoreHorizontal } from 'lucide-react';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { useDropdown } from '@/hooks/useDropdown';
import { Dropdown } from '@/components/ui/Dropdown';
import { WritingSurface } from '@/features/editor/WritingSurface';
import { editedLabel } from '@/lib/note-metadata';
import { plainText } from '@/lib/text';
import { EMPTY_CHECKLIST, removeDoneTasks, taskProgress } from '@/lib/tasks';

/** The one running to-do list: always the same list, so tasks pile up in one place. */
export default function TodoPage() {
  const { workspace } = useWorkspace(),
    { updateSheet } = useWorkspaceActions(),
    navigate = useNavigate();
  const todo = workspace.todo ?? { content: '', updatedAt: 0 };
  // An empty list still opens as a checklist, ready for the first task.
  const content = plainText(todo.content) ? todo.content : EMPTY_CHECKLIST;
  const back = () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/'));
  return (
    <WritingSurface
      doc={{ id: 'todo', title: '', content, updatedAt: todo.updatedAt }}
      onChange={(patch) => patch.content !== undefined && updateSheet('todo', patch.content)}
      backLabel="Back"
      onBack={back}
      untitled
      heading="To-do"
      placeholder="Add a task…"
      menu={<TodoOptions content={todo.content} updatedAt={todo.updatedAt} />}
    />
  );
}

function TodoOptions({ content, updatedAt }: { content: string; updatedAt: number }) {
  const { updateSheet } = useWorkspaceActions(),
    menu = useDropdown();
  const { done, total } = taskProgress(content);
  return (
    <div className="menu-anchor" data-menu-id={menu.id}>
      <button
        className="icon-button"
        aria-label="To-do options"
        aria-expanded={menu.open}
        onClick={() => menu.toggle()}
      >
        <MoreHorizontal size={19} />
      </button>
      <Dropdown id={menu.id} open={menu.open} className="note-options">
        <p className="note-options-meta">
          {total ? `${done} of ${total} done` : 'No tasks yet'}
          {updatedAt ? ` · ${editedLabel(updatedAt)}` : ''}
        </p>
        <button
          disabled={!done}
          onClick={() => {
            updateSheet('todo', removeDoneTasks(content));
            menu.close();
          }}
        >
          <ListX size={15} />
          Clear completed
        </button>
      </Dropdown>
    </div>
  );
}
