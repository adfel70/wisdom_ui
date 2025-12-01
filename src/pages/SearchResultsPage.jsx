import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  IconButton,
  Divider,
  CircularProgress,
  Chip,
  Stack,
  Alert,
  Button,
  Menu,
  MenuItem,
  Pagination,
} from '@mui/material';
import { Home as HomeIcon, FilterList, Shuffle, ChevronRight } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar from '../components/SearchBar';
import FilterModal from '../components/FilterModal';
import DatabaseTabs from '../components/DatabaseTabs';
import TableCard from '../components/TableCard';
import EmptyState from '../components/EmptyState';
import { getDatabaseMetadata, searchTablesByQuery, getMultipleTablesData } from '../data/mockDatabaseNew';
import { getExpandedQueryInfo } from '../utils/searchUtils';
import { PERMUTATION_FUNCTIONS, getPermutationMetadata } from '../utils/permutationUtils';
import { useTableContext } from '../context/TableContext';

const TABLES_PER_PAGE = 6;

/**
 * SearchResultsPage Component
 * Displays search results with database tabs and paginated tables
 *
 * IMPORTANT: Uses lazy loading with pagination (6 tables per page).
 * Step 1: Search to get matching table IDs
 * Step 2: Fetch data only for current page's tables
 */
const SearchResultsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resultsContainerRef = useRef(null);
  const isMountedRef = useRef(true);
  
  // Cache for loaded table data to avoid refetching
  const tableDataCache = useRef(new Map());

  // Use global context for matching table IDs to persist order
  const { 
    matchingTableIds, 
    setMatchingTableIds, 
    updateTableOrder, 
    lastSearchSignature,
    setLastSearchSignature
  } = useTableContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [activeDatabase, setActiveDatabase] = useState('db1');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [permutationId, setPermutationId] = useState('none');
  const [permutationParams, setPermutationParams] = useState({});
  const [permutationMenuAnchor, setPermutationMenuAnchor] = useState(null);
  const [nestedMenuPermutation, setNestedMenuPermutation] = useState(null);

  // Pagination state: store page number per database
  const [databasePages, setDatabasePages] = useState({
    db1: 1,
    db2: 1,
    db3: 1,
    db4: 1
  });

  // Store loaded table data (only for current page)
  const [loadedTables, setLoadedTables] = useState([]);

  // Loading states
  const [isSearching, setIsSearching] = useState(true); // Step 1: searching for table IDs
  const [isLoadingTableData, setIsLoadingTableData] = useState(false); // Step 2: loading table data
  const [, forcePendingRender] = useState(0);
  const pendingTableIdsRef = useRef(new Set());

  // Get database metadata (lightweight, no records)
  const databaseMetadata = getDatabaseMetadata();

  // Get selected permutation metadata
  const selectedPermutation = PERMUTATION_FUNCTIONS.find(p => p.id === permutationId);

  // Generate label for button
  const getPermutationLabel = () => {
    if (permutationId === 'none') return 'Permutations';
    const perm = PERMUTATION_FUNCTIONS.find(p => p.id === permutationId);
    if (!perm) return 'Permutations';

    // If has parameters, show them in label
    if (perm.parameters && perm.parameters.length > 0) {
      const paramLabels = perm.parameters.map(param => {
        const value = permutationParams[param.id] || param.default;
        const option = param.options.find(opt => opt.value === value);
        return option ? option.label.split(' ')[0] : ''; // Get just the first word (Low, Medium, High)
      }).filter(Boolean).join(', ');
      return `${perm.label}${paramLabels ? ` - ${paramLabels}` : ''}`;
    }

    return perm.label;
  };

  // Get current page for active database
  const currentPage = databasePages[activeDatabase] || 1;

  // Initialize from URL params
  useEffect(() => {
    const query = searchParams.get('q') || '';
    const permutation = searchParams.get('permutation') || 'none';
    const permParamsStr = searchParams.get('permutationParams') || '';
    const permParams = permParamsStr ? JSON.parse(permParamsStr) : {};
    const year = searchParams.get('year') || 'all';
    const category = searchParams.get('category') || 'all';
    const country = searchParams.get('country') || 'all';
    const tableName = searchParams.get('tableName') || '';
    const minDate = searchParams.get('minDate') || '';
    const maxDate = searchParams.get('maxDate') || '';
    const selectedTablesParam = searchParams.get('selectedTables') || '';
    const selectedTables = selectedTablesParam ? selectedTablesParam.split(',') : [];
    const pageParam = searchParams.get('page');
    const page = pageParam ? parseInt(pageParam, 10) : 1;

    setSearchQuery(query);
    setInputValue(query);
    setPermutationId(permutation);
    setPermutationParams(permParams);
    setFilters({
      year: year !== 'all' ? year : 'all',
      category: category !== 'all' ? category : 'all',
      country: country !== 'all' ? country : 'all',
      tableName: tableName || '',
      minDate: minDate || '',
      maxDate: maxDate || '',
      selectedTables: selectedTables,
    });

    // Update page for active database from URL
    setDatabasePages(prev => ({
      ...prev,
      [activeDatabase]: page
    }));
  }, [searchParams, activeDatabase]);

  // Helpers to track per-table loading states so unaffected cards never remount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const addPendingTableIds = useCallback((ids) => {
    if (!ids || ids.length === 0) return;
    const pendingSet = pendingTableIdsRef.current;
    let changed = false;
    ids.forEach(id => {
      if (!pendingSet.has(id)) {
        pendingSet.add(id);
        changed = true;
      }
    });
    if (changed && isMountedRef.current) {
      forcePendingRender(tick => tick + 1);
    }
  }, [forcePendingRender]);

  const removePendingTableIds = useCallback((ids) => {
    if (!ids || ids.length === 0) return;
    const pendingSet = pendingTableIdsRef.current;
    let changed = false;
    ids.forEach(id => {
      if (pendingSet.has(id)) {
        pendingSet.delete(id);
        changed = true;
      }
    });
    if (changed && isMountedRef.current) {
      forcePendingRender(tick => tick + 1);
    }
  }, [forcePendingRender]);

  // Get applied permutation from URL params (not state) to ensure it matches current results
  const appliedPermutationId = searchParams.get('permutation') || 'none';
  const appliedPermutationParamsStr = searchParams.get('permutationParams') || '';
  const appliedPermutationParams = useMemo(() => {
    return appliedPermutationParamsStr ? JSON.parse(appliedPermutationParamsStr) : {};
  }, [appliedPermutationParamsStr]);

  // Step 1: Search all databases for matching table IDs
  useEffect(() => {
    let isCancelled = false;

    // Create a signature for the current search criteria
    const currentSignature = JSON.stringify({
      query: searchQuery,
      filters,
      permutationId: appliedPermutationId,
      permutationParams: appliedPermutationParamsStr
    });

    const searchAllDatabases = async () => {
      // If we already have results for this exact search, don't re-run it
      // This preserves manual ordering changes within the same search context
      if (lastSearchSignature === currentSignature && matchingTableIds[activeDatabase].length > 0) {
         setIsSearching(false);
         return;
      }
      
      setIsSearching(true);
      try {
        // Search all databases in parallel
        const searchPromises = ['db1', 'db2', 'db3', 'db4'].map(dbId =>
          searchTablesByQuery(dbId, searchQuery, filters, appliedPermutationId, appliedPermutationParams)
        );

        const results = await Promise.all(searchPromises);

        if (!isCancelled) {
          // Update global context state
          setMatchingTableIds({
            db1: results[0].tableIds,
            db2: results[1].tableIds,
            db3: results[2].tableIds,
            db4: results[3].tableIds
          });
          
          setLastSearchSignature(currentSignature);
          
          // Clear cache on new search
          tableDataCache.current.clear();
        }
      } catch (error) {
        console.error('Failed to search databases:', error);
        if (!isCancelled) {
          setMatchingTableIds({
            db1: [],
            db2: [],
            db3: [],
            db4: []
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
  }, [searchQuery, filters, appliedPermutationId, appliedPermutationParamsStr, activeDatabase]); // Added activeDatabase to dependencies but logic handles global state

  // Step 2: Load table data for current page of active database
  useEffect(() => {
    let isCancelled = false;

    const loadCurrentPageData = async () => {
      const tableIds = matchingTableIds[activeDatabase] || [];
      if (tableIds.length === 0) {
        setLoadedTables([]);
        return;
      }

      let needsFetch = false;
      let idsToFetch = [];

      try {
        // Calculate which tables to load for current page
        const startIndex = (currentPage - 1) * TABLES_PER_PAGE;
        const endIndex = startIndex + TABLES_PER_PAGE;
        const pageTableIds = tableIds.slice(startIndex, endIndex);

        // Identify which tables are not in cache
        idsToFetch = pageTableIds.filter(id => !tableDataCache.current.has(id));
        needsFetch = idsToFetch.length > 0;

        if (needsFetch) {
          addPendingTableIds(idsToFetch);
          setIsLoadingTableData(true);
        }

        // Fetch missing tables
        if (needsFetch) {
          const newTables = await getMultipleTablesData(idsToFetch);
          newTables.forEach(t => tableDataCache.current.set(t.id, t));
        }

        if (!isCancelled) {
          // Construct loaded tables list from cache
          const currentTables = pageTableIds
            .map(id => tableDataCache.current.get(id))
            .filter(Boolean);
          
          setLoadedTables(currentTables);
        }
      } catch (error) {
        console.error('Failed to load table data:', error);
        if (!isCancelled) {
           // Keep existing loaded tables if possible, or clear? 
           // Better to not break UI completely, but for now we follow existing pattern
           // In a real app we might show an error toast.
           // setLoadedTables([]); 
        }
      } finally {
        if (needsFetch) {
          removePendingTableIds(idsToFetch);
          if (!isCancelled) {
            setIsLoadingTableData(false);
          }
        }
      }
    };

    loadCurrentPageData();

    return () => {
      isCancelled = true;
    };
  }, [activeDatabase, currentPage, matchingTableIds]);

  // Calculate table counts for all databases
  const tableCounts = useMemo(() => {
    return {
      db1: matchingTableIds.db1.length,
      db2: matchingTableIds.db2.length,
      db3: matchingTableIds.db3.length,
      db4: matchingTableIds.db4.length
    };
  }, [matchingTableIds]);

  // Calculate total tables with results across all databases
  const totalTablesWithResults = useMemo(() => {
    return Object.values(tableCounts).reduce((sum, count) => sum + count, 0);
  }, [tableCounts]);

  // Calculate total pages for current database
  const totalPages = useMemo(() => {
    const tableIds = matchingTableIds[activeDatabase] || [];
    return Math.ceil(tableIds.length / TABLES_PER_PAGE);
  }, [matchingTableIds, activeDatabase]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      (filters.year && filters.year !== 'all') ||
      (filters.category && filters.category !== 'all') ||
      (filters.country && filters.country !== 'all') ||
      filters.tableName ||
      filters.minDate ||
      filters.maxDate ||
      (filters.selectedTables && filters.selectedTables.length > 0)
    );
  }, [filters]);

  // Get expanded query information for permutations
  const expandedQueryInfo = useMemo(() => {
    return getExpandedQueryInfo(searchQuery, appliedPermutationId, appliedPermutationParams);
  }, [searchQuery, appliedPermutationId, appliedPermutationParams, searchParams]);

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleSearch = (query) => {
    // Accept query from SearchBar or use inputValue as fallback
    const searchQuery = query || inputValue;

    // Reset all database pages to 1 on new search
    setDatabasePages({
      db1: 1,
      db2: 1,
      db3: 1,
      db4: 1
    });

    // Update search query and URL params (page resets to 1)
    const params = new URLSearchParams({ q: searchQuery, page: '1' });

    // Add permutation if selected
    if (permutationId && permutationId !== 'none') {
      params.append('permutation', permutationId);

      // Add permutation parameters if any
      if (Object.keys(permutationParams).length > 0) {
        params.append('permutationParams', JSON.stringify(permutationParams));
      }
    }

    // Add current filters to URL
    if (filters.year && filters.year !== 'all') {
      params.append('year', filters.year);
    }
    if (filters.category && filters.category !== 'all') {
      params.append('category', filters.category);
    }
    if (filters.country && filters.country !== 'all') {
      params.append('country', filters.country);
    }
    if (filters.tableName) {
      params.append('tableName', filters.tableName);
    }
    if (filters.minDate) {
      params.append('minDate', filters.minDate);
    }
    if (filters.maxDate) {
      params.append('maxDate', filters.maxDate);
    }
    if (filters.selectedTables && filters.selectedTables.length > 0) {
      params.append('selectedTables', filters.selectedTables.join(','));
    }

    navigate(`/search?${params.toString()}`, { replace: true });
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);

    // Reset all database pages to 1 when filters change
    setDatabasePages({
      db1: 1,
      db2: 1,
      db3: 1,
      db4: 1
    });

    // Update URL with new filters (use inputValue to preserve current input)
    const params = new URLSearchParams({ q: inputValue, page: '1' });

    // Add permutation if selected
    if (permutationId && permutationId !== 'none') {
      params.append('permutation', permutationId);

      // Add permutation parameters if any
      if (Object.keys(permutationParams).length > 0) {
        params.append('permutationParams', JSON.stringify(permutationParams));
      }
    }

    if (newFilters.year && newFilters.year !== 'all') {
      params.append('year', newFilters.year);
    }
    if (newFilters.category && newFilters.category !== 'all') {
      params.append('category', newFilters.category);
    }
    if (newFilters.country && newFilters.country !== 'all') {
      params.append('country', newFilters.country);
    }
    if (newFilters.tableName) {
      params.append('tableName', newFilters.tableName);
    }
    if (newFilters.minDate) {
      params.append('minDate', newFilters.minDate);
    }
    if (newFilters.maxDate) {
      params.append('maxDate', newFilters.maxDate);
    }
    if (newFilters.selectedTables && newFilters.selectedTables.length > 0) {
      params.append('selectedTables', newFilters.selectedTables.join(','));
    }
    navigate(`/search?${params.toString()}`, { replace: true });
  };

  const handlePermutationChange = (newPermutationId) => {
    // Update permutation state
    setPermutationId(newPermutationId);

    // Reset all database pages to 1 when permutation changes
    setDatabasePages({
      db1: 1,
      db2: 1,
      db3: 1,
      db4: 1
    });

    // Trigger a new search with current input value (like clicking search button)
    // This ensures we use the latest search bar state
    const params = new URLSearchParams({ q: inputValue, page: '1' });

    // Add permutation if selected
    if (newPermutationId && newPermutationId !== 'none') {
      params.append('permutation', newPermutationId);

      // Add permutation parameters if any
      if (Object.keys(permutationParams).length > 0) {
        params.append('permutationParams', JSON.stringify(permutationParams));
      }
    }

    // Add current filters to URL
    if (filters.year && filters.year !== 'all') {
      params.append('year', filters.year);
    }
    if (filters.category && filters.category !== 'all') {
      params.append('category', filters.category);
    }
    if (filters.country && filters.country !== 'all') {
      params.append('country', filters.country);
    }
    if (filters.tableName) {
      params.append('tableName', filters.tableName);
    }
    if (filters.minDate) {
      params.append('minDate', filters.minDate);
    }
    if (filters.maxDate) {
      params.append('maxDate', filters.maxDate);
    }
    if (filters.selectedTables && filters.selectedTables.length > 0) {
      params.append('selectedTables', filters.selectedTables.join(','));
    }

    navigate(`/search?${params.toString()}`, { replace: true });
  };

  // Handle page change
  const handlePageChange = (event, newPage) => {
    // Update page for current database
    setDatabasePages(prev => ({
      ...prev,
      [activeDatabase]: newPage
    }));

    // Update URL with new page
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    navigate(`/search?${params.toString()}`, { replace: true });

    // Scroll to top
    if (resultsContainerRef.current) {
      resultsContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle database tab change (preserve page number per database)
  const handleDatabaseChange = (newDbId) => {
    setActiveDatabase(newDbId);

    // Update URL with page for the new database
    const params = new URLSearchParams(searchParams);
    const newDbPage = databasePages[newDbId] || 1;
    params.set('page', newDbPage.toString());
    navigate(`/search?${params.toString()}`, { replace: true });
  };

  const handleSendToLastPage = useCallback((tableId) => {
    updateTableOrder(activeDatabase, (currentIds = []) => {
      const index = currentIds.indexOf(tableId);
      if (index === -1) {
        return currentIds;
      }

      const nextOrder = [...currentIds];
      nextOrder.splice(index, 1);
      nextOrder.push(tableId);
      return nextOrder;
    });
  }, [activeDatabase, updateTableOrder]);

  // Determine empty state type
  const getEmptyStateType = () => {
    const hasFilters = Object.values(filters).some(v => {
      if (Array.isArray(v)) return v.length > 0;
      return v && v !== 'all';
    });
    const hasSearch = searchQuery.trim() !== '';
    const currentTableCount = matchingTableIds[activeDatabase]?.length || 0;

    if (currentTableCount === 0 && !hasFilters && !hasSearch) {
      return 'empty-database';
    }
    if (hasFilters && currentTableCount === 0) {
      return 'filter-empty';
    }
    return 'no-results';
  };

  // Get current database info
  const currentDatabaseInfo = useMemo(() => {
    return databaseMetadata.find(db => db.id === activeDatabase);
  }, [activeDatabase, databaseMetadata]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ position: 'absolute', width: '100%', minHeight: '100vh' }}
    >
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', pb: totalPages > 1 ? 10 : 6 }}>
        {/* Header */}
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
              {/* Top Bar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <IconButton
                    onClick={handleBackToHome}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'primary.main',
                        backgroundColor: 'primary.light',
                      },
                    }}
                  >
                    <HomeIcon />
                  </IconButton>

                  <Divider orientation="vertical" flexItem />

                  <Typography variant="h6" fontWeight={600} color="text.primary">
                    Wisdom UI
                  </Typography>

                  <Box sx={{ flex: 1 }} />

                  <Typography variant="body2" color="text.secondary">
                    Search Results
                  </Typography>
                </Box>
              </motion.div>

              {/* Action Buttons - Completely Outside */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mb: 0.75 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Shuffle />}
                    onClick={(e) => setPermutationMenuAnchor(e.currentTarget)}
                    sx={{
                      py: 0.35,
                      px: 1.25,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      borderRadius: '8px',
                      transition: 'all 0.2s',
                      textTransform: 'none',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                      },
                    }}
                  >
                    {getPermutationLabel()}
                  </Button>

                  <Menu
                    anchorEl={permutationMenuAnchor}
                    open={Boolean(permutationMenuAnchor)}
                    onClose={() => {
                      setPermutationMenuAnchor(null);
                      setNestedMenuPermutation(null);
                    }}
                  >
                    {PERMUTATION_FUNCTIONS.map((permutation) => (
                      <MenuItem
                        key={permutation.id}
                        onMouseEnter={(e) => {
                          if (permutation.parameters && permutation.parameters.length > 0) {
                            setNestedMenuPermutation({ permutation, anchorEl: e.currentTarget });
                          } else if (nestedMenuPermutation !== null) {
                            setNestedMenuPermutation(null);
                          }
                        }}
                        onClick={() => {
                          if (!permutation.parameters || permutation.parameters.length === 0) {
                            handlePermutationChange(permutation.id);
                            setPermutationParams({});
                            setPermutationMenuAnchor(null);
                            setNestedMenuPermutation(null);
                          }
                        }}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          minWidth: 250,
                          cursor: 'pointer'
                        }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {permutation.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {permutation.description}
                          </Typography>
                        </Box>
                        {permutation.parameters && permutation.parameters.length > 0 && (
                          <ChevronRight sx={{ ml: 2, color: 'text.secondary' }} />
                        )}
                      </MenuItem>
                    ))}
                  </Menu>

                  {/* Nested menu for parameters */}
                  {nestedMenuPermutation && nestedMenuPermutation.permutation.parameters && (
                    <Menu
                      anchorEl={nestedMenuPermutation.anchorEl}
                      open={Boolean(nestedMenuPermutation)}
                      onClose={() => setNestedMenuPermutation(null)}
                      anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                      }}
                      MenuListProps={{
                        onMouseLeave: () => setNestedMenuPermutation(null)
                      }}
                    >
                      {nestedMenuPermutation.permutation.parameters[0].options.map((option) => (
                        <MenuItem
                          key={option.value}
                          onClick={() => {
                            handlePermutationChange(nestedMenuPermutation.permutation.id);
                            setPermutationParams({ [nestedMenuPermutation.permutation.parameters[0].id]: option.value });
                            setPermutationMenuAnchor(null);
                            setNestedMenuPermutation(null);
                          }}
                        >
                          {option.label}
                        </MenuItem>
                      ))}
                    </Menu>
                  )}

                  <Button
                    variant="outlined"
                    startIcon={<FilterList />}
                    onClick={() => setIsFilterOpen(true)}
                    sx={{
                      py: 0.35,
                      px: 1.25,
                      fontSize: '0.75rem',
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                      },
                    }}
                  >
                    Filter Tables
                  </Button>
                </Box>
              </motion.div>

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
                    value={inputValue}
                    onChange={setInputValue}
                    onSubmit={handleSearch}
                    onFilterClick={() => setIsFilterOpen(true)}
                    variant="compact"
                  />
                </Paper>
              </motion.div>

            {/* Database Tabs */}
            <DatabaseTabs
              databases={databaseMetadata}
              activeDatabase={activeDatabase}
              onChange={handleDatabaseChange}
              tableCounts={tableCounts}
            />
          </Box>
        </Container>
      </Paper>

        {/* Results Content */}
        <Container maxWidth="xl" sx={{ mt: 4 }} ref={resultsContainerRef}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            {/* Permutation Indicator */}
            {expandedQueryInfo && appliedPermutationId && appliedPermutationId !== 'none' && (
              <Alert
                severity="success"
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Permutation Applied: {getPermutationMetadata(appliedPermutationId)?.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Searching with expanded terms: {Object.entries(expandedQueryInfo).map(([term, variants]) =>
                      `${term} → [${variants.join(', ')}]`
                    ).join(' | ')}
                  </Typography>
                </Box>
              </Alert>
            )}

            {/* Active Filters Alert */}
            {hasActiveFilters && (
              <Alert
                severity="info"
                sx={{ mb: 3 }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Filters Active
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {filters.year && filters.year !== 'all' && (
                      <Chip
                        label={`Year: ${filters.year}`}
                        size="small"
                        onDelete={() => handleApplyFilters({ ...filters, year: 'all' })}
                      />
                    )}
                    {filters.category && filters.category !== 'all' && (
                      <Chip
                        label={`Category: ${filters.category}`}
                        size="small"
                        onDelete={() => handleApplyFilters({ ...filters, category: 'all' })}
                      />
                    )}
                    {filters.country && filters.country !== 'all' && (
                      <Chip
                        label={`Country: ${filters.country}`}
                        size="small"
                        onDelete={() => handleApplyFilters({ ...filters, country: 'all' })}
                      />
                    )}
                    {filters.tableName && (
                      <Chip
                        label={`Table: ${filters.tableName}`}
                        size="small"
                        onDelete={() => handleApplyFilters({ ...filters, tableName: '' })}
                      />
                    )}
                    {filters.minDate && (
                      <Chip
                        label={`From: ${filters.minDate}`}
                        size="small"
                        onDelete={() => handleApplyFilters({ ...filters, minDate: '' })}
                      />
                    )}
                    {filters.maxDate && (
                      <Chip
                        label={`To: ${filters.maxDate}`}
                        size="small"
                        onDelete={() => handleApplyFilters({ ...filters, maxDate: '' })}
                      />
                    )}
                    {filters.selectedTables && filters.selectedTables.length > 0 && (
                      <Chip
                        label={`${filters.selectedTables.length} table${filters.selectedTables.length !== 1 ? 's' : ''} selected`}
                        size="small"
                        color="primary"
                        onDelete={() => handleApplyFilters({ ...filters, selectedTables: [] })}
                      />
                    )}
                  </Stack>
                </Box>
              </Alert>
            )}

            {/* Results Summary */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h5" fontWeight={600}>
                  {currentDatabaseInfo?.name || 'Loading...'}
                </Typography>
                {searchQuery && totalTablesWithResults > 0 && (
                  <Chip
                    icon={<FilterList />}
                    label={`Results in ${totalTablesWithResults} table${totalTablesWithResults !== 1 ? 's' : ''} across all databases`}
                    variant="outlined"
                    color="primary"
                  />
                )}
              </Box>
              {currentDatabaseInfo?.description && (
                <Typography variant="body2" color="text.secondary">
                  {currentDatabaseInfo.description}
                </Typography>
              )}
              {!isSearching && tableCounts[activeDatabase] > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Found <strong>{tableCounts[activeDatabase]}</strong> table{tableCounts[activeDatabase] !== 1 ? 's' : ''} in this database
                  {searchQuery && ` matching "${searchQuery}"`}
                  {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
                </Typography>
              )}
            </Box>

            {/* Loading State - Initial Search */}
            {isSearching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Table Cards or Empty State */}
                {tableCounts[activeDatabase] === 0 ? (
                  <EmptyState type={getEmptyStateType()} />
                ) : (
                  <AnimatePresence mode='popLayout'>
                    {loadedTables.map((table) => (
                      <motion.div
                        key={table.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        transition={{ duration: 0.3 }}
                      >
                        <TableCard
                          table={table}
                          query={searchQuery}
                          permutationId={appliedPermutationId}
                          permutationParams={appliedPermutationParams}
                          isLoading={pendingTableIdsRef.current.has(table.id)}
                          onSendToLastPage={handleSendToLastPage}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </>
            )}
          </motion.div>
        </Container>

        {/* Pinned Pagination at Bottom */}
        {!isSearching && totalPages > 1 && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 50,
              background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.95) 15%, rgba(255, 255, 255, 0.98) 100%)',
              backdropFilter: 'blur(8px)',
              borderTop: '1px solid',
              borderColor: 'rgba(0, 0, 0, 0.06)',
              py: 1.5,
            }}
          >
            <Container maxWidth="xl">
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="medium"
                  showFirstButton
                  showLastButton
                  siblingCount={1}
                  boundaryCount={1}
                  disabled={isLoadingTableData}
                  sx={{
                    '& .MuiPaginationItem-root': {
                      fontSize: '0.875rem',
                      minWidth: '32px',
                      height: '32px',
                    },
                  }}
                />
              </Box>
            </Container>
          </Box>
        )}

        {/* Filter Modal */}
        <FilterModal
          open={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          onApply={handleApplyFilters}
          initialFilters={filters}
        />
      </Box>
    </motion.div>
  );
};

export default SearchResultsPage;
