import { useState, useCallback } from 'react';

export const TABLES_PER_PAGE = 6;

/**
 * Hook to manage unified pagination state
 */
export const usePagination = () => {
  const [currentPage, setCurrentPage] = useState(1);

  const setPage = useCallback((page) => {
    const next = Number(page) || 1;
    setCurrentPage(next < 1 ? 1 : next);
  }, []);

  const resetAllPages = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const getTotalPages = useCallback((tableCount = 0) => {
    if (!tableCount || tableCount < 0) return 0;
    return Math.ceil(tableCount / TABLES_PER_PAGE);
  }, []);

  const getVisibleTableIds = useCallback((tableIds = [], page = currentPage) => {
    const safePage = page < 1 ? 1 : page;
    const startIndex = (safePage - 1) * TABLES_PER_PAGE;
    const endIndex = startIndex + TABLES_PER_PAGE;
    return tableIds.slice(startIndex, endIndex);
  }, [currentPage]);

  return {
    currentPage,
    setPage,
    resetAllPages,
    getTotalPages,
    getVisibleTableIds,
    TABLES_PER_PAGE,
  };
};
