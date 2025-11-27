import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  IconButton,
  Typography,
  Grid,
} from '@mui/material';
import { Close as CloseIcon, FilterList } from '@mui/icons-material';
import {
  getAvailableYears,
  getAvailableCategories,
  getAvailableCountries,
} from '../data/mockDatabase';

/**
 * FilterModal Component
 * Modal dialog for filtering table results
 */
const FilterModal = ({ open, onClose, onApply, initialFilters = {} }) => {
  const [filters, setFilters] = useState({
    tableName: '',
    year: 'all',
    category: 'all',
    country: 'all',
    ...initialFilters,
  });

  useEffect(() => {
    if (open) {
      setFilters({
        tableName: '',
        year: 'all',
        category: 'all',
        country: 'all',
        ...initialFilters,
      });
    }
  }, [open, initialFilters]);

  const handleChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      tableName: '',
      year: 'all',
      category: 'all',
      country: 'all',
    };
    setFilters(resetFilters);
  };

  const years = getAvailableYears();
  const categories = getAvailableCategories();
  const countries = getAvailableCountries();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Filter Source Tables
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: 'text.secondary',
            '&:hover': { color: 'error.main' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 1 }}>
          {/* Table Name */}
          <TextField
            fullWidth
            label="Table Name"
            placeholder="e.g., Transactions..."
            value={filters.tableName}
            onChange={(e) => handleChange('tableName', e.target.value)}
          />

          <Grid container spacing={2}>
            {/* Year Filter */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Year</InputLabel>
                <Select
                  value={filters.year}
                  label="Year"
                  onChange={(e) => handleChange('year', e.target.value)}
                >
                  <MenuItem value="all">All Years</MenuItem>
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Category Filter */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  label="Category"
                  onChange={(e) => handleChange('category', e.target.value)}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Country Filter */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Region/Country</InputLabel>
                <Select
                  value={filters.country}
                  label="Region/Country"
                  onChange={(e) => handleChange('country', e.target.value)}
                >
                  <MenuItem value="all">All Regions</MenuItem>
                  {countries.map((country) => (
                    <MenuItem key={country} value={country}>
                      {country}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={handleReset} color="secondary">
          Reset
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleApply} variant="contained">
          Apply Filters
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FilterModal;
