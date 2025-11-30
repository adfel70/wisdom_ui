import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Paper, Button, Chip, Menu, MenuItem } from '@mui/material';
import { School, FilterList, Shuffle, ChevronRight } from '@mui/icons-material';
import { motion } from 'framer-motion';
import SearchBar from '../components/SearchBar';
import FilterModal from '../components/FilterModal';
import { PERMUTATION_FUNCTIONS } from '../utils/permutationUtils';

/**
 * HomePage Component
 * Landing page with centered search interface
 */
const HomePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [permutationId, setPermutationId] = useState('none');
  const [permutationParams, setPermutationParams] = useState({});
  const [permutationMenuAnchor, setPermutationMenuAnchor] = useState(null);
  const [nestedMenuPermutation, setNestedMenuPermutation] = useState(null);

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

  const handleSearch = (query) => {
    if (!query || !query.trim()) return;

    // Navigate to results page with search params
    const params = new URLSearchParams({ q: query });

    // Add permutation if selected
    if (permutationId && permutationId !== 'none') {
      params.append('permutation', permutationId);

      // Add permutation parameters if any
      if (Object.keys(permutationParams).length > 0) {
        params.append('permutationParams', JSON.stringify(permutationParams));
      }
    }

    // Add filters to URL if any
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

    navigate(`/search?${params.toString()}`);
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    // If tables are selected, you could navigate to a results page or handle them here
    if (newFilters.selectedTables && newFilters.selectedTables.length > 0) {
      console.log('Selected tables:', newFilters.selectedTables);
      // You can add navigation or other logic here if needed
    }
  };

  const handleClearFilter = (filterKey) => {
    const clearedFilters = { ...filters };
    if (filterKey === 'selectedTables') {
      clearedFilters.selectedTables = [];
    } else if (filterKey === 'year' || filterKey === 'category' || filterKey === 'country') {
      clearedFilters[filterKey] = 'all';
    } else {
      clearedFilters[filterKey] = '';
    }
    setFilters(clearedFilters);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ position: 'absolute', width: '100%', minHeight: '100vh' }}
    >
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          backgroundColor: 'background.default',
          position: 'relative',
          overflow: 'hidden',
          pt: { xs: 8, md: 12 },
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              {/* Icon */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <School
                  sx={{
                    fontSize: '4rem',
                    color: 'primary.main',
                    opacity: 0.9,
                  }}
                />
              </Box>

              {/* Logo/Title */}
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  mb: 2,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                }}
              >
                Wisdom UI
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 400,
                  mb: 1,
                }}
              >
                Database Browser & Search
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: 'text.secondary',
                  maxWidth: 600,
                  mx: 'auto',
                }}
              >
                Search across multiple databases and tables with powerful filtering capabilities
              </Typography>
            </Box>
          </motion.div>

          {/* Search Section - Centered */}
          <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            {/* Action Buttons - Completely Outside */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mb: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<Shuffle />}
                  onClick={(e) => setPermutationMenuAnchor(e.currentTarget)}
                  sx={{
                    py: 0.4,
                    px: 1.5,
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
                  MenuListProps={{
                    onMouseLeave: () => setNestedMenuPermutation(null)
                  }}
                >
                  {PERMUTATION_FUNCTIONS.map((permutation) => (
                    <MenuItem
                      key={permutation.id}
                      onMouseEnter={(e) => {
                        if (permutation.parameters && permutation.parameters.length > 0) {
                          setNestedMenuPermutation({ permutation, anchorEl: e.currentTarget });
                        } else if (nestedMenuPermutation?.permutation?.id !== permutation.id) {
                          setNestedMenuPermutation(null);
                        }
                      }}
                      onClick={() => {
                        if (!permutation.parameters || permutation.parameters.length === 0) {
                          setPermutationId(permutation.id);
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
                  >
                    {nestedMenuPermutation.permutation.parameters[0].options.map((option) => (
                      <MenuItem
                        key={option.value}
                        onClick={() => {
                          setPermutationId(nestedMenuPermutation.permutation.id);
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
                    py: 0.4,
                    px: 1.5,
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

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 1, y: -250 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
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
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSearch}
                onFilterClick={() => setIsFilterOpen(true)}
                variant="home"
              />

              {/* Active Filters Display */}
              {(Object.values(filters).some(v => v && v !== 'all') || (filters.selectedTables && filters.selectedTables.length > 0)) && (
                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                    Active filters:
                  </Typography>
                  {filters.year && filters.year !== 'all' && (
                    <Chip
                      label={`Year: ${filters.year}`}
                      size="small"
                      onDelete={() => handleClearFilter('year')}
                      color="primary"
                    />
                  )}
                  {filters.category && filters.category !== 'all' && (
                    <Chip
                      label={`Category: ${filters.category}`}
                      size="small"
                      onDelete={() => handleClearFilter('category')}
                      color="primary"
                    />
                  )}
                  {filters.country && filters.country !== 'all' && (
                    <Chip
                      label={`Region: ${filters.country}`}
                      size="small"
                      onDelete={() => handleClearFilter('country')}
                      color="primary"
                    />
                  )}
                  {filters.tableName && (
                    <Chip
                      label={`Table: ${filters.tableName}`}
                      size="small"
                      onDelete={() => handleClearFilter('tableName')}
                      color="primary"
                    />
                  )}
                  {filters.minDate && (
                    <Chip
                      label={`From: ${filters.minDate}`}
                      size="small"
                      onDelete={() => handleClearFilter('minDate')}
                      color="primary"
                    />
                  )}
                  {filters.maxDate && (
                    <Chip
                      label={`To: ${filters.maxDate}`}
                      size="small"
                      onDelete={() => handleClearFilter('maxDate')}
                      color="primary"
                    />
                  )}
                  {filters.selectedTables && filters.selectedTables.length > 0 && (
                    <Chip
                      label={`${filters.selectedTables.length} table${filters.selectedTables.length > 1 ? 's' : ''} selected`}
                      size="small"
                      onDelete={() => handleClearFilter('selectedTables')}
                      color="secondary"
                    />
                  )}
                </Box>
              )}
            </Paper>
          </motion.div>
          </Box>

          {/* Info Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 3,
                mt: 6,
              }}
            >
              {[
                { title: 'Fast Search', description: 'Search across all databases instantly' },
                { title: 'Smart Filters', description: 'Filter by year, category, and region' },
                { title: 'Rich Data', description: 'Browse and explore detailed table data' },
              ].map((item, index) => (
                <Paper
                  key={index}
                  elevation={1}
                  sx={{
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
                    },
                  }}
                >
                  <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {item.description}
                  </Typography>
                </Paper>
              ))}
            </Box>

            {/* Browse Tables Button */}
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                View all tables with advanced filters and selection
              </Typography>
            </Box>
          </motion.div>
        </Container>

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

export default HomePage;
