import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { FilterList } from '@mui/icons-material';

/**
 * ResultsSummary - Displays database info and result counts
 * Small component showing current database and search results summary
 */
const ResultsSummary = ({
  currentDatabaseInfo,
  searchQuery,
  totalTablesWithResults,
  currentDatabaseTableCount,
  currentPage,
  totalPages,
  isSearching,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h5" fontWeight={600}>
          {currentDatabaseInfo?.name || 'Loading...'}
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
      {currentDatabaseInfo?.description && (
        <Typography variant="body2" color="text.secondary">
          {currentDatabaseInfo.description}
        </Typography>
      )}
      {!isSearching && currentDatabaseTableCount > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Found <strong>{currentDatabaseTableCount}</strong> table{currentDatabaseTableCount !== 1 ? 's' : ''} in this database
          {searchQuery && ` matching "${searchQuery}"`}
          {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
        </Typography>
      )}
    </Box>
  );
};

export default ResultsSummary;
