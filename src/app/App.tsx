import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useWorkspace } from '@/hooks/useWorkspace';
import { AppLayout } from '@/components/layout/AppLayout';
import { BoardPage } from '@/features/boards/BoardPage';
import { WorkspaceDialogs } from '@/features/workspace/WorkspaceDialogs';
import { useBoardTools } from '@/integrations/useBoardTools';
import { PagesPage } from '@/features/pages/PagesPage';
const EditorPage = lazy(() => import('@/features/editor/EditorPage'));
const PageEditorPage = lazy(() => import('@/features/pages/PageEditorPage'));
export function App() {
  const { workspace } = useWorkspace();
  useBoardTools();
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to={`/board/${workspace.boards[0].id}`} replace />} />
          <Route path="board/:boardId" element={<BoardPage />} />
          <Route
            path="card/:noteId"
            element={
              <Suspense
                fallback={
                  <div className="editor-placeholder" role="status">
                    Opening your page…
                  </div>
                }
              >
                <EditorPage />
              </Suspense>
            }
          />
          <Route path="pages" element={<PagesPage />} />
          <Route
            path="page/:pageId"
            element={
              <Suspense
                fallback={
                  <div className="editor-placeholder" role="status">
                    Opening your page…
                  </div>
                }
              >
                <PageEditorPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to={`/board/${workspace.boards[0].id}`} replace />} />
        </Route>
      </Routes>
      <WorkspaceDialogs />
    </>
  );
}
