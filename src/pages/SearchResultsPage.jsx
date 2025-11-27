import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  IconButton,
  Divider,
} from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import SearchBar from '../components/SearchBar';
import FilterModal from '../components/FilterModal';
import DatabaseTabs from '../components/DatabaseTabs';
import TableCard from '../components/TableCard';
import EmptyState from '../components/EmptyState';
import { MOCK_DATABASES } from '../data/mockDatabase';
import { applySearchAndFilters } from '../utils/searchUtils';

/**
 * SearchResultsPage Component
 * Displays search results with database tabs and filtered tables
 */
const SearchResultsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeDatabase, setActiveDatabase] = useState('db1');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({});

  // Initialize from URL params
  useEffect(() => {
    const query = searchParams.get('q') || '';
    const year = searchParams.get('year') || 'all';
    const category = searchParams.get('category') || 'all';
    const country = searchParams.get('country') || 'all';
    const tableName = searchParams.get('tableName') || '';

    setSearchQuery(query);
    setFilters({
      year: year !== 'all' ? year : 'all',
      category: category !== 'all' ? category : 'all',
      country: country !== 'all' ? country : 'all',
      tableName: tableName || '',
    });
  }, [searchParams]);

  // Get filtered tables for current database
  const filteredDatabases = useMemo(() => {
    return MOCK_DATABASES.map(db => ({
      ...db,
      tables: applySearchAndFilters(db.tables, searchQuery, filters),
    }));
  }, [searchQuery, filters]);

  const currentDatabase = filteredDatabases.find(db => db.id === activeDatabase);
  const currentTables = currentDatabase?.tables || [];

  // Calculate table counts for each database
  const tableCounts = useMemo(() => {
    const counts = {};
    filteredDatabases.forEach(db => {
      counts[db.id] = db.tables.length;
    });
    return counts;
  }, [filteredDatabases]);

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);

    // Update URL with new filters
    const params = new URLSearchParams({ q: searchQuery });
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

    if (currentDatabase?.tables.length === 0 && !hasFilters && !hasSearch) {
      return 'empty-database';
    }
    if (hasFilters && currentTables.length === 0) {
      return 'filter-empty';
    }
    return 'no-results';
  };

  return (
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

            {/* Search Bar */}
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onFilterClick={() => setIsFilterOpen(true)}
              variant="compact"
            />

            {/* Database Tabs */}
            <DatabaseTabs
              databases={filteredDatabases}
              activeDatabase={activeDatabase}
              onChange={setActiveDatabase}
              tableCounts={tableCounts}
            />
          </Box>
        </Container>
      </Paper>

      {/* Results Content */}
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        {/* Results Summary */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={600} gutterBottom>
            {currentDatabase?.name}
          </Typography>
          {currentDatabase?.description && (
            <Typography variant="body2" color="text.secondary">
              {currentDatabase.description}
            </Typography>
          )}
          {currentTables.length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Found <strong>{currentTables.length}</strong> table{currentTables.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
            </Typography>
          )}
        </Box>

        {/* Table Cards or Empty State */}
        {currentTables.length === 0 ? (
          <EmptyState type={getEmptyStateType()} />
        ) : (
          currentTables.map((table) => (
            <TableCard key={table.id} table={table} query={searchQuery} />
          ))
        )}
      </Container>

      {/* Filter Modal */}
      <FilterModal
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />
    </Box>
  );
};

export default SearchResultsPage;
