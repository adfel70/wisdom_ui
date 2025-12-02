import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { searchTablesByQuery, getMultipleTablesData } from '../data/mockDatabaseNew';

/**
 * Hook to manage search execution and table data fetching
 * Handles two-phase loading: search for IDs, then fetch table data
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

  // Step 1: Search all databases for matching table IDs
  useEffect(() => {
    let isCancelled = false;

    // Create a signature for the current search criteria
    const currentSignature = JSON.stringify({
      query: searchQuery,
      filters,
      permutationId,
      permutationParams: JSON.stringify(permutationParams),
    });

    const searchAllDatabases = async () => {
      // If we already have results for this exact search, don't re-run it
      if (lastSearchSignature === currentSignature && matchingTableIds[activeDatabase]?.length > 0) {
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        // Search all databases in parallel
        const searchPromises = ['db1', 'db2', 'db3', 'db4'].map(dbId =>
          searchTablesByQuery(dbId, searchQuery, filters, permutationId, permutationParams)
        );

        const results = await Promise.all(searchPromises);

        if (!isCancelled) {
          setMatchingTableIds({
            db1: results[0].tableIds,
            db2: results[1].tableIds,
            db3: results[2].tableIds,
            db4: results[3].tableIds,
          });

          setLastSearchSignature(currentSignature);
          tableDataCache.current.clear();
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
  }, [
    searchQuery,
    filters,
    permutationId,
    permutationParams,
    activeDatabase,
    matchingTableIds,
    setMatchingTableIds,
    lastSearchSignature,
    setLastSearchSignature,
  ]);

  // Step 2: Load table data for visible table IDs
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
        const newTables = await getMultipleTablesData(
          idsToFetch,
          searchQuery,
          filters,
          permutationId,
          permutationParams
        );

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
  }, [
    visibleTableIds,
    searchQuery,
    filters,
    permutationId,
    permutationParams,
    tableLoadingHook,
    pruneCacheToVisibleTables,
  ]);

  return {
    isSearching,
    isLoadingTableData,
    tableDataCache,
    pruneCacheToVisibleTables,
  };
};
