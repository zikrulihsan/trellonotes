import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { LABEL_COLORS } from '@/lib/note-metadata';
import type { Label } from './types';

export function LabelManager({ onClose }: { onClose: () => void }) {
  const { workspace } = useWorkspace(),
    { createLabel } = useWorkspaceActions();
  const labels = workspace.labels ?? [];
  const [name, setName] = useState('');
  // Suggest the first color no label uses yet.
  const nextColor =
    LABEL_COLORS.find((color) => !labels.some((label) => label.color === color.id)) ??
    LABEL_COLORS[labels.length % LABEL_COLORS.length];
  function add(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    createLabel(name, nextColor.id);
    setName('');
  }
  return (
    <Modal title="Labels" onClose={onClose}>
      {labels.length ? (
        <ul className="label-list">
          {labels.map((label) => (
            <LabelRow
              key={label.id}
              label={label}
              uses={workspace.cards.filter((note) => note.labelId === label.id).length}
            />
          ))}
        </ul>
      ) : (
        <p>No labels yet. Labels help you tell initiatives apart at a glance.</p>
      )}
      <form className="label-add" onSubmit={add}>
        <span className="label-dot" style={{ background: nextColor.value }} />
        <input
          autoFocus
          aria-label="New label name"
          placeholder="New label…"
          maxLength={40}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button type="submit" variant="primary" disabled={!name.trim()}>
          Add
        </Button>
      </form>
    </Modal>
  );
}

function LabelRow({ label, uses }: { label: Label; uses: number }) {
  const { updateLabel, deleteLabel } = useWorkspaceActions();
  const [name, setName] = useState(label.name);
  const commit = () => {
    if (name.trim() && name.trim() !== label.name) updateLabel(label.id, { name });
    else setName(label.name);
  };
  return (
    <li className="label-row">
      <input
        aria-label={`Name of label ${label.name}`}
        maxLength={40}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
      <div className="label-swatches" role="radiogroup" aria-label={`Color of ${label.name}`}>
        {LABEL_COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            role="radio"
            aria-checked={label.color === color.id}
            aria-label={color.name}
            title={color.name}
            className="label-swatch"
            style={{ background: color.value }}
            onClick={() => updateLabel(label.id, { color: color.id })}
          />
        ))}
      </div>
      <button
        type="button"
        className="icon-button"
        aria-label={`Delete label ${label.name}`}
        title={
          uses ? `Delete (removes it from ${uses} initiative${uses === 1 ? '' : 's'})` : 'Delete'
        }
        onClick={() => deleteLabel(label.id)}
      >
        <Trash2 size={15} />
      </button>
    </li>
  );
}
