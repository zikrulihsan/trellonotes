import { BrowserRouter, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { UIProvider } from '@/context/UIProvider';
import { AuthProvider } from '@/context/AuthProvider';
import { WorkspaceSession } from './WorkspaceSession';
import { LandingPreview, PublicReader } from '@/features/reader/PublicReader';
import { isPublicPath } from '@/lib/app-paths';
import { classifyHost } from '@/lib/site-host';
import { FocusProvider } from '@/features/focus/FocusProvider';

/** A writer's own domain or subdomain shows only their public pages, never the app. */
const WRITER_SITE = classifyHost(window.location.hostname).kind !== 'app';

/** Published writing (/@handle/…) is public; everything else is the signed-in app. */
function AppOrReader({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  if (WRITER_SITE || isPublicPath(pathname)) return <PublicReader />;
  // The frame inside the Public page screen; it shows only what that screen sends it.
  if (pathname === '/landing-preview') return <LandingPreview />;
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
