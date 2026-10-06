import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { setScreenWidth } from './match-media';
afterEach(() => {
  cleanup();
  localStorage.clear();
  setScreenWidth(1280);
});
