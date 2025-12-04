import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
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
  MenuItem,
  ListItemIcon,
  ListItemText,
  Skeleton
} from '@mui/material';
import { DataGrid, GridColumnMenuContainer, GridColumnMenuSortItem, GridColumnMenuFilterItem, GridColumnMenuHideItem, GridColumnMenuManageItem } from '@mui/x-data-grid';
import {
  ExpandMore,
  ExpandLess,
  TableChart,
  Info,
  Close,
  DragIndicator,
  ContentCopy,
  ReplyAll
} from '@mui/icons-material';
import { highlightText } from '../utils/searchUtils';
import { useTableContext, PANEL_EXPANDED_WIDTH, PANEL_COLLAPSED_WIDTH } from '../context/TableContext';
 
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
 * CustomColumnMenu Component
 * Custom column menu that extends the default MUI DataGrid column menu
 */
const CustomColumnMenu = (props) => {
  const { hideMenu, colDef } = props;

  const handleCopyColumnName = async () => {
    try {
      const text = colDef.headerName ?? colDef.field;
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy column name:', err);
    } finally {
      hideMenu?.();
    }
  };

  return (
    <GridColumnMenuContainer 
      {...props}
      sx={{
        borderRadius: 1,              
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)', 
    }}>
      <GridColumnMenuSortItem colDef={colDef} onClick={hideMenu} />
      <Divider />
      <GridColumnMenuFilterItem colDef={colDef} onClick={hideMenu} />
      <Divider />
      <GridColumnMenuHideItem colDef={colDef} onClick={hideMenu} />
      <GridColumnMenuManageItem colDef={colDef} onClick={hideMenu} />
      <MenuItem onClick={handleCopyColumnName}>
        <ListItemIcon>
          <ContentCopy fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="Copy column name" />
      </MenuItem>
    </GridColumnMenuContainer>
  );
};

/**
 * DraggableColumnHeader Component
 * Custom column header with drag and drop functionality
 */
const DraggableColumnHeader = ({ column, onDragStart, onDragOver, onDrop, isDragging, isDragOver }) => {
  return (
    <Box
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isDragOver ? 'primary.light' : 'transparent',
        border: isDragOver ? '2px dashed' : '2px solid transparent',
        borderColor: isDragOver ? 'primary.main' : 'transparent',
        borderRadius: 1,
        transition: 'all 0.2s ease',
        padding: '8px 12px',
        minHeight: '40px',
        width: '100%',
        '&:hover': {
          backgroundColor: isDragOver ? 'primary.light' : 'action.hover',
        },
      }}
    >
      <DragIndicator
        sx={{
          fontSize: '1rem',
          color: 'text.secondary',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      />
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          fontSize: '0.875rem',
          color: 'text.primary',
          flex: 1,
        }}
      >
        {column}
      </Typography>
    </Box>
  );
};

/**
 * TableCard Component
 * Displays a single table with expandable data view using MUI components
 */
const COLUMN_MIN_WIDTH = 160;
const ROW_DETAIL_COLUMN_FIELD = '__row_details';

