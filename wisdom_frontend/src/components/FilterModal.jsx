import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  IconButton,
  Typography,
  Chip,
  Stack,
  Paper,
  Tooltip,
  Popover,
  MenuItem,
  Checkbox,
} from '@mui/material';
import {
  Close as CloseIcon,
  FilterList,
  FilterAlt,
} from '@mui/icons-material';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import useFilterMetadata from '../hooks/useFilterMetadata';
import useTableColumns from '../hooks/useTableColumns';
import MultiSelectListFilter from './MultiSelectListFilter';

ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * Column header with inline filter popover
 */
const ColumnFilterHeader = (props) => {
  const {
    displayName,
    filterConfig = {},
    filtersSnapshot = {},
    onFilterChange,
    availableTags = [],
    api,
    column,
  } = props;

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectionState, setSelectionState] = useState({ checked: false, indeterminate: false });

  const showSelectAll = Boolean(column?.getColDef?.()?.headerCheckboxSelection);
  const open = Boolean(anchorEl);

  const isActive = useMemo(() => {
    if (filterConfig.disableFilter) return false;
    if (filterConfig.type === 'text') {
      return Boolean(filtersSnapshot[filterConfig.key]?.toString().trim());
    }
    if (filterConfig.type === 'select') {
      const value = filtersSnapshot[filterConfig.key];
      return Boolean(value && value !== 'all');
    }
    if (filterConfig.type === 'multiselect') {
      const value = filtersSnapshot[filterConfig.key];
      return Array.isArray(value) && value.length > 0;
    }
    if (filterConfig.type === 'dateRange') {
      const min = filtersSnapshot[filterConfig.minKey || 'minDate'];
      const max = filtersSnapshot[filterConfig.maxKey || 'maxDate'];
      return Boolean(min || max);
    }
    return false;
  }, [filterConfig, filtersSnapshot]);

  const handleOpen = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleClear = () => {
    if (!onFilterChange) {
      handleClose();
      return;
    }
    if (filterConfig.type === 'dateRange') {
      onFilterChange(filterConfig.minKey || 'minDate', '');
      onFilterChange(filterConfig.maxKey || 'maxDate', '');
    } else if (filterConfig.type === 'multiselect') {
      onFilterChange(filterConfig.key, []);
    } else if (filterConfig.type === 'select') {
      onFilterChange(filterConfig.key, 'all');
    } else if (filterConfig.type === 'text') {
      onFilterChange(filterConfig.key, '');
    }
    handleClose();
  };

  const handleSelectAllClick = (event) => {
    event.stopPropagation();
    if (!api) return;
    const shouldSelectAll = !(selectionState.checked && !selectionState.indeterminate);
    api.forEachNodeAfterFilterAndSort((node) => {
      node.setSelected(shouldSelectAll);
    });
  };

  useEffect(() => {
    if (!api || !showSelectAll) return undefined;

    const updateSelectionState = () => {
      let total = 0;
      let selected = 0;
      api.forEachNodeAfterFilterAndSort((node) => {
        total += 1;
        if (node.isSelected()) selected += 1;
      });
      setSelectionState({
        checked: total > 0 && selected === total,
        indeterminate: selected > 0 && selected < total,
      });
    };

    updateSelectionState();
    api.addEventListener('selectionChanged', updateSelectionState);
    api.addEventListener('modelUpdated', updateSelectionState);
    return () => {
      api.removeEventListener('selectionChanged', updateSelectionState);
      api.removeEventListener('modelUpdated', updateSelectionState);
    };
  }, [api, showSelectAll]);

  const renderContent = () => {
    if (filterConfig.disableFilter) return null;

    if (filterConfig.type === 'text') {
      return (
        <TextField
          autoFocus
          size="small"
          fullWidth
          label={filterConfig.label || 'Search'}
          placeholder={filterConfig.placeholder}
          value={filtersSnapshot[filterConfig.key] || ''}
          onChange={(e) => onFilterChange?.(filterConfig.key, e.target.value)}
        />
      );
    }

    if (filterConfig.type === 'select') {
      const options = filterConfig.options || [];
      return (
        <TextField
          select
          size="small"
          fullWidth
          label={filterConfig.label || displayName}
          value={filtersSnapshot[filterConfig.key] ?? 'all'}
          onChange={(e) => onFilterChange?.(filterConfig.key, e.target.value)}
        >
          <MenuItem value="all">All</MenuItem>
          {options.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    if (filterConfig.type === 'multiselect') {
      const options = filterConfig.options || availableTags || [];
      return (
        <MultiSelectListFilter
          options={options}
          value={filtersSnapshot[filterConfig.key]}
          onChange={(next) => onFilterChange?.(filterConfig.key, next)}
          placeholder={filterConfig.placeholder || 'Search options'}
        />
      );
    }

    if (filterConfig.type === 'dateRange') {
      const minKey = filterConfig.minKey || 'minDate';
      const maxKey = filterConfig.maxKey || 'maxDate';
      return (
        <Stack spacing={1}>
          <TextField
            size="small"
            label="From"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={filtersSnapshot[minKey] || ''}
            onChange={(e) => onFilterChange?.(minKey, e.target.value)}
          />
          <TextField
            size="small"
            label="To"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={filtersSnapshot[maxKey] || ''}
            onChange={(e) => onFilterChange?.(maxKey, e.target.value)}
          />
        </Stack>
      );
    }

    return null;
  };

  if (filterConfig.disableFilter) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          width: '100%',
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight={600}
          noWrap
          sx={{
            flex: 1,
            fontSize: '0.8rem',
            color: 'text.secondary',
          }}
        >
          {displayName}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        width: '100%',
      }}
    >
      {showSelectAll && (
        <Checkbox
          size="small"
          checked={selectionState.checked}
          indeterminate={selectionState.indeterminate}
          onClick={handleSelectAllClick}
          sx={{ p: 0.25, mr: 0.25 }}
        />
      )}
      <Typography
        variant="subtitle2"
        fontWeight={600}
        noWrap
        sx={{
          flex: 1,
          fontSize: '0.8rem',
          color: 'text.secondary',
        }}
      >
        {displayName}
      </Typography>
      <Tooltip title="Filter">
        <IconButton
          size="small"
          onClick={handleOpen}
          sx={{
            p: 0.5,
            color: isActive ? 'primary.main' : 'text.secondary',
            '&:hover': { color: 'primary.main', backgroundColor: 'action.hover' },
          }}
        >
          <FilterAlt fontSize="inherit" sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              p: 1.5,
              minWidth: 240,
              maxWidth: 320,
              borderRadius: 1.5,
              boxShadow: 4,
            },
          },
        }}
      >
        <Stack spacing={1}>
          {renderContent()}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button size="small" color="inherit" onClick={handleClear}>
              Clear
            </Button>
            <Button size="small" variant="contained" onClick={handleClose}>
              Done
            </Button>
          </Box>
        </Stack>
      </Popover>
    </Box>
  );
};

