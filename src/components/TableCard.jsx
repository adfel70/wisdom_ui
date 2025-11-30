import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  Paper,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  TableChart,
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
 * TableCard Component
 * Displays a single table with expandable data view
 */
const TableCard = ({ table, query }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

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
        <CardContent sx={{ p: 0 }}>
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              maxHeight: 400,
              '&::-webkit-scrollbar': {
                width: 8,
                height: 8,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'grey.100',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'grey.400',
                borderRadius: 4,
                '&:hover': {
                  backgroundColor: 'grey.500',
                },
              },
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {table.columns.map((column) => (
                    <TableCell
                      key={column}
                      sx={{
                        backgroundColor: 'grey.100',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        whiteSpace: 'nowrap',
                        borderRight: 1,
                        borderColor: 'divider',
                        '&:last-child': {
                          borderRight: 0,
                        },
                      }}
                    >
                      {column}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {table.data.map((row, index) => (
                  <TableRow
                    key={index}
                    hover
                    sx={{
                      '&:last-child td': {
                        borderBottom: 0,
                      },
                    }}
                  >
                    {table.columns.map((column) => (
                      <TableCell
                        key={`${index}-${column}`}
                        sx={{
                          whiteSpace: 'nowrap',
                          borderRight: 1,
                          borderColor: 'grey.100',
                          '&:last-child': {
                            borderRight: 0,
                          },
                        }}
                      >
                        <HighlightedText text={row[column]} query={query} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default TableCard;