const TableCard = ({
  table,
  query,
  permutationId = 'none',
  permutationParams = {},
  isLoading = false,
  onSendToLastPage,
  maxGridWidth = 0,
}) => {
  const { isSidePanelCollapsed } = useTableContext();
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [columnOrder, setColumnOrder] = useState(table?.columns || []);
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const gridWrapperRef = useRef(null);
  const proxyScrollRef = useRef(null);
  const virtualScrollerRef = useRef(null);
  const scrollSyncStateRef = useRef({ fromGrid: false, fromProxy: false });
  const [verticalScrollMetrics, setVerticalScrollMetrics] = useState({
    scrollHeight: 0,
    clientHeight: 0,
  });
  const [frozenColumnWidth, setFrozenColumnWidth] = useState(null);
  const containerRef = useRef(null);
  const tableIdRef = useRef(table?.id);

  // Reset frozen width when table changes
  if (tableIdRef.current !== table?.id) {
    tableIdRef.current = table?.id;
    setFrozenColumnWidth(null);
  }

  useLayoutEffect(() => {
    if (isLoading || !containerRef.current) return;

    // Function to calculate and set width
    const updateWidth = () => {
      const width = containerRef.current?.clientWidth;
      if (width > 0 && columnOrder.length > 0) {
        const actionsWidth = 80; 
        // Calculate the effective available width:
        // If sidebar is collapsed (true): current width is already "wide".
        // If sidebar is expanded (false): current width is "narrow". 
        // We want to target the "wide" width always.
        // So if expanded, add the difference back.
        const sidebarDiff = isSidePanelCollapsed ? 0 : (PANEL_EXPANDED_WIDTH - PANEL_COLLAPSED_WIDTH);
        
        const availableWidth = (width + sidebarDiff) - actionsWidth - 2; 
        const calculated = Math.floor(availableWidth / columnOrder.length);
        const finalWidth = Math.max(COLUMN_MIN_WIDTH, calculated);
        
        // Only set if not already frozen or if significantly different (e.g. during initial layout settle)
        // But user wants strictly "initial render" fit. 
        // We'll set it once.
        setFrozenColumnWidth(prev => (prev === null ? finalWidth : prev));
      }
    };

    // Use ResizeObserver to catch the exact moment the container has width
    const observer = new ResizeObserver(() => {
      // We use requestAnimationFrame to avoid "ResizeObserver loop limit exceeded"
      requestAnimationFrame(() => {
        // We check inside if we need to update
        // We only want to set it once per table load.
        // However, ResizeObserver fires continuously on resize. 
        // We must rely on the state check inside updateWidth logic or here.
        if (frozenColumnWidth === null) {
          updateWidth();
        }
      });
    });

    observer.observe(containerRef.current);
    
    // Also try immediately in case it's already ready
    updateWidth();

    return () => observer.disconnect();
  }, [isLoading, columnOrder.length, frozenColumnWidth]);

  // Update column order when table changes
  useEffect(() => {
    if (table?.columns) {
      setColumnOrder(table.columns);
    }
  }, [table?.columns]);

  // Global drag end handler
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setDraggedColumn(null);
      setDragOverColumn(null);
    };

    document.addEventListener('dragend', handleGlobalDragEnd);
    return () => document.removeEventListener('dragend', handleGlobalDragEnd);
  }, []);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleRowInfoClick = (row) => {
    setSelectedRow(row);
    setIsPopupOpen(true);
  };

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

  // Drag and drop handlers for column reordering
  const handleDragStart = (e, column) => {
    setDraggedColumn(column);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, column) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(column);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDrop = (e, targetColumn) => {
    e.preventDefault();

    if (!draggedColumn || draggedColumn === targetColumn) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetColumn);

    // Remove dragged column from its current position
    newOrder.splice(draggedIndex, 1);

    // Insert dragged column at target position
    newOrder.splice(targetIndex, 0, draggedColumn);

    setColumnOrder(newOrder);
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Transform data for DataGrid (add id field)
  const dataGridRows = React.useMemo(() => {
    if (!table?.data) return [];
    return table.data.map((row, index) => ({
      id: index,
      ...row,
    }));
  }, [table?.data]);

  // Create DataGrid columns configuration
  const dataGridColumns = React.useMemo(() => {
    const columns = columnOrder.map((column) => ({
      field: column,
      headerName: column,
      width: frozenColumnWidth || COLUMN_MIN_WIDTH, // Use calculated or default
      minWidth: COLUMN_MIN_WIDTH,
      renderHeader: () => (
        <DraggableColumnHeader
          column={column}
          onDragStart={(e) => handleDragStart(e, column)}
          onDragOver={(e) => handleDragOver(e, column)}
          onDrop={(e) => handleDrop(e, column)}
          isDragging={draggedColumn === column}
          isDragOver={dragOverColumn === column}
        />
      ),
      renderCell: (params) => (
          <Box
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'flex',
              alignItems: 'center',
              height: '100%'
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
            title={params.value || 'N/A'}
            >
            <HighlightedText text={params.value || 'N/A'} query={query} />
            </Typography>
          </Box>
      ),
    }));

    // Add actions column
    columns.push({
      field: 'actions',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Tooltip title="View full details">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleRowInfoClick(params.row);
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
      ),
    });

    return columns;
  }, [columnOrder, query, draggedColumn, frozenColumnWidth]);

  const resolvedGridWidth = maxGridWidth > 0 ? `${maxGridWidth}px` : '100%';

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
        <CardContent sx={{ p: 0, height: 400, overflow: 'hidden' }}>
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
              ref={containerRef}
              sx={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ width: '100%', height: '100%' }}>
                <DataGrid
                  rows={dataGridRows}
                  columns={dataGridColumns}
                  hideFooter
                  rowHeight={40}
                  disableColumnResize
                  initialState={{
                    pagination: { paginationModel: { pageSize: dataGridRows.length, page: 0 } }
                  }}
                  slots={{
                    columnMenu: CustomColumnMenu,
                  }}
                  sx={{
                    borderRadius: 0,
                    width: '100%',
                    '& .MuiDataGrid-cell': {
                      borderRight: '0.5px solid',
                      borderRightColor: 'divider',
                    },
                    '& .MuiDataGrid-columnHeaders': {
                      backgroundColor: 'grey.50',
                      minHeight: '56px !important',
                    },
                    '& .MuiDataGrid-columnHeader': {
                      backgroundColor: '#F1F1F1',
                      padding: 0.5,
                      borderRight: '0.5px solid',
                      borderRightColor: 'divider',
                      '&:last-child': {
                        borderRight: 'none',
                      },
                      '&:focus': {
                        outline: 'none',
                      },
                      '&:focus-within': {
                        outline: 'none',
                      },
                    },
                    '& .MuiDataGrid-columnHeaderTitle': {
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      color: 'text.primary',
                      display: 'none', // Hide default title since we use custom header
                    },
                    '& .MuiDataGrid-row:hover': {
                      backgroundColor: 'action.selected',
                    },
                    '& .MuiDataGrid-menuIcon': {
                      marginRight: 0,
                    },
                  }}
                />
              </Box>
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
    prev.isLoading === next.isLoading &&
    prev.onSendToLastPage === next.onSendToLastPage &&
    prev.maxGridWidth === next.maxGridWidth
  );
};

export default React.memo(TableCard, areEqual);
