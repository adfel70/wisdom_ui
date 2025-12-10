import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { searchTables, getTableDataPaginatedById } from '../api/backendClient';
import { RECORDS_PER_PAGE } from '../config/paginationConfig';
import { extractTermsFromQuery } from '../utils/searchUtils';

const logInfo = (...args) => {
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.info('[useSearchResults]', ...args);
  }
};

/**
 * Hook to manage search execution and table data fetching
 * Handles two-phase loading: search for IDs, then fetch table data
 * Now supports paginated table data
 */
export const useSearchResults = ({
  searchQuery,
  filters,
  perDbFilters = {},
  permutationId,
  permutationParams,
  activeDatabase,
  visibleTableIds,
  matchingTableIds,
  setMatchingTableIds,
  lastSearchSignature,
  setLastSearchSignature,
  tableLoadingHook,
  tablePaginationHook,
}) => {
  const [isSearching, setIsSearching] = useState(true);
  const [isLoadingTableData, setIsLoadingTableData] = useState(false);
  const tableDataCache = useRef(new Map());
  const pendingTableFetches = useRef(new Set());
  const inflightControllers = useRef(new Map());
  const [facetsByDb, setFacetsByDb] = useState({
    db1: null,
    db2: null,
    db3: null,
    db4: null,
  });
  const [permutationMap, setPermutationMap] = useState(null);

  const clearAllPending = useCallback(() => {
    // Abort inflight row requests and clear trackers
    inflightControllers.current.forEach((controller) => controller.abort());
    inflightControllers.current.clear();
    pendingTableFetches.current.clear();
    tableDataCache.current.clear();
    tableLoadingHook?.clearPending?.();
  }, [tableLoadingHook]);

  // Prune cache to only keep visible tables
  const pruneCacheToVisibleTables = useCallback((visibleIds) => {
    if (!visibleIds || visibleIds.length === 0) {
      tableDataCache.current.clear();
      return;
    }

    const visibleSet = new Set(visibleIds);
    tableDataCache.current.forEach((_, id) => {
      if (!visibleSet.has(id)) {
        tableDataCache.current.delete(id);
      }
    });
  }, []);

  // Build shared filters (only selectedTables propagated across DBs)
  const sharedFilters = useMemo(() => {
    let selectedTables = null;
    Object.values(perDbFilters || {}).forEach((f) => {
      if (Array.isArray(f?.selectedTables) && f.selectedTables.length > 0) {
        selectedTables = f.selectedTables;
      }
    });
    return selectedTables ? { selectedTables } : {};
  }, [perDbFilters]);

  // Step 1: Search all databases for matching table IDs
  useEffect(() => {
    let isCancelled = false;

    const hasSearchQuery =
      (Array.isArray(searchQuery) && searchQuery.length > 0) ||
      (typeof searchQuery === 'string' && searchQuery.trim() !== '');

    const hasAnyFilters =
      Object.keys(sharedFilters).length > 0 ||
      Object.values(perDbFilters || {}).some((f) => f && Object.keys(f).length > 0);

    // Skip kicking off searches when there's no query and no filters selected
    if (!hasSearchQuery && !hasAnyFilters) {
      setIsSearching(false);
      logInfo('skip search: no query and no filters');
      return undefined;
    }

    // New search: clear pending/inflight/cache so rows refetch cleanly
    clearAllPending();

    // Create a signature for the current search criteria
    const currentSignature = JSON.stringify({
      query: searchQuery,
      sharedFilters,
      perDbFilters,
      permutationId,
      permutationParams, // Don't double-stringify
    });

    const buildPermutationMap = async () => {
      if (!permutationId || permutationId === 'none') return null;

      let terms = [];
      if (Array.isArray(searchQuery)) {
        terms = extractTermsFromQuery(searchQuery);
      } else if (typeof searchQuery === 'string') {
        const trimmed = searchQuery.trim();
        if (trimmed) terms = [trimmed];
      }
      if (!terms.length) return null;
      try {
        const variants = await import('../api/backendClient').then((m) =>
          m.getPermutations(permutationId, terms, permutationParams || {}),
        );
        return variants && Object.keys(variants).length ? variants : null;
      } catch (error) {
        console.error('Failed to fetch permutations:', error);
        return null;
      }
    };

    const searchAllDatabases = async () => {
      // If we already have results for this exact search, don't re-run it
      // Use callback to get fresh matchingTableIds without adding to dependencies
      if (lastSearchSignature === currentSignature) {
        setIsSearching(false);
        logInfo('reuse last search results');
        return;
      }

      setIsSearching(true);
      logInfo('search start', { signature: currentSignature });
      const permutations = await buildPermutationMap();
      setPermutationMap(permutations);
      try {
        // Search all databases in parallel against FastAPI backend
        const searchPromises = ['db1', 'db2', 'db3', 'db4'].map((dbId) =>
          searchTables({
            db: dbId,
            query: searchQuery,
            filters: { ...sharedFilters, ...(perDbFilters[dbId] || {}) },
            permutations,
          })
        );

        const results = await Promise.all(searchPromises);

        if (!isCancelled) {
          setMatchingTableIds({
            db1: results[0]?.tableIds || [],
            db2: results[1]?.tableIds || [],
            db3: results[2]?.tableIds || [],
            db4: results[3]?.tableIds || [],
          });

          setLastSearchSignature(currentSignature);
          tableDataCache.current.clear();
          setFacetsByDb({
            db1: results[0]?.facets || null,
            db2: results[1]?.facets || null,
            db3: results[2]?.facets || null,
            db4: results[3]?.facets || null,
          });
          logInfo('search done', {
            db1: results[0]?.tableIds?.length ?? 0,
            db2: results[1]?.tableIds?.length ?? 0,
            db3: results[2]?.tableIds?.length ?? 0,
            db4: results[3]?.tableIds?.length ?? 0,
          });
        }
      } catch (error) {
        console.error('Failed to search databases:', error);
        if (!isCancelled) {
          setMatchingTableIds({
            db1: [],
            db2: [],
            db3: [],
            db4: [],
          });
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    };

    searchAllDatabases();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchQuery,
    JSON.stringify(perDbFilters),
    JSON.stringify(sharedFilters),
    permutationId,
    JSON.stringify(permutationParams), // Stringify to avoid object reference changes
  ]);

  // Step 2: Load table data for visible table IDs (with pagination)
  useEffect(() => {
    let isCancelled = false;

    const loadVisibleTableData = async () => {
      if (!visibleTableIds || visibleTableIds.length === 0) {
        tableDataCache.current.clear();
        tableLoadingHook.syncPendingWithVisible([]);
        tableLoadingHook.clearPending?.();
        if (!isCancelled) {
          setIsLoadingTableData(false);
        }
        return;
      }

      pruneCacheToVisibleTables(visibleTableIds);
      tableLoadingHook.syncPendingWithVisible(visibleTableIds);

      const idsToFetch = visibleTableIds.filter(id => !tableDataCache.current.has(id));
      if (idsToFetch.length === 0) {
        if (!isCancelled) {
          setIsLoadingTableData(false);
        }
        return;
      }

      const dedupedIdsToFetch = idsToFetch.filter((id) => !pendingTableFetches.current.has(id));
      if (dedupedIdsToFetch.length === 0) {
        if (!isCancelled) {
          setIsLoadingTableData(false);
        }
        return;
      }

      dedupedIdsToFetch.forEach((id) => pendingTableFetches.current.add(id));
      tableLoadingHook.addPendingTableIds(dedupedIdsToFetch);
      if (!isCancelled) {
        setIsLoadingTableData(true);
      }

      try {
        // Fetch paginated data for each table (first page only)
        // Backend handles batch-fetching to return exactly RECORDS_PER_PAGE matching records
        const tablePromises = dedupedIdsToFetch.map(async (tableId) => {
          const controller = new AbortController();
          inflightControllers.current.set(tableId, controller);
          logInfo('rows fetch start', { tableId, pageSize: RECORDS_PER_PAGE });

          const tableData = await getTableDataPaginatedById(
            tableId,
            {}, // Initial pagination state
            RECORDS_PER_PAGE,
            searchQuery,
            filters,
            permutationMap,
            controller.signal
          );

          // Initialize pagination state for this table
          if (tablePaginationHook && !isCancelled) {
            tablePaginationHook.initializeTable(
              tableId,
              tableData.data,
              tableData.paginationInfo
            );
          }

          logInfo('rows fetch done', { tableId, rows: tableData.data?.length ?? 0 });
          return tableData;
        });

        const newTables = await Promise.all(tablePromises);

        if (!isCancelled) {
          newTables.forEach(t => tableDataCache.current.set(t.id, t));
        }
      } catch (error) {
        if (error?.name !== 'AbortError') {
          console.error('Failed to load table data:', error);
        } else {
          logInfo('rows fetch aborted');
        }
      } finally {
        dedupedIdsToFetch.forEach((id) => {
          pendingTableFetches.current.delete(id);
          inflightControllers.current.delete(id);
        });
        tableLoadingHook.removePendingTableIds(dedupedIdsToFetch);
        if (!isCancelled) {
          setIsLoadingTableData(false);
        }
      }
    };

    loadVisibleTableData();

    return () => {
      isCancelled = true;
      // Abort inflight row requests and clear pending so next effect can re-fetch cleanly
      inflightControllers.current.forEach((controller) => controller.abort());
      inflightControllers.current.clear();
      const pendingIds = Array.from(pendingTableFetches.current);
      if (pendingIds.length) {
        tableLoadingHook.removePendingTableIds(pendingIds);
      }
      pendingTableFetches.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(visibleTableIds), // Array changes trigger re-fetch
    searchQuery,
    JSON.stringify(filters), // Stringify to avoid object reference changes
    permutationId,
    JSON.stringify(permutationParams), // Stringify to avoid object reference changes
  ]);

  return {
    isSearching,
    isLoadingTableData,
    tableDataCache,
    pruneCacheToVisibleTables,
    facetsByDb,
    permutationMap,
  };
};
