import { HashRouter, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { WorkspaceProvider } from '@/context/WorkspaceProvider';
import { UIProvider } from '@/context/UIProvider';
function RouteUIProvider({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  return <UIProvider key={pathname}>{children}</UIProvider>;
}
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <HashRouter>
      <WorkspaceProvider>
        <RouteUIProvider>{children}</RouteUIProvider>
      </WorkspaceProvider>
    </HashRouter>
  );
}
