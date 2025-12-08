/**
 * Backend API Module
 * Simulates backend database queries for different database types (Elastic, Mongo, etc.)
 *
 * IMPORTANT: This mock simulates a real backend that queries data on-demand.
 * - Metadata is loaded upfront (small, ~80KB)
 * - Records are fetched dynamically per database query (no caching)
 * - This matches the real backend architecture (Elastic DB)
 */

import metadataFile from '../data/metadata.json' with { type: 'json' };
import {
  RECORDS_PER_PAGE,
  PAGINATION_STRATEGY,
  getPaginationStrategy
} from '../config/paginationConfig';

// Metadata loaded once on app start (small file, OK to keep in memory)
const METADATA = metadataFile.metadata;
const DATABASE_CONFIG = metadataFile.databaseConfig;
const DATABASE_ASSIGNMENTS = metadataFile.databaseAssignments;

/**
 * Get all table metadata
 * Returns metadata for all tables (loaded upfront)
 * @returns {Object} Map of tableKey to metadata
 */
export function get_tables_metadata() {
  return METADATA;
}

/**
 * Fetch records for a specific database
 * Simulates an API call to the backend (Elastic, etc.)
 * @param {string} dbKey - Database key (e.g., 'db1')
 * @returns {Promise<Array>} List of records for this database
 */
async function fetchDatabaseRecords(dbKey) {
  const response = await fetch(`/src/data/records/${dbKey}.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch records for ${dbKey}`);
  }
  const data = await response.json();
  return data.records;
}

/**
 * Search records by query string
 * Simple text search across all field values
 * @param {Array} records - Records to search
 * @param {string} query - Search query
 * @returns {Array} Filtered records
 */
function searchRecords(records, query) {
  if (!query || query.trim() === '') {
    return records;
  }

  const searchTerm = query.toLowerCase();

  return records.filter(record => {
    return Object.values(record).some(value => {
      if (value == null) return false;
      return String(value).toLowerCase().includes(searchTerm);
    });
  });
}

/**
 * Query records for a specific database
 * Fetches records on-demand (no caching, like real Elastic backend)
 * @param {string} dbKey - Database key (e.g., 'db1')
 * @param {string} query - Search query string
 * @returns {Promise<Array>} List of matching records with tableKey field
 */
async function queryDatabase(dbKey, query = '') {
  const config = DATABASE_CONFIG[dbKey];
  if (!config) {
    throw new Error(`Database ${dbKey} not found`);
  }

  // Fetch records from file (simulates backend API call)
  const dbRecords = await fetchDatabaseRecords(dbKey);

  // Apply search filter
  return searchRecords(dbRecords, query);
}

/**
 * Database query functions (simulating different backend types)
 * Each function represents a different database tab in the UI
 * All functions are async and fetch data on-demand
 */

export async function db1(query) {
  return queryDatabase('db1', query);
}

export async function db2(query) {
  return queryDatabase('db2', query);
}

export async function db3(query) {
  return queryDatabase('db3', query);
}

export async function db4(query) {
  return queryDatabase('db4', query);
}

/**
 * Get database configuration
 * @returns {Object} Database configuration with table assignments
 */
export function getDatabaseConfig() {
  return {
    db1: { ...DATABASE_CONFIG.db1, tableKeys: DATABASE_ASSIGNMENTS.db1 },
    db2: { ...DATABASE_CONFIG.db2, tableKeys: DATABASE_ASSIGNMENTS.db2 },
    db3: { ...DATABASE_CONFIG.db3, tableKeys: DATABASE_ASSIGNMENTS.db3 },
    db4: { ...DATABASE_CONFIG.db4, tableKeys: DATABASE_ASSIGNMENTS.db4 },
  };
}

/**
 * Get all records for a specific table
 * Fetches from the appropriate database file
 * @param {string} tableKey - Table key (e.g., 't1')
 * @returns {Promise<Array>} All records for the table
 */
