import React, { useState, useEffect, useMemo } from 'react';
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
} from '@mui/material';
import { Home as HomeIcon, FilterList } from '@mui/icons-material';
import { motion } from 'framer-motion';
import SearchBar from '../components/SearchBar';
import FilterModal from '../components/FilterModal';
import DatabaseTabs from '../components/DatabaseTabs';
import TableCard from '../components/TableCard';
import EmptyState from '../components/EmptyState';
import { getMockDatabases, getDatabaseMetadata } from '../data/mockDatabaseNew';
import { applySearchAndFilters } from '../utils/searchUtils';

/**
 * SearchResultsPage Component
 * Displays search results with database tabs and filtered tables
 *
 * IMPORTANT: Loads all databases upfront for fast tab switching.
 * Files are still separated for organization and backend architecture matching.
 */
const SearchResultsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [activeDatabase, setActiveDatabase] = useState('db1');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [allDatabases, setAllDatabases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get database metadata (lightweight, no records)
  const databaseMetadata = getDatabaseMetadata();

  // Initialize from URL params
  useEffect(() => {
    const query = searchParams.get('q') || '';
    const year = searchParams.get('year') || 'all';
    const category = searchParams.get('category') || 'all';
    const country = searchParams.get('country') || 'all';
    const tableName = searchParams.get('tableName') || '';
    const minDate = searchParams.get('minDate') || '';
    const maxDate = searchParams.get('maxDate') || '';
    const selectedTablesParam = searchParams.get('selectedTables') || '';
    const selectedTables = selectedTablesParam ? selectedTablesParam.split(',') : [];

    setSearchQuery(query);
    setInputValue(query);
    setFilters({
      year: year !== 'all' ? year : 'all',
      category: category !== 'all' ? category : 'all',
      country: country !== 'all' ? country : 'all',
      tableName: tableName || '',
      minDate: minDate || '',
      maxDate: maxDate || '',
      selectedTables: selectedTables,
    });
  }, [searchParams]);

  // Load ALL databases on mount (fetch all at once)
  useEffect(() => {
    let isCancelled = false;

    const loadAllDatabases = async () => {
      setIsLoading(true);
      try {
        const databases = await getMockDatabases();
        if (!isCancelled) {
          setAllDatabases(databases);
        }
      } catch (error) {
        console.error('Failed to load databases:', error);
        if (!isCancelled) {
          setAllDatabases([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadAllDatabases();

    return () => {
      isCancelled = true;
    };
  }, []); // Only run once on mount

  // Get current database data (no fetching, just filtering from loaded data)
  const currentDatabaseData = useMemo(() => {
    return allDatabases.find(db => db.id === activeDatabase);
  }, [allDatabases, activeDatabase]);

  // Apply filters to current database
  const currentTables = useMemo(() => {
    if (!currentDatabaseData) return [];
    return applySearchAndFilters(currentDatabaseData.tables, searchQuery, filters);
  }, [currentDatabaseData, searchQuery, filters]);

  // Calculate table counts for all databases
  const tableCounts = useMemo(() => {
    const counts = {};
    allDatabases.forEach(db => {
      const filteredTables = applySearchAndFilters(db.tables, searchQuery, filters);
      counts[db.id] = filteredTables.length;
    });
    return counts;
  }, [allDatabases, searchQuery, filters]);

  // Calculate total tables with results across all databases
  const totalTablesWithResults = useMemo(() => {
    return Object.values(tableCounts).reduce((sum, count) => sum + count, 0);
  }, [tableCounts]);

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

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleSearch = (query) => {
    // Accept query from SearchBar or use inputValue as fallback
    const searchQuery = query || inputValue;

    // Update search query and URL params
    const params = new URLSearchParams({ q: searchQuery });

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

    // Update URL with new filters (use inputValue to preserve current input)
    const params = new URLSearchParams({ q: inputValue });
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

  // Determine empty state type
  const getEmptyStateType = () => {
    const hasFilters = Object.values(filters).some(v => {
      if (Array.isArray(v)) return v.length > 0;
      return v && v !== 'all';
    });
    const hasSearch = searchQuery.trim() !== '';

    if (currentDatabaseData?.tables.length === 0 && !hasFilters && !hasSearch) {
      return 'empty-database';
    }
    if (hasFilters && currentTables.length === 0) {
      return 'filter-empty';
    }
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
      <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default', pb: 6 }}>
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

              {/* Search Bar */}
              <motion.div
                initial={{ opacity: 1, y: 200 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 1, y: 200 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* Filter Button - Outside Paper */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.75 }}>
                  <Button
                    variant="outlined"
                    startIcon={<FilterList />}
                    onClick={() => setIsFilterOpen(true)}
                    sx={{
                      py: 0.4,
                      px: 1.5,
                      fontSize: '0.8125rem',
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

                <Paper
                  elevation={3}
                  sx={{
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    p: 2,
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
              onChange={setActiveDatabase}
              tableCounts={tableCounts}
            />
          </Box>
        </Container>
      </Paper>

        {/* Results Content */}
        <Container maxWidth="xl" sx={{ mt: 4 }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
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
                  {currentDatabaseData?.name || 'Loading...'}
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
              {currentDatabaseData?.description && (
                <Typography variant="body2" color="text.secondary">
                  {currentDatabaseData.description}
                </Typography>
              )}
              {!isLoading && currentTables.length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Found <strong>{currentTables.length}</strong> table{currentTables.length !== 1 ? 's' : ''} in this database
                  {searchQuery && ` matching "${searchQuery}"`}
                </Typography>
              )}
            </Box>

            {/* Loading State */}
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Table Cards or Empty State */}
                {currentTables.length === 0 ? (
                  <EmptyState type={getEmptyStateType()} />
                ) : (
                  currentTables.map((table) => (
                    <TableCard key={table.id} table={table} query={searchQuery} />
                  ))
                )}
              </>
            )}
          </motion.div>
        </Container>

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
