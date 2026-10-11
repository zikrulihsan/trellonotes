import { useEffect } from 'react';

/** The handwritten face of the landing page, loaded only where a public page or its theme samples show. */
export function useLandingFont() {
  useEffect(() => {
    const id = 'landing-font';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Kalam:wght@700&family=Patrick+Hand&family=JetBrains+Mono:wght@400&display=swap';
    document.head.appendChild(link);
  }, []);
}
