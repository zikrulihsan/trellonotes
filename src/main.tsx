import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { AppProviders } from './app/AppProviders';
import './styles/index.css';

// Links from before clean URLs carried the route in the hash, e.g. /#/board/x.
// Supabase sign-in callbacks also use the hash (#access_token=…) and are left alone.
if (window.location.hash.startsWith('#/'))
  window.history.replaceState(null, '', window.location.hash.slice(1));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
