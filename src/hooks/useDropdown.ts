import { useCallback, useEffect, useId, useState, type MouseEvent } from 'react';
export function useDropdown() {
  const id = useId(),
    [open, setOpen] = useState(false),
    [position, setPosition] = useState({ top: 0, left: 0 });
  const close = useCallback(() => setOpen(false), []);
  const toggle = (event?: MouseEvent<HTMLButtonElement>) => {
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 172 > window.innerHeight ? Math.max(8, rect.top - 168) : rect.bottom + 5,
        left: Math.max(8, Math.min(rect.right - 200, window.innerWidth - 208)),
      });
    }
    setOpen((value) => !value);
  };
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        !(event.target instanceof Element) ||
        event.target.closest('[data-menu-id]')?.getAttribute('data-menu-id') !== id
      )
        close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const scroll = (event: Event) => {
      if (!(event.target instanceof Element && event.target.closest('.dropdown'))) close();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    document.addEventListener('scroll', scroll, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('scroll', scroll, true);
    };
  }, [open, id, close]);
  return { id, open, position, toggle, close };
}
