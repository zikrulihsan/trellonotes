import { BrowserRouter, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { UIProvider } from '@/context/UIProvider';
import { AuthProvider } from '@/context/AuthProvider';
import { WorkspaceSession } from './WorkspaceSession';
import { PublicReader } from '@/features/reader/PublicReader';
import { isPublicPath } from '@/lib/app-paths';
import { FocusProvider } from '@/features/focus/FocusProvider';

/** Published writing (/@handle/…) is public; everything else is the signed-in app. */
function AppOrReader({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  if (isPublicPath(pathname)) return <PublicReader />;
  return (
    <UIProvider>
      <FocusProvider>
        <WorkspaceSession>{children}</WorkspaceSession>
      </FocusProvider>
    </UIProvider>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppOrReader>{children}</AppOrReader>
      </AuthProvider>
    </BrowserRouter>
  );
}
