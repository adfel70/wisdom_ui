import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Paper } from '@mui/material';
import { motion } from 'framer-motion';

// Components
import SearchBar from '../components/SearchBar';
import FilterModal from '../components/FilterModal';
import QueryBuilderModal from '../components/QueryBuilderModal';
import DatabaseTabs from '../components/DatabaseTabs';
import TableSidePanel from '../components/TableSidePanel';
import {
  SearchHeader,
  SearchControls,
  PermutationIndicator,
  ActiveFiltersAlert,
  ResultsSummary,
  ResultsGrid,
  PaginationFooter,
} from '../components/search';

// Hooks
import {
  useSearchState,
  usePagination,
  useTableLoading,
  useURLSync,
  useSearchResults,
} from '../hooks';

// Context & Utils
import { useTableContext, PANEL_EXPANDED_WIDTH, PANEL_COLLAPSED_WIDTH } from '../context/TableContext';
import { getDatabaseMetadata } from '../data/mockDatabaseNew';
import { getExpandedQueryInfo } from '../utils/searchUtils';

/**
 * SearchResultsPage Component
 * Orchestrates search functionality using extracted hooks and components
 *
 * Reduced from 1208 lines to ~350 lines through modularization
 */
const SearchResultsPage = () => {
  const navigate = useNavigate();
  const resultsContainerRef = useRef(null);

  // Modal states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isQueryBuilderOpen, setIsQueryBuilderOpen] = useState(false);
  const [activeDatabase, setActiveDatabase] = useState('db1');
  const [pendingScrollTableId, setPendingScrollTableId] = useState(null);
  const [visibleTableIds, setVisibleTableIds] = useState([]);

  // Global context
  const {
    matchingTableIds,
    setMatchingTableIds,
    updateTableOrder,
    lastSearchSignature,
    setLastSearchSignature,
    isSidePanelCollapsed,
    toggleSidePanel,
  } = useTableContext();

  // Custom hooks
  const searchState = useSearchState();
  const pagination = usePagination();
  const tableLoading = useTableLoading();
  const urlSync = useURLSync();

  // Get database metadata
  const databaseMetadata = getDatabaseMetadata();

  // Calculate current page and visible table IDs
  const currentPage = pagination.getCurrentPage(activeDatabase);
  const currentPageTableIds = useMemo(() => {
    const tableIds = matchingTableIds[activeDatabase] || [];
    return pagination.getVisibleTableIds(tableIds, currentPage);
  }, [matchingTableIds, activeDatabase, currentPage, pagination]);

  // Update visible table IDs when they change
  useEffect(() => {
    setVisibleTableIds(currentPageTableIds);
  }, [currentPageTableIds]);

  // Search results hook
  const { isSearching, isLoadingTableData, tableDataCache } = useSearchResults({
    searchQuery: searchState.searchQuery,
    filters: searchState.filters,
    permutationId: searchState.permutationId,
    permutationParams: searchState.permutationParams,
    activeDatabase,
    visibleTableIds,
    matchingTableIds,
    setMatchingTableIds,
    lastSearchSignature,
    setLastSearchSignature,
    tableLoadingHook: tableLoading,
  });

  // Initialize state from URL params
  // Convert searchParams to string to ensure effect re-runs on URL changes
  const searchParamsString = urlSync.searchParams.toString();

  useEffect(() => {
    const params = urlSync.readParamsFromURL();
    searchState.initializeSearchState({
      query: params.query,
      inputValue: params.query,
      filters: params.filters,
      permutationId: params.permutation,
      permutationParams: params.permutationParams,
    });
    pagination.setPage(activeDatabase, params.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsString, activeDatabase]); // Re-run when URL or database changes

  // Calculate sidebar offset
  const sidebarWidth = isSidePanelCollapsed ? PANEL_COLLAPSED_WIDTH : PANEL_EXPANDED_WIDTH;
  const sidebarOffset = sidebarWidth + 48;

  // Get expanded query info
  const appliedPermutationId = urlSync.searchParams.get('permutation') || 'none';
  const appliedPermutationParamsStr = urlSync.searchParams.get('permutationParams') || '';
  const appliedPermutationParams = useMemo(() => {
    return appliedPermutationParamsStr ? JSON.parse(appliedPermutationParamsStr) : {};
  }, [appliedPermutationParamsStr]);

  const expandedQueryInfo = useMemo(() => {
    return getExpandedQueryInfo(
      searchState.searchQuery,
      appliedPermutationId,
      appliedPermutationParams
    );
  }, [searchState.searchQuery, appliedPermutationId, appliedPermutationParams]);

  // Calculate table counts and totals
  const tableCounts = useMemo(() => ({
    db1: matchingTableIds.db1.length,
    db2: matchingTableIds.db2.length,
    db3: matchingTableIds.db3.length,
    db4: matchingTableIds.db4.length,
  }), [matchingTableIds]);

  const totalTablesWithResults = useMemo(
    () => Object.values(tableCounts).reduce((sum, count) => sum + count, 0),
    [tableCounts]
  );

  const totalPages = pagination.getTotalPages(tableCounts[activeDatabase]);
  const currentDatabaseInfo = useMemo(
    () => databaseMetadata.find(db => db.id === activeDatabase),
    [activeDatabase, databaseMetadata]
  );

  // Scroll to table card
  const focusTableCard = useCallback((tableId) => {
    if (!tableId) return;

    const element = document.getElementById(`table-card-${tableId}`);
    if (element) {
      const elementRect = element.getBoundingClientRect();
      const absoluteElementTop = elementRect.top + window.pageYOffset;
      const headerHeight = 280;
      const scrollPosition = absoluteElementTop - headerHeight;

      window.scrollTo({
        top: Math.max(0, scrollPosition),
        behavior: 'smooth',
      });
    }
  }, []);

  // Handle pending scroll
  useEffect(() => {
    if (!pendingScrollTableId) return;
    if (visibleTableIds.includes(pendingScrollTableId)) {
      focusTableCard(pendingScrollTableId);
      setPendingScrollTableId(null);
    }
  }, [pendingScrollTableId, visibleTableIds, focusTableCard]);

  // Event Handlers
  const handleBackToHome = () => navigate('/');

  const handleSearch = (query) => {
    const searchQuery = query || searchState.inputValue;
    pagination.resetAllPages();
    urlSync.updateURL({
      query: searchQuery,
      page: 1,
      permutationId: searchState.permutationId,
      permutationParams: searchState.permutationParams,
      filters: searchState.filters,
    });
  };

  const handleApplyFilters = (newFilters) => {
    searchState.setFilters(newFilters);
    pagination.resetAllPages();
    urlSync.updateURL({
      query: searchState.inputValue,
      page: 1,
      permutationId: searchState.permutationId,
      permutationParams: searchState.permutationParams,
      filters: newFilters,
    });
  };

  const handleRemoveFilter = (filterKey) => {
    const newFilters = { ...searchState.filters };
    if (filterKey === 'selectedTables') {
      newFilters.selectedTables = [];
    } else if (['year', 'category', 'country'].includes(filterKey)) {
      newFilters[filterKey] = 'all';
    } else {
      newFilters[filterKey] = '';
    }
    handleApplyFilters(newFilters);
  };

  const handlePermutationChange = (newPermutationId) => {
    searchState.setPermutationId(newPermutationId);
    pagination.resetAllPages();
    urlSync.updateURL({
      query: searchState.inputValue,
      page: 1,
      permutationId: newPermutationId,
      permutationParams: searchState.permutationParams,
      filters: searchState.filters,
    });
  };

  const handlePermutationParamsChange = (newParams) => {
    searchState.setPermutationParams(newParams);
  };

  const handlePageChange = useCallback((event, newPage) => {
    pagination.setPage(activeDatabase, newPage);
    urlSync.updateURL({
      query: searchState.searchQuery,
      page: newPage,
      permutationId: searchState.permutationId,
      permutationParams: searchState.permutationParams,
      filters: searchState.filters,
    });

    if (resultsContainerRef.current) {
      resultsContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeDatabase, pagination, urlSync, searchState, resultsContainerRef]);

  const handleDatabaseChange = (newDbId) => {
    setActiveDatabase(newDbId);
    const newDbPage = pagination.getCurrentPage(newDbId);
    urlSync.updateURL({
      query: searchState.searchQuery,
      page: newDbPage,
      permutationId: searchState.permutationId,
      permutationParams: searchState.permutationParams,
      filters: searchState.filters,
    });
  };

  const handleQueryBuilderApply = (queryString) => {
    searchState.setInputValue(queryString);
    handleSearch(queryString);
    setIsQueryBuilderOpen(false);
  };

  const handleSendToLastPage = useCallback((tableId) => {
    updateTableOrder(activeDatabase, (currentIds = []) => {
      const index = currentIds.indexOf(tableId);
      if (index === -1) return currentIds;

      const nextOrder = [...currentIds];
      nextOrder.splice(index, 1);
      nextOrder.push(tableId);
      return nextOrder;
    });
  }, [activeDatabase, updateTableOrder]);

  const handleSidePanelSelect = useCallback((tableId) => {
    const allIds = matchingTableIds[activeDatabase] || [];
    const targetIndex = allIds.indexOf(tableId);
    if (targetIndex === -1) return;

    const targetPage = Math.floor(targetIndex / pagination.TABLES_PER_PAGE) + 1;
    if (targetPage !== currentPage) {
      setPendingScrollTableId(tableId);
      handlePageChange(null, targetPage);
      return;
    }
    focusTableCard(tableId);
  }, [matchingTableIds, activeDatabase, currentPage, handlePageChange, focusTableCard, pagination]);

  // Determine empty state type
  const getEmptyStateType = () => {
    const hasFilters = Object.values(searchState.filters).some(v => {
      if (Array.isArray(v)) return v.length > 0;
      return v && v !== 'all';
    });
    const hasSearch = searchState.searchQuery.trim() !== '';
    const currentTableCount = matchingTableIds[activeDatabase]?.length || 0;

    if (currentTableCount === 0 && !hasFilters && !hasSearch) return 'empty-database';
    if (hasFilters && currentTableCount === 0) return 'filter-empty';
    return 'no-results';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ position: 'absolute', width: '100%', minHeight: '100vh' }}
    >
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', pb: totalPages > 1 ? 10 : 6 }}>
        {/* Sticky Header */}
        <Paper
          elevation={1}
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backgroundColor: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: 0,
          }}
        >
          <Container maxWidth="xl">
            <Box sx={{ py: 2 }}>
              <SearchHeader onBackToHome={handleBackToHome} />

              <SearchControls
                permutationId={searchState.permutationId}
                permutationParams={searchState.permutationParams}
                onPermutationChange={handlePermutationChange}
                onPermutationParamsChange={handlePermutationParamsChange}
                onFilterClick={() => setIsFilterOpen(true)}
                onQueryBuilderClick={() => setIsQueryBuilderOpen(true)}
              />

              {/* Search Bar */}
              <motion.div
                initial={{ opacity: 1, y: 200 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 1, y: 200 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                <Paper
                  elevation={3}
                  sx={{
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    p: 1.75,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  }}
                >
                  <SearchBar
                    value={searchState.inputValue}
                    onChange={searchState.setInputValue}
                    onSubmit={handleSearch}
                    onFilterClick={() => setIsFilterOpen(true)}
                    onQueryBuilderClick={() => setIsQueryBuilderOpen(true)}
                    variant="compact"
                  />
                </Paper>
              </motion.div>

              <DatabaseTabs
                databases={databaseMetadata}
                activeDatabase={activeDatabase}
                onChange={handleDatabaseChange}
                tableCounts={tableCounts}
              />
            </Box>
          </Container>
        </Paper>

        {/* Fixed Side Panel */}
        <TableSidePanel
          databaseId={activeDatabase}
          databaseName={currentDatabaseInfo?.name}
          tableIds={matchingTableIds[activeDatabase] || []}
          visibleTableIds={visibleTableIds}
          pendingTableIds={tableLoading.getPendingTableIds()}
          isSearching={isSearching}
          onSelectTable={handleSidePanelSelect}
          isCollapsed={isSidePanelCollapsed}
          onToggleCollapse={toggleSidePanel}
        />

        {/* Results Content */}
        <Box
          sx={{
            ml: { xs: 0, lg: `${sidebarOffset}px` },
            transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            width: { xs: '100%', lg: `calc(100% - ${sidebarOffset}px)` },
          }}
        >
          <Container maxWidth="xl" sx={{ mt: 4 }} ref={resultsContainerRef}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'stretch' }}>
              <Box sx={{ flex: 1, width: '100%' }}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <PermutationIndicator
                    permutationId={appliedPermutationId}
                    expandedQueryInfo={expandedQueryInfo}
                  />

                  <ActiveFiltersAlert
                    filters={searchState.filters}
                    onRemoveFilter={handleRemoveFilter}
                  />

                  <ResultsSummary
                    currentDatabaseInfo={currentDatabaseInfo}
                    searchQuery={searchState.searchQuery}
                    totalTablesWithResults={totalTablesWithResults}
                    currentDatabaseTableCount={tableCounts[activeDatabase]}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    isSearching={isSearching}
                  />

                  <ResultsGrid
                    isSearching={isSearching}
                    visibleTableIds={visibleTableIds}
                    tableDataCache={tableDataCache}
                    pendingTableIdsRef={tableLoading.pendingTableIdsRef}
                    searchQuery={searchState.searchQuery}
                    permutationId={appliedPermutationId}
                    permutationParams={appliedPermutationParams}
                    onSendToLastPage={handleSendToLastPage}
                    emptyStateType={getEmptyStateType()}
                  />
                </motion.div>
              </Box>
            </Box>
          </Container>
        </Box>

        {/* Pagination Footer */}
        <PaginationFooter
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          isLoadingTableData={isLoadingTableData}
          sidebarOffset={sidebarOffset}
        />

        {/* Modals */}
        <FilterModal
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          onApply={handleApplyFilters}
          initialFilters={searchState.filters}
        />

        <QueryBuilderModal
          open={isQueryBuilderOpen}
          onClose={() => setIsQueryBuilderOpen(false)}
          onApply={handleQueryBuilderApply}
          initialQuery={searchState.inputValue}
        />
      </Box>
    </motion.div>
  );
};

export default SearchResultsPage;
