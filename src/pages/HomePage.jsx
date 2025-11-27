import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Fade } from '@mui/material';
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        },
      }}
    >
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <Fade in timeout={1000}>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            {/* Logo/Title */}
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                color: 'white',
                mb: 2,
                textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                fontSize: { xs: '2rem', md: '3rem' },
              }}
            >
              Wisdom UI
            </Typography>

            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255,255,255,0.9)',
                fontWeight: 400,
                mb: 1,
              }}
            >
              Database Browser & Search
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255,255,255,0.7)',
                maxWidth: 600,
                mx: 'auto',
              }}
            >
              Search across multiple databases and tables with powerful filtering capabilities
            </Typography>
          </Box>
        </Fade>

        <Fade in timeout={1500}>
          <Box
            sx={{
              backgroundColor: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: 4,
              p: 4,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
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
          </Box>
        </Fade>

        {/* Info Cards */}
        <Fade in timeout={2000}>
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
              <Box
                key={index}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  {item.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Fade>
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
