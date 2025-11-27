import React, { useState } from 'react';
import { Box, TextField, Button, InputAdornment, Select, MenuItem, IconButton, Tooltip } from '@mui/material';
import { Search as SearchIcon, FilterList, ArrowForward, Undo } from '@mui/icons-material';
import { TRANSFORMATIONS, applyTransformation } from '../utils/transformUtils';

/**
 * SearchBar Component
 * Reusable search input with filter button and text transformation
 */
const SearchBar = ({
  value,
  onChange,
  onSubmit,
  onFilterClick,
  variant = 'home', // 'home' or 'compact'
  placeholder = 'Search by Value (e.g., Name, ID, Location)...'
}) => {
  const [originalText, setOriginalText] = useState('');
  const [hasTransformed, setHasTransformed] = useState(false);
  const [transformValue, setTransformValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(value);
  };

  const handleTransformChange = (e) => {
    const transformId = e.target.value;

    // Reset dropdown to empty after selection
    setTransformValue('');

    if (!transformId) return;

    // Store original text before first transformation
    if (!hasTransformed) {
      setOriginalText(value);
      setHasTransformed(true);
    }

    // Apply transformation to current text (chainable)
    const transformed = applyTransformation(value, transformId);
    onChange(transformed);
  };

  const handleRevert = () => {
    onChange(originalText);
    setOriginalText('');
    setHasTransformed(false);
  };

  const isHome = variant === 'home';

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        width: '100%',
      }}
    >
      <TextField
        fullWidth
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        size={isHome ? 'large' : 'medium'}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon
                sx={{
                  color: 'text.secondary',
                  transition: 'color 0.2s',
                }}
              />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {hasTransformed && (
                  <Tooltip title="Revert to original">
                    <IconButton
                      onClick={handleRevert}
                      size="small"
                      sx={{
                        color: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                          color: 'primary.dark',
                        },
                      }}
                    >
                      <Undo fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Select
                  value={transformValue}
                  onChange={handleTransformChange}
                  displayEmpty
                  size="small"
                  sx={{
                    minWidth: 140,
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none',
                    },
                    '& .MuiSelect-select': {
                      py: 0.75,
                      fontSize: '0.875rem',
                      color: 'text.secondary',
                    },
                    '&:hover': {
                      '& .MuiSelect-select': {
                        color: 'primary.main',
                      },
                    },
                  }}
                >
                  <MenuItem value="" disabled>
                    Transform...
                  </MenuItem>
                  {TRANSFORMATIONS.map((transform) => (
                    <MenuItem key={transform.id} value={transform.id}>
                      {transform.label}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            </InputAdornment>
          ),
          sx: {
            py: isHome ? 2 : 1,
            fontSize: isHome ? '1.125rem' : '1rem',
          }
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'background.paper',
            '&:hover': {
              '& .MuiInputAdornment-root svg': {
                color: 'primary.main',
              },
            },
            '&.Mui-focused': {
              '& .MuiInputAdornment-root svg': {
                color: 'primary.main',
              },
            },
          },
        }}
      />

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          type="button"
          variant="outlined"
          onClick={onFilterClick}
          startIcon={<FilterList />}
          sx={{
            py: isHome ? 2 : 1.25,
            px: 3,
            whiteSpace: 'nowrap',
            minWidth: 'fit-content',
          }}
        >
          Filter Tables
        </Button>

        <Button
          type="submit"
          variant="contained"
          endIcon={isHome ? <ArrowForward /> : <SearchIcon />}
          sx={{
            py: isHome ? 2 : 1.25,
            px: isHome ? 4 : 3,
            fontSize: isHome ? '1rem' : '0.875rem',
            fontWeight: 600,
          }}
        >
          Search
        </Button>
      </Box>
    </Box>
  );
};

export default SearchBar;
