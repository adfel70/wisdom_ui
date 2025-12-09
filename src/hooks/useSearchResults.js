import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { searchTablesByQuery, getTableDataPaginatedById } from '../data/mockDatabaseNew';
import { RECORDS_PER_PAGE } from '../config/paginationConfig';

/**
 * Hook to manage search execution and table data fetching
 * Handles two-phase loading: search for IDs, then fetch table data
 * Now supports paginated table data
 */
export const useSearchResults = ({
  searchQuery,
  filters,
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

  // Step 1: Search for matching table IDs (current database only)
  useEffect(() => {
    let isCancelled = false;

    // Create a signature for the current search criteria
    const currentSignature = JSON.stringify({
      query: searchQuery,
      filters,
      permutationId,
      permutationParams, // Don't double-stringify
      activeDatabase,
    });

    const searchCurrentDatabase = async () => {
      // If we already have results for this exact search, don't re-run it
      // Use callback to get fresh matchingTableIds without adding to dependencies
      if (lastSearchSignature === currentSignature) {
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        // Only query the active database
        const result = await searchTablesByQuery(
          activeDatabase,
          searchQuery,
          filters,
          permutationId,
          permutationParams
        );

        if (!isCancelled) {
          setMatchingTableIds(prev => ({
            ...prev,
            [activeDatabase]: result.tableIds,
          }));

          setLastSearchSignature(currentSignature);
          tableDataCache.current.clear();
        }
      } catch (error) {
        console.error('Failed to search databases:', error);
        if (!isCancelled) {
          setMatchingTableIds(prev => ({
            ...prev,
            [activeDatabase]: [],
          }));
        }
      } finally {
        if (!isCancelled) {
          setIsSearching(false);
        }
      }
    };

    searchCurrentDatabase();

    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeDatabase,
    searchQuery,
    JSON.stringify(filters), // Stringify to avoid object reference changes
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

      tableLoadingHook.addPendingTableIds(idsToFetch);
      if (!isCancelled) {
        setIsLoadingTableData(true);
      }

      try {
        // Fetch paginated data for each table (first page only)
        // Backend handles batch-fetching to return exactly RECORDS_PER_PAGE matching records
        const tablePromises = idsToFetch.map(async (tableId) => {
          const tableData = await getTableDataPaginatedById(
            tableId,
            {}, // Initial pagination state
            RECORDS_PER_PAGE,
            searchQuery,
            permutationId,
            permutationParams,
            filters
          );

          // Initialize pagination state for this table
          if (tablePaginationHook && !isCancelled) {
            tablePaginationHook.initializeTable(
              tableId,
              tableData.data,
              tableData.paginationInfo
            );
          }

          return tableData;
        });

        const newTables = await Promise.all(tablePromises);

        if (!isCancelled) {
          newTables.forEach(t => tableDataCache.current.set(t.id, t));
        }
      } catch (error) {
        console.error('Failed to load table data:', error);
      } finally {
        tableLoadingHook.removePendingTableIds(idsToFetch);
        if (!isCancelled) {
          setIsLoadingTableData(false);
        }
      }
    };

    loadVisibleTableData();

    return () => {
      isCancelled = true;
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
  };
};
