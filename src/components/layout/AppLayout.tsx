import { Outlet, useMatch } from 'react-router-dom';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUI } from '@/hooks/useUI';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { findByRef } from '@/lib/app-paths';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
export function AppLayout() {
  const { workspace, saveError, cloudEnabled, syncStatus } = useWorkspace(),
    { sidebarOpen, sidebarCollapsed } = useUI(),
    narrow = useMediaQuery('(max-width:760px)');
  const initiativeRoute = useMatch('/initiative/:ref'),
    legacyNoteRoute = useMatch('/card/:ref'),
    noteRoute = initiativeRoute ?? legacyNoteRoute,
    pageRoute = useMatch('/page/:ref'),
    freeWriteRoute = useMatch('/write'),
    todoRoute = useMatch('/todo/:ref'),
    pagesRoute = useMatch('/pages'),
    todosRoute = useMatch('/todos'),
    boardRoute = useMatch('/board/:ref');
  const note = findByRef(workspace.cards, noteRoute?.params.ref);
  const board =
    (note
      ? workspace.boards.find((board) => board.id === note.boardId)
      : findByRef(workspace.boards, boardRoute?.params.ref)) ?? workspace.boards[0];
  const section = pagesRoute ? 'pages' : todosRoute ? 'todos' : 'boards';
  const writing = Boolean(noteRoute || pageRoute || freeWriteRoute || todoRoute);
  return (
    <div
      className={`app ${writing ? 'writing-view' : 'board-workspace'} ${sidebarCollapsed && !narrow ? 'sidebar-collapsed' : ''}`}
    >
      {/* The writing page keeps only the page itself in view. */}
      {!writing && (
        <Sidebar
          board={board}
          section={section}
          inert={!sidebarOpen && narrow}
          collapsed={sidebarCollapsed && !narrow}
        />
      )}
      <main className="main">
        {!writing && <Topbar board={board} section={section} />}
        {saveError && (
          <div className="storage-warning" role="alert">
            {cloudEnabled && syncStatus === 'error'
              ? 'Cloud sync could not reach SweGrowth. Your latest changes are still saved on this device.'
              : 'Your browser could not save these changes. Keep this page open and free up browser storage.'}
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
