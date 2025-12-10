import React, { useState, useEffect, useMemo } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  Stack,
  Paper,
  Divider,
} from '@mui/material';
import { Close as CloseIcon, FilterList, CalendarToday } from '@mui/icons-material';
import {
  getAvailableYears,
  getAvailableCategories,
  getAvailableCountries,
  getDatabasesWithTables,
} from '../api/backendClient';

/**
 * FilterModal Component
 * Modal dialog for filtering and selecting tables with metadata view
 */
const FilterModal = ({ open, onClose, onApply, initialFilters = {}, initialPickedTables = [] }) => {
  const [filters, setFilters] = useState({
    tableName: '',
    year: 'all',
    category: 'all',
    country: 'all',
    minDate: '',
    maxDate: '',
    ...initialFilters,
  });
  const [selectedTables, setSelectedTables] = useState([]);
  const [allDatabases, setAllDatabases] = useState([]);
  const [yearOptions, setYearOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [countryOptions, setCountryOptions] = useState([]);

  // Load all databases when modal opens
  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      if (!open) return;
      try {
        const [databases, years, categories, countries] = await Promise.all([
          getDatabasesWithTables(),
          getAvailableYears(),
          getAvailableCategories(),
          getAvailableCountries(),
        ]);

        if (isCancelled) return;
        setAllDatabases(databases || []);
        setYearOptions(years || []);
        setCategoryOptions(categories || []);
        setCountryOptions(countries || []);
      } catch (error) {
        console.error('Failed to load filter metadata:', error);
        if (!isCancelled) {
          setAllDatabases([]);
          setYearOptions([]);
          setCategoryOptions([]);
          setCountryOptions([]);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [open]);

  // Flatten all tables from all databases
  const allTables = useMemo(() => {
    const tables = [];
    allDatabases.forEach(db => {
      (db.tables || []).forEach(table => {
        tables.push({
          ...table,
          databaseName: db.name,
          databaseId: db.id,
        });
      });
    });
    return tables;
  }, [allDatabases]);

  // Filter tables based on current filters
  const filteredTables = useMemo(() => {
    return allTables.filter(table => {
      // Filter by table name
      if (filters.tableName && !table.name.toLowerCase().includes(filters.tableName.toLowerCase())) {
        return false;
      }

      // Filter by year
      if (filters.year !== 'all' && table.year !== filters.year) {
        return false;
      }

      // Filter by category
      if (filters.category !== 'all' && !table.categories.includes(filters.category)) {
        return false;
      }

      // Filter by country
      if (filters.country !== 'all' && table.country !== filters.country) {
        return false;
      }

      // Filter by date range
      if (table.indexingDate) {
        const tableDate = new Date(table.indexingDate);

        if (filters.minDate) {
          const min = new Date(filters.minDate);
          if (tableDate < min) return false;
        }

        if (filters.maxDate) {
          const max = new Date(filters.maxDate);
          if (tableDate > max) return false;
        }
      }

      return true;
    });
  }, [allTables, filters]);

  useEffect(() => {
    if (open) {
      setFilters({
        tableName: '',
        year: 'all',
        category: 'all',
        country: 'all',
        minDate: '',
        maxDate: '',
        ...initialFilters,
      });
      // Seed selected tables from provided picked tables
      const initialSelected = Array.isArray(initialPickedTables)
        ? initialPickedTables.map((t) => t.table).filter(Boolean)
        : [];
      setSelectedTables(initialSelected);
    }
  }, [open, initialFilters, initialPickedTables]);

  const handleChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectTable = (tableId) => {
    setSelectedTables(prev => {
      if (prev.includes(tableId)) {
        return prev.filter(id => id !== tableId);
      } else {
        return [...prev, tableId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedTables.length === filteredTables.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(filteredTables.map(t => t.id));
    }
  };

  const handleApply = () => {
    const cleaned = { ...filters };

    // Drop neutral/empty values before sending
    ['tableName', 'year', 'category', 'country', 'minDate', 'maxDate'].forEach((key) => {
      const val = cleaned[key];
      if (val === undefined || val === null) {
        delete cleaned[key];
        return;
      }
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed === '' || trimmed.toLowerCase() === 'all') {
          delete cleaned[key];
          return;
        }
        cleaned[key] = trimmed;
      }
    });

    // Map selected table IDs to { db, table }
    const tableIndex = new Map(allTables.map((t) => [t.id, t]));
    const pickedTables = (selectedTables || []).map((tableId) => {
      const meta = tableIndex.get(tableId) || {};
      return {
        db: meta.databaseId || '',
        table: tableId,
      };
    }).filter((t) => t.db && t.table);

    onApply({ filters: cleaned, pickedTables });
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      tableName: '',
      year: 'all',
      category: 'all',
      country: 'all',
      minDate: '',
      maxDate: '',
    };
    setFilters(resetFilters);
    setSelectedTables([]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const allSelected = filteredTables.length > 0 && selectedTables.length === filteredTables.length;
  const someSelected = selectedTables.length > 0 && selectedTables.length < filteredTables.length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '90vh',
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
            Filter & Select Source Tables
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
        {/* Filters Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Filters
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Table Name */}
            <TextField
              fullWidth
              label="Table Name"
              placeholder="Search by table name..."
              value={filters.tableName}
              onChange={(e) => handleChange('tableName', e.target.value)}
              size="small"
            />

            <Grid container spacing={2}>
              {/* Year Filter */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={filters.year}
                    label="Year"
                    onChange={(e) => handleChange('year', e.target.value)}
                  >
                    <MenuItem value="all">All Years</MenuItem>
                    {yearOptions.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Category Filter */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filters.category}
                    label="Category"
                    onChange={(e) => handleChange('category', e.target.value)}
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    {categoryOptions.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Country Filter */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Region/Country</InputLabel>
                  <Select
                    value={filters.country}
                    label="Region/Country"
                    onChange={(e) => handleChange('country', e.target.value)}
                  >
                    <MenuItem value="all">All Regions</MenuItem>
                    {countryOptions.map((country) => (
                      <MenuItem key={country} value={country}>
                        {country}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Date Range Filters */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CalendarToday fontSize="small" color="primary" />
                <Typography variant="subtitle2" fontWeight={600}>
                  Indexing Date Range
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Min Date"
                    type="date"
                    value={filters.minDate}
                    onChange={(e) => handleChange('minDate', e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max Date"
                    type="date"
                    value={filters.maxDate}
                    onChange={(e) => handleChange('maxDate', e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    size="small"
                  />
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Tables Selection Section */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Tables
              </Typography>
              <Chip
                label={`${filteredTables.length} available`}
                size="small"
                variant="outlined"
              />
            </Box>
            {selectedTables.length > 0 && (
              <Chip
                label={`${selectedTables.length} selected`}
                color="primary"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Year</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Country</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Categories</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Indexing Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Records</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No tables found matching the current filters
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTables.map((table) => {
                    const isSelected = selectedTables.includes(table.id);
                    return (
                      <TableRow
                        key={table.id}
                        hover
                        onClick={() => handleSelectTable(table.id)}
                        sx={{
                          cursor: 'pointer',
                          bgcolor: isSelected ? 'action.selected' : 'inherit',
                          '&:hover': {
                            bgcolor: isSelected ? 'action.selected' : 'action.hover',
                          }
                        }}
                      >
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelectTable(table.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={isSelected ? 600 : 500}>
                            {table.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {table.databaseName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                            {table.year}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                            {table.country}
                          </Typography>
                        </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                          {table.categories.slice(0, 2).map((category, idx) => (
                            <Chip
                              key={idx}
                              label={category}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          ))}
                          {table.categories.length > 2 && (
                            <Chip
                              label={`+${table.categories.length - 2}`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                        </Stack>
                      </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(table.indexingDate)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={isSelected ? 600 : 500}>
                            {table.count.toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={handleReset} color="secondary">
          Reset All
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button 
          onClick={handleApply} 
          variant="contained"
        >
          Apply ({selectedTables.length} selected)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FilterModal;