import React, { useState } from 'react';
import { Button, Menu, MenuItem, Box, Typography } from '@mui/material';
import { Shuffle, ChevronRight } from '@mui/icons-material';
import { PERMUTATION_FUNCTIONS } from '../../utils/permutationUtils';

/**
 * PermutationMenu - Dropdown menu for selecting search permutations
 * Handles nested menus for permutations with parameters
 */
const PermutationMenu = ({
  permutationId,
  permutationParams,
  onPermutationChange,
  onPermutationParamsChange,
}) => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [nestedMenuState, setNestedMenuState] = useState(null);

  // Generate label for the button
  const getPermutationLabel = () => {
    if (permutationId === 'none') return 'Permutations';

    const perm = PERMUTATION_FUNCTIONS.find(p => p.id === permutationId);
    if (!perm) return 'Permutations';

    // If has parameters, show them in label
    if (perm.parameters && perm.parameters.length > 0) {
      const paramLabels = perm.parameters
        .map(param => {
          const value = permutationParams[param.id] || param.default;
          const option = param.options.find(opt => opt.value === value);
          return option ? option.label.split(' ')[0] : '';
        })
        .filter(Boolean)
        .join(', ');
      return `${perm.label}${paramLabels ? ` - ${paramLabels}` : ''}`;
    }

    return perm.label;
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setNestedMenuState(null);
  };

  const handlePermutationSelect = (permutation) => {
    if (!permutation.parameters || permutation.parameters.length === 0) {
      onPermutationChange(permutation.id);
      onPermutationParamsChange({});
      handleMenuClose();
    }
  };

  const handleParameterSelect = (permutation, paramId, value) => {
    onPermutationChange(permutation.id);
    onPermutationParamsChange({ [paramId]: value });
    handleMenuClose();
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<Shuffle />}
        onClick={(e) => setMenuAnchor(e.currentTarget)}
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
        {getPermutationLabel()}
      </Button>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {PERMUTATION_FUNCTIONS.map((permutation) => (
          <MenuItem
            key={permutation.id}
            onMouseEnter={(e) => {
              if (permutation.parameters && permutation.parameters.length > 0) {
                setNestedMenuState({ permutation, anchorEl: e.currentTarget });
              } else if (nestedMenuState !== null) {
                setNestedMenuState(null);
              }
            }}
            onClick={() => handlePermutationSelect(permutation)}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              minWidth: 250,
              cursor: 'pointer',
            }}
          >
            <Box>
              <Typography variant="body2" fontWeight={500}>
                {permutation.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {permutation.description}
              </Typography>
            </Box>
            {permutation.parameters && permutation.parameters.length > 0 && (
              <ChevronRight sx={{ ml: 2, color: 'text.secondary' }} />
            )}
          </MenuItem>
        ))}
      </Menu>

      {/* Nested menu for parameters */}
      {nestedMenuState && nestedMenuState.permutation.parameters && (
        <Menu
          anchorEl={nestedMenuState.anchorEl}
          open={Boolean(nestedMenuState)}
          onClose={() => setNestedMenuState(null)}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          MenuListProps={{
            onMouseLeave: () => setNestedMenuState(null),
          }}
        >
          {nestedMenuState.permutation.parameters[0].options.map((option) => (
            <MenuItem
              key={option.value}
              onClick={() =>
                handleParameterSelect(
                  nestedMenuState.permutation,
                  nestedMenuState.permutation.parameters[0].id,
                  option.value
                )
              }
            >
              {option.label}
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
};

export default PermutationMenu;
