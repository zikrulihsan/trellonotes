import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { UIProvider } from '@/context/UIProvider';
import { AuthProvider } from '@/context/AuthProvider';
import { WorkspaceSession } from './WorkspaceSession';
import { PublicReader } from '@/features/reader/PublicReader';
function RouteUIProvider({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  return <UIProvider key={pathname}>{children}</UIProvider>;
}
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          {/* Published writing is public: readers need no account. */}
          <Route path="read/*" element={<PublicReader />} />
          <Route
            path="*"
            element={
              <RouteUIProvider>
                <WorkspaceSession>{children}</WorkspaceSession>
              </RouteUIProvider>
            }
          />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
