import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Chip,
  Stack,
  Paper,
} from '@mui/material';
import { Close as CloseIcon, FilterList, CalendarToday } from '@mui/icons-material';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import {
  getAvailableYears,
  getAvailableCategories,
  getAvailableCountries,
  getDatabasesWithTables,
} from '../api/backendClient';

ModuleRegistry.registerModules([AllCommunityModule]);

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
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
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
      // Free-text search across table metadata
      if (filters.tableName) {
        const query = filters.tableName.trim().toLowerCase();
        const fields = [
          table.name,
          table.databaseName,
          String(table.year ?? ''),
          table.country,
          ...(table.categories || []),
        ]
          .filter(Boolean)
          .map((val) => val.toString().toLowerCase());

        const matchesAnyField = fields.some((val) => val.includes(query));
        if (!matchesAnyField) return false;
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
      setShowSelectedOnly(false);
    }
  }, [open, initialFilters, initialPickedTables]);

  const handleChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
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

  const gridApiRef = useRef(null);

  const columnDefs = useMemo(() => [
    {
      headerName: 'Name',
      field: 'name',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true,
      minWidth: 220,
      flex: 1.3,
      cellRenderer: (params) => (
        <Box sx={{ maxWidth: '100%' }}>
          <Typography
            variant="body2"
            fontWeight={600}
            title={params.data?.name}
            sx={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block',
              maxWidth: '100%',
            }}
          >
            {params.data?.name}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            title={params.data?.databaseName}
            sx={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block',
              maxWidth: '100%',
            }}
          >
            {params.data?.databaseName}
          </Typography>
        </Box>
      ),
    },
    {
      headerName: 'Year',
      field: 'year',
      width: 110,
      valueFormatter: ({ value }) => value ?? '—',
    },
    {
      headerName: 'Country',
      field: 'country',
      width: 140,
      valueFormatter: ({ value }) => value ?? '—',
    },
    {
      headerName: 'Categories',
      field: 'categories',
      flex: 1.2,
      minWidth: 200,
      cellRenderer: ({ value }) => {
        const cats = Array.isArray(value) ? value : [];
        const visible = cats.slice(0, 2);
        const extra = cats.length > 2 ? cats.length - 2 : 0;
        return (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
            }}
          >
            <Stack
              direction="row"
              spacing={0.5}
              flexWrap="wrap"
              gap={0.5}
              justifyContent="center"
              alignItems="center"
            >
              {visible.map((category, idx) => (
                <Chip
                  key={`${category}-${idx}`}
                  label={category}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              ))}
              {extra > 0 && (
                <Chip
                  label={`+${extra}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              )}
            </Stack>
          </Box>
        );
      },
    },
    {
      headerName: 'Indexing Date',
      field: 'indexingDate',
      width: 170,
      valueFormatter: ({ value }) => formatDate(value),
    },
    {
      headerName: 'Records',
      field: 'count',
      width: 140,
      type: 'rightAligned',
      valueFormatter: ({ value }) => {
        if (value === undefined || value === null || Number.isNaN(Number(value))) return '—';
        return Number(value).toLocaleString();
      },
    },
  ], [formatDate]);

  const displayedTables = useMemo(
    () => (showSelectedOnly ? filteredTables.filter((t) => selectedTables.includes(t.id)) : filteredTables),
    [showSelectedOnly, filteredTables, selectedTables]
  );

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 120,
  }), []);

  useEffect(() => {
    if (!gridApiRef.current) return;
    gridApiRef.current.forEachNode((node) => {
      const shouldSelect = selectedTables.includes(node.data?.id);
      if (node.isSelected() !== shouldSelect) {
        node.setSelected(shouldSelect);
      }
    });
  }, [selectedTables, displayedTables]);

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
        <Box>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Table Name */}
              <TextField
                fullWidth
                label="Search Tables"
                placeholder="Search by name, database, country, category..."
                value={filters.tableName}
                onChange={(e) => handleChange('tableName', e.target.value)}
                size="small"
              />
            </Box>
          </Box>
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
                label={
                  showSelectedOnly
                    ? `${selectedTables.length} selected`
                    : `${selectedTables.length} selected`
                }
                color={showSelectedOnly ? 'secondary' : 'primary'}
                size="small"
                onClick={() => setShowSelectedOnly((prev) => !prev)}
                clickable
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>

          <Paper variant="outlined" sx={{ height: 420, position: 'relative', overflow: 'hidden' }}>
            <AgGridReact
              style={{ height: '100%', width: '100%' }}
              theme={themeQuartz}
              rowData={displayedTables}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              animateRows
              rowSelection="multiple"
              rowMultiSelectWithClick
              suppressRowClickSelection={false}
              tooltipShowDelay={200}
              overlayNoRowsTemplate="No tables found matching the current filters"
              getRowId={(params) => params?.data?.id}
              onGridReady={(params) => {
                gridApiRef.current = params.api;
                params.api.forEachNode((node) => {
                  const shouldSelect = selectedTables.includes(node.data?.id);
                  if (shouldSelect) node.setSelected(true);
                });
              }}
              onSelectionChanged={(event) => {
                const ids = (event.api.getSelectedRows() || []).map((row) => row.id);
                setSelectedTables(ids);
              }}
            />
          </Paper>
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