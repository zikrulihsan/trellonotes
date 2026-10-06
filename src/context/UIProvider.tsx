import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useLocation } from 'react-router-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { UIContext, type WorkspaceDialog } from './ui-context';
const NARROW_SCREEN = '(max-width:760px)';
const COLLAPSED_KEY = 'folio.sidebar-collapsed';
function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}
export function UIProvider({ children }: PropsWithChildren) {
  const narrowScreen = useMediaQuery(NARROW_SCREEN),
    // The phone drawer and the docked sidebar keep separate state, so opening the
    // drawer on a phone never changes how the sidebar sits on a wider screen.
    [drawerOpen, setDrawerOpen] = useState(false),
    [collapsed, setCollapsed] = useState(readCollapsed),
    [dialog, setDialog] = useState<WorkspaceDialog | null>(null);
  // Moving to another screen closes dialogs and the phone drawer, and so does
  // widening the window past the phone layout. These stay state resets: remounting
  // the provider would rebuild the whole app on every click.
  const { pathname } = useLocation();
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setDialog(null);
    setDrawerOpen(false);
  }
  const [shownNarrow, setShownNarrow] = useState(narrowScreen);
  if (shownNarrow !== narrowScreen) {
    setShownNarrow(narrowScreen);
    setDrawerOpen(false);
  }
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, String(collapsed));
    } catch {
      // Private windows can refuse storage; the sidebar still works for this visit.
    }
  }, [collapsed]);
  const toggleSidebar = useCallback(() => {
      if (narrowScreen) setDrawerOpen((open) => !open);
      else setCollapsed((wasCollapsed) => !wasCollapsed);
    }, [narrowScreen]),
    showSidebar = useCallback(() => {
      if (narrowScreen) setDrawerOpen(true);
      else setCollapsed(false);
    }, [narrowScreen]),
    hideSidebar = useCallback(() => {
      if (narrowScreen) setDrawerOpen(false);
      else setCollapsed(true);
    }, [narrowScreen]),
    closeSidebarDrawer = useCallback(() => setDrawerOpen(false), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDialog(null);
        setDrawerOpen(false);
      } else if (e.key === '\\' && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebar]);
  const openDialog = useCallback((dialog: WorkspaceDialog) => {
      setDrawerOpen(false);
      setDialog(dialog);
    }, []),
    closeDialog = useCallback(() => setDialog(null), []);
  const sidebarVisible = narrowScreen ? drawerOpen : !collapsed;
  const value = useMemo(
    () => ({
      narrowScreen,
      sidebarVisible,
      toggleSidebar,
      showSidebar,
      hideSidebar,
      closeSidebarDrawer,
      dialog,
      openDialog,
      closeDialog,
    }),
    [
      narrowScreen,
      sidebarVisible,
      toggleSidebar,
      showSidebar,
      hideSidebar,
      closeSidebarDrawer,
      dialog,
      openDialog,
      closeDialog,
    ],
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
