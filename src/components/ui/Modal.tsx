import { useId, type PropsWithChildren } from 'react';
import { X } from 'lucide-react';
import { useDialogFocus } from '@/hooks/useDialogFocus';
interface Props extends PropsWithChildren {
  title: string;
  onClose: () => void;
}
export function Modal({ title, onClose, children }: Props) {
  const titleId = useId();
  useDialogFocus(true);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
        <h2 id={titleId}>{title}</h2>
        {children}
      </section>
    </div>
  );
}
