import { useState, useCallback } from 'react';

/**
 * Hook for managing modal open/close state.
 * Eliminates repeated useState + open/close handler patterns across modal components.
 */
export function useModal(initial = false) {
  const [isOpen, setIsOpen] = useState(initial);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return { isOpen, open, close, toggle };
}
