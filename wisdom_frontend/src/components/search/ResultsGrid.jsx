import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import TableCard from '../TableCard';
import TableCardSkeleton from '../TableCardSkeleton';
import EmptyState from '../EmptyState';

/**
 * ResultsGrid - Renders the list of table cards or empty state
 *
 * Progressive loading:
 * - During search: shows skeletons
 * - After search, during row loading: shows card wrapper with loading in grid area
 * - After rows load: shows full card with data
 */
const ResultsGrid = ({
  isSearching,
  visibleTableIds,
  getTableForDisplay,
  searchQuery,
  permutationId,
  permutationParams,
  permutationVariants,
  onSendToLastPage,
  emptyStateType,
  tablePaginationHook,
  onLoadMore,
}) => {
  // Show loading spinner during initial search
  if (isSearching) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show empty state if no results
  if (visibleTableIds.length === 0) {
    return <EmptyState type={emptyStateType} />;
  }

  // Render table cards
  return (
    <AnimatePresence mode="popLayout">
      {visibleTableIds.map((tableId) => {
        // getTableForDisplay returns merged metadata + row data
        // table.isLoadingRows indicates if rows are still being fetched
        const table = getTableForDisplay(tableId);

        return (
          <motion.div
            key={tableId}
            id={`table-card-${tableId}`}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3 }}
          >
            {table ? (
              <TableCard
                table={table}
                query={searchQuery}
                permutationId={permutationId}
                permutationParams={permutationParams}
                permutationVariants={permutationVariants}
                isLoadingRows={table.isLoadingRows}
                onSendToLastPage={onSendToLastPage}
                hasMore={tablePaginationHook?.hasMoreRecords(tableId) || false}
                onLoadMore={onLoadMore ? () => onLoadMore(tableId) : null}
                isLoadingMore={tablePaginationHook?.isTableLoadingMore(tableId) || false}
              />
            ) : (
              <TableCardSkeleton />
            )}
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
};

export default ResultsGrid;