export async function getTableRecords(tableKey) {
  // Find which database contains this table
  let dbKey = null;
  for (const [key, tableKeys] of Object.entries(DATABASE_ASSIGNMENTS)) {
    if (tableKeys.includes(tableKey)) {
      dbKey = key;
      break;
    }
  }

  if (!dbKey) {
    throw new Error(`Table ${tableKey} not found in any database`);
  }

  // Fetch all records from the database
  const dbRecords = await fetchDatabaseRecords(dbKey);

  // Filter for this specific table
  return dbRecords.filter(record => record.tableKey === tableKey);
}

/**
 * Get statistics about the data
 * @returns {Object} Data statistics
 */
export function getDataStats() {
  return {
    totalTables: Object.keys(METADATA).length,
    totalRecords: Object.values(METADATA).reduce((sum, table) => sum + table.recordCount, 0),
    databases: Object.keys(DATABASE_CONFIG).map(dbKey => ({
      key: dbKey,
      name: DATABASE_CONFIG[dbKey].name,
      tableCount: DATABASE_ASSIGNMENTS[dbKey].length
    }))
  };
}

/**
 * Get metadata for tables in a specific database
 * Returns lightweight table information without records
 * @param {string} dbKey - Database key (e.g., 'db1')
 * @returns {Array} Array of table metadata objects
 */
export function getTablesMetadataForDatabase(dbKey) {
  const tableKeys = DATABASE_ASSIGNMENTS[dbKey];
  if (!tableKeys) {
    return [];
  }

  return tableKeys.map(tableKey => {
    const meta = METADATA[tableKey];
    return {
      id: tableKey,
      name: meta.name,
      year: meta.year,
      country: meta.country,
      categories: meta.categories,
      count: meta.recordCount,
      columns: meta.columns.map(col => col.name)
    };
  });
}

/**
 * Get data for a specific table (lazy loading)
 * Fetches only the records for one table
 * @param {string} tableKey - Table key (e.g., 't1')
 * @returns {Promise<Object>} Table object with data
 */
export async function getTableData(tableKey) {
  const meta = METADATA[tableKey];
  if (!meta) {
    throw new Error(`Table ${tableKey} not found`);
  }

  // Get records for this table
  const records = await getTableRecords(tableKey);

  // Remove tableKey field from records
  const data = records.map(record => {
    const { tableKey: _, ...rowData } = record;
    return rowData;
  });

  return {
    id: tableKey,
    name: meta.name,
    year: meta.year,
    country: meta.country,
    categories: meta.categories,
    count: meta.recordCount,
    columns: meta.columns.map(col => col.name),
    data: data
  };
}

/**
 * Get paginated data for a specific table
 * Supports both cursor-based and offset-based pagination
 * When searchQuery is provided, fetches batches until pageSize matching records found
 * @param {string} tableKey - Table key (e.g., 't1')
 * @param {Object} paginationState - Current pagination state
 *   - For cursor strategy: { cursor: string | null }
 *   - For offset strategy: { offset: number }
 * @param {number} pageSize - Number of records to fetch (default: RECORDS_PER_PAGE)
 * @param {string} searchQuery - Optional search query to filter records
 * @param {string} permutationId - Optional permutation ID for search
 * @param {Object} permutationParams - Optional permutation parameters
 * @returns {Promise<Object>} Paginated table data with pagination info
 */
