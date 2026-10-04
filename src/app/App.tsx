import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useWorkspace } from '@/hooks/useWorkspace';
import { AppLayout } from '@/components/layout/AppLayout';
import { BoardPage } from '@/features/boards/BoardPage';
import { WorkspaceDialogs } from '@/features/workspace/WorkspaceDialogs';
import { useBoardTools } from '@/integrations/useBoardTools';
import { PagesPage } from '@/features/pages/PagesPage';
import { boardPath } from '@/lib/app-paths';
import { FocusPanel } from '@/features/focus/FocusPanel';
const EditorPage = lazy(() => import('@/features/editor/EditorPage'));
const PageEditorPage = lazy(() => import('@/features/pages/PageEditorPage'));
const FreeWritePage = lazy(() => import('@/features/free-write/FreeWritePage'));
const TodoPage = lazy(() => import('@/features/todo/TodoPage'));
export function App() {
  const { workspace } = useWorkspace();
  useBoardTools();
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to={boardPath(workspace.boards[0])} replace />} />
          <Route path="board/:boardRef" element={<BoardPage />} />
          <Route
            path="initiative/:noteRef"
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
          <Route
            path="card/:noteRef"
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
            path="page/:pageRef"
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
          <Route
            path="write"
            element={
              <Suspense
                fallback={
                  <div className="editor-placeholder" role="status">
                    Opening your page…
                  </div>
                }
              >
                <FreeWritePage />
              </Suspense>
            }
          />
          <Route
            path="todo"
            element={
              <Suspense
                fallback={
                  <div className="editor-placeholder" role="status">
                    Opening your page…
                  </div>
                }
              >
                <TodoPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to={boardPath(workspace.boards[0])} replace />} />
        </Route>
      </Routes>
      <WorkspaceDialogs />
      <FocusPanel />
    </>
  );
}
