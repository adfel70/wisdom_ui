import React from 'react';
import { Alert, Box, Typography, Chip, Stack } from '@mui/material';

/**
 * ActiveFiltersAlert - Shows active filters with removable chips
 * Displays when any filters are active, allowing users to remove them individually
 */
const ActiveFiltersAlert = ({ filters, pickedTables = [], onRemoveFilter }) => {
  // Check if any filters are active
  const hasActiveFilters =
    (filters.year && filters.year !== 'all') ||
    (filters.category && filters.category !== 'all') ||
    (filters.country && filters.country !== 'all') ||
    filters.tableName ||
    filters.minDate ||
    filters.maxDate ||
    (filters.selectedTables && filters.selectedTables.length > 0);

  if (!hasActiveFilters) return null;

  return (
    <Alert severity="info" sx={{ mb: 3 }}>
      <Box>
        <Typography variant="body2" fontWeight={600} gutterBottom>
          Filters Active
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
          {filters.year && filters.year !== 'all' && (
            <Chip
              label={`Year: ${filters.year}`}
              size="small"
              onDelete={() => onRemoveFilter('year')}
            />
          )}
          {filters.category && filters.category !== 'all' && (
            <Chip
              label={`Category: ${filters.category}`}
              size="small"
              onDelete={() => onRemoveFilter('category')}
            />
          )}
          {filters.country && filters.country !== 'all' && (
            <Chip
              label={`Country: ${filters.country}`}
              size="small"
              onDelete={() => onRemoveFilter('country')}
            />
          )}
          {filters.tableName && (
            <Chip
              label={`Table: ${filters.tableName}`}
              size="small"
              onDelete={() => onRemoveFilter('tableName')}
            />
          )}
          {filters.minDate && (
            <Chip
              label={`From: ${filters.minDate}`}
              size="small"
              onDelete={() => onRemoveFilter('minDate')}
            />
          )}
          {filters.maxDate && (
            <Chip
              label={`To: ${filters.maxDate}`}
              size="small"
              onDelete={() => onRemoveFilter('maxDate')}
            />
          )}
          {filters.selectedTables && filters.selectedTables.length > 0 && (
            <Chip
              label={`${filters.selectedTables.length} table${filters.selectedTables.length !== 1 ? 's' : ''} selected`}
              size="small"
              color="primary"
              onDelete={() => onRemoveFilter('selectedTables')}
            />
          )}
        </Stack>
      </Box>
    </Alert>
  );
};

export default ActiveFiltersAlert;
