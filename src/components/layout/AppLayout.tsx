import { Outlet, useMatch } from 'react-router-dom';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUI } from '@/hooks/useUI';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
export function AppLayout() {
  const { workspace, saveError, cloudEnabled, syncStatus } = useWorkspace(),
    { sidebarOpen, sidebarCollapsed, focusMode } = useUI(),
    narrow = useMediaQuery('(max-width:760px)');
  const noteRoute = useMatch('/card/:noteId'),
    boardRoute = useMatch('/board/:boardId');
  const note = workspace.cards.find((note) => note.id === noteRoute?.params.noteId);
  const board =
    workspace.boards.find((board) => board.id === (note?.boardId ?? boardRoute?.params.boardId)) ??
    workspace.boards[0];
  const writing = Boolean(noteRoute);
  return (
    <div
      className={`app ${writing ? 'writing-view' : 'board-workspace'} ${focusMode ? 'focus-mode' : ''} ${sidebarCollapsed && !narrow ? 'sidebar-collapsed' : ''}`}
    >
      <Sidebar
        board={board}
        inert={!sidebarOpen && narrow}
        collapsed={sidebarCollapsed && !narrow}
      />
      <main className="main">
        <Topbar board={board} writing={writing} />
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
