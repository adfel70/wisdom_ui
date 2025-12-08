import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Paper, Button, Chip, Menu, MenuItem } from '@mui/material';
import { School, FilterList, Shuffle, ChevronRight, AccountTree } from '@mui/icons-material';
import { motion } from 'framer-motion';
import SearchBar from '../components/SearchBar';
import FilterModal from '../components/FilterModal';
import QueryBuilderModal from '../components/QueryBuilderModal';
import { PERMUTATION_FUNCTIONS } from '../utils/permutationUtils';
import { queryJSONToString, queryStringToJSON } from '../utils/searchUtils';

/**
 * HomePage Component
 * Landing page with centered search interface
 */
const HomePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');  // Display string for input
  const [searchQueryJSON, setSearchQueryJSON] = useState(null);  // Actual query JSON from QueryBuilder
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isQueryBuilderOpen, setIsQueryBuilderOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [permutationId, setPermutationId] = useState('none');
  const [permutationParams, setPermutationParams] = useState({});
  const [permutationMenuAnchor, setPermutationMenuAnchor] = useState(null);
  const [nestedMenuPermutation, setNestedMenuPermutation] = useState(null);
  const isApplyingQueryBuilderRef = useRef(false);  // Flag to prevent clearing JSON during apply

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
    // Handle both string input (from simple search) and JSON array (from query builder)
    let queryJSON;

    if (Array.isArray(query)) {
      // Already in JSON format from query builder
      queryJSON = query;
    } else {
      // Check if we have a stored JSON query from QueryBuilder
      if (searchQueryJSON && normalizeQueryString(searchQuery) === normalizeQueryString(query)) {
        // User clicked search after using QueryBuilder - use the stored JSON to preserve bdt
        queryJSON = searchQueryJSON;
      } else {
        // Simple string input - parse to JSON format
        if (!query || !query.trim()) return;

        // Use queryStringToJSON to properly parse AND/OR operators
        queryJSON = queryStringToJSON(query);
      }
    }

    // Validate query is not empty
    if (!queryJSON || queryJSON.length === 0) {
      return;
    }

    // Navigate to results page with search params
    const params = new URLSearchParams({ q: JSON.stringify(queryJSON) });

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

  const handleQueryBuilderApply = (queryJSON) => {
    // Set flag to prevent handleSearchQueryChange from clearing JSON during this update
    isApplyingQueryBuilderRef.current = true;

    // Query builder returns JSON array - store it to preserve bdt values
    setSearchQueryJSON(queryJSON);

    // Convert to string for display in search input
    const displayString = queryJSONToString(queryJSON);
    setSearchQuery(displayString);

    setIsQueryBuilderOpen(false);

    // Reset flag after state updates (use setTimeout to ensure it happens after)
    setTimeout(() => {
      isApplyingQueryBuilderRef.current = false;
    }, 0);
  };

  const handleSearchQueryChange = (value) => {
    setSearchQuery(value);

    // Don't clear JSON if we're in the middle of applying from QueryBuilder
    if (isApplyingQueryBuilderRef.current) {
      return;
    }

    // If we have a stored JSON query, try to carry BDTs forward into the new string form
    if (searchQueryJSON) {
      const parsedNext = queryStringToJSON(value);
      const merged = mergeBdtIntoQuery(searchQueryJSON, parsedNext) || parsedNext;
      setSearchQueryJSON(merged);
      return;
    }
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
          <Box sx={{ maxWidth: 960, mx: 'auto' }}>
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
                    transition: 'all 0.2s',
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
                    MenuListProps={{
                      onMouseLeave: () => setNestedMenuPermutation(null)
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
                  startIcon={<AccountTree />}
                  onClick={() => setIsQueryBuilderOpen(true)}
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
                  Query Builder
                </Button>
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
                onChange={handleSearchQueryChange}
                onSubmit={handleSearch}
                onFilterClick={() => setIsFilterOpen(true)}
                onQueryBuilderClick={() => setIsQueryBuilderOpen(true)}
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

        <QueryBuilderModal
          open={isQueryBuilderOpen}
          onClose={() => setIsQueryBuilderOpen(false)}
          onApply={handleQueryBuilderApply}
          initialQuery={searchQueryJSON || queryStringToJSON(searchQuery)}
        />
      </Box>
    </motion.div>
  );
};

export default HomePage;
