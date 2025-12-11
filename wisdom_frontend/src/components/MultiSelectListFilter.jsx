import React, { useMemo, useState, useCallback } from 'react';
import { Box, Checkbox, MenuItem, Stack, TextField, Typography } from '@mui/material';

/**
 * Reusable multiselect filter list with search + compact spacing.
 * Handles string/number options and controlled array values.
 */
const MultiSelectListFilter = ({
  options = [],
  value = [],
  placeholder = 'Search options',
  maxHeight = 220,
  onChange,
  containerSx = {},
  menuItemSx = {},
  disableSearch = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const normalizedValue = useMemo(
    () => (Array.isArray(value) ? value.filter(Boolean) : []),
    [value]
  );

  const filteredOptions = useMemo(() => {
    const list = Array.isArray(options) ? options : [];
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return list;
    return list.filter((opt) => opt?.toString().toLowerCase().includes(normalizedSearch));
  }, [options, searchTerm]);

  const toggleOption = useCallback(
    (option) => {
      const exists = normalizedValue.includes(option);
      const next = exists
        ? normalizedValue.filter((v) => v !== option)
        : [...normalizedValue, option];
      onChange?.(next);
    },
    [normalizedValue, onChange]
  );

  return (
    <Stack spacing={0}>
      {!disableSearch && (
        <TextField
          size="small"
          fullWidth
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      )}
      <Box
        sx={{
          maxHeight,
          overflowY: 'auto',
          p: 0.5,
          ...containerSx,
        }}
      >
        {filteredOptions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 0.5 }}>
            No options
          </Typography>
        ) : (
          filteredOptions.map((option) => {
            const checked = normalizedValue.includes(option);
            return (
              <MenuItem
                key={option}
                dense
                onClick={() => toggleOption(option)}
                sx={{
                  gap: 0,
                  py: 0,
                  px: 0.25,
                  minHeight: 28,
                  ...menuItemSx,
                }}
              >
                <Checkbox
                  size="small"
                  checked={checked}
                  tabIndex={-1}
                  disableRipple
                  sx={{ p: 0, mr: 0.25 }}
                />
                <Typography variant="body2">{option}</Typography>
              </MenuItem>
            );
          })
        )}
      </Box>
    </Stack>
  );
};

export default MultiSelectListFilter;

