import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { searchTablesByQuery, getTableDataPaginatedById } from '../data/mockDatabaseNew';
import { RECORDS_PER_PAGE } from '../config/paginationConfig';
import { applySearchAndFilters } from '../utils/searchUtils';

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

  // Step 1: Search all databases for matching table IDs
  useEffect(() => {
    let isCancelled = false;

    // Create a signature for the current search criteria
    const currentSignature = JSON.stringify({
      query: searchQuery,
      filters,
      permutationId,
      permutationParams, // Don't double-stringify
    });

    const searchAllDatabases = async () => {
      // If we already have results for this exact search, don't re-run it
      // Use callback to get fresh matchingTableIds without adding to dependencies
      if (lastSearchSignature === currentSignature) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
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
        const tablePromises = idsToFetch.map(async (tableId) => {
          // Keep fetching batches until we have enough matching records
          const targetRecords = RECORDS_PER_PAGE;
          let allMatchingRecords = [];
          let currentPaginationState = {};
          let lastPaginationInfo = null;
          let lastTableData = null;
          let hasMoreRecords = true;

          while (allMatchingRecords.length < targetRecords && hasMoreRecords) {
            // Fetch next batch
            lastTableData = await getTableDataPaginatedById(tableId, currentPaginationState, RECORDS_PER_PAGE);
            lastPaginationInfo = lastTableData.paginationInfo;

            // Apply search filter to this batch
            let matchingRecords = lastTableData.data;
            if (searchQuery && searchQuery.trim()) {
              const filtered = applySearchAndFilters(
                [lastTableData],
                searchQuery,
                {}, // Don't apply filters again
                permutationId,
                permutationParams
              );

              if (filtered.length > 0 && filtered[0].data.length > 0) {
                matchingRecords = filtered[0].data;
              } else {
                matchingRecords = [];
              }
            }

            // Accumulate matching records
            allMatchingRecords = [...allMatchingRecords, ...matchingRecords];

            // Update pagination state for next fetch
            hasMoreRecords = lastTableData.paginationInfo.hasMore;
            if (hasMoreRecords) {
              currentPaginationState = lastTableData.paginationInfo.nextPaginationState;
            }
          }

          // Create table object with accumulated matches
          const filteredTable = {
            id: tableId,
            name: lastTableData.name,
            year: lastTableData.year,
            country: lastTableData.country,
            categories: lastTableData.categories,
            count: lastTableData.count,
            columns: lastTableData.columns,
            data: allMatchingRecords.slice(0, targetRecords), // Limit to target
            matchCount: allMatchingRecords.length
          };

          // Initialize pagination state for this table
          if (tablePaginationHook && !isCancelled) {
            tablePaginationHook.initializeTable(
              tableId,
              filteredTable.data,
              lastPaginationInfo // Use last pagination info
            );
          }

          return filteredTable;
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
