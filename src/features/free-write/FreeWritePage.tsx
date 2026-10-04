import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eraser, FilePlus2, MoreHorizontal } from 'lucide-react';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { useDropdown } from '@/hooks/useDropdown';
import { Dropdown } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { WritingSurface } from '@/features/editor/WritingSurface';
import { editedLabel } from '@/lib/note-metadata';
import { pagePath } from '@/lib/app-paths';
import { plainText } from '@/lib/text';
import { shortDay } from '@/features/pages/templates';

/** One blank sheet, always there: no title, no board, no list. Kept until cleared. */
export default function FreeWritePage() {
  const { workspace } = useWorkspace(),
    { updateScratch } = useWorkspaceActions(),
    navigate = useNavigate();
  const scratch = workspace.scratch ?? { content: '', updatedAt: 0 };
  // Go back to wherever free writing was opened from; a direct visit goes home.
  const back = () => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/'));
  return (
    <WritingSurface
      doc={{ id: 'free-writing', title: '', ...scratch }}
      onChange={(patch) => patch.content !== undefined && updateScratch(patch.content)}
      backLabel="Back"
      onBack={back}
      untitled
      placeholder="Just write. Nothing here needs a title or a place yet…"
      menu={<FreeWriteOptions updatedAt={scratch.updatedAt} empty={!plainText(scratch.content)} />}
    />
  );
}

function FreeWriteOptions({ updatedAt, empty }: { updatedAt: number; empty: boolean }) {
  const { keepScratchAsPage, updateScratch } = useWorkspaceActions(),
    navigate = useNavigate(),
    menu = useDropdown(),
    [confirming, setConfirming] = useState(false);
  return (
    <div className="menu-anchor" data-menu-id={menu.id}>
      <button
        className="icon-button"
        aria-label="Free writing options"
        aria-expanded={menu.open}
        onClick={() => menu.toggle()}
      >
        <MoreHorizontal size={19} />
      </button>
      <Dropdown id={menu.id} open={menu.open} className="note-options">
        <p className="note-options-meta">
          {updatedAt ? editedLabel(updatedAt) : 'Free writing stays here until you clear it'}
        </p>
        <button
          disabled={empty}
          onClick={() => {
            const id = keepScratchAsPage(`Free writing · ${shortDay()}`);
            navigate(pagePath({ id, title: '' }), { replace: true });
          }}
        >
          <FilePlus2 size={15} />
          Keep as a page
        </button>
        <button
          className="danger"
          disabled={empty}
          onClick={() => {
            setConfirming(true);
            menu.close();
          }}
        >
          <Eraser size={15} />
          Clear the sheet
        </button>
      </Dropdown>
      {confirming && (
        <Modal title="Clear free writing?" onClose={() => setConfirming(false)}>
          <p>Everything on this sheet will be erased. Keep it as a page first to save it.</p>
          <div className="modal-actions">
            <Button onClick={() => setConfirming(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                updateScratch('');
                setConfirming(false);
              }}
            >
              Clear
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
