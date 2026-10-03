import { useContext } from 'react';
import { BoardDragContext } from './board-drag-context';
export function useBoardDrag() {
  const value = useContext(BoardDragContext);
  if (!value) throw new Error('useBoardDrag must be used within BoardDragProvider');
  return value;
}
