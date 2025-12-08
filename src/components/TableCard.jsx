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
  Skeleton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
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
  RestartAlt
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { highlightText } from '../utils/searchUtils';
import * as XLSX from 'xlsx';

ModuleRegistry.registerModules([AllCommunityModule]);
 
/**
 * HighlightedText Component
 * Highlights matching text in search results
 */
const HighlightedText = ({ text, query, permutationId = 'none', permutationParams = {} }) => {
  if (!query || !text) return <span>{text}</span>;

  const parts = highlightText(text, query, permutationId, permutationParams);

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
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const pinMenuCloseTimeoutRef = useRef(null);

  const { column, displayName, showColumnMenu, progressSort, enableSorting, api } = props;

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

  // Listen for popup menu hidden event to reset filter menu state
  useEffect(() => {
    const onPopupMenuHidden = () => {
      setIsFilterMenuOpen(false);
    };

    if (api) {
      api.addEventListener('popupMenuHidden', onPopupMenuHidden);
      return () => api.removeEventListener('popupMenuHidden', onPopupMenuHidden);
    }
  }, [api]);

  // Apply custom animation to AG Grid popups to match Material-UI Menu animation
  useEffect(() => {
    // Override AG Grid popup animation to match Material-UI's grow animation
    const style = document.createElement('style');
    style.textContent = `
      .ag-popup {
        animation: ag-popup-grow 0.2s ease-out !important;
      }

      @keyframes ag-popup-grow {
        0% {
          opacity: 0;
          transform: scale(0.75);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }

      .ag-popup.ag-popup-hiding {
        animation: ag-popup-shrink 0.15s ease-in !important;
      }

      @keyframes ag-popup-shrink {
        0% {
          opacity: 1;
          transform: scale(1);
        }
        100% {
          opacity: 0;
          transform: scale(0.75);
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
    if (isFilterMenuOpen) {
      // Hide the column menu if it's already open
      if (api?.hidePopupMenu) {
        api.hidePopupMenu();
      }
      setIsFilterMenuOpen(false);
    } else {
      // Show the column menu
      showColumnMenu(e.currentTarget);
      setIsFilterMenuOpen(true);
    }
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
                '&:hover': { opacity: 1 }
            }}
         >
            <FilterAlt fontSize="small" sx={{ fontSize: 16 }} />
         </IconButton>
      </Tooltip>

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
  isLoading = false,
  onSendToLastPage,
  hasMore = false,
  onLoadMore = null,
  isLoadingMore = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [columnOrder, setColumnOrder] = useState(table?.columns || []);
  const [gridApi, setGridApi] = useState(null);

  // Update column order when table changes
  useEffect(() => {
    if (table?.columns) {
      setColumnOrder(table.columns);
    }
  }, [table?.columns]);

  const onGridReady = useCallback((params) => {
    setGridApi(params.api);
  }, []);

  const handleResetView = useCallback(() => {
    if (!gridApi) return;
    
    // Reset column order to original
    if (table?.columns) {
      setColumnOrder(table.columns);
    }

    // Reset grid state (sort, filter, width, pin)
    gridApi.setFilterModel(null);
    gridApi.resetColumnState();
  }, [gridApi, table?.columns]);

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
    if (!table?.data || table.data.length === 0) {
      return;
    }

    const formattedRows = table.data.map((row) => {
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

  // Transform data for AG Grid (add id field)
  const rowData = React.useMemo(() => {
    if (!table?.data) return [];
    return table.data.map((row, index) => ({
      id: index,
      ...row,
    }));
  }, [table?.data, table?.id]);

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
            <HighlightedText text={params.value ?? 'N/A'} query={query} />
          </Typography>
        </Box>
      );
    },
    [query]
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

    const dataColumns = columnOrder.map((column) => ({
      field: column,
      headerName: column,
      flex: 1,
      minWidth: 140,
      filter: 'agTextColumnFilter',
      sortable: true,
      cellRenderer: renderHighlightCell,
      wrapText: false,
      autoHeight: false,
    }));

    return [rowDetailsColumn, ...dataColumns];
  }, [columnOrder, renderActionCell, renderHighlightCell]);

  const defaultColDef = React.useMemo(
    () => ({
      headerComponent: CustomHeader,
      headerComponentParams: {
        onResetView: handleResetView
      },
      resizable: true,
      sortable: true,
      filter: true,
      unSortIcon: true,
      suppressHeaderMenuButton: true,
    }),
    [handleResetView]
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
                label={`${table.data?.length || 0} Records`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
              {hasMore && onLoadMore && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={isLoadingMore ? <CircularProgress size={14} /> : <ExpandCircleDown />}
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
      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <CardContent sx={{ p: 0, height: 400, position: 'relative' }}>
          {isLoading ? (
            <Box sx={{ p: 3 }}>
              <Skeleton variant="rectangular" height={56} sx={{ mb: 2 }} animation="wave" />
              <Skeleton variant="rectangular" height={48} sx={{ mb: 1 }} animation="wave" />
              <Skeleton variant="rectangular" height={48} sx={{ mb: 1 }} animation="wave" />
              <Skeleton variant="rectangular" height={48} sx={{ mb: 1 }} animation="wave" />
              <Skeleton variant="rectangular" height={48} sx={{ mb: 1 }} animation="wave" />
              <Skeleton variant="rectangular" height={48} animation="wave" />
            </Box>
          ) : (
            <>
              <Box sx={{ height: '100%', width: '100%' }}>
                <AgGridReact
                  theme={themeQuartz}
                  rowData={rowData}
                  columnDefs={columnDefs}
                  defaultColDef={defaultColDef}
                  animateRows
                  suppressRowClickSelection
                  enableCellTextSelection
                  getMainMenuItems={getMainMenuItems}
                  onColumnMoved={handleColumnMoved}
                  tooltipShowDelay={200}
                  suppressDragLeaveHidesColumns
                  domLayout="normal"
                  getRowId={(params) => params?.data?.id}
                  onGridReady={onGridReady}
                />
              </Box>
              {/* Semi-transparent loading overlay for Load More */}
              {isLoadingMore && (
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
            </>
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
    prev.isLoading === next.isLoading &&
    prev.onSendToLastPage === next.onSendToLastPage &&
    prev.hasMore === next.hasMore &&
    prev.isLoadingMore === next.isLoadingMore &&
    prev.onLoadMore === next.onLoadMore
  );
};

export default React.memo(TableCard, areEqual);
