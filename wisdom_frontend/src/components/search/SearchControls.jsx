import React from 'react';
import { Box, Button } from '@mui/material';
import { FilterList, AccountTree } from '@mui/icons-material';
import { motion } from 'framer-motion';
import PermutationMenu from './PermutationMenu';

/**
 * SearchControls - Action buttons for filters, query builder, and permutations
 * Small component grouping the control buttons above the search bar
 */
const SearchControls = ({
  permutationId,
  permutationParams,
  onPermutationChange,
  onPermutationParamsChange,
  onFilterClick,
  onQueryBuilderClick,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: 0.1 }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mb: 0.75 }}>
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
          Query Builder
        </Button>

        <Button
          variant="outlined"
          startIcon={<FilterList />}
          onClick={onFilterClick}
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
  );
};

export default SearchControls;
