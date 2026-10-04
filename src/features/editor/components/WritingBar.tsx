import type { PropsWithChildren, ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { FocusPill } from '@/features/focus/FocusPill';
export function WritingBar({
  backLabel,
  onBack,
  saving,
  saveError,
  syncStatus,
  toolbar,
  children,
}: PropsWithChildren<{
  backLabel: string;
  onBack: () => void;
  saving: boolean;
  saveError: boolean;
  syncStatus: 'local' | 'loading' | 'syncing' | 'synced' | 'error';
  toolbar: ReactNode;
}>) {
  const status = saveError
    ? syncStatus === 'error'
      ? 'Offline · saved here'
      : 'Not saved'
    : saving || syncStatus === 'loading' || syncStatus === 'syncing'
      ? 'Saving…'
      : 'Saved';
  return (
    <header className="writing-bar">
      <button className="back-board" onClick={onBack} title={`Back to ${backLabel}`}>
        <ArrowLeft size={16} />
        <span>{backLabel}</span>
      </button>
      {toolbar}
      <div className="writing-bar-end">
        <FocusPill />
        <span role="status" className={`save-status ${saveError ? 'save-failed' : ''}`}>
          {status}
        </span>
        {children}
      </div>
    </header>
  );
}
