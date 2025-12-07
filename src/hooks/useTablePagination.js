import { useState, useCallback, useRef } from 'react';
import { RECORDS_PER_PAGE } from '../config/paginationConfig';

/**
 * Hook to manage pagination state for individual tables
 * Each table maintains its own:
 * - Loaded records
 * - Pagination state (cursor or offset)
 * - hasMore flag
 * - Loading state
 */
export const useTablePagination = () => {
  // Map of tableId -> { loadedData, paginationState, hasMore, isLoadingMore }
  const [tablePaginationState, setTablePaginationState] = useState({});

  // Track the page size (configurable)
  const pageSize = useRef(RECORDS_PER_PAGE);

  /**
   * Initialize a table's pagination state with initial data
   * @param {string} tableId - Table ID
   * @param {Array} initialData - Initial records
   * @param {Object} paginationInfo - Pagination info from backend
   */
  const initializeTable = useCallback((tableId, initialData, paginationInfo) => {
    setTablePaginationState(prev => ({
      ...prev,
      [tableId]: {
        loadedData: initialData,
        paginationState: paginationInfo.nextPaginationState,
        hasMore: paginationInfo.hasMore,
        isLoadingMore: false,
        strategy: paginationInfo.strategy,
      }
    }));
  }, []);

  /**
   * Append more records to a table
   * @param {string} tableId - Table ID
   * @param {Array} newData - New records to append
   * @param {Object} paginationInfo - Updated pagination info
   */
  const appendRecords = useCallback((tableId, newData, paginationInfo) => {
    setTablePaginationState(prev => {
      const currentState = prev[tableId];
      if (!currentState) return prev;

      return {
        ...prev,
        [tableId]: {
          ...currentState,
          loadedData: [...currentState.loadedData, ...newData],
          paginationState: paginationInfo.nextPaginationState,
          hasMore: paginationInfo.hasMore,
          isLoadingMore: false,
        }
      };
    });
  }, []);

  /**
   * Set loading state for a table
   * @param {string} tableId - Table ID
   * @param {boolean} isLoading - Loading state
   */
  const setLoadingMore = useCallback((tableId, isLoading) => {
    setTablePaginationState(prev => {
      const currentState = prev[tableId];
      if (!currentState) return prev;

      return {
        ...prev,
        [tableId]: {
          ...currentState,
          isLoadingMore: isLoading,
        }
      };
    });
  }, []);

  /**
   * Get pagination state for a table
   * @param {string} tableId - Table ID
   * @returns {Object|null} Pagination state or null if not initialized
   */
  const getTableState = useCallback((tableId) => {
    return tablePaginationState[tableId] || null;
  }, [tablePaginationState]);

  /**
   * Reset a table's pagination state
   * @param {string} tableId - Table ID
   */
  const resetTable = useCallback((tableId) => {
    setTablePaginationState(prev => {
      const newState = { ...prev };
      delete newState[tableId];
      return newState;
    });
  }, []);

  /**
   * Reset all tables' pagination state
   */
  const resetAllTables = useCallback(() => {
    setTablePaginationState({});
  }, []);

  /**
   * Check if a table has more records to load
   * @param {string} tableId - Table ID
   * @returns {boolean} True if more records available
   */
  const hasMoreRecords = useCallback((tableId) => {
    const state = tablePaginationState[tableId];
    return state ? state.hasMore : false;
  }, [tablePaginationState]);

  /**
   * Check if a table is loading more records
   * @param {string} tableId - Table ID
   * @returns {boolean} True if loading
   */
  const isTableLoadingMore = useCallback((tableId) => {
    const state = tablePaginationState[tableId];
    return state ? state.isLoadingMore : false;
  }, [tablePaginationState]);

  /**
   * Get loaded records for a table
   * @param {string} tableId - Table ID
   * @returns {Array} Loaded records
   */
  const getLoadedRecords = useCallback((tableId) => {
    const state = tablePaginationState[tableId];
    return state ? state.loadedData : [];
  }, [tablePaginationState]);

  /**
   * Get pagination state for loading more
   * @param {string} tableId - Table ID
   * @returns {Object|null} Pagination state for next request
   */
  const getPaginationState = useCallback((tableId) => {
    const state = tablePaginationState[tableId];
    return state ? state.paginationState : null;
  }, [tablePaginationState]);

  return {
    initializeTable,
    appendRecords,
    setLoadingMore,
    getTableState,
    resetTable,
    resetAllTables,
    hasMoreRecords,
    isTableLoadingMore,
    getLoadedRecords,
    getPaginationState,
    pageSize: pageSize.current,
  };
};
