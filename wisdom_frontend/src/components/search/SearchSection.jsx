import React from 'react';
import { Box, Button, Paper, IconButton } from '@mui/material';
import { FilterList, AccountTree, Close } from '@mui/icons-material';
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
  queryJSON,
  // Action button props
  permutationId,
  permutationParams,
  onPermutationChange,
  onPermutationParamsChange,
  pickedTables = [],
  onClearPickedTables,
  // Layout overrides
  containerSx = {},
  searchBarVariant = 'compact',
  paperSx = {},
}) => {
  const pickedCount = Array.isArray(pickedTables) ? pickedTables.length : 0;
  const hasPicked = pickedCount > 0;

  return (
    <motion.div
      initial={{ opacity: 1, y: 200 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 1, y: 200 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'nowrap', ...containerSx }}>
        {/* Left: Search Bar */}
        <Paper
          elevation={3}
          sx={{
            flex: '1 1 1100px',
            minWidth: 1000,
            maxWidth: '100%',
            overflow: 'hidden',
            backgroundColor: 'background.paper',
            borderRadius: 2,
            p: 1.25,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            ...paperSx,
          }}
        >
          <SearchBar
            value={searchValue}
            onChange={onSearchChange}
            onSubmit={onSearchSubmit}
            onFilterClick={onFilterClick}
            onQueryBuilderClick={onQueryBuilderClick}
            queryJSON={queryJSON}
            variant={searchBarVariant}
          />
        </Paper>

        {/* Right: Action Buttons Horizontal */}
        <Box
          sx={{
            display: 'flex',
            gap: 0.75,
            flexShrink: 0,
            flexWrap: 'nowrap',
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
            variant={hasPicked ? 'contained' : 'outlined'}
            startIcon={<FilterList />}
            onClick={onFilterClick}
            sx={{
              py: 0.5,
              px: 1.5,
              fontSize: '0.75rem',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
              },
            }}
          >
            {hasPicked
              ? `${pickedCount} table${pickedCount === 1 ? '' : 's'} picked`
              : 'Filter Tables'}
            {hasPicked && (
              <IconButton
                size="small"
                color="inherit"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearPickedTables?.();
                }}
                sx={{
                  ml: 0.5,
                  p: 0.2,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.25)' },
                }}
              >
                <Close sx={{ fontSize: '0.9rem' }} />
              </IconButton>
            )}
          </Button>
        </Box>
      </Box>
    </motion.div>
  );
};

export default SearchSection;
