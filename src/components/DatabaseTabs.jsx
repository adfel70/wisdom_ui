import React from 'react';
import { Box, Tabs, Tab, Badge } from '@mui/material';
import { Storage as DatabaseIcon } from '@mui/icons-material';

/**
 * DatabaseTabs Component
 * Tabs for switching between different databases
 */
const DatabaseTabs = ({ databases, activeDatabase, onChange, tableCounts = {} }) => {
  const handleChange = (event, newValue) => {
    onChange(newValue);
  };

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        mt: 3,
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
          const tableCount = tableCounts[database.id] || database.tables.length;

          return (
            <Tab
              key={database.id}
              value={database.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DatabaseIcon sx={{ fontSize: 18 }} />
                  <span>{database.name}</span>
                  {tableCount > 0 && (
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
                  )}
                </Box>
              }
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                minHeight: 48,
                px: 3,
              }}
            />
          );
        })}
      </Tabs>
    </Box>
  );
};

export default DatabaseTabs;