export async function getTableDataPaginated(tableKey, paginationState = {}, pageSize = RECORDS_PER_PAGE, searchQuery = '', permutationId = 'none', permutationParams = {}) {
  const meta = METADATA[tableKey];
  if (!meta) {
    throw new Error(`Table ${tableKey} not found`);
  }

  // Find which database contains this table
  let dbKey = null;
  for (const [key, tableKeys] of Object.entries(DATABASE_ASSIGNMENTS)) {
    if (tableKeys.includes(tableKey)) {
      dbKey = key;
      break;
    }
  }

  if (!dbKey) {
    throw new Error(`Table ${tableKey} not found in any database`);
  }

  // Get all records for this table
  const allRecords = await getTableRecords(tableKey);

  // Determine pagination strategy
  const strategy = getPaginationStrategy(dbKey);

  // If no search query, use simple pagination
  if (!searchQuery || !searchQuery.trim()) {
    let records = [];
    let nextPaginationState = null;
    let hasMore = false;

    if (strategy === PAGINATION_STRATEGY.CURSOR) {
      // Cursor-based pagination
      const cursor = paginationState.cursor || null;
      const startIndex = cursor ? parseInt(cursor, 10) : 0;
      const endIndex = startIndex + pageSize;

      records = allRecords.slice(startIndex, endIndex);
      hasMore = endIndex < allRecords.length;

      nextPaginationState = hasMore ? {
        cursor: endIndex.toString()
      } : null;
    } else {
      // Offset-based pagination
      const offset = paginationState.offset || 0;
      const startIndex = offset;
      const endIndex = startIndex + pageSize;

      records = allRecords.slice(startIndex, endIndex);
      hasMore = endIndex < allRecords.length;

      nextPaginationState = hasMore ? {
        offset: endIndex
      } : null;
    }

    // Remove tableKey field from records
    const data = records.map(record => {
      const { tableKey: _, ...rowData } = record;
      return rowData;
    });

    return {
      id: tableKey,
      name: meta.name,
      year: meta.year,
      country: meta.country,
      categories: meta.categories,
      count: meta.recordCount,
      columns: meta.columns.map(col => col.name),
      data: data,
      paginationInfo: {
        hasMore,
        nextPaginationState,
        strategy,
        loadedRecords: data.length,
        totalRecords: meta.recordCount,
      }
    };
  }

  // With search query: batch-fetch until we have pageSize matching records
  const { applySearchAndFilters } = await import('../utils/searchUtils.js');

  let matchingRecords = [];
  let currentPaginationState = paginationState;
  let lastPaginationInfo = null;
  let hasMoreRecords = true;
  let totalFetchedIndex = 0;

  while (matchingRecords.length < pageSize && hasMoreRecords) {
    // Calculate batch indices based on strategy
    let batchRecords = [];
    let batchEndIndex = 0;

    if (strategy === PAGINATION_STRATEGY.CURSOR) {
      const cursor = currentPaginationState.cursor || null;
      const startIndex = cursor ? parseInt(cursor, 10) : 0;
      const endIndex = startIndex + pageSize;

      batchRecords = allRecords.slice(startIndex, endIndex);
      batchEndIndex = endIndex;
      hasMoreRecords = endIndex < allRecords.length;
    } else {
      const offset = currentPaginationState.offset || 0;
      const startIndex = offset;
      const endIndex = startIndex + pageSize;

      batchRecords = allRecords.slice(startIndex, endIndex);
      batchEndIndex = endIndex;
      hasMoreRecords = endIndex < allRecords.length;
    }

    // If no more records in this batch, break
    if (batchRecords.length === 0) {
      break;
    }

    // Create temporary table object for filtering
    const tempTable = {
      id: tableKey,
      name: meta.name,
      year: meta.year,
      country: meta.country,
      categories: meta.categories,
      count: meta.recordCount,
      columns: meta.columns.map(col => col.name),
      data: batchRecords.map(record => {
        const { tableKey: _, ...rowData } = record;
        return rowData;
      })
    };

    // Apply search filter to this batch
    const filtered = applySearchAndFilters(
      [tempTable],
      searchQuery,
      {}, // Don't apply filters, they were applied in searchTablesByQuery
      permutationId,
      permutationParams
    );

    // Extract matching records from this batch
    if (filtered.length > 0 && filtered[0].data.length > 0) {
      matchingRecords = [...matchingRecords, ...filtered[0].data];
    }

    // Update pagination state for next batch
    totalFetchedIndex = batchEndIndex;
    if (hasMoreRecords) {
      currentPaginationState = strategy === PAGINATION_STRATEGY.CURSOR
        ? { cursor: batchEndIndex.toString() }
        : { offset: batchEndIndex };
    }
  }

  // Limit to pageSize matching records
  const finalRecords = matchingRecords.slice(0, pageSize);

  // Determine if there are more matching records
  // We have more if either:
  // 1. We collected more than pageSize matches (we sliced them)
  // 2. We stopped because we ran out of DB records, but there might be more
  const hasMoreMatches = matchingRecords.length > pageSize || hasMoreRecords;

  return {
    id: tableKey,
    name: meta.name,
    year: meta.year,
    country: meta.country,
    categories: meta.categories,
    count: meta.recordCount,
    columns: meta.columns.map(col => col.name),
    data: finalRecords,
    paginationInfo: {
      hasMore: hasMoreMatches,
      nextPaginationState: hasMoreMatches ? currentPaginationState : null,
      strategy,
      loadedRecords: finalRecords.length,
      totalRecords: meta.recordCount,
    }
  };
}

