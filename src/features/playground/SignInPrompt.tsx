import { Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

/**
 * Shown in the playground when a visitor tries an AI feature: it works on their own notes
 * or resume, so it needs an account.
 */
export function SignInPrompt({ feature, onClose }: { feature: string; onClose: () => void }) {
  return (
    <Modal title="Sign in to use AI" onClose={onClose}>
      <p>
        <Sparkles size={15} /> {feature} runs on your own writing, so it needs an account. Sign in
        and it works on your notes; nothing is published until you choose to.
      </p>
      <div className="modal-actions">
        <Button onClick={onClose}>Not now</Button>
        <a className="button primary" href="/?start">
          Sign in
        </a>
      </div>
    </Modal>
  );
}
