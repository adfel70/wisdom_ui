import React from 'react';
import { Box, Tabs, Tab, Badge, CircularProgress } from '@mui/material';
import { Storage as DatabaseIcon } from '@mui/icons-material';

/**
 * DatabaseTabs Component
 * Tabs for switching between different databases
 *
 * Shows loading indicator when isSearching is true
 */
const DatabaseTabs = ({ databases, activeDatabase, onChange, tableCounts = {}, isSearchingByDb = {} }) => {
  const handleChange = (event, newValue) => {
    onChange(newValue);
  };

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        mt: 2,
      }}
    >
      <Tabs
        value={activeDatabase}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTabs-indicator': {
            height: 3,
            borderRadius: '3px 3px 0 0',
          },
        }}
      >
        {databases.map((database) => {
          const tableCount = tableCounts[database.id] !== undefined ? tableCounts[database.id] : (database.tables?.length);
          const isDbSearching = !!isSearchingByDb[database.id];

          return (
            <Tab
              key={database.id}
              value={database.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DatabaseIcon sx={{ fontSize: 18 }} />
                  <span>{database.name}</span>
                  {isDbSearching ? (
                    <CircularProgress size={14} sx={{ ml: 0.5 }} />
                  ) : (
                    tableCount !== undefined && tableCount > 0 && (
                      <Badge
                        badgeContent={tableCount}
                        color="primary"
                        sx={{
                          '& .MuiBadge-badge': {
                            position: 'relative',
                            transform: 'none',
                            fontSize: '0.7rem',
                            height: 18,
                            minWidth: 18,
                            padding: '0 4px',
                          },
                        }}
                      />
                    )
                  )}
                </Box>
              }
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                minHeight: 44,
                px: 2.5,
              }}
            />
          );
        })}
      </Tabs>
    </Box>
  );
};

export default DatabaseTabs;
