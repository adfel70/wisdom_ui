import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Paper } from '@mui/material';
import { motion } from 'framer-motion';

// Components
import FilterModal from '../components/FilterModal';
import QueryBuilderModal from '../components/QueryBuilderModal';
import DatabaseTabs from '../components/DatabaseTabs';
import TableSidePanel from '../components/TableSidePanel';
import {
  BrandHeader,
  SearchSection,
  PermutationIndicator,
  ActiveFiltersAlert,
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
  useTablePagination,
} from '../hooks';

// Context & Utils
import { useTableContext, PANEL_EXPANDED_WIDTH, PANEL_COLLAPSED_WIDTH } from '../context/TableContext';
import { getDatabaseMetadata, getTableDataPaginatedById, getPermutations } from '../api/backendClient';
import { getExpandedQueryInfo, queryJSONToString, queryStringToJSON, extractTermsFromQuery } from '../utils/searchUtils';

const STATIC_DATABASES = [
  { id: 'db1', name: 'Sales Database', description: 'Contains sales transactions, inventory, and customer data' },
  { id: 'db2', name: 'HR & Personnel', description: 'Human resources and employee management data' },
  { id: 'db3', name: 'Marketing Analytics', description: 'Marketing campaigns, leads, and analytics data' },
  { id: 'db4', name: 'Legacy Archives', description: 'Historical data and archived records' },
];

/**
 * SearchResultsPage Component
 * Orchestrates search functionality using extracted hooks and components
 *
 * Reduced from 1208 lines to ~350 lines through modularization
 */
