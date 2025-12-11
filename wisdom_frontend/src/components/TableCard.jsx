import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Chip,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Popover,
  Stack
} from '@mui/material';
import { keyframes } from '@mui/system';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import {
  ExpandMore,
  ExpandLess,
  TableChart,
  Info,
  Close,
  ContentCopy,
  ReplyAll,
  Download,
  ExpandCircleDown,
  FilterAlt,
  MoreVert,
  PushPin,
  PushPinOutlined,
  ArrowUpward,
  ArrowDownward,
  ViewWeek,
  KeyboardArrowRight,
  CompareArrows,
  RestartAlt,
  LocalOfferOutlined
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import MultiSelectListFilter from './MultiSelectListFilter';
import { highlightText } from '../utils/searchUtils';
import * as XLSX from 'xlsx';

ModuleRegistry.registerModules([AllCommunityModule]);
 
// Animated ellipsis for record loading state
const loadingDots = keyframes`
  0% { content: '.'; }
  33% { content: '..'; }
  66% { content: '...'; }
  100% { content: '.'; }
`;

const AnimatedDots = () => (
  <Box
    component="span"
    sx={{
      display: 'inline-block',
      minWidth: '1.5em',
      '&::after': {
        content: '"..."',
        display: 'inline-block',
        animation: `${loadingDots} 1s steps(3, end) infinite`,
      },
    }}
  />
);

/**
 * Custom Loading Overlay Component
 * Shows a circular progress indicator instead of default "Loading..." text
 */
const CustomLoadingOverlay = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%'
    }}
  >
    <CircularProgress size={32} />
  </Box>
);

/**
 * Custom No Rows Overlay Component
 * Shows a friendly message when there is nothing to render
 */
const CustomNoRowsOverlay = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%'
    }}
  >
    <Typography variant="body2" color="text.secondary">
      No rows to display
    </Typography>
  </Box>
);

/**
 * HighlightedText Component
 * Highlights matching text in search results
 */
