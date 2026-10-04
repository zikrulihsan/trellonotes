import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ListX, MoreHorizontal, Trash2 } from 'lucide-react';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { useDropdown } from '@/hooks/useDropdown';
import { Dropdown } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { WritingSurface } from '@/features/editor/WritingSurface';
import type { TodoList } from '@/features/workspace/types';
import { editedLabel } from '@/lib/note-metadata';
import { plainText } from '@/lib/text';
import { EMPTY_CHECKLIST, removeDoneTasks, taskProgress } from '@/lib/tasks';
import { findByRef, todoPath } from '@/lib/app-paths';

export default function TodoListPage() {
  const { todoRef } = useParams(),
    { workspace } = useWorkspace(),
    { updateTodoList } = useWorkspaceActions(),
    navigate = useNavigate();
  const list = findByRef(workspace.todos ?? [], todoRef);
  const canonical = list && todoPath(list);
  useEffect(() => {
    // Keep the address bar on the short, current-title link.
    if (canonical && canonical !== `/todo/${todoRef}`) navigate(canonical, { replace: true });
  }, [canonical, todoRef, navigate]);
  if (!list)
    return (
      <div className="editor-placeholder">
        <h1>List not found</h1>
        <p>This to-do list may have been deleted.</p>
        <Button onClick={() => navigate('/todos')}>Open my to-do lists</Button>
      </div>
    );
  // An empty list still opens as a checklist, ready for the first task.
  const content = plainText(list.content) ? list.content : EMPTY_CHECKLIST;
  return (
    <WritingSurface
      key={list.id}
      doc={{ ...list, content }}
      onChange={(patch) => updateTodoList(list.id, patch)}
      backLabel="To-do lists"
      onBack={() => navigate('/todos')}
      placeholder="Add a task…"
      menu={<TodoListOptions list={list} />}
    />
  );
}

function TodoListOptions({ list }: { list: TodoList }) {
  const { updateTodoList, deleteTodoList } = useWorkspaceActions(),
    navigate = useNavigate(),
    menu = useDropdown(),
    [confirming, setConfirming] = useState(false);
  const { done, total } = taskProgress(list.content);
  return (
    <div className="menu-anchor" data-menu-id={menu.id}>
      <button
        className="icon-button"
        aria-label="To-do list options"
        aria-expanded={menu.open}
        onClick={() => menu.toggle()}
      >
        <MoreHorizontal size={19} />
      </button>
      <Dropdown id={menu.id} open={menu.open} className="note-options">
        <p className="note-options-meta">
          {total ? `${done} of ${total} done` : 'No tasks yet'} · {editedLabel(list.updatedAt)}
        </p>
        <button
          disabled={!done}
          onClick={() => {
            updateTodoList(list.id, { content: removeDoneTasks(list.content) });
            menu.close();
          }}
        >
          <ListX size={15} />
          Clear completed
        </button>
        <button
          className="danger"
          onClick={() => {
            setConfirming(true);
            menu.close();
          }}
        >
          <Trash2 size={15} />
          Delete list
        </button>
      </Dropdown>
      {confirming && (
        <Modal title="Delete to-do list?" onClose={() => setConfirming(false)}>
          <p>“{list.title || 'Untitled list'}” and all its tasks will be permanently deleted.</p>
          <div className="modal-actions">
            <Button onClick={() => setConfirming(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteTodoList(list.id);
                navigate('/todos');
              }}
            >
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
