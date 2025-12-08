import React from 'react';
import { Box, Select, MenuItem, IconButton, Tooltip } from '@mui/material';
import { Undo, AutoAwesome, Close } from '@mui/icons-material';
import { TRANSFORMATIONS } from '../../utils/transformUtils';

/**
 * SearchActions Component
 * Contains clear button, transform dropdown, and revert button
 *
 * @param {boolean} showClear - Whether to show the clear button
 * @param {Function} onClear - Callback when clear is clicked
 * @param {boolean} hasTransformed - Whether text has been transformed
 * @param {Function} onRevert - Callback when revert is clicked
 * @param {string} transformValue - Current transform dropdown value
 * @param {Function} onTransformChange - Callback when transform is selected
 */
const SearchActions = ({
  showClear,
  onClear,
  hasTransformed,
  onRevert,
  transformValue,
  onTransformChange
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        flexShrink: 0,
      }}
    >
      {/* Clear All button */}
      {showClear && (
        <Tooltip title="Clear all">
          <IconButton
            onClick={onClear}
            size="small"
            sx={{
              color: 'text.secondary',
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: 'rgba(244, 67, 54, 0.08)',
                color: 'error.main',
                transform: 'scale(1.05)',
              },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {/* Transform dropdown and revert button */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        borderLeft: '1px solid',
        borderColor: 'divider',
        pl: 1.5,
      }}>
        {hasTransformed && (
          <Tooltip title="Revert to original">
            <IconButton
              onClick={onRevert}
              size="small"
              sx={{
                color: 'primary.main',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: 'primary.light',
                  color: 'primary.dark',
                  transform: 'scale(1.05)',
                },
              }}
            >
              <Undo fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Select
          value={transformValue}
          onChange={onTransformChange}
          displayEmpty
          size="small"
          renderValue={() => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <AutoAwesome sx={{ fontSize: '1rem' }} />
              <span>Transform</span>
            </Box>
          )}
          sx={{
            minWidth: 'fit-content',
            borderRadius: '12px',
            transition: 'all 0.2s',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(37, 99, 235, 0.5)', // Light blue border
            },
            '& .MuiSelect-select': {
              py: 0.75,
              px: 1.5,
              fontSize: '0.875rem',
              color: 'text.primary',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
            },
            '&:hover': {
              backgroundColor: 'action.hover',
              transform: 'translateY(-1px)',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
            },
          }}
        >
          <MenuItem value="" disabled>
            Transform...
          </MenuItem>
          {TRANSFORMATIONS.map((transform) => (
            <MenuItem key={transform.id} value={transform.id}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%'
              }}>
                <span style={{ marginRight: '8px' }}>{transform.label}</span>
                <span style={{ color: '#9e9e9e', fontSize: '0.75rem', fontWeight: 'normal', marginLeft: '8px' }}>
                  {transform.shortcut}
                </span>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </Box>
    </Box>
  );
};

export default SearchActions;
