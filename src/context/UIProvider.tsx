import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { UIContext, type WorkspaceDialog } from './ui-context';
export function UIProvider({ children }: PropsWithChildren) {
  const [sidebarOpen, setSidebarOpen] = useState(false),
    [focusMode, setFocusMode] = useState(false),
    [dialog, setDialog] = useState<WorkspaceDialog | null>(null);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDialog(null);
        setSidebarOpen(false);
        setFocusMode(false);
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
      focusMode,
      setFocusMode,
      dialog,
      openDialog,
      closeDialog,
    }),
    [sidebarOpen, focusMode, dialog, openDialog, closeDialog],
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
