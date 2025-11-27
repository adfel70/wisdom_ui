import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import SearchBar from '../components/SearchBar';
import FilterModal from '../components/FilterModal';

/**
 * HomePage Component
 * Landing page with centered search interface
 */
const HomePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({});

  const handleSearch = (query) => {
    if (!query || !query.trim()) return;

    // Navigate to results page with search params
    const params = new URLSearchParams({ q: query });

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

    navigate(`/search?${params.toString()}`);
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'background.default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          <Box sx={{ textAlign: 'center', mb: 6 }}>
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

        <motion.div
          layout
          layoutId="search-container"
          transition={{
            layout: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
          }}
          style={{
            width: '100%',
          }}
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
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSearch}
              onFilterClick={() => setIsFilterOpen(true)}
              variant="home"
            />

            {/* Active Filters Display */}
            {Object.values(filters).some(v => v && v !== 'all') && (
              <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                  Active filters:
                </Typography>
                {filters.year && filters.year !== 'all' && (
                  <Typography variant="caption" sx={{ px: 1, py: 0.5, backgroundColor: 'primary.light', color: 'white', borderRadius: 1 }}>
                    Year: {filters.year}
                  </Typography>
                )}
                {filters.category && filters.category !== 'all' && (
                  <Typography variant="caption" sx={{ px: 1, py: 0.5, backgroundColor: 'primary.light', color: 'white', borderRadius: 1 }}>
                    Category: {filters.category}
                  </Typography>
                )}
                {filters.country && filters.country !== 'all' && (
                  <Typography variant="caption" sx={{ px: 1, py: 0.5, backgroundColor: 'primary.light', color: 'white', borderRadius: 1 }}>
                    Region: {filters.country}
                  </Typography>
                )}
                {filters.tableName && (
                  <Typography variant="caption" sx={{ px: 1, py: 0.5, backgroundColor: 'primary.light', color: 'white', borderRadius: 1 }}>
                    Table: {filters.tableName}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </motion.div>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, delay: 0.1 }}
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
        </motion.div>
      </Container>

      <FilterModal
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />
    </Box>
  );
};

export default HomePage;
