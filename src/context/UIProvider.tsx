import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useLocation } from 'react-router-dom';
import { UIContext, type WorkspaceDialog } from './ui-context';
export function UIProvider({ children }: PropsWithChildren) {
  const [sidebarOpen, setSidebarOpen] = useState(false),
    [sidebarCollapsed, setSidebarCollapsed] = useState(
      () => localStorage.getItem('folio.sidebar-collapsed') === 'true',
    ),
    [dialog, setDialog] = useState<WorkspaceDialog | null>(null);
  // Moving to another screen closes dialogs and the mobile sidebar. This stays a
  // state reset: remounting the provider would rebuild the whole app on every click.
  const { pathname } = useLocation();
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setDialog(null);
    setSidebarOpen(false);
  }
  useEffect(() => {
    localStorage.setItem('folio.sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDialog(null);
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);
  const openDialog = useCallback((dialog: WorkspaceDialog) => {
      setSidebarOpen(false);
      setDialog(dialog);
    }, []),
    closeDialog = useCallback(() => setDialog(null), []);
  const value = useMemo(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      sidebarCollapsed,
      setSidebarCollapsed,
      dialog,
      openDialog,
      closeDialog,
    }),
    [sidebarOpen, sidebarCollapsed, dialog, openDialog, closeDialog],
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
