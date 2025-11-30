import React, { useState } from 'react';
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
  Tooltip
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
  ExpandMore,
  ExpandLess,
  TableChart,
  Info,
  Close
} from '@mui/icons-material';
import { highlightText } from '../utils/searchUtils';

/**
 * HighlightedText Component
 * Highlights matching text in search results
 */
const HighlightedText = ({ text, query }) => {
  if (!query || !text) return <span>{text}</span>;

  const parts = highlightText(text, query);

  return (
    <span>
      {parts.map((part, index) =>
        part.highlight ? (
          <Box
            key={index}
            component="span"
            sx={{
              backgroundColor: 'primary.light',
              color: 'primary.contrastText',
              fontWeight: 600,
              px: 0.5,
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
 * TableCard Component
 * Displays a single table with expandable data view using MUI components
 */
const TableCard = ({ table, query }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

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

  // Transform data for DataGrid (add id field)
  const dataGridRows = React.useMemo(() => {
    return table.data.map((row, index) => ({
      id: index,
      ...row,
    }));
  }, [table.data]);

  // Create DataGrid columns configuration
  const dataGridColumns = React.useMemo(() => {
    const columns = table.columns.map((column) => ({
      field: column,
      headerName: column,
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <Typography
            variant="body2"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
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
  }, [table.columns, query]);

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

          {/* Right: Toggle Button */}
          <IconButton
            onClick={handleToggle}
            sx={{
              alignSelf: { xs: 'flex-end', md: 'center' },
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

      {/* Table Data */}
      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <CardContent sx={{ p: 0, height: 400 }}>
          <DataGrid
            rows={dataGridRows}
            columns={dataGridColumns}
            hideFooter
            initialState={{
              pagination: { paginationModel: { pageSize: dataGridRows.length, page: 0 } }
            }}
            sx={{
              '& .MuiDataGrid-cell': {
                borderBottom: '1px solid',
                borderBottomColor: 'divider',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'grey.50',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 600,
                fontSize: '0.875rem',
                color: 'text.primary',
              },
              '& .MuiDataGrid-row:hover': {
                backgroundColor: 'action.selected',
              },       
            }}
          />
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
          <IconButton
            onClick={handleClosePopup}
            sx={{ color: 'primary.contrastText' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {selectedRow && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {table.columns.map((column, index) => (
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
                  {index < table.columns.length - 1 && <Divider sx={{ mt: 2 }} />}
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

export default TableCard;
