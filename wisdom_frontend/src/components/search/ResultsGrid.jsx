import React, { useEffect, useRef, useState } from 'react';
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
  const [suppressEmptyState, setSuppressEmptyState] = useState(false);
  const suppressTimerRef = useRef(null);

  // Suppress the empty state briefly after search completes to avoid flash
  useEffect(() => {
    // When searching, always suppress
    if (isSearching) {
      setSuppressEmptyState(true);
      if (suppressTimerRef.current) {
        clearTimeout(suppressTimerRef.current);
        suppressTimerRef.current = null;
      }
      return;
    }

    // When search finishes, wait a short moment before allowing empty state
    if (suppressEmptyState) {
      suppressTimerRef.current = setTimeout(() => {
        setSuppressEmptyState(false);
        suppressTimerRef.current = null;
      }, 200);
    }

    return () => {
      if (suppressTimerRef.current) {
        clearTimeout(suppressTimerRef.current);
        suppressTimerRef.current = null;
      }
    };
  }, [isSearching, suppressEmptyState]);

  const shouldShowSkeletons = (isSearching || suppressEmptyState) && visibleTableIds.length === 0;

  // Show skeleton cards during search or immediately after to avoid "no results" flash
  if (shouldShowSkeletons) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Array.from({ length: 6 }).map((_, idx) => (
          <TableCardSkeleton key={`search-skeleton-${idx}`} />
        ))}
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
