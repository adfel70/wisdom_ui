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
} from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
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

    setSearchQuery(query);
    setInputValue(query);
    setFilters({
      year: year !== 'all' ? year : 'all',
      category: category !== 'all' ? category : 'all',
      country: country !== 'all' ? country : 'all',
      tableName: tableName || '',
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

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleSearch = () => {
    // Update search query and URL params
    const params = new URLSearchParams({ q: inputValue });

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
    navigate(`/search?${params.toString()}`, { replace: true });
  };

  // Determine empty state type
  const getEmptyStateType = () => {
    const hasFilters = Object.values(filters).some(v => v && v !== 'all');
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
                <Paper
                  elevation={3}
                  sx={{
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    p: 3,
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
            {/* Results Summary */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                {currentDatabaseData?.name || 'Loading...'}
              </Typography>
              {currentDatabaseData?.description && (
                <Typography variant="body2" color="text.secondary">
                  {currentDatabaseData.description}
                </Typography>
              )}
              {!isLoading && currentTables.length > 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Found <strong>{currentTables.length}</strong> table{currentTables.length !== 1 ? 's' : ''}
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