/**
 * FilterModal Component
 * Modal dialog for filtering and selecting tables with metadata view
 */
const FilterModal = ({ open, onClose, onApply, initialFilters = {}, initialPickedTables = [] }) => {
  const normalizeArrayValue = useCallback((value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (!value) return [];
    if (typeof value === 'string' && value.toLowerCase() === 'all') return [];
    return [value];
  }, []);

  const [filters, setFilters] = useState({
    tableName: '',
    year: normalizeArrayValue(initialFilters.year),
    category: normalizeArrayValue(initialFilters.category),
    country: normalizeArrayValue(initialFilters.country),
    minDate: '',
    maxDate: '',
    columnTags: normalizeArrayValue(initialFilters.columnTags),
    ...initialFilters,
  });
  const [selectedTables, setSelectedTables] = useState([]);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const {
    allDatabases,
    availableYears,
    availableCategories,
    availableCountries,
  } = useFilterMetadata(open);

  const getColumnTags = useCallback((table) => {
    const tags = new Set();
    (table?.columns || []).forEach((col) => {
      if (col && typeof col === 'object') {
        const colTags = col.tags ?? (col.type ? [col.type] : []);
        (colTags || []).forEach((tag) => tag && tags.add(String(tag)));
      } else if (col) {
        tags.add(String(col));
      }
    });
    return Array.from(tags);
  }, []);

  // Flatten all tables from all databases
  const allTables = useMemo(() => {
    const tables = [];
    allDatabases.forEach(db => {
      (db.tables || []).forEach(table => {
        tables.push({
          ...table,
          databaseName: db.name,
          databaseId: db.id,
          columnTags: getColumnTags(table),
        });
      });
    });
    return tables;
  }, [allDatabases, getColumnTags]);

  const availableColumnTags = useMemo(() => {
    const tags = new Set();
    allTables.forEach((table) => {
      (table.columnTags || []).forEach((tag) => {
        if (tag) tags.add(String(tag));
      });
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [allTables]);

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
        ...(table.columnTags || []),
        ]
          .filter(Boolean)
          .map((val) => val.toString().toLowerCase());

        const matchesAnyField = fields.some((val) => val.includes(query));
        if (!matchesAnyField) return false;
      }

      // Filter by year (match any selected)
      const selectedYears = Array.isArray(filters.year) ? filters.year.filter(Boolean) : [];
      if (selectedYears.length > 0) {
        const matchesYear = selectedYears.some((y) => {
          const tableYear = Number(table.year);
          const target = Number(y);
          if (!Number.isNaN(tableYear) && !Number.isNaN(target)) return tableYear === target;
          return String(table.year) === String(y);
        });
        if (!matchesYear) return false;
      }

      // Filter by category
      const tableCategories = Array.isArray(table.categories) ? table.categories : [];
      const selectedCategories = Array.isArray(filters.category) ? filters.category.filter(Boolean) : [];
      if (selectedCategories.length > 0) {
        const matches = selectedCategories.some((cat) => tableCategories.includes(cat));
        if (!matches) return false;
      }

      // Filter by country
      const selectedCountries = Array.isArray(filters.country) ? filters.country.filter(Boolean) : [];
      if (selectedCountries.length > 0) {
        const matchesCountry = selectedCountries.some((c) => table.country === c);
        if (!matchesCountry) return false;
      }

      // Filter by column tags (must include all selected)
      if (Array.isArray(filters.columnTags) && filters.columnTags.length > 0) {
        const tableTags = table.columnTags || [];
        const required = filters.columnTags.map(String);
        const hasAll = required.every((tag) => tableTags.includes(tag));
        if (!hasAll) return false;
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
    const allowedIds = new Set(filteredTables.map((table) => table.id));
    setSelectedTables((prev) => {
      const next = prev.filter((id) => allowedIds.has(id));
      if (next.length === prev.length) return prev;
      return next;
    });
  }, [filteredTables]);

  useEffect(() => {
    if (open) {
      setFilters({
        tableName: '',
        year: normalizeArrayValue(initialFilters.year),
        category: normalizeArrayValue(initialFilters.category),
        country: normalizeArrayValue(initialFilters.country),
        minDate: '',
        maxDate: '',
        columnTags: normalizeArrayValue(initialFilters.columnTags),
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

  const handleChange = useCallback((field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleApply = () => {
    const cleaned = { ...filters };
    const columnTags = Array.isArray(cleaned.columnTags) ? cleaned.columnTags.filter(Boolean) : [];
    if (columnTags.length === 0) {
      delete cleaned.columnTags;
    } else {
      cleaned.columnTags = columnTags;
    }

    // Drop neutral/empty values before sending
    ['tableName', 'minDate', 'maxDate'].forEach((key) => {
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

    const cleanArrayField = (key) => {
      if (Array.isArray(cleaned[key])) {
        cleaned[key] = cleaned[key].filter(Boolean);
        if (cleaned[key].length === 0) {
          delete cleaned[key];
        }
      }
    };

    cleanArrayField('category');
    cleanArrayField('columnTags');
    cleanArrayField('year');
    cleanArrayField('country');

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
      year: [],
      category: [],
      country: [],
      minDate: '',
      maxDate: '',
      columnTags: [],
    };
    setFilters(resetFilters);
    setSelectedTables([]);
  };

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const gridApiRef = useRef(null);

  const headerParams = useMemo(() => ({
    filtersSnapshot: filters,
    onFilterChange: handleChange,
    availableYears,
    availableCategories,
    availableCountries,
    availableTags: availableColumnTags,
  }), [availableCategories, availableColumnTags, availableCountries, availableYears, filters, handleChange]);

  const columnDefs = useTableColumns({
    headerParams,
    availableYears,
    availableCountries,
    availableCategories,
    availableColumnTags,
    formatDate,
  });

  const displayedTables = useMemo(
    () => (showSelectedOnly ? filteredTables.filter((t) => selectedTables.includes(t.id)) : filteredTables),
    [showSelectedOnly, filteredTables, selectedTables]
  );

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: false,
    resizable: true,
    flex: 1,
    minWidth: 120,
    headerComponent: ColumnFilterHeader,
    headerComponentParams: headerParams,
  }), [headerParams]);

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
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Tables
              </Typography>
              <Chip
                label={
                  showSelectedOnly
                    ? `${displayedTables.length} visible / ${filteredTables.length} filtered`
                    : `${filteredTables.length} visible`
                }
                size="small"
                variant="outlined"
              />
            </Box>
            {selectedTables.length > 0 && (
              <Chip
                label={`${selectedTables.length} selected`}
                color={showSelectedOnly ? 'secondary' : 'primary'}
                size="small"
                onClick={() => setShowSelectedOnly((prev) => !prev)}
                clickable
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>

          <Paper variant="outlined" sx={{ height: 550, position: 'relative', overflow: 'hidden' }}>
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