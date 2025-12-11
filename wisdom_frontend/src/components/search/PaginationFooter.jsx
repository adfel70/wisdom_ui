import React from 'react';
import { Box, Container, Pagination, CircularProgress, Typography } from '@mui/material';

/**
 * PaginationFooter - Fixed bottom pagination bar
 *
 * Behavior:
 * - During search (isSearching=true): Shows loading indicator
 * - After search, during row loading: Pagination is ENABLED (user can switch pages)
 * - Hidden when only 1 page of results
 */
const PaginationFooter = ({
  totalPages,
  currentPage,
  onPageChange,
  isSearching,
  sidebarOffset,
}) => {
  // During search, show a loading placeholder
  if (isSearching) {
    return (
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.06)',
          py: 1.5,
          pl: { xs: 0, lg: `${sidebarOffset}px` },
          transition: 'padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Loading results...
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  // Hide if only 1 page
  if (totalPages <= 1) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid',
        borderColor: 'rgba(0, 0, 0, 0.06)',
        py: 1.5,
        pl: { xs: 0, lg: `${sidebarOffset}px` },
        transition: 'padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={onPageChange}
            color="primary"
            size="medium"
            showFirstButton
            showLastButton
            siblingCount={1}
            boundaryCount={1}
            sx={{
              '& .MuiPaginationItem-root': {
                fontSize: '0.875rem',
                minWidth: '32px',
                height: '32px',
              },
            }}
          />
        </Box>
      </Container>
    </Box>
  );
};

export default PaginationFooter;