const createFilterSet = (values = [], normalizer = (value) => value) => {
  const normalized = Array.isArray(values) ? values : [];
  return new Set(
    normalized
      .map((value) => {
        if (value === null || value === undefined) {
          return '';
        }
        const transformed = normalizer(value);
        return String(transformed).trim();
      })
      .filter(Boolean)
  );
};

const increment = (bucket, key) => {
  if (!key) {
    return;
  }
  bucket[key] = (bucket[key] || 0) + 1;
};

export function fetchFacetAggregates(dbKey, filters = {}) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        const config = DATABASE_CONFIG[dbKey];
        if (!config) {
          throw new Error(`Database ${dbKey} not found`);
        }

        const records = await fetchDatabaseRecords(dbKey);

        const categoriesFilter = createFilterSet(filters.categories, (value) => String(value).toLowerCase());
        const regionsFilter = createFilterSet(filters.regions, (value) => String(value).toUpperCase());
        const tableNamesFilter = createFilterSet(filters.tableNames, (value) => String(value).toLowerCase());
        const tableYearsFilter = createFilterSet(filters.tableYears, (value) => value);

        const filteredRecords = records.filter((record) => {
          const meta = METADATA[record.tableKey];
          if (!meta) {
            return false;
          }

          const uniqueCategories = Array.isArray(meta.categories)
            ? Array.from(new Set(meta.categories.map((category) => category?.toString()?.trim()).filter(Boolean)))
            : [];

          const categoryMatch =
            categoriesFilter.size === 0 ||
            uniqueCategories.some((category) => categoriesFilter.has(category.toLowerCase()));

          const region = meta.country || record.country;
          const regionMatch = regionsFilter.size === 0 || regionsFilter.has(region);

          const tableNameLabel = (meta.name || record.tableKey || '').trim();
          const tableNameMatch =
            tableNamesFilter.size === 0 ||
            tableNamesFilter.has(tableNameLabel.toLowerCase()) ||
            tableNamesFilter.has((record.tableKey || '').toLowerCase());

          const yearLabel = meta.year ? String(meta.year).trim() : '';
          const tableYearMatch = tableYearsFilter.size === 0 || tableYearsFilter.has(yearLabel);

          return categoryMatch && regionMatch && tableNameMatch && tableYearMatch;
        });

        const aggregates = {
          categories: {},
          regions: {},
          tableNames: {},
          tableYears: {}
        };

        filteredRecords.forEach((record) => {
          const meta = METADATA[record.tableKey];
          if (!meta) {
            return;
          }

          const categories = Array.isArray(meta.categories)
            ? Array.from(new Set(meta.categories.map((category) => category?.toString()?.trim()).filter(Boolean)))
            : [];
          categories.forEach((category) => increment(aggregates.categories, category));

          const region = meta.country || record.country;
          increment(aggregates.regions, region);

          const tableName = (meta.name || record.tableKey || '').trim();
          increment(aggregates.tableNames, tableName);

          const yearKey = meta.year ? String(meta.year).trim() : 'unknown';
          increment(aggregates.tableYears, yearKey);
        });

        setTimeout(() => resolve(aggregates), 150);
      } catch (error) {
        reject(error);
      }
    })();
  });
}