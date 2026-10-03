import { useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { isAllowedLink } from '@/lib/links';
export function LinkDialog({
  initialUrl,
  onClose,
  onApply,
}: {
  initialUrl: string;
  onClose: () => void;
  onApply: (url: string) => void;
}) {
  const [value, setValue] = useState(initialUrl),
    [error, setError] = useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    const url = value.trim();
    if (url && !isAllowedLink(url)) {
      setError('Use a link starting with https://, http://, or mailto:.');
      return;
    }
    onApply(url);
    onClose();
  }
  return (
    <Modal title="Add a link" onClose={onClose}>
      <form onSubmit={submit}>
        <label htmlFor="note-link">Link URL</label>
        <input
          id="note-link"
          autoFocus
          placeholder="https://example.com"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        {error && (
          <p className="danger" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button
            onClick={() => {
              onApply('');
              onClose();
            }}
          >
            Remove link
          </Button>
          <Button type="submit" variant="primary">
            Apply link
          </Button>
        </div>
      </form>
    </Modal>
  );
}
