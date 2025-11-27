import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import {
  SearchOff,
  Storage as DatabaseIcon,
  FilterList,
} from '@mui/icons-material';

/**
 * EmptyState Component
 * Displays appropriate message when no data is available
 */
const EmptyState = ({ type = 'no-results', message, icon: CustomIcon }) => {
  const getConfig = () => {
    switch (type) {
      case 'no-results':
        return {
          icon: CustomIcon || SearchOff,
          title: 'No Results Found',
          description: message || 'No data matches your search criteria. Try adjusting your search or filters.',
        };
      case 'no-tables':
        return {
          icon: CustomIcon || DatabaseIcon,
          title: 'No Tables Found',
          description: message || 'There are no tables in this database matching your current filters.',
        };
      case 'empty-database':
        return {
          icon: CustomIcon || DatabaseIcon,
          title: 'Database Empty',
          description: message || 'This database does not contain any tables yet.',
        };
      case 'filter-empty':
        return {
          icon: CustomIcon || FilterList,
          title: 'No Matching Tables',
          description: message || 'Your current filters excluded all tables. Try adjusting your filter criteria.',
        };
      default:
        return {
          icon: CustomIcon || SearchOff,
          title: 'No Data Available',
          description: message || 'No data is currently available.',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <Paper
      elevation={0}
      sx={{
        py: 12,
        px: 4,
        textAlign: 'center',
        border: 2,
        borderStyle: 'dashed',
        borderColor: 'divider',
        borderRadius: 3,
        backgroundColor: 'grey.50',
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          p: 3,
          borderRadius: '50%',
          backgroundColor: 'background.paper',
          mb: 3,
        }}
      >
        <Icon sx={{ fontSize: 48, color: 'text.disabled' }} />
      </Box>

      <Typography variant="h6" fontWeight={600} gutterBottom>
        {config.title}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto' }}>
        {config.description}
      </Typography>
    </Paper>
  );
};

export default EmptyState;
