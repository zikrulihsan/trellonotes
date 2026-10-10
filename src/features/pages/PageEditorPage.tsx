import { useEffect, useState } from 'react';
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
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  publishPage,
  setPageUnlisted,
  unpublishPage,
  writerUrl,
} from '@/lib/supabase/published-pages';
import { findByRef, pagePath } from '@/lib/app-paths';
import { useProfile } from './useProfile';
import type { Page } from '@/features/workspace/types';
import { WritingSurface } from '@/features/editor/WritingSurface';
import { publishState, visibility, VISIBILITY_LABELS, type Visibility } from './publish-state';

export default function PageEditorPage() {
  const { pageRef } = useParams(),
    { workspace } = useWorkspace(),
    { updatePage } = useWorkspaceActions(),
    navigate = useNavigate();
  const page = findByRef(workspace.pages ?? [], pageRef);
  const canonical = page && pagePath(page);
  useEffect(() => {
    // Keep the address bar on the short, current-title link.
    if (canonical && canonical !== `/page/${pageRef}`) navigate(canonical, { replace: true });
  }, [canonical, pageRef, navigate]);
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

const VISIBILITY_HINTS: Record<Visibility, string> = {
  draft: 'Only you can see this page',
  published: 'Anyone can find this page on your public writing page',
  unlisted: 'Anyone with the link can read this page, but it is not on your public list',
};

function PublishButton({ page }: { page: Page }) {
  const { setPagePublished } = useWorkspaceActions(),
    { user } = useAuth(),
    { ensure, displayName } = useProfile();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const state = publishState(page),
    shown = visibility(page);
  async function run(task: (client: SupabaseClient) => Promise<void>, failure: string) {
    if (!supabase || !user) return;
    setBusy(true);
    setError('');
    try {
      await task(supabase);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : failure);
    } finally {
      setBusy(false);
    }
  }
  const publish = (unlisted?: boolean) =>
    run(async (client) => {
      // The first publish also picks the writer's public address (/@handle).
      await ensure();
      setPagePublished(page.id, await publishPage(client, page, displayName, unlisted));
    }, 'Could not publish this page.');
  function choose(next: Visibility) {
    if (next === shown) return;
    if (next === 'draft')
      return run(async (client) => {
        await unpublishPage(client, page.id);
        setPagePublished(page.id, undefined);
      }, 'Could not unpublish this page.');
    const unlisted = next === 'unlisted';
    if (!page.published) return publish(unlisted);
    const { slug, at } = page.published;
    return run(async (client) => {
      await setPageUnlisted(client, page.id, unlisted);
      setPagePublished(page.id, { slug, at, ...(unlisted && { unlisted }) });
    }, 'Could not change who can see this page.');
  }
  if (!supabase || !user)
    return (
      <span className="publish-hint" title="Sign in with Google to publish pages">
        Sign in to publish
      </span>
    );
  return (
    <>
      <select
        className="publish-visibility"
        aria-label="Visibility"
        title={VISIBILITY_HINTS[shown]}
        value={shown}
        disabled={busy}
        onChange={(event) => void choose(event.target.value as Visibility)}
      >
        {(Object.keys(VISIBILITY_LABELS) as Visibility[]).map((option) => (
          <option key={option} value={option}>
            {VISIBILITY_LABELS[option]}
          </option>
        ))}
      </select>
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
          ? 'Saving…'
          : state === 'draft'
            ? 'Publish'
            : state === 'changed'
              ? 'Update'
              : 'Up to date'}
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
    { author } = useProfile(),
    navigate = useNavigate(),
    menu = useDropdown();
  const [copied, setCopied] = useState(false),
    [confirming, setConfirming] = useState(false),
    [error, setError] = useState('');
  const url = author && page.published ? writerUrl(author, page.published.slug) : null;
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
