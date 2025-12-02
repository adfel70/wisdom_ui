import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * Hook to manage per-table loading states
 * Tracks which tables are pending data load to show skeletons
 */
export const useTableLoading = () => {
  const isMountedRef = useRef(true);
  const pendingTableIdsRef = useRef(new Set());
  const [, forcePendingRender] = useState(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Add table IDs to pending state
  const addPendingTableIds = useCallback((ids) => {
    if (!ids || ids.length === 0) return;

    const pendingSet = pendingTableIdsRef.current;
    let changed = false;

    ids.forEach(id => {
      if (!pendingSet.has(id)) {
        pendingSet.add(id);
        changed = true;
      }
    });

    if (changed && isMountedRef.current) {
      forcePendingRender(tick => tick + 1);
    }
  }, []);

  // Remove table IDs from pending state
  const removePendingTableIds = useCallback((ids) => {
    if (!ids || ids.length === 0) return;

    const pendingSet = pendingTableIdsRef.current;
    let changed = false;

    ids.forEach(id => {
      if (pendingSet.has(id)) {
        pendingSet.delete(id);
        changed = true;
      }
    });

    if (changed && isMountedRef.current) {
      forcePendingRender(tick => tick + 1);
    }
  }, []);

  // Sync pending IDs with visible IDs (remove non-visible)
  const syncPendingWithVisible = useCallback((visibleIds) => {
    const pendingSet = pendingTableIdsRef.current;
    if (pendingSet.size === 0) return;

    const visibleSet = new Set(visibleIds);
    let changed = false;

    pendingSet.forEach(id => {
      if (!visibleSet.has(id)) {
        pendingSet.delete(id);
        changed = true;
      }
    });

    if (changed && isMountedRef.current) {
      forcePendingRender(tick => tick + 1);
    }
  }, []);

  // Check if a table ID is pending
  const isPending = useCallback((tableId) => {
    return pendingTableIdsRef.current.has(tableId);
  }, []);

  // Get all pending table IDs as array
  const getPendingTableIds = useCallback(() => {
    return Array.from(pendingTableIdsRef.current);
  }, []);

  return {
    addPendingTableIds,
    removePendingTableIds,
    syncPendingWithVisible,
    isPending,
    getPendingTableIds,
    pendingTableIdsRef, // Expose ref for direct access if needed
  };
};
