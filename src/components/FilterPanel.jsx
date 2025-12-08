import React from 'react';
import { Box, Button } from '@mui/material';
import FacetGroup from './FacetGroup';

const facetGroups = ['Categories', 'Regions', 'Table Names', 'Table Years'];

const PlaceholderFacetOptions = [{ label: 'Option 1', count: 10 }, { label: 'Option 2', count: 20 }, { label: 'Option 3', count: 30 }];

const FilterPanel = () => (
  <Box
    sx={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    }}
  >
    <Box
      component="section"
      sx={{
        flex: '1 1 auto',
        minHeight: 0,
        overflowY: 'auto',
        px: 2,
        py: 2
      }}
    >
      {facetGroups.map((title) => (
        <FacetGroup
          key={title}
          title={title}
          options={PlaceholderFacetOptions}
          selected={[]}
          onChange={() => {}}
          loading={false}
        />
      ))}
    </Box>

    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        zIndex: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
        px: 2,
        py: 1.5,
        bgcolor: 'background.paper'
      }}
    >
      <Button variant="contained" fullWidth>
        Apply Filters
      </Button>
    </Box>
  </Box>
);

export default FilterPanel;
