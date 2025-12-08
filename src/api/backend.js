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
 * Evaluate a JSON query element against a record
 * @param {Object} element - Query element (clause, operator, or subQuery)
 * @param {Object} record - Record object
 * @returns {boolean|null} True if matches, false if doesn't match, null for operators
 */
function evaluateElement(element, record) {
  if (element.type === 'clause') {
    const { value, bdt } = element.content;

    // For Phase 1, bdt is always null - search all fields
    // In Phase 2, bdt will filter to specific column types

    const lowerTerm = value.toLowerCase();
    return Object.values(record).some(fieldValue => {
      if (fieldValue == null) return false;
      return String(fieldValue).toLowerCase().includes(lowerTerm);
    });
  }

  if (element.type === 'operator') {
    // Operators don't evaluate - they're handled by evaluateQueryElements
    return null;
  }

  if (element.type === 'subQuery') {
    // Recursively evaluate the subquery
    return evaluateQueryElements(element.content.elements, record);
  }

  return false;
}

/**
 * Evaluate a JSON query array against a record
 * @param {Array} elements - Array of query elements
 * @param {Object} record - Record object
 * @returns {boolean} True if record matches the query
 */
function evaluateQueryElements(elements, record) {
  if (!elements || elements.length === 0) return true;

  let result = null;
  let pendingOperator = null;

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];

    if (element.type === 'operator') {
      pendingOperator = element.content.operator;
      continue;
    }

    // Evaluate this element
    const elementResult = evaluateElement(element, record);

    if (result === null) {
      // First element - just store the result
      result = elementResult;
    } else if (pendingOperator) {
      // Apply the operator
      if (pendingOperator === 'AND') {
        result = result && elementResult;
      } else if (pendingOperator === 'OR') {
        result = result || elementResult;
      }
      pendingOperator = null;
    }
  }

  return result !== null ? result : true;
}

/**
 * Search records by JSON query
 * @param {Array} records - Records to search
 * @param {Array} query - JSON query array
 * @returns {Array} Filtered records
 */
function searchRecords(records, query) {
  // Handle empty query
  if (!query || !Array.isArray(query) || query.length === 0) {
    return records;
  }

  return records.filter(record => {
    return evaluateQueryElements(query, record);
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
  if (!searchQuery || (Array.isArray(searchQuery) && searchQuery.length === 0)) {
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
  // Use server-side filtering with searchRecords function

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

    // Apply server-side search filter to this batch using searchRecords
    const filteredBatch = searchRecords(batchRecords, searchQuery);

    // Add matching records to results
    if (filteredBatch.length > 0) {
      matchingRecords = [...matchingRecords, ...filteredBatch];
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
  const limitedRecords = matchingRecords.slice(0, pageSize);

  // Remove tableKey field from records before returning
  const finalRecords = limitedRecords.map(record => {
    const { tableKey: _, ...rowData } = record;
    return rowData;
  });

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
