import { useState, type FormEvent } from 'react';
import { ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GEMINI_KEY_URL, loadGeminiKey, saveGeminiKey } from '@/lib/gemini-key';

/**
 * Where a writer adds their own Gemini API key, for AI past the free daily requests. The
 * key stays in this browser.
 */
export function GeminiKeyDialog({ onClose }: { onClose: () => void }) {
  const [saved] = useState(loadGeminiKey);
  const [key, setKey] = useState(saved);
  const [error, setError] = useState('');
  function store(value: string) {
    if (!saveGeminiKey(value)) {
      setError('This browser would not keep the key. Check that site storage is allowed.');
      return;
    }
    onClose();
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    store(key);
  }
  return (
    <Modal title="Your Gemini API key" onClose={onClose} className="gemini-key">
      <form onSubmit={submit}>
        <p>
          AI in Notis comes with free requests every day. When they run out, add your own Gemini API
          key to keep going. Google gives every key a free tier.
        </p>
        <p>
          <a href={GEMINI_KEY_URL} target="_blank" rel="noreferrer">
            Get a key from Google AI Studio <ExternalLink size={14} />
          </a>
        </p>
        <label htmlFor="gemini-key">API key</label>
        <input
          id="gemini-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="AIza…"
          value={key}
          onChange={(event) => setKey(event.target.value)}
        />
        <small className="gemini-key-note">
          Saved only in this browser. It goes along with your AI requests and is never stored on our
          server.
        </small>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          {saved && (
            <Button className="gemini-key-remove" onClick={() => store('')}>
              Remove key
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!key.trim() || key.trim() === saved}>
            Save key
          </Button>
        </div>
      </form>
    </Modal>
  );
}
