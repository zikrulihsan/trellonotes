import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Copy, ExternalLink, EyeOff, MoreHorizontal, Trash2 } from 'lucide-react';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { useAuth } from '@/context/auth-context';
import { useDropdown } from '@/hooks/useDropdown';
import { Dropdown } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase/client';
import { editedLabel } from '@/lib/note-metadata';
import { publicWritingUrl, publishPage, unpublishPage } from '@/lib/supabase/published-pages';
import type { Page } from '@/features/workspace/types';
import { WritingSurface } from '@/features/editor/WritingSurface';
import { publishState } from './publish-state';

export default function PageEditorPage() {
  const { pageId } = useParams(),
    { workspace } = useWorkspace(),
    { updatePage } = useWorkspaceActions(),
    navigate = useNavigate();
  const page = workspace.pages?.find((page) => page.id === pageId);
  if (!page)
    return (
      <div className="editor-placeholder">
        <h1>Page not found</h1>
        <p>This page may have been deleted.</p>
        <Button onClick={() => navigate('/pages')}>Open my pages</Button>
      </div>
    );
  return (
    <WritingSurface
      key={page.id}
      doc={page}
      onChange={(patch) => updatePage(page.id, patch)}
      backLabel="Pages"
      onBack={() => navigate('/pages')}
      actions={<PublishButton page={page} />}
      menu={<PageOptions page={page} />}
    />
  );
}

function authorName(user: ReturnType<typeof useAuth>['user']): string | null {
  // Shown publicly as the byline, so never fall back to the email address.
  const name: unknown = user?.user_metadata.full_name ?? user?.user_metadata.name;
  return typeof name === 'string' && name.trim() ? name.trim() : null;
}

function PublishButton({ page }: { page: Page }) {
  const { setPagePublished } = useWorkspaceActions(),
    { user } = useAuth();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const state = publishState(page);
  async function publish() {
    if (!supabase || !user) return;
    setBusy(true);
    setError('');
    try {
      setPagePublished(page.id, await publishPage(supabase, page, authorName(user)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not publish this page.');
    } finally {
      setBusy(false);
    }
  }
  if (!supabase || !user)
    return (
      <span className="publish-hint" title="Sign in with Google to publish pages">
        Sign in to publish
      </span>
    );
  return (
    <>
      <button
        className={`publish-button ${state === 'published' ? 'is-live' : ''}`}
        onClick={() => void publish()}
        disabled={busy || state === 'published'}
        title={
          state === 'published'
            ? 'Your latest changes are live'
            : state === 'changed'
              ? 'Publish your latest changes'
              : 'Publish to your public writing page'
        }
      >
        {state === 'published' && <Check size={14} />}
        {busy
          ? 'Publishing…'
          : state === 'draft'
            ? 'Publish'
            : state === 'changed'
              ? 'Update'
              : 'Published'}
      </button>
      {error && (
        <p className="publish-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function PageOptions({ page }: { page: Page }) {
  const { setPagePublished, deletePage } = useWorkspaceActions(),
    { user } = useAuth(),
    navigate = useNavigate(),
    menu = useDropdown();
  const [copied, setCopied] = useState(false),
    [confirming, setConfirming] = useState(false),
    [error, setError] = useState('');
  const url = user && page.published ? publicWritingUrl(user.id, page.published.slug) : null;
  async function unpublish() {
    if (!supabase) return;
    setError('');
    try {
      await unpublishPage(supabase, page.id);
      setPagePublished(page.id, undefined);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not unpublish this page.');
      return false;
    }
  }
  async function remove() {
    // Take the public copy down first, so no live link is left without its page.
    if (page.published && !(await unpublish())) return;
    deletePage(page.id);
    navigate('/pages');
  }
  return (
    <div className="menu-anchor" data-menu-id={menu.id}>
      <button
        className="icon-button"
        aria-label="Page options"
        aria-expanded={menu.open}
        onClick={() => menu.toggle()}
      >
        <MoreHorizontal size={19} />
      </button>
      <Dropdown id={menu.id} open={menu.open} className="note-options">
        <p className="note-options-meta">
          {editedLabel(page.updatedAt)}
          {page.published &&
            ` · Published ${new Date(page.published.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
        </p>
        {url && (
          <>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(url).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Link copied' : 'Copy public link'}
            </button>
            <a className="dropdown-link" href={url} target="_blank" rel="noreferrer">
              <ExternalLink size={15} />
              Open public page
            </a>
            <button
              onClick={() => {
                void unpublish();
                menu.close();
              }}
            >
              <EyeOff size={15} />
              Unpublish
            </button>
          </>
        )}
        <button
          className="danger"
          onClick={() => {
            setConfirming(true);
            menu.close();
          }}
        >
          <Trash2 size={15} />
          Delete page
        </button>
      </Dropdown>
      {error && (
        <p className="publish-error" role="alert">
          {error}
        </p>
      )}
      {confirming && (
        <Modal title="Delete page?" onClose={() => setConfirming(false)}>
          <p>
            “{page.title || 'Untitled'}” will be permanently deleted
            {page.published ? ' and removed from your public writing page' : ''}.
          </p>
          <div className="modal-actions">
            <Button onClick={() => setConfirming(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void remove()}>
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
