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
  IconButton
} from '@mui/material';
import { motion } from 'framer-motion';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { MOCK_DATABASES } from '../data/mockDatabase';

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
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filter by Indexing Date
          </Typography>
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
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Showing {filteredTables.length} of {allTables.length} tables
          </Typography>
        </Paper>

        {/* Tables View */}
        <TableContainer component={Paper}>
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
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No tables found matching the selected date range
                    </Typography>
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
                    <TableCell>{table.year}</TableCell>
                    <TableCell>{table.country}</TableCell>
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
                    <TableCell>{formatDate(table.indexingDate)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {table.databaseName}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={500}>
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
