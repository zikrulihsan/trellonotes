import {
  ChevronRight,
  Feather,
  FileText,
  LayoutGrid,
  ListChecks,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useUI } from '@/hooks/useUI';
import type { Board } from '@/features/workspace/types';
import { useWorkspace } from '@/hooks/useWorkspace';
import { FocusPill } from '@/features/focus/FocusPill';
/** The breadcrumb names the board on board screens, otherwise the section. */
export function Topbar({
  board,
  section,
}: {
  board: Board;
  section: 'boards' | 'pages' | 'todos';
}) {
  const { sidebarVisible, narrowScreen, toggleSidebar, showSidebar } = useUI();
  // One toggle for every screen size: it docks or hides the sidebar on wide
  // screens and opens or closes the drawer on phones.
  const toggleLabel = narrowScreen
    ? sidebarVisible
      ? 'Close navigation'
      : 'Open navigation'
    : sidebarVisible
      ? 'Hide sidebar'
      : 'Show sidebar';
  const { cloudEnabled, syncStatus } = useWorkspace();
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button
          id="sidebar-toggle"
          className="sidebar-toggle icon-button"
          onClick={toggleSidebar}
          aria-label={toggleLabel}
          aria-expanded={sidebarVisible}
          aria-controls="app-sidebar"
          title={narrowScreen ? toggleLabel : `${toggleLabel} (Ctrl+\\)`}
        >
          {narrowScreen ? (
            <Menu size={20} />
          ) : sidebarVisible ? (
            <PanelLeftClose size={18} />
          ) : (
            <PanelLeftOpen size={18} />
          )}
        </button>
        {section === 'boards' ? (
          <>
            <LayoutGrid size={16} />
            <button onClick={showSidebar}>My boards</button>
            <ChevronRight size={14} />
            <span>{board.title}</span>
          </>
        ) : section === 'pages' ? (
          <>
            <FileText size={16} />
            <span>Pages</span>
          </>
        ) : (
          <>
            <ListChecks size={16} />
            <span>To-do lists</span>
          </>
        )}
      </div>
      <div className="topbar-end">
        <FocusPill />
        <span className="topbar-hint">
          <span className="small-logo">
            <Feather size={14} />
          </span>
          folio
          <span className="topbar-local">
            {cloudEnabled
              ? syncStatus === 'error'
                ? 'Sync paused'
                : 'Synced with SweGrowth'
              : 'Saved on this device'}
          </span>
        </span>
      </div>
    </header>
  );
}
