import React from 'react';
import { Alert, Box, Typography } from '@mui/material';
import { getPermutationMetadata } from '../../utils/permutationUtils';

/**
 * PermutationIndicator - Shows when a permutation is applied
 * Displays the permutation name and expanded query terms
 */
const PermutationIndicator = ({ permutationId, expandedQueryInfo }) => {
  if (!permutationId || permutationId === 'none' || !expandedQueryInfo) {
    return null;
  }

  const metadata = getPermutationMetadata(permutationId);

  return (
    <Alert severity="success" sx={{ mb: 2 }}>
      <Box>
        <Typography variant="body2" fontWeight={600} gutterBottom>
          Permutation Applied: {metadata?.label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Searching with expanded terms:{' '}
          {Object.entries(expandedQueryInfo)
            .map(([term, variants]) => `${term} → [${variants.join(', ')}]`)
            .join(' | ')}
        </Typography>
      </Box>
    </Alert>
  );
};

export default PermutationIndicator;
