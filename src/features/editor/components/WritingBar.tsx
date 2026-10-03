import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Board, Note } from '@/features/workspace/types';
import { NoteOptions } from './NoteOptions';
export function WritingBar({
  note,
  board,
  onBack,
  saving,
  saveError,
  syncStatus,
  toolbar,
}: {
  note: Note;
  board: Board;
  onBack: () => void;
  saving: boolean;
  saveError: boolean;
  syncStatus: 'local' | 'loading' | 'syncing' | 'synced' | 'error';
  toolbar: ReactNode;
}) {
  const status = saveError
    ? syncStatus === 'error'
      ? 'Offline · saved here'
      : 'Not saved'
    : saving || syncStatus === 'loading' || syncStatus === 'syncing'
      ? 'Saving…'
      : 'Saved';
  return (
    <header className="writing-bar">
      <button className="back-board" onClick={onBack} title="Back to board">
        <ArrowLeft size={16} />
        <span>{board.title}</span>
      </button>
      {toolbar}
      <div className="writing-bar-end">
        <span role="status" className={`save-status ${saveError ? 'save-failed' : ''}`}>
          {status}
        </span>
        <NoteOptions note={note} board={board} />
      </div>
    </header>
  );
}
