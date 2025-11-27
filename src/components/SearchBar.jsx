import React from 'react';
import { Box, TextField, Button, InputAdornment } from '@mui/material';
import { Search as SearchIcon, FilterList, ArrowForward } from '@mui/icons-material';

/**
 * SearchBar Component
 * Reusable search input with filter button
 */
const SearchBar = ({
  value,
  onChange,
  onSubmit,
  onFilterClick,
  variant = 'home', // 'home' or 'compact'
  placeholder = 'Search by Value (e.g., Name, ID, Location)...'
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(value);
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

        {isHome && (
          <Button
            type="submit"
            variant="contained"
            endIcon={<ArrowForward />}
            sx={{
              py: 2,
              px: 4,
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            Search
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default SearchBar;
