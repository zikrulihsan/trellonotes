import { BrowserRouter, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { UIProvider } from '@/context/UIProvider';
import { AuthProvider } from '@/context/AuthProvider';
import { WorkspaceSession } from './WorkspaceSession';
import { LandingPreview, PublicReader } from '@/features/reader/PublicReader';
import { isLegalPath, isPublicPath } from '@/lib/app-paths';
import { FocusProvider } from '@/features/focus/FocusProvider';
import { LegalPage } from '@/features/legal/LegalPage';

/** Published writing (/@handle/…) and the terms and privacy pages are public; everything else is the signed-in app. */
function AppOrReader({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  if (isPublicPath(pathname)) return <PublicReader />;
  // The frame inside the Public page screen; it shows only what that screen sends it.
  if (pathname === '/landing-preview') return <LandingPreview />;
  if (isLegalPath(pathname)) return <LegalPage pathname={pathname} />;
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
