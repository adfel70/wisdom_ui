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
  Autocomplete,
  Checkbox,
} from '@mui/material';
import {
  Close as CloseIcon,
  FilterList,
  LocalOfferOutlined,
  FilterAlt,
} from '@mui/icons-material';
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
  const [searchTerm, setSearchTerm] = useState('');

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
      const value = Array.isArray(filtersSnapshot[filterConfig.key])
        ? filtersSnapshot[filterConfig.key]
        : [];
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const filteredOptions = normalizedSearch
        ? options.filter((opt) => opt.toString().toLowerCase().includes(normalizedSearch))
        : options;

      const toggleOption = (option) => {
        const exists = value.includes(option);
        const next = exists ? value.filter((v) => v !== option) : [...value, option];
        onFilterChange?.(filterConfig.key, next);
      };

      return (
        <Stack spacing={1}>
          <TextField
            size="small"
            fullWidth
            placeholder={filterConfig.placeholder || 'Search options'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Box
            sx={{
              maxHeight: 220,
              overflowY: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 0.5,
            }}
          >
            {filteredOptions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 0.5 }}>
                No options
              </Typography>
            ) : (
              filteredOptions.map((option) => {
                const checked = value.includes(option);
                return (
                  <MenuItem
                    key={option}
                    dense
                    onClick={() => toggleOption(option)}
                    sx={{ gap: 1 }}
                  >
                    <Checkbox
                      size="small"
                      checked={checked}
                      tabIndex={-1}
                      disableRipple
                    />
                    <Typography variant="body2">{option}</Typography>
                  </MenuItem>
                );
              })
            )}
          </Box>
        </Stack>
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
  const [allDatabases, setAllDatabases] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableCountries, setAvailableCountries] = useState([]);

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
        setAvailableYears(Array.isArray(years) ? years : []);
        setAvailableCategories(Array.isArray(categories) ? categories : []);
        setAvailableCountries(Array.isArray(countries) ? countries : []);
      } catch (error) {
        console.error('Failed to load filter metadata:', error);
        if (!isCancelled) {
          setAllDatabases([]);
          setAvailableYears([]);
          setAvailableCategories([]);
          setAvailableCountries([]);
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

  const columnDefs = useMemo(() => [
    {
      headerName: 'Name',
      field: 'name',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true,
      minWidth: 220,
      flex: 1.3,
      headerComponentParams: {
        ...headerParams,
        filterConfig: {
          key: 'tableName',
          type: 'text',
          label: 'Search',
          placeholder: 'Name, database, country, category, tags',
        },
      },
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
      headerComponentParams: {
        ...headerParams,
        filterConfig: {
          key: 'year',
          type: 'multiselect',
          label: 'Years',
          options: availableYears,
          placeholder: 'Search years',
        },
      },
      valueFormatter: ({ value }) => value ?? '—',
    },
    {
      headerName: 'Country',
      field: 'country',
      width: 140,
      headerComponentParams: {
        ...headerParams,
        filterConfig: {
          key: 'country',
          type: 'multiselect',
          label: 'Countries',
          options: availableCountries,
          placeholder: 'Search countries',
        },
      },
      valueFormatter: ({ value }) => value ?? '—',
    },
    {
      headerName: 'Categories',
      field: 'categories',
      flex: 1.2,
      minWidth: 200,
      headerComponentParams: {
        ...headerParams,
        filterConfig: {
          key: 'category',
          type: 'multiselect',
          label: 'Categories',
          options: availableCategories,
          placeholder: 'Search categories',
        },
      },
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
              overflow: 'hidden',
            }}
          >
            <Stack
              direction="row"
              spacing={0.5}
              flexWrap="nowrap"
              gap={0.5}
              alignItems="center"
              sx={{
                width: '100%',
                maxWidth: '100%',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
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
                <Tooltip
                  title={
                    <Stack spacing={0.25}>
                      {cats.map((cat, idx) => (
                        <span key={`${cat}-${idx}`}>{cat}</span>
                      ))}
                    </Stack>
                  }
                  placement="right"
                  arrow
                  enterDelay={300}
                >
                  <Chip
                    label={`+${extra}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 20, cursor: 'pointer' }}
                  />
                </Tooltip>
              )}
            </Stack>
          </Box>
        );
      },
    },
    {
      headerName: 'Column Tags',
      field: 'columnTags',
      flex: 1.2,
      minWidth: 220,
      headerComponentParams: {
        ...headerParams,
        filterConfig: {
          key: 'columnTags',
          type: 'multiselect',
          label: 'Column Tags',
          options: availableColumnTags,
          placeholder: 'Search tags',
        },
      },
      cellRenderer: ({ value }) => {
        const tags = Array.isArray(value) ? value : [];
        const visible = tags.slice(0, 2);
        const extra = tags.length > 2 ? tags.length - 2 : 0;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%' }}>
            <Stack
              direction="row"
              spacing={0.5}
              flexWrap="nowrap"
              gap={0.5}
              alignItems="center"
              sx={{
                width: '100%',
                maxWidth: '100%',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {visible.map((tag, idx) => (
                <Chip
                  key={`${tag}-${idx}`}
                  label={tag}
                  size="small"
                  variant="outlined"
                  icon={<LocalOfferOutlined fontSize="inherit" sx={{ fontSize: '0.9rem' }} />}
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              ))}
              {extra > 0 && (
                <Tooltip
                  placement="right"
                  arrow
                  enterDelay={300}
                  title={
                    <Stack spacing={0.5}>
                      {tags.map((tag, idx) => (
                        <Box key={`${tag}-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocalOfferOutlined fontSize="inherit" sx={{ fontSize: '0.9rem' }} />
                          <span>{tag}</span>
                        </Box>
                      ))}
                    </Stack>
                  }
                >
                  <Chip
                    label={`+${extra}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 20, cursor: 'pointer' }}
                  />
                </Tooltip>
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
      headerComponentParams: {
        ...headerParams,
        filterConfig: {
          type: 'dateRange',
          minKey: 'minDate',
          maxKey: 'maxDate',
        },
      },
      valueFormatter: ({ value }) => formatDate(value),
    },
    {
      headerName: 'Records',
      field: 'count',
      width: 140,
      type: 'rightAligned',
      headerComponentParams: {
        ...headerParams,
        filterConfig: { disableFilter: true },
      },
      valueFormatter: ({ value }) => {
        if (value === undefined || value === null || Number.isNaN(Number(value))) return '—';
        return Number(value).toLocaleString();
      },
    },
  ], [availableCategories, availableColumnTags, availableCountries, availableYears, formatDate, headerParams]);

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