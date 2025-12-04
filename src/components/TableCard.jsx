import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Skeleton
} from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import {
  ExpandMore,
  ExpandLess,
  TableChart,
  Info,
  Close,
  ContentCopy,
  ReplyAll
} from '@mui/icons-material';
import { highlightText } from '../utils/searchUtils';

// Register AG Grid modules
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
 * Custom Cell Renderer for highlighted text
 */
const HighlightCellRenderer = (props) => {
  const { value, context } = props;
  const displayValue = value ?? 'N/A';

  return (
    <Box
      sx={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        width: '100%',
        px: 1,
      }}
      title={displayValue}
    >
      <HighlightedText
        text={String(displayValue)}
        query={context?.query}
        permutationId={context?.permutationId}
        permutationParams={context?.permutationParams}
      />
    </Box>
  );
};

/**
 * Custom Cell Renderer for the Actions column
 */
const ActionsCellRenderer = (props) => {
  const { data, context } = props;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Tooltip title="View full details">
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            context?.onRowInfoClick?.(data);
          }}
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: 'primary.main',
              backgroundColor: 'primary.light',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          <Info fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

/**
 * TableCard Component
 * Displays a single table with expandable data view using AG Grid
 */
const TableCard = ({
  table,
  query,
  permutationId = 'none',
  permutationParams = {},
  isLoading = false,
  onSendToLastPage
}) => {
  const gridRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [columnOrder, setColumnOrder] = useState(table?.columns || []);

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMenuColumn, setContextMenuColumn] = useState(null);

  // Update column order when table changes
  useEffect(() => {
    if (table?.columns) {
      setColumnOrder(table.columns);
    }
  }, [table?.columns]);

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
    } catch (err) {
      console.error('Failed to copy row content:', err);
    }
  };

  // Context menu handlers
  const handleContextMenuClose = () => {
    setContextMenu(null);
    setContextMenuColumn(null);
  };

  const handleCopyColumnName = async () => {
    if (contextMenuColumn) {
      try {
        await navigator.clipboard.writeText(contextMenuColumn);
      } catch (err) {
        console.error('Failed to copy column name:', err);
      }
    }
    handleContextMenuClose();
  };

  // Handle column moved event from AG Grid
  const onColumnMoved = useCallback((event) => {
    if (event.finished && gridRef.current) {
      const columnState = event.api.getColumnState();
      const newOrder = columnState
        .filter(col => col.colId !== 'actions')
        .map(col => col.colId);
      setColumnOrder(newOrder);
    }
  }, []);

  // Handle header right-click for context menu
  const onColumnHeaderContextMenu = useCallback((event) => {
    event.preventDefault();
    const colId = event.column?.getColId();
    if (colId && colId !== 'actions') {
      setContextMenuColumn(colId);
      setContextMenu({
        mouseX: event.event.clientX,
        mouseY: event.event.clientY,
      });
    }
  }, []);

  // Row data for AG Grid
  const rowData = useMemo(() => {
    if (!table?.data) return [];
    return table.data.map((row, index) => ({
      ...row,
      _rowIndex: index,
    }));
  }, [table?.data]);

  // Column definitions for AG Grid
  const columnDefs = useMemo(() => {
    const cols = columnOrder.map((column) => ({
      field: column,
      headerName: column,
      flex: 1,
      minWidth: 120,
      sortable: true,
      filter: true,
      resizable: true,
      cellRenderer: HighlightCellRenderer,
    }));

    // Add actions column
    cols.push({
      field: 'actions',
      headerName: '',
      width: 60,
      minWidth: 60,
      maxWidth: 60,
      sortable: false,
      filter: false,
      resizable: false,
      suppressMovable: true,
      lockPosition: 'right',
      cellRenderer: ActionsCellRenderer,
    });

    return cols;
  }, [columnOrder]);

  // Default column definition
  const defaultColDef = useMemo(() => ({
    suppressHeaderMenuButton: false,
  }), []);

  // Grid context for passing data to cell renderers
  const gridContext = useMemo(() => ({
    query,
    permutationId,
    permutationParams,
    onRowInfoClick: handleRowInfoClick,
  }), [query, permutationId, permutationParams, handleRowInfoClick]);

  // Grid options
  const gridOptions = useMemo(() => ({
    suppressContextMenu: true,
    suppressCellFocus: true,
    enableCellTextSelection: true,
    ensureDomOrder: true,
  }), []);

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
                label={`${table.matchCount || table.count} Records`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
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
                {table.categories.map((category) => (
                  <Chip
                    key={category}
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
        <CardContent sx={{ p: 0, height: 400 }}>
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
            <Box
              sx={{
                height: '100%',
                width: '100%',
                '& .ag-theme-alpine': {
                  '--ag-header-background-color': '#F1F1F1',
                  '--ag-header-foreground-color': '#1a1a1a',
                  '--ag-row-hover-color': 'rgba(0, 0, 0, 0.04)',
                  '--ag-selected-row-background-color': 'rgba(25, 118, 210, 0.08)',
                  '--ag-font-family': '"Roboto", "Helvetica", "Arial", sans-serif',
                  '--ag-font-size': '14px',
                  '--ag-grid-size': '6px',
                  '--ag-list-item-height': '40px',
                  '--ag-row-height': '40px',
                  '--ag-header-height': '48px',
                  '--ag-borders': 'none',
                  '--ag-border-color': 'rgba(0, 0, 0, 0.12)',
                  '--ag-cell-horizontal-border': 'solid rgba(0, 0, 0, 0.12)',
                },
                '& .ag-header-cell': {
                  fontWeight: 600,
                  fontSize: '0.875rem',
                },
                '& .ag-cell': {
                  display: 'flex',
                  alignItems: 'center',
                  borderRight: '1px solid rgba(0, 0, 0, 0.12)',
                },
                '& .ag-header-cell:last-child, & .ag-cell:last-child': {
                  borderRight: 'none',
                },
                '& .ag-root-wrapper': {
                  borderRadius: 0,
                  border: 'none',
                },
              }}
            >
              <div className="ag-theme-alpine" style={{ height: '100%', width: '100%' }}>
                <AgGridReact
                  ref={gridRef}
                  rowData={rowData}
                  columnDefs={columnDefs}
                  defaultColDef={defaultColDef}
                  context={gridContext}
                  onColumnMoved={onColumnMoved}
                  onColumnHeaderContextMenu={onColumnHeaderContextMenu}
                  rowHeight={40}
                  headerHeight={48}
                  suppressRowClickSelection={true}
                  animateRows={false}
                  {...gridOptions}
                />
              </div>
            </Box>
          )}
        </CardContent>
      </Collapse>

      {/* Context Menu for Column Header */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        PaperProps={{
          sx: {
            borderRadius: 1,
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          }
        }}
      >
        <MenuItem onClick={handleCopyColumnName}>
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Copy column name" />
        </MenuItem>
      </Menu>

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
    prev.onSendToLastPage === next.onSendToLastPage
  );
};

export default React.memo(TableCard, areEqual);
