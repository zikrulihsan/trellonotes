import { useContext } from 'react';
import { UIContext } from '@/context/ui-context';
export function useUI() {
  const ui = useContext(UIContext);
  if (!ui) throw new Error('useUI must be used within UIProvider');
  return ui;
}
