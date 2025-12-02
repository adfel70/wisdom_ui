import React from 'react';
import { Box, Container, Pagination } from '@mui/material';

/**
 * PaginationFooter - Fixed bottom pagination bar
 * Small component for the sticky pagination at the bottom
 */
const PaginationFooter = ({
  totalPages,
  currentPage,
  onPageChange,
  isLoadingTableData,
  sidebarOffset,
}) => {
  if (totalPages <= 1) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: { xs: 0, lg: `${sidebarOffset}px` },
        right: 0,
        zIndex: 40,
        background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.95) 15%, rgba(255, 255, 255, 0.98) 100%)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid',
        borderColor: 'rgba(0, 0, 0, 0.06)',
        py: 1.5,
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
            disabled={isLoadingTableData}
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
