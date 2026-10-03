import { useNavigate } from 'react-router-dom';
import { ExternalLink, FileText, Plus } from 'lucide-react';
import { useWorkspace, useWorkspaceActions } from '@/hooks/useWorkspace';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/Button';
import { editedLabel } from '@/lib/note-metadata';
import { plainText } from '@/lib/text';
import { publicWritingPath } from '@/lib/supabase/published-pages';
import { PageStatus } from './PageStatus';

export function PagesPage() {
  const { workspace, cloudEnabled } = useWorkspace(),
    { createPage } = useWorkspaceActions(),
    { user } = useAuth(),
    navigate = useNavigate();
  const pages = [...(workspace.pages ?? [])].sort((a, b) => b.updatedAt - a.updatedAt);
  const newPage = () => navigate(`/page/${createPage()}`);
  return (
    <div className="pages-view">
      <section className="board-header">
        <div>
          <div className="eyebrow">PAGES</div>
          <h1>Your writing</h1>
          <p>Write longer pieces here, then publish them to your public writing page.</p>
        </div>
        <div className="board-actions">
          {cloudEnabled && user && (
            <a
              className="button"
              href={`#${publicWritingPath(user.id)}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} />
              Public page
            </a>
          )}
          <Button variant="primary" onClick={newPage}>
            <Plus size={17} />
            New page
          </Button>
        </div>
      </section>
      {pages.length ? (
        <ul className="page-list">
          {pages.map((page) => {
            const excerpt = plainText(page.content).slice(0, 180);
            return (
              <li key={page.id}>
                <button className="page-row" onClick={() => navigate(`/page/${page.id}`)}>
                  <span className="page-row-title">{page.title || 'Untitled'}</span>
                  {excerpt && <span className="page-row-excerpt">{excerpt}</span>}
                  <span className="page-row-meta">
                    <PageStatus page={page} />
                    <span>{editedLabel(page.updatedAt)}</span>
                  </span>
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
