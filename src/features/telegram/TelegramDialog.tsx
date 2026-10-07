import { useCallback, useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/auth-context';
import { useWorkspace } from '@/hooks/useWorkspace';
import { supabase } from '@/lib/supabase/client';
import {
  createTelegramCode,
  getTelegramLink,
  setTelegramTarget,
  unlinkTelegram,
  type TelegramLink,
} from '@/lib/supabase/telegram-links';
import { resolveTarget, telegramStartLink } from '@/lib/telegram/bot';

const BOT_USERNAME: string | undefined = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

/** Connects a Telegram chat, so messages sent to the bot become notes on a board. */
export function TelegramDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth(),
    { workspace } = useWorkspace();
  const [link, setLink] = useState<TelegramLink | null>(null),
    [loading, setLoading] = useState(Boolean(supabase && user)),
    [busy, setBusy] = useState(false),
    [code, setCode] = useState<string | null>(null),
    [error, setError] = useState<string | null>(null);
  const userId = user?.id;

  const refresh = useCallback(() => {
    if (!supabase || !userId) return Promise.resolve();
    return getTelegramLink(supabase, userId).then(
      (current) => {
        setLink(current);
        setError(null);
        setLoading(false);
      },
      (reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Could not load the Telegram link.');
        setLoading(false);
      },
    );
  }, [userId]);

  useEffect(() => {
    void refresh();
    // Coming back from Telegram after tapping the link shows the new connection.
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const connect = () =>
    run(async () => {
      if (supabase) setCode(await createTelegramCode(supabase));
    });
  const disconnect = () =>
    run(async () => {
      if (!supabase) return;
      await unlinkTelegram(supabase);
      setCode(null);
      await refresh();
    });
  const target = link?.linked ? resolveTarget(workspace, link) : null;
  const chooseList = (value: string) =>
    run(async () => {
      const [boardId, listId] = value.split('/');
      if (!supabase || !userId) return;
      await setTelegramTarget(supabase, userId, boardId, listId);
      setLink((current) => current && { ...current, boardId, listId });
    });

  let body;
  if (!supabase || !userId) body = <p>Sign in to connect Telegram.</p>;
  else if (loading) body = <p>Loading…</p>;
  else if (link?.linked)
    body = (
      <>
        <p>
          Connected. Every message you send to the bot becomes a note: the first line is its title.
        </p>
        <label className="telegram-target">
          New notes go to
          <select
            value={target ? `${target.board.id}/${target.list.id}` : ''}
            disabled={busy}
            onChange={(event) => void chooseList(event.target.value)}
          >
            {workspace.boards.map((board) => (
              <optgroup key={board.id} label={board.title}>
                {board.lists.map((list) => (
                  <option key={list.id} value={`${board.id}/${list.id}`}>
                    {board.title} › {list.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="modal-actions">
          <Button variant="destructive" disabled={busy} onClick={() => void disconnect()}>
            Disconnect
          </Button>
        </div>
      </>
    );
  else if (code)
    body = (
      <>
        {BOT_USERNAME ? (
          <p>
            <a href={telegramStartLink(BOT_USERNAME, code)} target="_blank" rel="noreferrer">
              Open @{BOT_USERNAME.replace(/^@/, '')} in Telegram
            </a>{' '}
            and tap <b>Start</b>. The link works for 15 minutes.
          </p>
        ) : (
          <p>
            Send this to your bot in Telegram within 15 minutes: <code>/start {code}</code>
          </p>
        )}
        <div className="modal-actions">
          <Button disabled={busy} onClick={() => void refresh()}>
            I&apos;ve connected it
          </Button>
        </div>
      </>
    );
  else
    body = (
      <>
        <p>Add notes from Telegram: send the bot a message and it lands on your board.</p>
        <div className="modal-actions">
          <Button variant="primary" disabled={busy} onClick={() => void connect()}>
            Connect Telegram
          </Button>
        </div>
      </>
    );

  return (
    <Modal title="Telegram" onClose={onClose} className="telegram-dialog">
      {body}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