const HighlightedText = ({
  text,
  query,
  permutationId = 'none',
  permutationParams = {},
  permutationVariants = null
}) => {
  if (!query || !text) return <span>{text}</span>;

  const parts = highlightText(text, query, permutationId, permutationParams, permutationVariants);

  return (
    <span>
      {parts.map((part, index) =>
        part.highlight ? (
          <Box
            key={index}
            component="span"
            sx={{
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              color: 'primary.main',
              fontWeight: 500,
              borderRadius: 0.5,
            }}
          >
            {part.text}
          </Box>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </span>
  );
};

/**
 * CustomHeader Component
 * Renders column header with sort, filter, and custom menu
 */
const CustomHeader = (props) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [pinMenuAnchorEl, setPinMenuAnchorEl] = useState(null);
  const [sortState, setSortState] = useState(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const pinMenuCloseTimeoutRef = useRef(null);

  const {
    column,
    displayName,
    progressSort,
    enableSorting,
    api,
    getFilterOptions = () => [],
    getFilterValues = () => [],
    onFilterChange,
    onFilterClear,
  } = props;
  const headerTags = column?.getColDef()?.metaTags || [];
  const colId = column?.getColId?.();
  const filterOptions = getFilterOptions(colId) || [];
  const selectedFilterValues = getFilterValues(colId) || [];
  const isFilterActive = Array.isArray(selectedFilterValues) && selectedFilterValues.length > 0;

  useEffect(() => {
    const onSortChanged = () => {
      if (column.isSortAscending()) {
        setSortState('asc');
      } else if (column.isSortDescending()) {
        setSortState('desc');
      } else {
        setSortState(null);
      }
    };

    onSortChanged();

    column.addEventListener('sortChanged', onSortChanged);
    return () => column.removeEventListener('sortChanged', onSortChanged);
  }, [column]);

  const handleMenuClick = (event) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setPinMenuAnchorEl(null);
    // Clear any pending close timeout
    if (pinMenuCloseTimeoutRef.current) {
      clearTimeout(pinMenuCloseTimeoutRef.current);
      pinMenuCloseTimeoutRef.current = null;
    }
  };

  const handlePinMenuOpen = (event) => {
    // Clear any pending close timeout
    if (pinMenuCloseTimeoutRef.current) {
      clearTimeout(pinMenuCloseTimeoutRef.current);
      pinMenuCloseTimeoutRef.current = null;
    }
    setPinMenuAnchorEl(event.currentTarget);
  };

  const handlePinMenuClose = () => {
    // Delay closing to allow mouse to move between main item and submenu
    pinMenuCloseTimeoutRef.current = setTimeout(() => {
      setPinMenuAnchorEl(null);
    }, 150);
  };

  const handlePinMenuCloseImmediate = () => {
    // Clear timeout and close immediately
    if (pinMenuCloseTimeoutRef.current) {
      clearTimeout(pinMenuCloseTimeoutRef.current);
      pinMenuCloseTimeoutRef.current = null;
    }
    setPinMenuAnchorEl(null);
  };

  const handleSort = (e) => {
    if (enableSorting) {
      progressSort(e.shiftKey);
    }
  };

  const handleFilterClick = (e) => {
    e.stopPropagation();
    setFilterAnchorEl(e.currentTarget);
  };

  const handlePin = (pinned) => {
    api.setColumnsPinned([column], pinned);
    handleMenuClose();
  };

  const handleAutosize = () => {
    api.autoSizeColumns([column]);
    handleMenuClose();
  };

  const handleAutosizeAll = () => {
    api.autoSizeAllColumns();
    handleMenuClose();
  };

  const handleCopyName = async () => {
    try {
      const text = displayName ?? column.getColId();
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy column name:', error);
    }
    handleMenuClose();
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        width: '100%', 
        height: '100%',
        gap: 0.5
      }}
    >
      <Box
        onClick={handleSort}
        sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            cursor: enableSorting ? 'pointer' : 'default',
            overflow: 'hidden',
            height: '100%'
        }}
      >
        {headerTags.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.25 }}>
            <Tooltip
              title={
                headerTags.length > 1 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                    {headerTags.map((tag, idx) => (
                      <Box key={`${tag}-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocalOfferOutlined fontSize="inherit" sx={{ fontSize: '0.9rem' }} />
                        <span>{tag}</span>
                      </Box>
                    ))}
                  </Box>
                ) : headerTags[0]
              }
              arrow
              placement="top"
            >
              <IconButton
                size="small"
                disableRipple
                sx={{
                  p: 0.25,
                  ml: 0.25,
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <LocalOfferOutlined fontSize="inherit" sx={{ fontSize: '1rem' }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        <Typography 
            variant="subtitle2" 
            fontWeight={600} 
            noWrap 
            sx={{ 
                mr: 0.5, 
                fontSize: '0.75rem', 
                color: 'text.secondary' 
            }}
        >
            {displayName}
        </Typography>
        {sortState === 'asc' && <ArrowUpward fontSize="small" sx={{ fontSize: 14, color: 'text.secondary' }} />}
        {sortState === 'desc' && <ArrowDownward fontSize="small" sx={{ fontSize: 14, color: 'text.secondary' }} />}
      </Box>

      {/* Filter Button */}
      <Tooltip title="Filter">
         <IconButton 
            size="small" 
            onClick={handleFilterClick} 
            sx={{ 
                p: 0.5,
                opacity: 0.7,
                color: isFilterActive ? 'primary.main' : 'text.secondary',
                '&:hover': { opacity: 1, color: 'primary.main' }
            }}
         >
            <FilterAlt fontSize="small" sx={{ fontSize: 16 }} />
         </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              p: 1.25,
              minWidth: 220,
              maxWidth: 320,
              borderRadius: 1.5,
              boxShadow: 4,
            },
          },
        }}
      >
        <Stack spacing={1}>
          <MultiSelectListFilter
            options={filterOptions}
            value={selectedFilterValues}
            onChange={(next) => onFilterChange?.(colId, next)}
            placeholder="Search options"
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                onFilterClear?.(colId);
                setFilterAnchorEl(null);
              }}
            >
              Clear
            </Button>
            <Button size="small" variant="contained" onClick={() => setFilterAnchorEl(null)}>
              Done
            </Button>
          </Box>
        </Stack>
      </Popover>

      {/* Column Menu Button */}
      <Tooltip title="Column Options">
        <IconButton 
            size="small" 
            onClick={handleMenuClick} 
            sx={{ 
                p: 0.5,
                opacity: 0.7,
                '&:hover': { opacity: 1 }
            }}
        >
            <MoreVert fontSize="small" sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        MenuListProps={{ dense: true }}
      >
        <MenuItem
            onClick={handlePinMenuOpen}
            onMouseEnter={handlePinMenuOpen}
            onMouseLeave={handlePinMenuClose}
            sx={{ display: 'flex', justifyContent: 'space-between' }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ListItemIcon><PushPin fontSize="small" /></ListItemIcon>
                <ListItemText>Pin Column</ListItemText>
            </Box>
            <KeyboardArrowRight fontSize="small" />
        </MenuItem>

        <Divider />
        <MenuItem onClick={handleCopyName}>
            <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
            <ListItemText>Copy Name</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleAutosize}>
            <ListItemIcon><CompareArrows fontSize="small" /></ListItemIcon>
            <ListItemText>Autosize This Column</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleAutosizeAll}>
            <ListItemIcon><CompareArrows fontSize="small" /></ListItemIcon>
            <ListItemText>Autosize All</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
            props.onResetView?.();
            handleMenuClose();
        }}>
            <ListItemIcon><RestartAlt fontSize="small" /></ListItemIcon>
            <ListItemText>Return to default view</ListItemText>
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={pinMenuAnchorEl}
        open={Boolean(pinMenuAnchorEl)}
        onClose={handlePinMenuCloseImmediate}
        anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
        }}
        transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
        }}
        MenuListProps={{
            dense: true,
            onMouseEnter: () => {
              // Clear close timeout when entering submenu
              if (pinMenuCloseTimeoutRef.current) {
                clearTimeout(pinMenuCloseTimeoutRef.current);
                pinMenuCloseTimeoutRef.current = null;
              }
            },
            onMouseLeave: handlePinMenuClose
        }}
        sx={{ pointerEvents: 'none' }}
        PaperProps={{
             sx: { pointerEvents: 'auto' }
        }}
      >
        <MenuItem onClick={() => handlePin('left')}>
            <ListItemIcon><PushPin fontSize="small" /></ListItemIcon>
            <ListItemText>Pin Left</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handlePin('right')}>
            <ListItemIcon><PushPin sx={{ transform: 'scaleX(-1)' }} fontSize="small" /></ListItemIcon>
            <ListItemText>Pin Right</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handlePin(null)}>
            <ListItemIcon><PushPinOutlined fontSize="small" /></ListItemIcon>
            <ListItemText>Unpin</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

/**
 * TableCard Component
 * Displays a single table with expandable data view using MUI components
 */
const TableCard = ({
  table,
  query,
  permutationId = 'none',
  permutationParams = {},
  permutationVariants = null,
  isLoadingRows = false,
  onSendToLastPage,
  hasMore = false,
  onLoadMore = null,
  isLoadingMore = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const columnMeta = React.useMemo(() => {
    const cols = Array.isArray(table?.columns) ? table.columns : [];
    return cols
      .map((col) => {
        if (typeof col === 'string') {
          return { id: col, label: col, tags: [] };
        }
        if (col && typeof col === 'object') {
          const field = col.field || col.name || '';
          if (!field) return null;
          return {
            id: field,
            label: col.name || col.headerName || col.field || field,
            tags: Array.isArray(col.tags) ? col.tags.filter(Boolean) : [],
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [table?.columns]);

  const [columnOrder, setColumnOrder] = useState(columnMeta.map((c) => c.id));
  const [gridApi, setGridApi] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const gridContainerRef = useRef(null);

  const dedupedData = React.useMemo(() => {
    if (!Array.isArray(table?.data)) return [];

    // Drop duplicate records that share the same id (can happen when pagination overlaps)
    const seen = new Set();
    return table.data.filter((row, index) => {
      const key = row?.id ?? `idx-${index}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [table?.data]);

  const totalRecords = table?.count ?? dedupedData.length;

  const expectsRows = (table?.count ?? 0) > 0;
  const isGridLoading = isLoadingRows || (!dedupedData.length && expectsRows);

  const normalizeCellValue = useCallback((value) => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) {
      return value
        .map((v) => (v === null || v === undefined ? '' : String(v)))
        .filter((v) => v !== '')
        .join(', ');
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  }, []);

  const columnFilterOptions = React.useMemo(() => {
    const options = {};
    dedupedData.forEach((row) => {
      columnOrder.forEach((colId) => {
        const cellValue = row?.[colId];
        if (cellValue === undefined || cellValue === null) return;
        const normalized = normalizeCellValue(cellValue);
        if (!options[colId]) {
          options[colId] = new Set();
        }
        options[colId].add(normalized);
      });
    });

    return Object.fromEntries(
      Object.entries(options).map(([key, set]) => [
        key,
        Array.from(set).sort((a, b) => String(a).localeCompare(String(b))),
      ])
    );
  }, [columnOrder, dedupedData, normalizeCellValue]);

  const handleColumnFilterChange = useCallback((colId, values) => {
    setColumnFilters((prev) => {
      const nextValues = Array.isArray(values) ? values.filter(Boolean) : [];
      if (nextValues.length === 0) {
        if (!prev[colId]) return prev;
        const { [colId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [colId]: nextValues };
    });
  }, []);

  const handleColumnFilterClear = useCallback((colId) => {
    setColumnFilters((prev) => {
      if (!prev[colId]) return prev;
      const { [colId]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  // Update column order when table changes
  useEffect(() => {
    if (columnMeta.length) {
      setColumnOrder(columnMeta.map((c) => c.id));
    }
  }, [columnMeta]);

  const onGridReady = useCallback((params) => {
    setGridApi(params.api);
  }, []);

  // Transform data for AG Grid (add id field)
  const rowData = React.useMemo(() => {
    if (!dedupedData) return [];
    return dedupedData.map((row, index) => ({
      id: row?.id ?? index,
      ...row,
    }));
  }, [dedupedData, table?.id]);

  const filteredRowData = React.useMemo(() => {
    const activeFilters = Object.entries(columnFilters).filter(
      ([, values]) => Array.isArray(values) && values.length > 0
    );
    if (activeFilters.length === 0) return rowData;

    return rowData.filter((row) =>
      activeFilters.every(([colId, selected]) => {
        const cellValue = row?.[colId];
        if (cellValue === undefined || cellValue === null) return false;
        const normalized = normalizeCellValue(cellValue);
        return selected.includes(normalized);
      })
    );
  }, [columnFilters, normalizeCellValue, rowData]);

  const hasVisibleRows = filteredRowData.length > 0;

  // Keep AG Grid overlays in sync; rely on our outer overlay for loading
  useEffect(() => {
    if (!gridApi) return;

    if (isGridLoading) {
      // Use outer semi-transparent overlay; keep grid overlays hidden to avoid double spinners
      gridApi.hideOverlay();
      return;
    }

    if (!hasVisibleRows) {
      gridApi.showNoRowsOverlay();
      return;
    }

    gridApi.hideOverlay();
  }, [gridApi, hasVisibleRows, isGridLoading]);

  const handleResetView = useCallback(() => {
    if (!gridApi) return;
    
    // Reset column order to original
    if (columnMeta.length) {
      setColumnOrder(columnMeta.map((c) => c.id));
    }

    // Reset grid state (sort, filter, width, pin)
    setColumnFilters({});
    gridApi.setFilterModel(null);
    gridApi.resetColumnState();
  }, [columnMeta, gridApi]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleRowInfoClick = useCallback((row) => {
    setSelectedRow(row);
    setIsPopupOpen(true);
  }, []);

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setSelectedRow(null);
  };

  const handleCopyRow = async () => {
    if (!selectedRow) return;

    const rowContent = columnOrder
      .map(column => `${column}: ${selectedRow[column] || 'N/A'}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(rowContent);
      // Could add a toast notification here if desired
    } catch (err) {
      console.error('Failed to copy row content:', err);
    }
  };

  const handleDownloadExcel = () => {
    if (!dedupedData.length) {
      return;
    }

    const formattedRows = dedupedData.map((row) => {
      const formattedRow = {};
      columnOrder.forEach((column) => {
        formattedRow[column] = row?.[column] ?? 'N/A';
      });
      return formattedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const workbook = XLSX.utils.book_new();
    const sheetName = (table.name || 'Data').slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const safeFileName = `${table.name || 'table'}`.replace(
      /[\\/:*?"<>|]/g,
      '_'
    );

    XLSX.writeFile(workbook, `${safeFileName}.xlsx`);
  };

  const renderHighlightCell = useCallback(
    (params) => {
      return (
        <Box
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            width: '100%',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'left',
              flex: 1,
            }}
            title={params.value ?? 'N/A'}
          >
            <HighlightedText
              text={params.value ?? 'N/A'}
              query={query}
              permutationId={permutationId}
              permutationParams={permutationParams}
              permutationVariants={permutationVariants}
            />
          </Typography>
        </Box>
      );
    },
    [permutationId, permutationParams, permutationVariants, query]
  );

  const renderActionCell = useCallback(
    (params) => {
      const row = params.data;
      if (!row) return null;

      return (
        <Tooltip title="View full details">
          <IconButton
            size="small"
            disableRipple
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRowInfoClick(row);
            }}
            sx={{
              width: 28,
              height: 28,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '50%',
              color: 'text.secondary',
              backgroundColor: 'transparent',
              boxShadow: 'none',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: 'transparent',
                borderColor: 'primary.main',
                color: 'primary.main',
                transform: 'translateY(-2px)',
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
              },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                lineHeight: 1,
                fontSize: '0.85rem',
                textTransform: 'lowercase',
              }}
            >
              i
            </Typography>
          </IconButton>
        </Tooltip>
      );
    },
    [handleRowInfoClick]
  );

  const columnTagsMap = React.useMemo(() => {
    const map = new Map();
    columnMeta.forEach((c) => {
      map.set(c.id, c.tags || []);
    });
    return map;
  }, [columnMeta]);

  const columnLabelMap = React.useMemo(() => {
    const map = new Map();
    columnMeta.forEach((c) => {
      map.set(c.id, c.label || c.id);
    });
    return map;
  }, [columnMeta]);

  const columnDefs = React.useMemo(() => {
    const rowDetailsColumn = {
      field: '__rowDetails__',
      headerName: '',
      headerComponent: () => null,
      width: 64,
      minWidth: 64,
      maxWidth: 64,
      pinned: 'left',
      lockPinned: true,
      suppressMovable: true,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: renderActionCell,
      colId: '__rowDetails__',
      menuTabs: [],
    };

    const dataColumns = columnOrder.map((column) => {
      const tags = columnTagsMap.get(column) || [];
      const label = columnLabelMap.get(column) || column;
      return {
        field: column,
        headerName: label,
        width: 200,
        minWidth: 140,
        filter: false,
        sortable: true,
        cellRenderer: renderHighlightCell,
        wrapText: false,
        autoHeight: false,
        metaTags: tags,
      };
    });

    return [rowDetailsColumn, ...dataColumns];
  }, [columnLabelMap, columnOrder, columnTagsMap, renderActionCell, renderHighlightCell]);

  const headerComponentParams = React.useMemo(
    () => ({
      onResetView: handleResetView,
      getFilterOptions: (colId) => columnFilterOptions[colId] || [],
      getFilterValues: (colId) => columnFilters[colId] || [],
      onFilterChange: handleColumnFilterChange,
      onFilterClear: handleColumnFilterClear,
    }),
    [columnFilterOptions, columnFilters, handleColumnFilterChange, handleColumnFilterClear, handleResetView]
  );

  const defaultColDef = React.useMemo(
    () => ({
      headerComponent: CustomHeader,
      headerComponentParams,
      resizable: true,
      sortable: true,
      filter: false,
      unSortIcon: true,
      suppressHeaderMenuButton: true,
    }),
    [headerComponentParams]
  );

  const getMainMenuItems = useCallback((params) => {
    const defaultItems = params.defaultItems ?? [];

    const copyItem = {
      name: 'Copy column name',
      action: async () => {
        try {
          const text = params.column.getColDef().headerName ?? params.column.getColId();
          await navigator.clipboard.writeText(text);
        } catch (error) {
          console.error('Failed to copy column name:', error);
        }
      },
    };

    return [...defaultItems, 'separator', copyItem];
  }, []);

  const handleColumnMoved = useCallback((event) => {
    if (!event?.finished || !event?.columnApi) return;
    const ordered = event.columnApi
      .getAllGridColumns()
      .map((col) => col.getColId())
      .filter((field) => field && field !== '__rowDetails__');
    if (ordered.length) {
      setColumnOrder(ordered);
    }
  }, []);

  const handleCellClicked = useCallback((event) => {
    // Store the selected cell information
    setSelectedCell({
      value: event.value,
      colId: event.column.getColId(),
      rowIndex: event.rowIndex
    });
  }, []);

  // Clear the tracked cell when clicking outside the grid to avoid hijacking copy
  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!gridContainerRef.current) return;
      if (!gridContainerRef.current.contains(event.target)) {
        setSelectedCell(null);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  // Handle keyboard events for cell copying, but only when focus is inside the grid
  useEffect(() => {
    const handleKeyDown = async (event) => {
      if (!gridContainerRef.current) return;

      const isInsideGrid =
        gridContainerRef.current.contains(document.activeElement) ||
        gridContainerRef.current.contains(event.target);

      if (!isInsideGrid) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && selectedCell) {
        try {
          const cellValue = selectedCell.value ?? 'N/A';
          await navigator.clipboard.writeText(cellValue);
          event.preventDefault(); // Prevent default copy behavior within grid
        } catch (error) {
          console.error('Failed to copy cell value:', error);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell]);


  return (
    <Card
      sx={{
        mb: 3,
        overflow: 'visible',
        transition: 'box-shadow 0.3s ease',
        '&:hover': {
          boxShadow: 4,
        },
      }}
    >
      {/* Table Header */}
      <Box
        sx={{
          backgroundColor: 'grey.50',
          borderBottom: 1,
          borderColor: 'divider',
          px: 3,
          py: 2.5,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          {/* Left: Table Info */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <TableChart color="primary" />
              <Typography variant="h6" fontWeight={700}>
                {table.name}
              </Typography>
              <Chip
                label={table.year}
                size="small"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={
                  (isLoadingRows || isLoadingMore) ? (
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      <span>Records:</span>
                      <AnimatedDots />
                      <span>/ {totalRecords}</span>
                    </Box>
                  ) : (
                    `Records: ${dedupedData.length} / ${totalRecords}`
                  )
                }
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
              {hasMore && onLoadMore && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={isLoadingMore ? null : <ExpandCircleDown />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadMore();
                  }}
                  disabled={isLoadingMore}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    height: '24px',
                    px: 1,
                    minWidth: 'auto',
                  }}
                >
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </Button>
              )}
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Region: <strong>{table.country}</strong>
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Categories:
                </Typography>
                {table.categories.map((category, index) => (
                  <Chip
                    key={`${category}-${index}`}
                    label={category}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.75rem' }}
                  />
                ))}
              </Box>
            </Box>
          </Box>

          {/* Right: Toggle Button and Actions */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', alignSelf: { xs: 'flex-end', md: 'center' } }}>
            {onSendToLastPage && (
              <Tooltip title="Send to Last Page">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onSendToLastPage(table.id);
                  }}
                  sx={{
                    backgroundColor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': {
                      backgroundColor: 'grey.100',
                    },
                  }}
                >
                  <ReplyAll />
                </IconButton>
              </Tooltip>
            )}
            {!!table?.data?.length && (
              <Tooltip title="Download as Excel">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadExcel();
                  }}
                  sx={{
                    backgroundColor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    '&:hover': {
                      backgroundColor: 'grey.100',
                    },
                  }}
                >
                  <Download />
                </IconButton>
              </Tooltip>
            )}
            <IconButton
              onClick={handleToggle}
              sx={{
                backgroundColor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                '&:hover': {
                  backgroundColor: 'grey.100',
                },
              }}
            >
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Table Data */}
      <Collapse in={isExpanded} timeout="auto">
        <CardContent sx={{ p: 0, height: 400, position: 'relative' }}>
          <Box sx={{ height: '100%', width: '100%' }} ref={gridContainerRef}>
            <AgGridReact
              theme={themeQuartz}
              rowData={filteredRowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              animateRows
              enableCellTextSelection
              enableCellCopy
              loadingOverlayComponent={CustomLoadingOverlay}
              noRowsOverlayComponent={CustomNoRowsOverlay}
              onColumnMoved={handleColumnMoved}
              onCellClicked={handleCellClicked}
              tooltipShowDelay={200}
              suppressDragLeaveHidesColumns
              suppressSizeToFit
              domLayout="normal"
              getRowId={(params) => params?.data?.id}
              onGridReady={onGridReady}
            />
          </Box>
          {/* Semi-transparent loading overlay for initial row loading or Load More */}
          {(isLoadingRows || isLoadingMore) && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <CircularProgress size={40} />
            </Box>
          )}
        </CardContent>
      </Collapse>

      {/* Row Overview Popup */}
      <Dialog
        open={isPopupOpen}
        onClose={handleClosePopup}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Info />
            <Typography variant="h6" fontWeight={500}>
              Row Details
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Copy row content">
              <IconButton
                onClick={handleCopyRow}
                size="small"
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'primary.main',
                    backgroundColor: 'primary.light',
                  },
                }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {selectedRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {columnOrder.map((column, index) => (
                <Box key={column}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 1,
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={500}
                    >
                      {column}:
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={300}
                    >
                      {selectedRow[column] || 'N/A'}
                    </Typography>
                  </Box>
                  {index < columnOrder.length - 1 && <Divider sx={{ mt: 2 }} />}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={handleClosePopup}
            variant="outlined"
            startIcon={<Close />}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

const shallowEqualObject = (a = {}, b = {}) => {
  if (a === b) return true;
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i += 1) {
    const key = aKeys[i];
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
};

const areEqual = (prev, next) => {
  return (
    prev.table === next.table &&
    prev.query === next.query &&
    prev.permutationId === next.permutationId &&
    shallowEqualObject(prev.permutationParams, next.permutationParams) &&
    prev.isLoadingRows === next.isLoadingRows &&
    prev.onSendToLastPage === next.onSendToLastPage &&
    prev.hasMore === next.hasMore &&
    prev.isLoadingMore === next.isLoadingMore &&
    prev.onLoadMore === next.onLoadMore
  );
};

export default React.memo(TableCard, areEqual);
