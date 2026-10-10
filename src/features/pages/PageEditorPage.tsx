import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Copy, ExternalLink, EyeOff, Link2, MoreHorizontal, Trash2 } from 'lucide-react';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { useDropdown } from '@/hooks/useDropdown';
import { Dropdown } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase/client';
import { editedLabel } from '@/lib/note-metadata';
import {
  ensureShortCode,
  shortUrl,
  unpublishPage,
  writerUrl,
} from '@/lib/supabase/published-pages';
import { findByRef, pagePath } from '@/lib/app-paths';
import { useProfile } from './useProfile';
import type { Page } from '@/features/workspace/types';
import { WritingSurface } from '@/features/editor/WritingSurface';
import { publishState, visibility, VISIBILITY_LABELS } from './publish-state';
import { usePageVisibility } from './usePageVisibility';
import { VisibilitySelect } from './VisibilitySelect';

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

function PublishButton({ page }: { page: Page }) {
  const control = usePageVisibility(page),
    { canPublish, busy, error, publish } = control;
  const state = publishState(page);
  if (!canPublish)
    return (
      <span className="publish-hint" title="Sign in with Google to publish pages">
        Sign in to publish
      </span>
    );
  return (
    <>
      <VisibilitySelect page={page} control={control} />
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
  const [copied, setCopied] = useState<'link' | 'short' | null>(null),
    [confirming, setConfirming] = useState(false),
    [error, setError] = useState('');
  const url = author && page.published ? writerUrl(author, page.published.slug) : null,
    shown = visibility(page),
    unlisted = shown === 'unlisted';
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
  /** The page's short link, made the first time it is asked for. */
  async function shortLink() {
    if (!supabase || !page.published) throw new Error('Publish this page to get a short link.');
    const code = await ensureShortCode(supabase, page);
    if (code !== page.published.code) setPagePublished(page.id, { ...page.published, code });
    return shortUrl(code);
  }
  async function copy(kind: 'link' | 'short', text: Promise<string>) {
    setError('');
    try {
      // Handing the clipboard a pending value keeps Safari's copy permission while the link loads.
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write)
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': text.then((value) => new Blob([value], { type: 'text/plain' })),
          }),
        ]);
      else await navigator.clipboard.writeText(await text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch (reason) {
      // Prefer the reason the link couldn't be made over the clipboard's generic error.
      const cause: unknown = await text.then(
        () => reason,
        (inner: unknown) => inner,
      );
      setError(cause instanceof Error ? cause.message : 'Could not copy the link.');
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
            ` · ${VISIBILITY_LABELS[shown]} ${new Date(page.published.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
        </p>
        {url && (
          <>
            <button
              onClick={() => {
                void copy('link', Promise.resolve(url));
              }}
            >
              {copied === 'link' ? <Check size={15} /> : <Copy size={15} />}
              {copied === 'link' ? 'Link copied' : unlisted ? 'Copy link' : 'Copy public link'}
            </button>
            <button onClick={() => void copy('short', shortLink())}>
              {copied === 'short' ? <Check size={15} /> : <Link2 size={15} />}
              {copied === 'short' ? 'Short link copied' : 'Copy short link'}
            </button>
            <a className="dropdown-link" href={url} target="_blank" rel="noreferrer">
              <ExternalLink size={15} />
              {unlisted ? 'Open page' : 'Open public page'}
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
            {shown === 'published' && ' and removed from your public writing page'}
            {unlisted && ' and its link will stop working'}.
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
