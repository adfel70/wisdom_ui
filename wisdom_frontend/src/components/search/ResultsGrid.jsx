import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import TableCard from '../TableCard';
import TableCardSkeleton from '../TableCardSkeleton';
import EmptyState from '../EmptyState';

/**
 * ResultsGrid - Renders the list of table cards or empty state
 *
 * Simplified: receives helper functions instead of refs
 */
const ResultsGrid = ({
  isSearching,
  visibleTableIds,
  getTableData,
  isTableLoading,
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
        const table = getTableData(tableId);
        const isPending = isTableLoading(tableId);

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
                isLoading={isPending}
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
