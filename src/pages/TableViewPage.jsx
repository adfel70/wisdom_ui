import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Stack,
  Chip,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import { motion } from 'framer-motion';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClearIcon from '@mui/icons-material/Clear';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { MOCK_DATABASES } from '../data/mockDatabaseNew';

/**
 * TableViewPage Component
 * Displays all tables in a tabular format with date range filtering
 */
const TableViewPage = () => {
  const navigate = useNavigate();
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');

  // Flatten all tables from all databases
  const allTables = useMemo(() => {
    const tables = [];
    MOCK_DATABASES.forEach(db => {
      db.tables.forEach(table => {
        tables.push({
          ...table,
          databaseName: db.name
        });
      });
    });
    return tables;
  }, []);

  // Filter tables by date range
  const filteredTables = useMemo(() => {
    return allTables.filter(table => {
      if (!table.indexingDate) return true;

      const tableDate = new Date(table.indexingDate);

      if (minDate) {
        const min = new Date(minDate);
        if (tableDate < min) return false;
      }

      if (maxDate) {
        const max = new Date(maxDate);
        if (tableDate > max) return false;
      }

      return true;
    });
  }, [allTables, minDate, maxDate]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setMinDate('');
    setMaxDate('');
  };

  const hasActiveFilters = minDate || maxDate;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <IconButton
              onClick={() => navigate('/')}
              sx={{
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1" fontWeight={600}>
              All Tables Overview
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ ml: 7 }}>
            Browse all tables across databases with indexing date filters
          </Typography>
        </Box>

        {/* Date Range Filters */}
        <Paper sx={{ p: 3, mb: 3, boxShadow: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarTodayIcon color="primary" />
              <Typography variant="h6">
                Filter by Indexing Date
              </Typography>
            </Box>
            {hasActiveFilters && (
              <Button
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                size="small"
                color="secondary"
              >
                Clear Filters
              </Button>
            )}
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Min Date"
              type="date"
              value={minDate}
              onChange={(e) => setMinDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
            />
            <TextField
              label="Max Date"
              type="date"
              value={maxDate}
              onChange={(e) => setMaxDate(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
            />
          </Stack>
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing <strong>{filteredTables.length}</strong> of <strong>{allTables.length}</strong> tables
            </Typography>
            {hasActiveFilters && (
              <Chip
                label="Filters Active"
                color="primary"
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </Paper>

        {/* Tables View */}
        <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
          <Table sx={{ minWidth: 650 }} aria-label="tables overview">
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Year</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Country</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Categories</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Indexing Date</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>Database</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="right">Records</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <CalendarTodayIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                      <Typography variant="h6" color="text.secondary">
                        No tables found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {hasActiveFilters 
                          ? 'Try adjusting your date range filters'
                          : 'No tables available in the database'
                        }
                      </Typography>
                      {hasActiveFilters && (
                        <Button
                          variant="outlined"
                          onClick={handleClearFilters}
                          startIcon={<ClearIcon />}
                          sx={{ mt: 1 }}
                        >
                          Clear Filters
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTables.map((table) => (
                  <TableRow
                    key={table.id}
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                      '&:last-child td, &:last-child th': { border: 0 }
                    }}
                  >
                    <TableCell component="th" scope="row">
                      <Typography variant="body2" fontWeight={500}>
                        {table.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {table.year}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {table.country}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                        {table.categories.map((category, idx) => (
                          <Chip
                            key={idx}
                            label={category}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(table.indexingDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {table.databaseName}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={500} color="primary">
                        {table.count.toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </motion.div>
  );
};

export default TableViewPage;