const SearchResultsPage = () => {
  const navigate = useNavigate();
  const resultsContainerRef = useRef(null);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(280); // Fallback height
  // Normalize query strings for comparisons (case- and whitespace-insensitive)
  const normalizeQueryString = (str) =>
    (str || '').replace(/\s+/g, '').toLowerCase();

  // Merge BDT selections from a previous query into a new parsed query (sequential clause mapping)
  const mergeBdtIntoQuery = (prevQuery, nextQuery) => {
    if (!Array.isArray(prevQuery) || !Array.isArray(nextQuery)) return null;

    const normalizeVal = (v) => (v || '').trim().toLowerCase();

    const collectClauses = (elements, bucket) => {
      if (!elements) return;
      elements.forEach(el => {
        if (el.type === 'clause') {
          bucket.push(el);
        } else if (el.type === 'subQuery') {
          collectClauses(el.content?.elements, bucket);
        }
      });
    };

    const prevClauses = [];
    const nextClauses = [];
    collectClauses(prevQuery, prevClauses);
    collectClauses(nextQuery, nextClauses);

    if (prevClauses.length === 0 || nextClauses.length === 0) {
      return nextQuery;
    }

    const usedPrev = new Set();
    const pickBdt = (value, fallbackIdx) => {
      const norm = normalizeVal(value);

      let matchIdx = prevClauses.findIndex((c, idx) =>
        !usedPrev.has(idx) && normalizeVal(c.content?.value) === norm
      );

      if (matchIdx === -1 && typeof fallbackIdx === 'number' && fallbackIdx < prevClauses.length && !usedPrev.has(fallbackIdx)) {
        matchIdx = fallbackIdx;
      }

      if (matchIdx === -1) return null;
      usedPrev.add(matchIdx);
      return prevClauses[matchIdx]?.content?.bdt ?? null;
    };

    let idx = 0;
    const apply = (elements) =>
      elements.map(el => {
        if (el.type === 'clause') {
          const merged = {
            ...el,
            content: {
              ...el.content,
              bdt: pickBdt(el.content?.value, idx),
            },
          };
          idx += 1;
          return merged;
        }
        if (el.type === 'subQuery') {
          return {
            ...el,
            content: {
              ...el.content,
              elements: apply(el.content?.elements || []),
            },
          };
        }
        return el;
      });

    return apply(nextQuery);
  };

  // Update header height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Modal states
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isQueryBuilderOpen, setIsQueryBuilderOpen] = useState(false);
  const [activeDatabase, setActiveDatabase] = useState('db1');
  const [pendingScrollTableId, setPendingScrollTableId] = useState(null);
  const [visibleTableIds, setVisibleTableIds] = useState([]);
  const [cacheUpdateCounter, setCacheUpdateCounter] = useState(0);
  const [permutationVariants, setPermutationVariants] = useState(null);
  const [draftQueryJSON, setDraftQueryJSON] = useState([]);
  const [filtersByDb, setFiltersByDb] = useState({
    db1: {},
    db2: {},
    db3: {},
    db4: {},
  });

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
  const tablePagination = useTablePagination();

  // Get database metadata from backend
  const [databaseMetadata, setDatabaseMetadata] = useState(STATIC_DATABASES);
  useEffect(() => {
    let isMounted = true;
    getDatabaseMetadata()
      .then((data) => {
        if (isMounted) {
          const next = (data && data.length) ? data : STATIC_DATABASES;
          setDatabaseMetadata(next);
        }
      })
      .catch((error) => {
        console.error('Failed to load database metadata:', error);
        // Keep static defaults on failure
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Calculate current page and visible table IDs
  const currentPage = pagination.getCurrentPage(activeDatabase);
  const activeFilters = filtersByDb[activeDatabase] || {};

  // Update visible table IDs when dependencies change
  useEffect(() => {
    const tableIds = matchingTableIds[activeDatabase] || [];
    const startIndex = (currentPage - 1) * 6; // TABLES_PER_PAGE
    const endIndex = startIndex + 6;
    const pageTableIds = tableIds.slice(startIndex, endIndex);
    setVisibleTableIds(pageTableIds);
  }, [matchingTableIds, activeDatabase, currentPage]);

  // Search results hook
  const { isSearching, isLoadingTableData, tableDataCache } = useSearchResults({
    searchQuery: searchState.searchQuery,
    filters: activeFilters,
    perDbFilters: filtersByDb,
    permutationId: searchState.permutationId,
    permutationParams: searchState.permutationParams,
    activeDatabase,
    visibleTableIds,
    matchingTableIds,
    setMatchingTableIds,
    lastSearchSignature,
    setLastSearchSignature,
    tableLoadingHook: tableLoading,
    tablePaginationHook: tablePagination,
  });

  // Initialize state from URL params
  // Convert searchParams to string to ensure effect re-runs on URL changes
  const searchParamsString = urlSync.searchParams.toString();

  const hasHydratedFromUrl = useRef(false);
  useEffect(() => {
    if (hasHydratedFromUrl.current) return;
    const params = urlSync.readParamsFromURL();
    searchState.initializeSearchState({
      query: params.query,
      inputValue: queryJSONToString(params.query), // Convert JSON to string for display
      filters: params.filters,
      permutationId: params.permutation,
      permutationParams: params.permutationParams,
    });
    setFiltersByDb(prev => ({
      ...prev,
      [activeDatabase]: params.filters || {},
    }));
    pagination.setPage(activeDatabase, params.page);
    hasHydratedFromUrl.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsString]);

  // Keep draft query JSON aligned with committed search query (used for token hydration)
  useEffect(() => {
    if (Array.isArray(searchState.searchQuery)) {
      setDraftQueryJSON(searchState.searchQuery);
    } else {
      setDraftQueryJSON([]);
    }
  }, [searchState.searchQuery]);

  // Load permutation variants from backend for highlighting/indicator
  useEffect(() => {
    let isCancelled = false;

    const loadPermutations = async () => {
      if (!Array.isArray(searchState.searchQuery) || searchState.searchQuery.length === 0 || searchState.permutationId === 'none') {
        if (!isCancelled) {
          setPermutationVariants(null);
        }
        return;
      }

      const terms = extractTermsFromQuery(searchState.searchQuery);
      if (!terms.length) {
        if (!isCancelled) {
          setPermutationVariants(null);
        }
        return;
      }

      try {
        const variants = await getPermutations(searchState.permutationId, terms, searchState.permutationParams);
        if (!isCancelled) {
          setPermutationVariants(variants && Object.keys(variants).length ? variants : null);
        }
      } catch (error) {
        console.error('Failed to fetch permutations:', error);
        if (!isCancelled) {
          setPermutationVariants(null);
        }
      }
    };

    loadPermutations();

    return () => {
      isCancelled = true;
    };
  }, [searchState.searchQuery, searchState.permutationId, JSON.stringify(searchState.permutationParams)]);

  // Keep filters map in sync with the active database filter state
  useEffect(() => {
    setFiltersByDb(prev => {
      const existing = prev[activeDatabase] || {};
      const next = searchState.filters || {};
      if (JSON.stringify(existing) === JSON.stringify(next)) {
        return prev;
      }
      return { ...prev, [activeDatabase]: next };
    });
  }, [activeDatabase, searchState.filters]);

  // Calculate sidebar offset
  const sidebarWidth = isSidePanelCollapsed ? PANEL_COLLAPSED_WIDTH : PANEL_EXPANDED_WIDTH;
  const sidebarOffset = sidebarWidth;

  // Get expanded query info
  const appliedPermutationId = urlSync.searchParams.get('permutation') || 'none';
  const appliedPermutationParamsStr = urlSync.searchParams.get('permutationParams') || '';
  const appliedPermutationParams = useMemo(() => {
    return appliedPermutationParamsStr ? JSON.parse(appliedPermutationParamsStr) : {};
  }, [appliedPermutationParamsStr]);

  const expandedQueryInfo = useMemo(() => {
    if (permutationVariants && Object.keys(permutationVariants).length) {
      return permutationVariants;
    }

    return getExpandedQueryInfo(
      searchState.searchQuery,
      appliedPermutationId,
      appliedPermutationParams
    );
  }, [permutationVariants, searchState.searchQuery, appliedPermutationId, appliedPermutationParams]);

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
    // Handle both JSON array (from query builder) and string (from simple search)
    let queryJSON;

    const baseDraft = Array.isArray(draftQueryJSON) && draftQueryJSON.length
      ? draftQueryJSON
      : searchState.searchQuery;

    if (Array.isArray(query)) {
      // Already in JSON format
      queryJSON = query;
    } else if (typeof query === 'string' && query.trim()) {
      const parsed = queryStringToJSON(query);
      const merged = mergeBdtIntoQuery(baseDraft, parsed) || parsed;
      queryJSON = merged;
    } else {
      // No query string provided, use current input value
      const inputValue = searchState.inputValue;
      if (typeof inputValue === 'string' && inputValue.trim()) {
        const parsed = queryStringToJSON(inputValue);
        const merged = mergeBdtIntoQuery(baseDraft, parsed) || parsed;
        queryJSON = merged;
      } else if (Array.isArray(baseDraft) && baseDraft.length) {
        queryJSON = baseDraft;
      }
    }

    // Validate query is not empty
    if (!queryJSON || queryJSON.length === 0) {
      return;
    }

    // Keep local search state in sync (avoids waiting for URL re-read)
    searchState.setSearchQuery(queryJSON);
    setDraftQueryJSON(queryJSON);
    pagination.resetAllPages();
    urlSync.updateURL({
      query: queryJSON,
      page: 1,
      permutationId: searchState.permutationId,
      permutationParams: searchState.permutationParams,
      filters: activeFilters,
    });
  };

  const handleApplyFilters = (newFilters) => {
    const cleanedFilters = { ...(newFilters || {}) };

    // Remove empty arrays
    ['categories', 'regions', 'tableNames', 'tableYears', 'selectedTables'].forEach((key) => {
      if (Array.isArray(cleanedFilters[key]) && cleanedFilters[key].length === 0) {
        delete cleanedFilters[key];
      }
    });

    // Remove empty/neutral scalar values
    ['tableName', 'year', 'category', 'country', 'minDate', 'maxDate'].forEach((key) => {
      const val = cleanedFilters[key];
      if (val === undefined || val === null) {
        delete cleanedFilters[key];
        return;
      }
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === '' || trimmed.toLowerCase() === 'all') {
          delete cleanedFilters[key];
          return;
        }
        cleanedFilters[key] = trimmed;
      }
    });

    setFiltersByDb(prev => ({
      ...prev,
      [activeDatabase]: cleanedFilters,
    }));
    searchState.setFilters(cleanedFilters);
    pagination.resetAllPages();
    const currentQueryForUrl = searchState.searchQuery || searchState.inputValue;
    urlSync.updateURL({
      query: currentQueryForUrl,
      page: 1,
      permutationId: searchState.permutationId,
      permutationParams: searchState.permutationParams,
      filters: cleanedFilters,
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
      filters: activeFilters,
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
      filters: activeFilters,
    });

    if (resultsContainerRef.current) {
      resultsContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeDatabase, pagination, urlSync, searchState, resultsContainerRef, activeFilters]);

  const handleDatabaseChange = (newDbId) => {
    setActiveDatabase(newDbId);
    const newDbPage = pagination.getCurrentPage(newDbId);
    const newDbFilters = filtersByDb[newDbId] || {};
    searchState.setFilters(newDbFilters);
    urlSync.updateURL({
      query: searchState.searchQuery,
      page: newDbPage,
      permutationId: searchState.permutationId,
      permutationParams: searchState.permutationParams,
      filters: newDbFilters,
    });
  };

  const handleQueryBuilderApply = (queryJSON) => {
    // Query builder now returns JSON array
    // Convert to string for display in search input
    const displayString = queryJSONToString(queryJSON);
    searchState.setInputValue(displayString);
    // Store JSON to preserve BDT selections when the user re-submits
    searchState.setSearchQuery(queryJSON);
    handleSearch(queryJSON);
    setIsQueryBuilderOpen(false);
  };

  // Keep BDTs when the search input changes (e.g., transformations) by aligning with existing JSON
  const handleSearchChange = (value) => {
    searchState.setInputValue(value);

    const parsed = queryStringToJSON(value);
    const base = Array.isArray(draftQueryJSON) && draftQueryJSON.length
      ? draftQueryJSON
      : searchState.searchQuery;
    const merged = base ? (mergeBdtIntoQuery(base, parsed) || parsed) : parsed;
    setDraftQueryJSON(merged);
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

  const handleLoadMore = useCallback(async (tableId) => {
    // Get current pagination state for this table
    const paginationState = tablePagination.getPaginationState(tableId);

    if (!paginationState) {
      console.error('No pagination state found for table:', tableId);
      return;
    }

    // Set loading state
    tablePagination.setLoadingMore(tableId, true);

    try {
      // Backend handles batch-fetching to return exactly pageSize matching records
      const tableData = await getTableDataPaginatedById(
        tableId,
        paginationState,
        tablePagination.pageSize,
          searchState.searchQuery,
          searchState.filters
      );

      const newRecords = tableData.data;

      // Update the cache with new data
      const cachedTable = tableDataCache.current.get(tableId);
      if (cachedTable) {
        const updatedTable = {
          ...cachedTable,
          data: [...cachedTable.data, ...newRecords],
        };
        tableDataCache.current.set(tableId, updatedTable);
      }

      // Update pagination state (this also triggers re-render)
      tablePagination.appendRecords(tableId, newRecords, tableData.paginationInfo);

      // Force re-render by updating counter
      setCacheUpdateCounter(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load more records:', error);
    }
  }, [tablePagination, tableDataCache, searchState]);

  // Determine empty state type
  const getEmptyStateType = () => {
    const hasFilters = Object.values(searchState.filters).some(v => {
      if (Array.isArray(v)) return v.length > 0;
      return v && v !== 'all';
    });
    // Check if query is a non-empty array (new JSON format)
    const hasSearch = Array.isArray(searchState.searchQuery) && searchState.searchQuery.length > 0;
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
        <Box
          ref={headerRef}
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          {/* Brand Header - Dark Blue */}
          <BrandHeader onBackToHome={handleBackToHome} />

          {/* White Section - Search and Tabs */}
          <Paper
            elevation={1}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: 0,
            }}
          >
            <Container maxWidth="xl">
              <Box sx={{ py: 1.5 }}>
                <SearchSection
          searchValue={searchState.inputValue}
          onSearchChange={handleSearchChange}
                  onSearchSubmit={handleSearch}
                  onFilterClick={() => setIsFilterOpen(true)}
                  onQueryBuilderClick={() => setIsQueryBuilderOpen(true)}
                  queryJSON={draftQueryJSON}
                  permutationId={searchState.permutationId}
                  permutationParams={searchState.permutationParams}
                  onPermutationChange={handlePermutationChange}
                  onPermutationParamsChange={handlePermutationParamsChange}
                />

                <DatabaseTabs
                  databases={databaseMetadata}
                  activeDatabase={activeDatabase}
                  onChange={handleDatabaseChange}
                  tableCounts={tableCounts}
                />
              </Box>
            </Container>
          </Paper>
        </Box>

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
          topOffset={headerHeight}
          appliedFilters={filtersByDb[activeDatabase] || {}}
          onApplyFilters={handleApplyFilters}
          facetSearchQuery={searchState.searchQuery}
        />

        {/* Results Content */}
        <Box
          sx={{
            ml: { xs: 0, lg: `${sidebarOffset}px` },
            transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            width: { xs: '100%', lg: `calc(100% - ${sidebarOffset}px)` },
          }}
        >
          <Container maxWidth={false} sx={{ mt: 4, px: { xs: 3, md: 8 } }} ref={resultsContainerRef}>
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

                  <ResultsGrid
                    isSearching={isSearching}
                    visibleTableIds={visibleTableIds}
                    tableDataCache={tableDataCache}
                    pendingTableIdsRef={tableLoading.pendingTableIdsRef}
                    searchQuery={searchState.searchQuery}
                    permutationId={appliedPermutationId}
                    permutationParams={appliedPermutationParams}
                    permutationVariants={expandedQueryInfo}
                    onSendToLastPage={handleSendToLastPage}
                    emptyStateType={getEmptyStateType()}
                    tablePaginationHook={tablePagination}
                    onLoadMore={handleLoadMore}
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
          initialQuery={
            (Array.isArray(draftQueryJSON) && draftQueryJSON.length)
              ? draftQueryJSON
              : (Array.isArray(searchState.searchQuery)
                ? searchState.searchQuery
                : queryStringToJSON(searchState.inputValue))
          }
        />
      </Box>
    </motion.div>
  );
};

export default SearchResultsPage;
