import { useState, useCallback, useMemo } from 'react';

export const TABLES_PER_PAGE = 6;

/**
 * Hook to manage pagination state per database
 * Each database maintains its own current page
 */
export const usePagination = (databases = ['db1', 'db2', 'db3', 'db4']) => {
  // Store page number for each database
  const [databasePages, setDatabasePages] = useState(
    databases.reduce((acc, db) => ({ ...acc, [db]: 1 }), {})
  );

  // Get current page for a specific database
  const getCurrentPage = useCallback((databaseId) => {
    return databasePages[databaseId] || 1;
  }, [databasePages]);

  // Set page for a specific database
  const setPage = useCallback((databaseId, page) => {
    setDatabasePages(prev => ({
      ...prev,
      [databaseId]: page
    }));
  }, []);

  // Reset all databases to page 1
  const resetAllPages = useCallback(() => {
    setDatabasePages(
      databases.reduce((acc, db) => ({ ...acc, [db]: 1 }), {})
    );
  }, [databases]);

  // Calculate total pages for a database given table count
  const getTotalPages = useCallback((tableCount) => {
    return Math.ceil(tableCount / TABLES_PER_PAGE);
  }, []);

  // Calculate which table IDs should be visible for current page
  const getVisibleTableIds = useCallback((tableIds, currentPage) => {
    const startIndex = (currentPage - 1) * TABLES_PER_PAGE;
    const endIndex = startIndex + TABLES_PER_PAGE;
    return tableIds.slice(startIndex, endIndex);
  }, []);

  return {
    databasePages,
    getCurrentPage,
    setPage,
    resetAllPages,
    getTotalPages,
    getVisibleTableIds,
    TABLES_PER_PAGE,
  };
};
