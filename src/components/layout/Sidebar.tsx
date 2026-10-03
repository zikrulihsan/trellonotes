import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronDown, Feather, LayoutGrid, Plus } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth } from '@/context/auth-context';
import { useUI } from '@/hooks/useUI';
import type { Board } from '@/features/workspace/types';
export function Sidebar({
  board,
  inert,
  collapsed,
}: {
  board: Board;
  inert: boolean;
  collapsed: boolean;
}) {
  const { workspace, cloudEnabled, syncStatus } = useWorkspace(),
    { user, signOut } = useAuth(),
    { sidebarOpen, setSidebarOpen, openDialog } = useUI(),
    navigate = useNavigate();
  function go(id: string) {
    navigate(`/board/${id}`);
    setSidebarOpen(false);
  }
  return (
    <>
      {sidebarOpen && (
        <button
          className="sidebar-shade"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        id="app-sidebar"
        inert={inert || collapsed}
        className={`sidebar ${sidebarOpen ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}
      >
        <button className="brand" onClick={() => go(workspace.boards[0].id)}>
          <span className="brand-mark">
            <Feather size={22} />
          </span>
          folio<span className="brand-period">.</span>
        </button>
        <div className="workspace-label">
          <span className="workspace-avatar">S</span>
          <div>
            Personal workspace<small>Your space to create</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <button className="side-link active" onClick={() => go(board.id)}>
          <LayoutGrid size={18} />
          My boards<span className="side-count">{workspace.boards.length}</span>
        </button>
        <div className="side-section">
          <span>YOUR BOARDS</span>
          <button aria-label="Create board" onClick={() => openDialog({ kind: 'create-board' })}>
            <Plus size={16} />
          </button>
        </div>
        <nav aria-label="Boards">
          {workspace.boards.map((b) => (
            <button
              className={`board-nav ${b.id === board.id ? 'selected' : ''}`}
              key={b.id}
              onClick={() => go(b.id)}
            >
              <span className="board-dot" style={{ background: b.color }} />
              <span className="board-nav-label">{b.title}</span>
            </button>
          ))}
        </nav>
        <button className="new-board" onClick={() => openDialog({ kind: 'create-board' })}>
          <Plus size={16} />
          Create a board
        </button>
        <div className="sidebar-note">
          <BookOpen size={20} />
          <p>
            Every good idea
            <br />
            starts with a little space.
          </p>
        </div>
        <div className="sidebar-footer">
          <span className="profile-avatar">S</span>
          <div>
            {user?.email ?? 'My workspace'}
            <small>
              {cloudEnabled
                ? syncStatus === 'error'
                  ? 'Sync paused'
                  : 'SweGrowth sync'
                : 'Saved on this device'}
            </small>
          </div>
          {cloudEnabled ? (
            <button
              className="local-pill signout-pill"
              onClick={() => void signOut()}
              title="Sign out"
            >
              Sign out
            </button>
          ) : (
            <span className="local-pill">Local</span>
          )}
        </div>
      </aside>
    </>
  );
}
