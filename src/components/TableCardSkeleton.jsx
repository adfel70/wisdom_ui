import React from 'react';
import { Card, Box, Skeleton } from '@mui/material';

const TableCardSkeleton = () => (
  <Card
    sx={{
      mb: 3,
      overflow: 'hidden',
      borderRadius: 2,
    }}
  >
    <Box
      sx={{
        backgroundColor: 'grey.50',
        borderBottom: 1,
        borderColor: 'divider',
        px: 3,
        py: 2.5,
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Skeleton variant="text" width="40%" height={32} />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Skeleton variant="rounded" width={80} height={28} />
          <Skeleton variant="rounded" width={120} height={28} />
        </Box>
      </Box>
    </Box>

    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {[56, 48, 48, 48, 48, 48].map((height, index) => (
        <Skeleton
          key={index}
          variant="rectangular"
          height={height}
          animation="wave"
        />
      ))}
    </Box>
  </Card>
);

export default TableCardSkeleton;

