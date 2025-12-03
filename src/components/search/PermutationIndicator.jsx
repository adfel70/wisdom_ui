import React from 'react';
import { Alert, Typography } from '@mui/material';
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
    <Alert severity="success" sx={{ mb: 2, py: 0.75 }}>
      <Typography variant="body2" component="span">
        <strong>✓ Permutation: {metadata?.label}</strong>
        {' '}
        <Typography variant="caption" component="span" color="text.secondary">
          ({Object.entries(expandedQueryInfo)
            .map(([term, variants]) => `${term} → [${variants.join(', ')}]`)
            .join(' | ')})
        </Typography>
      </Typography>
    </Alert>
  );
};

export default PermutationIndicator;
