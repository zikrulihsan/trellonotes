import {
  ChevronRight,
  Feather,
  LayoutGrid,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useUI } from '@/hooks/useUI';
import type { Board } from '@/features/workspace/types';
import { useWorkspace } from '@/hooks/useWorkspace';
export function Topbar({ board, writing }: { board: Board; writing: boolean }) {
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = useUI();
  const { cloudEnabled, syncStatus } = useWorkspace();
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button
          className="sidebar-toggle icon-button"
          onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!sidebarCollapsed}
          aria-controls="app-sidebar"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        <button
          className="mobile-menu icon-button"
          onClick={() => setSidebarOpen((value) => !value)}
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
        >
          <Menu size={20} />
        </button>
        <LayoutGrid size={16} />
        <button onClick={() => setSidebarOpen(true)}>My boards</button>
        <ChevronRight size={14} />
        <span>{board.title}</span>
        {writing && (
          <>
            <ChevronRight size={14} />
            <span className="crumb-card">Writing</span>
          </>
        )}
      </div>
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
    </header>
  );
}
