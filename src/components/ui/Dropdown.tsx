import { createPortal } from 'react-dom';
import type { PropsWithChildren } from 'react';
interface Props extends PropsWithChildren {
  id: string;
  open: boolean;
  position?: { top: number; left: number };
  className?: string;
}
export function Dropdown({ id, open, position, className = '', children }: Props) {
  if (!open) return null;
  const menu = (
    <div
      data-menu-id={id}
      className={`dropdown ${className}`}
      style={
        position
          ? { position: 'fixed', top: position.top, left: position.left, right: 'auto', width: 200 }
          : undefined
      }
    >
      {children}
    </div>
  );
  return position ? createPortal(menu, document.body) : menu;
}
