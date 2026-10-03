import { ArrowLeft, Check, Maximize2, Minimize2 } from 'lucide-react';
import { useUI } from '@/hooks/useUI';
import type { Note } from '@/features/workspace/types';
import { NoteOptions } from './NoteOptions';
export function EditorControls({
  note,
  onBack,
  saving,
  saveError,
  syncStatus,
}: {
  note: Note;
  onBack: () => void;
  saving: boolean;
  saveError: boolean;
  syncStatus: 'local' | 'loading' | 'syncing' | 'synced' | 'error';
}) {
  const { focusMode, setFocusMode } = useUI();
  return (
    <div className="writing-controls">
      <button className="back-board" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to board
      </button>
      <div className="writing-controls-right">
        <span role="status" className={`save-status ${saveError ? 'save-failed' : ''}`}>
          {saveError ? (
            syncStatus === 'error' ? (
              'Cloud sync paused · saved on this device'
            ) : (
              'Changes not saved'
            )
          ) : saving ? (
            'Saving…'
          ) : syncStatus === 'loading' || syncStatus === 'syncing' ? (
            'Syncing…'
          ) : (
            <>
              <Check size={14} />
              {syncStatus === 'synced' ? 'Synced with SweGrowth' : 'Saved on this device'}
            </>
          )}
        </span>
        <button
          className="icon-button focus-button"
          aria-label={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
          title={focusMode ? 'Exit focus mode' : 'Focus mode'}
          onClick={() => setFocusMode(!focusMode)}
        >
          {focusMode ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
        <NoteOptions note={note} />
      </div>
    </div>
  );
}
