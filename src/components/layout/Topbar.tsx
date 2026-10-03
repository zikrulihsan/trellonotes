import { ChevronRight, Feather, LayoutGrid, Menu } from 'lucide-react';
import { useUI } from '@/hooks/useUI';
import type { Board } from '@/features/workspace/types';
export function Topbar({ board, writing }: { board: Board; writing: boolean }) {
  const { setSidebarOpen } = useUI();
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button
          className="mobile-menu icon-button"
          onClick={() => setSidebarOpen((value) => !value)}
          aria-label="Open navigation"
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
        folio<span className="topbar-local">Saved on this device</span>
      </span>
    </header>
  );
}
