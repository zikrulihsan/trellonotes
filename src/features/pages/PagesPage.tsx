import { useNavigate } from 'react-router-dom';
import { FileText, Pin, PinOff, Plus } from 'lucide-react';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { Button } from '@/components/ui/Button';
import { editedLabel } from '@/lib/note-metadata';
import { plainText } from '@/lib/text';
import { pagePath } from '@/lib/app-paths';
import { PublicAddress } from './PublicAddress';
import { PageStatus } from './PageStatus';
import { TaskCount } from '@/components/ui/TaskCount';

export function PagesPage() {
  const { workspace, cloudEnabled } = useWorkspace(),
    { createPage, setPagePinned } = useWorkspaceActions(),
    navigate = useNavigate();
  // Pinned pages first, most recently pinned on top; the rest by last edit.
  const pages = [...(workspace.pages ?? [])].sort(
    (a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0) || b.updatedAt - a.updatedAt,
  );
  const newPage = () => navigate(pagePath({ id: createPage(), title: '' }));
  return (
    <div className="pages-view">
      <section className="board-header">
        <div>
          <div className="eyebrow">PAGES</div>
          <h1>Your writing</h1>
          <p>Write longer pieces here, then publish them to your public writing page.</p>
          {cloudEnabled && <PublicAddress />}
        </div>
        <div className="board-actions">
          <Button variant="primary" onClick={newPage}>
            <Plus size={17} />
            New page
          </Button>
        </div>
      </section>
      {pages.length ? (
        <ul className="page-list">
          {pages.map((page) => {
            const excerpt = plainText(page.content).slice(0, 180),
              pinned = page.pinnedAt !== undefined,
              title = page.title || 'Untitled';
            return (
              <li key={page.id} className={`page-item ${pinned ? 'is-pinned' : ''}`}>
                <button className="page-row" onClick={() => navigate(pagePath(page))}>
                  <span className="page-row-title">
                    {pinned && <Pin size={14} className="page-pin-mark" aria-label="Pinned" />}
                    {title}
                  </span>
                  {excerpt && <span className="page-row-excerpt">{excerpt}</span>}
                  <span className="page-row-meta">
                    <PageStatus page={page} />
                    <TaskCount content={page.content} />
                    <span>{editedLabel(page.updatedAt)}</span>
                  </span>
                </button>
                <button
                  className="page-pin icon-button"
                  aria-pressed={pinned}
                  aria-label={pinned ? `Unpin ${title}` : `Pin ${title}`}
                  title={pinned ? 'Unpin' : 'Pin to top'}
                  onClick={() => setPagePinned(page.id, !pinned)}
                >
                  {pinned ? <PinOff size={16} /> : <Pin size={16} />}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="pages-empty">
          <FileText size={26} />
          <h2>No pages yet</h2>
          <p>Pages are for writing you want to share: updates, reports, essays.</p>
          <Button variant="primary" onClick={newPage}>
            <Plus size={17} />
            Write your first page
          </Button>
        </div>
      )}
    </div>
  );
}
