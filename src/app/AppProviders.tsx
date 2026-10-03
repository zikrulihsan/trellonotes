import { HashRouter, Route, Routes } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { UIProvider } from '@/context/UIProvider';
import { AuthProvider } from '@/context/AuthProvider';
import { WorkspaceSession } from './WorkspaceSession';
import { PublicReader } from '@/features/reader/PublicReader';
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
              <UIProvider>
                <WorkspaceSession>{children}</WorkspaceSession>
              </UIProvider>
            }
          />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
