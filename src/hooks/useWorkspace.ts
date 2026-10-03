import { useContext } from 'react';
import { WorkspaceActionsContext, WorkspaceStateContext } from '@/context/workspace-context';
export function useWorkspace() {
  const context = useContext(WorkspaceStateContext);
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return context;
}
export function useWorkspaceActions() {
  const context = useContext(WorkspaceActionsContext);
  if (!context) throw new Error('useWorkspaceActions must be used within WorkspaceProvider');
  return context;
}
