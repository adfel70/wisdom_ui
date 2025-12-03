import React from 'react';
import { Box, Button, Paper } from '@mui/material';
import { FilterList, AccountTree } from '@mui/icons-material';
import { motion } from 'framer-motion';
import SearchBar from '../SearchBar';
import PermutationMenu from './PermutationMenu';

/**
 * SearchSection - Combines search bar with horizontal action buttons
 * Compact layout: search bar on left, buttons horizontally aligned on right
 */
const SearchSection = ({
  // Search bar props
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onFilterClick,
  onQueryBuilderClick,
  // Action button props
  permutationId,
  permutationParams,
  onPermutationChange,
  onPermutationParamsChange,
}) => {
  return (
    <motion.div
      initial={{ opacity: 1, y: 200 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 1, y: 200 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {/* Left: Search Bar */}
        <Paper
          elevation={3}
          sx={{
            flex: 1,
            backgroundColor: 'background.paper',
            borderRadius: 2,
            p: 1.25,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <SearchBar
            value={searchValue}
            onChange={onSearchChange}
            onSubmit={onSearchSubmit}
            onFilterClick={onFilterClick}
            onQueryBuilderClick={onQueryBuilderClick}
            variant="compact"
          />
        </Paper>

        {/* Right: Action Buttons Horizontal */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            flexShrink: 0,
          }}
        >
          <PermutationMenu
            permutationId={permutationId}
            permutationParams={permutationParams}
            onPermutationChange={onPermutationChange}
            onPermutationParamsChange={onPermutationParamsChange}
          />

          <Button
            variant="outlined"
            startIcon={<AccountTree />}
            onClick={onQueryBuilderClick}
            sx={{
              py: 0.5,
              px: 1.5,
              fontSize: '0.75rem',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
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
            onClick={onFilterClick}
            sx={{
              py: 0.5,
              px: 1.5,
              fontSize: '0.75rem',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
              },
            }}
          >
            Filter Tables
          </Button>
        </Box>
      </Box>
    </motion.div>
  );
};

export default SearchSection;
