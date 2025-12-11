import { useState, useEffect, useRef, useCallback } from 'react';
import { searchTables, getTableDataPaginatedById } from '../api/backendClient';
import { RECORDS_PER_PAGE } from '../config/paginationConfig';
import { extractTermsFromQuery } from '../utils/searchUtils';

/**
 * Row data loading status
 */
const RowStatus = {
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
};

/**
 * Hook to manage unified search execution and table data fetching
 *
 * Architecture:
 * - Table metadata (name, year, db, etc.) comes from searchTables API
 * - Row data comes from getTableDataPaginatedById API
 * - These are stored separately and merged for display
 */
export const useSearchResults = ({
  searchQuery,
  filters,
  selectedDatabases = [],
  pickedTables = [],
  permutationId,
  permutationParams,
  visibleTableIds,
  setMatchingTableIds,
  lastSearchSignature,
  setLastSearchSignature,
  tablePaginationHook,
}) => {
  const [isSearching, setIsSearching] = useState(true);
  const [facets, setFacets] = useState(null);
  const [permutationMap, setPermutationMap] = useState(null);

  // Table metadata from searchTables - keyed by tableId
  const [tableMetadata, setTableMetadata] = useState(() => new Map());

  // Row data state - keyed by tableId
  // Map<tableId, { data: rows[], status: RowStatus, error?: Error, paginationInfo?: object }>
  const [rowDataMap, setRowDataMap] = useState(() => new Map());

  // Ref to access current rowDataMap without causing effect re-runs
  const rowDataMapRef = useRef(rowDataMap);
  rowDataMapRef.current = rowDataMap;

  // Abort controllers for row fetches
  const abortControllersRef = useRef(new Map());

  // Track current fetch generation to ignore stale responses
  const fetchGenerationRef = useRef(0);

  /**
   * Get table metadata by ID
   */
  const getTableMetadata = useCallback((tableId) => {
    return tableMetadata.get(tableId) || null;
  }, [tableMetadata]);

  /**
   * Get row data by table ID
   */
  const getRowData = useCallback((tableId) => {
    return rowDataMap.get(tableId) ?? null;
  }, [rowDataMap]);

  /**
   * Check if rows are currently loading for a table
   */
  const isRowsLoading = useCallback((tableId) => {
    const rowData = rowDataMap.get(tableId);
    return rowData?.status === RowStatus.LOADING;
  }, [rowDataMap]);

  /**
   * Get merged table data for display (metadata + rows)
   * Returns null if metadata doesn't exist
   */
  const getTableForDisplay = useCallback((tableId) => {
    const metadata = getTableMetadata(tableId);
    if (!metadata) return null;

    const rowData = rowDataMap.get(tableId);

    return {
      ...metadata,
      data: rowData?.data ?? [],
      columns: rowData?.columns ?? metadata.columns ?? [],
      paginationInfo: rowData?.paginationInfo ?? null,
      isLoadingRows: rowData?.status === RowStatus.LOADING,
      hasRowData: rowData?.status === RowStatus.READY,
      rowError: rowData?.error ?? null,
    };
  }, [getTableMetadata, rowDataMap]);

  /**
   * Update row data for a table (used by "Load More" functionality)
   */
  const updateRowData = useCallback((tableId, updater) => {
    setRowDataMap(prev => {
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
   * Clear all row data (called on new search)
   */
  const clearRowData = useCallback(() => {
    // Abort all in-flight requests
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();
    // Clear the row data map
    setRowDataMap(new Map());
    // Increment generation so any pending fetches are ignored
    fetchGenerationRef.current++;
  }, []);

  // Step 1: Run unified search across selected databases
  useEffect(() => {
    let isCancelled = false;

    const hasSearchQuery =
      (Array.isArray(searchQuery) && searchQuery.length > 0) ||
      (typeof searchQuery === 'string' && searchQuery.trim() !== '');

    const hasAnyFilters =
      (Array.isArray(pickedTables) && pickedTables.length > 0) ||
      (filters && Object.keys(filters || {}).length > 0);

    // Skip searching when there's no query and no filters
    if (!hasSearchQuery && !hasAnyFilters) {
      clearRowData();
      setTableMetadata(new Map());
      setMatchingTableIds([]);
      setFacets(null);
      setPermutationMap(null);
      setIsSearching(false);
      return undefined;
    }

    // Clear row data for new search
    clearRowData();

    // Create signature for deduplication
    const currentSignature = JSON.stringify({
      query: searchQuery,
      filters,
      pickedTables,
      permutationId,
      permutationParams,
      selectedDatabases: [...(selectedDatabases || [])].sort(),
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

    const runUnifiedSearch = async () => {
      // If we already have results for this exact search, don't re-run
      if (lastSearchSignature === currentSignature) {
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setTableMetadata(new Map());
      setMatchingTableIds([]);
      setFacets(null);
      const permutations = await buildPermutationMap();
      setPermutationMap(permutations);

      try {
        const result = await searchTables({
          dbs: selectedDatabases,
          query: searchQuery,
          filters,
          pickedTables,
          permutations,
        });

        if (isCancelled) return;

        const metaMap = new Map();
        (result?.tables || []).forEach((table) => {
          if (table?.id) {
            metaMap.set(table.id, table);
          }
        });

        setTableMetadata(metaMap);
        setMatchingTableIds(result?.tableIds || []);
        setFacets(result?.facets || null);
        setLastSearchSignature(currentSignature);
      } catch (error) {
        console.error('Failed to run unified search:', error);
        if (!isCancelled) {
          setTableMetadata(new Map());
          setMatchingTableIds([]);
          setFacets(null);
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    };

    runUnifiedSearch();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchQuery,
    JSON.stringify(filters),
    JSON.stringify(pickedTables),
    permutationId,
    JSON.stringify(permutationParams),
    JSON.stringify(selectedDatabases),
  ]);

  // Step 2: Load row data for visible table IDs
  useEffect(() => {
    if (!visibleTableIds || visibleTableIds.length === 0) {
      return;
    }

    // Capture current generation for this effect run
    const currentGeneration = fetchGenerationRef.current;

    // Use ref to check current state (avoids dependency on rowDataMap)
    const currentMap = rowDataMapRef.current;

    // Determine which tables need row fetching
    const tablesToFetch = visibleTableIds.filter(tableId => {
      const rowData = currentMap.get(tableId);
      // Fetch if: no entry, or error (retry)
      // Don't fetch if: loading or ready
      return !rowData || rowData.status === RowStatus.ERROR;
    });

    if (tablesToFetch.length === 0) {
      return;
    }

    // Mark tables as loading immediately
    setRowDataMap(prev => {
      const newMap = new Map(prev);
      tablesToFetch.forEach(tableId => {
        newMap.set(tableId, { data: [], status: RowStatus.LOADING, error: null });
      });
      return newMap;
    });

    // Fetch rows for each table
    const fetchRows = async (tableId) => {
      const controller = new AbortController();
      abortControllersRef.current.set(tableId, controller);

      try {
        const result = await getTableDataPaginatedById(
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
          return;
        }

        // Initialize pagination state
        if (tablePaginationHook) {
          tablePaginationHook.initializeTable(
            tableId,
            result.data,
            result.paginationInfo
          );
        }

        // Update row data
        setRowDataMap(prev => {
          const newMap = new Map(prev);
          newMap.set(tableId, {
            data: result.data,
            columns: result.columns,
            status: RowStatus.READY,
            error: null,
            paginationInfo: result.paginationInfo,
          });
          return newMap;
        });

      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }

        console.error(`Failed to load rows for table ${tableId}:`, error);

        if (currentGeneration !== fetchGenerationRef.current) {
          return;
        }

        setRowDataMap(prev => {
          const newMap = new Map(prev);
          newMap.set(tableId, { data: [], status: RowStatus.ERROR, error });
          return newMap;
        });
      } finally {
        abortControllersRef.current.delete(tableId);
      }
    };

    // Start all fetches
    tablesToFetch.forEach(tableId => fetchRows(tableId));

  }, [
    visibleTableIds,
    searchQuery,
    filters,
    permutationMap,
    pickedTables,
    tablePaginationHook,
  ]);

  // Prune row data for non-visible tables to prevent memory leaks
  useEffect(() => {
    if (!visibleTableIds || visibleTableIds.length === 0) {
      setRowDataMap(new Map());
      return;
    }

    const visibleSet = new Set(visibleTableIds);
    const currentMap = rowDataMapRef.current;

    let needsPruning = false;
    currentMap.forEach((_, tableId) => {
      if (!visibleSet.has(tableId)) {
        needsPruning = true;
      }
    });

    if (needsPruning) {
      setRowDataMap(prev => {
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
  const isLoadingRows = Array.from(rowDataMap.values()).some(
    entry => entry.status === RowStatus.LOADING
  );

  return {
    isSearching,
    facets,
    permutationMap,
    tableMetadata,
    getTableMetadata,
    rowDataMap,
    isLoadingRows,
    getRowData,
    isRowsLoading,
    getTableForDisplay,
    updateRowData,
    clearRowData,
  };
};
