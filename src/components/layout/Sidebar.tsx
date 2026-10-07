import { useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Feather,
  FileText,
  LayoutGrid,
  ListChecks,
  PanelLeftClose,
  PenLine,
  Plus,
  Send,
  Tags,
  Timer,
  X,
} from 'lucide-react';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { useAuth } from '@/context/auth-context';
import { useUI } from '@/hooks/useUI';
import type { Board } from '@/features/workspace/types';
import { boardPath } from '@/lib/app-paths';
import { useFocus } from '@/features/focus/focus-context';
import { formatClock } from '@/features/focus/focus-timer';
export function Sidebar({
  board,
  section,
}: {
  board: Board;
  section: 'boards' | 'pages' | 'todos';
}) {
  const { workspace, cloudEnabled, syncStatus } = useWorkspace(),
    { finishSync } = useWorkspaceActions(),
    focus = useFocus(),
    { user, signOut } = useAuth(),
    [signingOut, setSigningOut] = useState(false),
    { sidebarVisible, narrowScreen, hideSidebar, closeSidebarDrawer, openDialog } = useUI(),
    navigate = useNavigate(),
    asideRef = useRef<HTMLElement>(null),
    hideRef = useRef<HTMLButtonElement>(null),
    wasVisible = useRef(sidebarVisible);
  // The phone drawer takes keyboard focus when it opens. When the sidebar hides with
  // focus inside it (or on the drawer's shade), focus goes back to the toggle in the
  // top bar instead of being lost. A layout effect, so it runs before the browser
  // drops focus from the now-inert aside.
  useLayoutEffect(() => {
    if (sidebarVisible === wasVisible.current) return;
    wasVisible.current = sidebarVisible;
    const active = document.activeElement;
    if (sidebarVisible) {
      if (narrowScreen) hideRef.current?.focus();
    } else if (
      asideRef.current?.contains(active) ||
      (narrowScreen && (!active || active === document.body))
    ) {
      document.getElementById('sidebar-toggle')?.focus();
    }
  }, [sidebarVisible, narrowScreen]);
  async function handleSignOut() {
    setSigningOut(true);
    try {
      const synced = await finishSync();
      if (
        !synced &&
        !window.confirm(
          'Some changes have not reached the cloud yet. They stay on this device and sync the next time you sign in here. Sign out anyway?',
        )
      )
        return setSigningOut(false);
      await signOut();
    } catch {
      setSigningOut(false);
    }
  }
  function go(target: Board) {
    navigate(boardPath(target));
    closeSidebarDrawer();
  }
  function goPages() {
    navigate('/pages');
    closeSidebarDrawer();
  }
  function freeWrite() {
    navigate('/write');
    closeSidebarDrawer();
  }
  function goTodos() {
    navigate('/todos');
    closeSidebarDrawer();
  }
  function openFocus() {
    focus.setPanelOpen(true);
    closeSidebarDrawer();
  }
  const hideLabel = narrowScreen ? 'Close navigation' : 'Hide sidebar';
  return (
    <>
      {narrowScreen && sidebarVisible && (
        <button className="sidebar-shade" aria-label="Close navigation" onClick={hideSidebar} />
      )}
      <aside
        id="app-sidebar"
        ref={asideRef}
        aria-label="Sidebar"
        inert={!sidebarVisible}
        className={`sidebar ${sidebarVisible ? '' : 'is-hidden'}`}
      >
        <div className="sidebar-head">
          <button className="brand" onClick={() => go(workspace.boards[0])}>
            <span className="brand-mark">
              <Feather size={22} />
            </span>
            folio<span className="brand-period">.</span>
          </button>
          <button
            ref={hideRef}
            className="sidebar-hide"
            onClick={hideSidebar}
            aria-label={hideLabel}
            title={narrowScreen ? hideLabel : `${hideLabel} (Ctrl+\\)`}
          >
            {narrowScreen ? <X size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <div className="sidebar-body">
          <div className="workspace-label">
            <span className="workspace-avatar">S</span>
            <div className="sidebar-text">
              Personal workspace<small>Your space to create</small>
            </div>
          </div>
          <nav className="side-links" aria-label="Sections">
            <button
              className={`side-link ${section === 'boards' ? 'active' : ''}`}
              aria-current={section === 'boards' ? 'page' : undefined}
              onClick={() => go(board)}
            >
              <LayoutGrid size={18} />
              <span className="side-label">My boards</span>
              <span className="side-count">{workspace.boards.length}</span>
            </button>
            <button
              className={`side-link ${section === 'pages' ? 'active' : ''}`}
              aria-current={section === 'pages' ? 'page' : undefined}
              onClick={goPages}
            >
              <FileText size={18} />
              <span className="side-label">Pages</span>
              <span className="side-count">{workspace.pages?.length ?? 0}</span>
            </button>
            <button
              className={`side-link ${section === 'todos' ? 'active' : ''}`}
              aria-current={section === 'todos' ? 'page' : undefined}
              onClick={goTodos}
            >
              <ListChecks size={18} />
              <span className="side-label">To-do lists</span>
              <span className="side-count">{workspace.todos?.length ?? 0}</span>
            </button>
            <button className="side-link" onClick={() => openDialog({ kind: 'manage-labels' })}>
              <Tags size={18} />
              <span className="side-label">Labels</span>
              <span className="side-count">{workspace.labels?.length ?? 0}</span>
            </button>
          </nav>
          <div className="side-section">
            <span>QUICK ACTIONS</span>
          </div>
          <button className="side-link side-quick" onClick={freeWrite}>
            <PenLine size={18} />
            <span className="side-label">Free write</span>
          </button>
          <button
            className="side-link side-quick"
            onClick={openFocus}
            aria-expanded={focus.panelOpen}
          >
            <Timer size={18} />
            <span className="side-label">Focus timer</span>
            {focus.active && (
              <span className={`side-count side-timer ${focus.running ? '' : 'is-paused'}`}>
                {formatClock(focus.left)}
              </span>
            )}
          </button>
          {cloudEnabled && (
            <button
              className="side-link side-quick"
              onClick={() => {
                openDialog({ kind: 'telegram' });
                closeSidebarDrawer();
              }}
            >
              <Send size={18} />
              <span className="side-label">Telegram</span>
            </button>
          )}
          <div className="side-section">
            <span>YOUR BOARDS</span>
            <button
              aria-label="Create board"
              title="Create board"
              onClick={() => openDialog({ kind: 'create-board' })}
            >
              <Plus size={16} />
            </button>
          </div>
          <nav aria-label="Boards">
            {workspace.boards.map((b) => {
              const selected = section === 'boards' && b.id === board.id;
              return (
                <button
                  className={`board-nav ${selected ? 'selected' : ''}`}
                  aria-current={selected ? 'page' : undefined}
                  key={b.id}
                  title={b.title}
                  onClick={() => go(b)}
                >
                  <span className="board-dot" style={{ background: b.color }} />
                  <span className="board-nav-label">{b.title}</span>
                </button>
              );
            })}
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
        </div>
        <div className="sidebar-footer">
          <span className="profile-avatar">S</span>
          <div className="sidebar-text" title={user?.email ?? undefined}>
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
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              title="Sign out"
            >
              {signingOut ? 'Saving…' : 'Sign out'}
            </button>
          ) : (
            <span className="local-pill">Local</span>
          )}
        </div>
      </aside>
    </>
  );
}
