import { HashRouter, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { UIProvider } from '@/context/UIProvider';
import { AuthProvider } from '@/context/AuthProvider';
import { WorkspaceSession } from './WorkspaceSession';
function RouteUIProvider({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  return <UIProvider key={pathname}>{children}</UIProvider>;
}
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <HashRouter>
      <AuthProvider>
        <RouteUIProvider>
          <WorkspaceSession>{children}</WorkspaceSession>
        </RouteUIProvider>
      </AuthProvider>
    </HashRouter>
  );
}
