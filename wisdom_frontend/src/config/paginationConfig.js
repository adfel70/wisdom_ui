/**
 * Pagination Configuration
 *
 * This file contains configuration for table-level pagination.
 * Different databases use different pagination strategies.
 */

// Number of records to fetch per page
// TODO: Change to 100 in production
export const RECORDS_PER_PAGE = 20;

// Pagination strategy types
export const PAGINATION_STRATEGY = {
  CURSOR: 'cursor',  // Cursor-based pagination (e.g., Elasticsearch)
  OFFSET: 'offset',  // Offset-based pagination (e.g., SQL)
};

// Database-specific pagination configuration
export const DATABASE_PAGINATION_CONFIG = {
  db1: {
    strategy: PAGINATION_STRATEGY.CURSOR,
    // Cursor-based: tracks nextCursorMark
  },
  db2: {
    strategy: PAGINATION_STRATEGY.OFFSET,
    // Offset-based: tracks from/size
  },
  db3: {
    strategy: PAGINATION_STRATEGY.CURSOR,
    // Cursor-based: tracks nextCursorMark
  },
  db4: {
    strategy: PAGINATION_STRATEGY.OFFSET,
    // Offset-based: tracks from/size
  },
};

/**
 * Get pagination strategy for a database
 * @param {string} dbKey - Database key (e.g., 'db1')
 * @returns {string} Pagination strategy type
 */
export function getPaginationStrategy(dbKey) {
  return DATABASE_PAGINATION_CONFIG[dbKey]?.strategy || PAGINATION_STRATEGY.OFFSET;
}
