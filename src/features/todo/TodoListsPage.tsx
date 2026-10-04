import { useNavigate } from 'react-router-dom';
import { ListChecks, Plus } from 'lucide-react';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/Button';
import { TaskCount } from '@/components/ui/TaskCount';
import { editedLabel } from '@/lib/note-metadata';
import { openTasks } from '@/lib/tasks';
import { todoPath } from '@/lib/app-paths';

/** Every to-do list in one place; open one to add and tick off tasks. */
export function TodoListsPage() {
  const { workspace } = useWorkspace(),
    { createTodoList } = useWorkspaceActions(),
    navigate = useNavigate();
  const lists = [...(workspace.todos ?? [])].sort((a, b) => b.updatedAt - a.updatedAt);
  const newList = () => navigate(todoPath({ id: createTodoList(), title: '' }));
  return (
    <div className="pages-view">
      <section className="board-header">
        <div>
          <div className="eyebrow">TO-DO LISTS</div>
          <h1>Your to-dos</h1>
          <p>Keep a list for each thing you are juggling, and tick tasks off as they get done.</p>
        </div>
        <div className="board-actions">
          <Button variant="primary" onClick={newList}>
            <Plus size={17} />
            New to-do list
          </Button>
        </div>
      </section>
      {lists.length ? (
        <ul className="page-list">
          {lists.map((list) => {
            const open = openTasks(list.content);
            return (
              <li key={list.id}>
                <button className="page-row" onClick={() => navigate(todoPath(list))}>
                  <span className="page-row-title">{list.title || 'Untitled list'}</span>
                  <span className="page-row-excerpt">
                    {open.length ? open.slice(0, 4).join(' · ') : 'Nothing left to do'}
                  </span>
                  <span className="page-row-meta">
                    <TaskCount content={list.content} />
                    <span>{editedLabel(list.updatedAt)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="pages-empty">
          <ListChecks size={26} />
          <h2>No to-do lists yet</h2>
          <p>Start one for today, a project, or the groceries.</p>
          <Button variant="primary" onClick={newList}>
            <Plus size={17} />
            Start your first list
          </Button>
        </div>
      )}
    </div>
  );
}
