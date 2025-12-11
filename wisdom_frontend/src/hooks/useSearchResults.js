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
 * Hook to manage search execution and table data fetching
 *
 * Architecture:
 * - Table metadata (name, year, count, etc.) comes from searchTables API
 * - Row data comes from getTableDataPaginatedById API
 * - These are stored separately and merged for display
 * - This allows showing table card wrappers immediately while rows load
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
  const [dbLoadingState, setDbLoadingState] = useState({
    db1: true,
    db2: true,
    db3: true,
    db4: true,
  });
  const [facetsByDb, setFacetsByDb] = useState({
    db1: null,
    db2: null,
    db3: null,
    db4: null,
  });
  const [permutationMap, setPermutationMap] = useState(null);

  // Table metadata from searchTables - keyed by database
  // Structure: { db1: Map<tableId, tableMetadata>, db2: Map, ... }
  const [tableMetadataByDb, setTableMetadataByDb] = useState({
    db1: new Map(),
    db2: new Map(),
    db3: new Map(),
    db4: new Map(),
  });

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

  // Current active database (needed to look up metadata)
  const [activeDb, setActiveDb] = useState('db1');

  /**
   * Get table metadata by ID (from any database)
   */
  const getTableMetadata = useCallback((tableId) => {
    for (const db of ['db1', 'db2', 'db3', 'db4']) {
      const metadata = tableMetadataByDb[db].get(tableId);
      if (metadata) return metadata;
    }
    return null;
  }, [tableMetadataByDb]);

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

    // Merge metadata columns (with tags) with row columns (string list) to keep tag info
    const metaColumns = Array.isArray(metadata.columns) ? metadata.columns : [];
    const metaMap = new Map();
    metaColumns.forEach((col) => {
      if (col && typeof col === 'object') {
        const field = col.field || col.name;
        if (field) {
          metaMap.set(field, col);
        }
      } else if (col) {
        metaMap.set(String(col), { name: String(col) });
      }
    });

    const mergeColumns = () => {
      if (rowData?.columns && Array.isArray(rowData.columns) && rowData.columns.length) {
        return rowData.columns.map((col) => {
          if (col && typeof col === 'object') {
            const field = col.field || col.name;
            const meta = field ? metaMap.get(field) : null;
            return meta ? { ...meta, ...col } : col;
          }
          const meta = metaMap.get(col);
          if (meta) return meta;
          return { name: col, field: col };
        });
      }
      return metaColumns;
    };

    return {
      ...metadata,
      data: rowData?.data ?? [],
      columns: mergeColumns(),
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

  // Step 1: Search all databases for matching tables
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

    // Clear row data for new search
    clearRowData();

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
        setDbLoadingState({
          db1: false,
          db2: false,
          db3: false,
          db4: false,
        });
        return;
      }

      setIsSearching(true);
      setDbLoadingState({
        db1: true,
        db2: true,
        db3: true,
        db4: true,
      });
      // Reset table metadata and visible matches immediately to avoid showing stale cards
      setTableMetadataByDb({
        db1: new Map(),
        db2: new Map(),
        db3: new Map(),
        db4: new Map(),
      });
      setMatchingTableIds({
        db1: [],
        db2: [],
        db3: [],
        db4: [],
      });
      const permutations = await buildPermutationMap();
      setPermutationMap(permutations);

      const dbIds = ['db1', 'db2', 'db3', 'db4'];

      const searchDb = async (dbId) => {
        try {
          const result = await searchTables({
            db: dbId,
            query: searchQuery,
            filters: { ...(perDbFilters[dbId] || {}) },
            pickedTables,
            permutations,
          });

          if (isCancelled) return;

          setTableMetadataByDb(prev => {
            const next = {
              ...prev,
              [dbId]: new Map(),
            };
            (result?.tables || []).forEach(table => {
              next[dbId].set(table.id, table);
            });
            return next;
          });

          setMatchingTableIds(prev => ({
            ...prev,
            [dbId]: result?.tableIds || [],
          }));

          setFacetsByDb(prev => ({
            ...prev,
            [dbId]: result?.facets || null,
          }));
        } catch (error) {
          console.error(`Failed to search database ${dbId}:`, error);
          if (isCancelled) return;
          setTableMetadataByDb(prev => ({
            ...prev,
            [dbId]: new Map(),
          }));
          setMatchingTableIds(prev => ({
            ...prev,
            [dbId]: [],
          }));
        } finally {
          if (!isCancelled) {
            setDbLoadingState(prev => ({
              ...prev,
              [dbId]: false,
            }));
          }
        }
      };

      try {
        await Promise.all(dbIds.map(searchDb));
        if (!isCancelled) {
          setLastSearchSignature(currentSignature);
        }
      } catch (error) {
        console.error('Failed to search databases:', error);
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
    // Search state
    isSearching,
    dbLoadingState,
    facetsByDb,
    permutationMap,

    // Table metadata (from searchTables)
    tableMetadataByDb,
    getTableMetadata,

    // Row data state
    rowDataMap,
    isLoadingRows,

    // Helper functions
    getRowData,
    isRowsLoading,
    getTableForDisplay,
    updateRowData,
    clearRowData,
  };
};
