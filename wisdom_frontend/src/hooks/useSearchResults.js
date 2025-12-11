import { useState, useEffect, useRef, useCallback } from 'react';
import { searchTables, getTableDataPaginatedById } from '../api/backendClient';
import { RECORDS_PER_PAGE } from '../config/paginationConfig';
import { extractTermsFromQuery } from '../utils/searchUtils';

/**
 * Table data status enum
 */
const TableStatus = {
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
};

/**
 * Hook to manage search execution and table data fetching
 *
 * Simplified architecture:
 * - Single source of truth: tableDataMap (React state)
 * - Loading state is derived from map entries
 * - Uses ref for checking current state to avoid effect dependency loops
 */
export const useSearchResults = ({
  searchQuery,
  filters,
  perDbFilters = {},
  pickedTables = [],
  permutationId,
  permutationParams,
  visibleTableIds,
  setMatchingTableIds,
  lastSearchSignature,
  setLastSearchSignature,
  tablePaginationHook,
}) => {
  // Search state
  const [isSearching, setIsSearching] = useState(true);
  const [facetsByDb, setFacetsByDb] = useState({
    db1: null,
    db2: null,
    db3: null,
    db4: null,
  });
  const [permutationMap, setPermutationMap] = useState(null);

  // Table data state - single source of truth
  // Map<tableId, { data: TableData | null, status: TableStatus, error?: Error }>
  const [tableDataMap, setTableDataMap] = useState(() => new Map());

  // Ref to access current tableDataMap without causing effect re-runs
  const tableDataMapRef = useRef(tableDataMap);
  tableDataMapRef.current = tableDataMap;

  // Abort controllers - ref because they don't need to trigger re-renders
  const abortControllersRef = useRef(new Map());

  // Track current fetch generation to ignore stale responses
  const fetchGenerationRef = useRef(0);

  /**
   * Get table data by ID
   */
  const getTableData = useCallback((tableId) => {
    return tableDataMap.get(tableId)?.data ?? null;
  }, [tableDataMap]);

  /**
   * Check if a table is currently loading
   */
  const isTableLoading = useCallback((tableId) => {
    const entry = tableDataMap.get(tableId);
    return entry?.status === TableStatus.LOADING;
  }, [tableDataMap]);

  /**
   * Check if a table has data ready
   */
  const isTableReady = useCallback((tableId) => {
    const entry = tableDataMap.get(tableId);
    return entry?.status === TableStatus.READY;
  }, [tableDataMap]);

  /**
   * Update table data (used by "Load More" functionality)
   */
  const updateTableData = useCallback((tableId, updater) => {
    setTableDataMap(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(tableId);
      if (existing && existing.data) {
        const updatedData = typeof updater === 'function'
          ? updater(existing.data)
          : updater;
        newMap.set(tableId, { ...existing, data: updatedData });
      }
      return newMap;
    });
  }, []);

  /**
   * Clear all table data (called on new search)
   */
  const clearTableData = useCallback(() => {
    // Abort all in-flight requests
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();
    // Clear the data map
    setTableDataMap(new Map());
    // Increment generation so any pending fetches are ignored
    fetchGenerationRef.current++;
  }, []);

  // Step 1: Search all databases for matching table IDs
  useEffect(() => {
    let isCancelled = false;

    const hasSearchQuery =
      (Array.isArray(searchQuery) && searchQuery.length > 0) ||
      (typeof searchQuery === 'string' && searchQuery.trim() !== '');

    const hasAnyFilters =
      (Array.isArray(pickedTables) && pickedTables.length > 0) ||
      Object.values(perDbFilters || {}).some((f) => f && Object.keys(f).length > 0);

    // Skip searching when there's no query and no filters
    if (!hasSearchQuery && !hasAnyFilters) {
      setIsSearching(false);
      return undefined;
    }

    // Clear table data for new search
    clearTableData();

    // Create signature for deduplication
    const currentSignature = JSON.stringify({
      query: searchQuery,
      perDbFilters,
      pickedTables,
      permutationId,
      permutationParams,
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
        const { getPermutations } = await import('../api/backendClient');
        const variants = await getPermutations(permutationId, terms, permutationParams || {});
        return variants && Object.keys(variants).length ? variants : null;
      } catch (error) {
        console.error('Failed to fetch permutations:', error);
        return null;
      }
    };

    const searchAllDatabases = async () => {
      // If we already have results for this exact search, don't re-run
      if (lastSearchSignature === currentSignature) {
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const permutations = await buildPermutationMap();
      setPermutationMap(permutations);

      try {
        const searchPromises = ['db1', 'db2', 'db3', 'db4'].map((dbId) =>
          searchTables({
            db: dbId,
            query: searchQuery,
            filters: { ...(perDbFilters[dbId] || {}) },
            pickedTables,
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
          setFacetsByDb({
            db1: results[0]?.facets || null,
            db2: results[1]?.facets || null,
            db3: results[2]?.facets || null,
            db4: results[3]?.facets || null,
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
    JSON.stringify(pickedTables),
    permutationId,
    JSON.stringify(permutationParams),
  ]);

  // Step 2: Load table data for visible table IDs
  // Uses refs to check current state without causing re-runs
  useEffect(() => {
    if (!visibleTableIds || visibleTableIds.length === 0) {
      return;
    }

    // Capture current generation for this effect run
    const currentGeneration = fetchGenerationRef.current;

    // Use ref to check current state (avoids dependency on tableDataMap)
    const currentMap = tableDataMapRef.current;

    // Determine which tables need fetching
    const tablesToFetch = visibleTableIds.filter(tableId => {
      const entry = currentMap.get(tableId);
      // Fetch if: no entry, or error (retry)
      // Don't fetch if: loading or ready
      return !entry || entry.status === TableStatus.ERROR;
    });

    if (tablesToFetch.length === 0) {
      return;
    }

    // Mark tables as loading immediately
    setTableDataMap(prev => {
      const newMap = new Map(prev);
      tablesToFetch.forEach(tableId => {
        newMap.set(tableId, { data: null, status: TableStatus.LOADING, error: null });
      });
      return newMap;
    });

    // Fetch each table
    const fetchTable = async (tableId) => {
      // Create abort controller for this request
      const controller = new AbortController();
      abortControllersRef.current.set(tableId, controller);

      try {
        const tableData = await getTableDataPaginatedById(
          tableId,
          {}, // Initial pagination state
          RECORDS_PER_PAGE,
          searchQuery,
          filters,
          permutationMap,
          controller.signal,
          pickedTables
        );

        // Check if this fetch is still relevant
        if (currentGeneration !== fetchGenerationRef.current) {
          return; // Stale fetch, ignore
        }

        // Initialize pagination state
        if (tablePaginationHook) {
          tablePaginationHook.initializeTable(
            tableId,
            tableData.data,
            tableData.paginationInfo
          );
        }

        // Update state with fetched data
        setTableDataMap(prev => {
          const newMap = new Map(prev);
          newMap.set(tableId, { data: tableData, status: TableStatus.READY, error: null });
          return newMap;
        });

      } catch (error) {
        if (error?.name === 'AbortError') {
          return; // Request was cancelled, don't update state
        }

        console.error(`Failed to load table ${tableId}:`, error);

        // Check if this fetch is still relevant
        if (currentGeneration !== fetchGenerationRef.current) {
          return;
        }

        // Mark as error
        setTableDataMap(prev => {
          const newMap = new Map(prev);
          newMap.set(tableId, { data: null, status: TableStatus.ERROR, error });
          return newMap;
        });
      } finally {
        abortControllersRef.current.delete(tableId);
      }
    };

    // Start all fetches
    tablesToFetch.forEach(tableId => fetchTable(tableId));

    // No cleanup needed - we don't abort on visibleTableIds change
    // The generation check handles stale responses
  }, [
    visibleTableIds,
    searchQuery,
    filters,
    permutationMap,
    pickedTables,
    tablePaginationHook,
  ]);

  // Prune non-visible tables from the map to prevent memory leaks
  useEffect(() => {
    if (!visibleTableIds || visibleTableIds.length === 0) {
      setTableDataMap(new Map());
      return;
    }

    const visibleSet = new Set(visibleTableIds);
    const currentMap = tableDataMapRef.current;

    // Check if any pruning is needed
    let needsPruning = false;
    currentMap.forEach((_, tableId) => {
      if (!visibleSet.has(tableId)) {
        needsPruning = true;
      }
    });

    if (needsPruning) {
      setTableDataMap(prev => {
        const newMap = new Map();
        visibleTableIds.forEach(tableId => {
          const entry = prev.get(tableId);
          if (entry) {
            newMap.set(tableId, entry);
          }
        });
        return newMap;
      });
    }
  }, [visibleTableIds]);

  // Compute derived loading state
  const isLoadingTableData = Array.from(tableDataMap.values()).some(
    entry => entry.status === TableStatus.LOADING
  );

  return {
    // Search state
    isSearching,
    facetsByDb,
    permutationMap,

    // Table data state
    tableDataMap,
    isLoadingTableData,

    // Helper functions
    getTableData,
    isTableLoading,
    isTableReady,
    updateTableData,
    clearTableData,
  };
};
