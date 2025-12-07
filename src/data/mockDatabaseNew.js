/**
 * Mock Database - UI Data Provider
 * Wraps the backend API and provides data in the UI's expected format
 *
 * IMPORTANT: This module provides lazy-loading functions.
 * Data is NOT loaded at module import time - it's fetched on-demand.
 */

import { get_tables_metadata, db1, db2, db3, db4, getDatabaseConfig, getTablesMetadataForDatabase, getTableData, getTableDataPaginated } from '../api/backend.js';
import { applySearchAndFilters } from '../utils/searchUtils.js';

// Get metadata and config (small, loaded upfront)
const metadata = get_tables_metadata();
const dbConfig = getDatabaseConfig();

/**
 * Convert backend records to UI table format
 * @param {string} tableKey - Table key
 * @param {Array} records - Array of records from backend
 * @returns {Object} Table object in UI format
 */
function createTableFromRecords(tableKey, records) {
  const tableMeta = metadata[tableKey];

  if (!tableMeta) {
    return null;
  }

  // Extract column names from metadata
  const columns = tableMeta.columns.map(col => col.name);

  // Convert records to UI format (remove tableKey field)
  const data = records.map(record => {
    const { tableKey: _, ...rowData } = record;
    return rowData;
  });

  return {
    id: tableKey,
    name: tableMeta.name,
    year: tableMeta.year,
    country: tableMeta.country,
    categories: tableMeta.categories,
    count: tableMeta.recordCount,
    columns: columns,
    data: data
  };
}

/**
 * Get all records for a database and group by table
 * @param {Function} dbQueryFunc - Database query function (db1, db2, etc.)
 * @param {Array} tableKeys - Array of table keys for this database
 * @returns {Promise<Array>} Array of table objects
 */
async function getTablesForDatabase(dbQueryFunc, tableKeys) {
  // Get all records for this database (async fetch)
  const allRecords = await dbQueryFunc();

  // Group records by tableKey
  const recordsByTable = {};
  allRecords.forEach(record => {
    const { tableKey } = record;
    if (!recordsByTable[tableKey]) {
      recordsByTable[tableKey] = [];
    }
    recordsByTable[tableKey].push(record);
  });

  // Create table objects for each tableKey that has records
  const tables = [];
  tableKeys.forEach(tableKey => {
    const records = recordsByTable[tableKey] || [];
    const table = createTableFromRecords(tableKey, records);
    if (table) {
      tables.push(table);
    }
  });

  return tables;
}

/**
 * Get MOCK_DATABASES array for the UI
 * This function fetches data on-demand (async)
 * @returns {Promise<Array>} Array of database objects with tables
 */
export async function getMockDatabases() {
  return [
    {
      id: 'db1',
      name: dbConfig.db1.name,
      description: dbConfig.db1.description,
      tables: await getTablesForDatabase(db1, dbConfig.db1.tableKeys)
    },
    {
      id: 'db2',
      name: dbConfig.db2.name,
      description: dbConfig.db2.description,
      tables: await getTablesForDatabase(db2, dbConfig.db2.tableKeys)
    },
    {
      id: 'db3',
      name: dbConfig.db3.name,
      description: dbConfig.db3.description,
      tables: await getTablesForDatabase(db3, dbConfig.db3.tableKeys)
    },
    {
      id: 'db4',
      name: dbConfig.db4.name,
      description: dbConfig.db4.description,
      tables: await getTablesForDatabase(db4, dbConfig.db4.tableKeys)
    }
  ];
}

/**
 * Get a single database with its tables
 * More efficient than loading all databases
 * @param {string} dbId - Database ID (db1, db2, db3, db4)
 * @returns {Promise<Object>} Database object with tables
 */
export async function getMockDatabase(dbId) {
  const dbFunctions = { db1, db2, db3, db4 };
  const dbQueryFunc = dbFunctions[dbId];

  if (!dbQueryFunc) {
    throw new Error(`Database ${dbId} not found`);
  }

  const config = dbConfig[dbId];
  return {
    id: dbId,
    name: config.name,
    description: config.description,
    tables: await getTablesForDatabase(dbQueryFunc, config.tableKeys)
  };
}

/**
 * Get all unique years from all tables (uses metadata, not data)
 */
export const getAvailableYears = () => {
  const years = new Set();
  Object.values(metadata).forEach(table => {
    if (table.year) years.add(table.year);
  });
  return Array.from(years).sort((a, b) => b - a);
};

/**
 * Get all unique categories from all tables (uses metadata, not data)
 */
export const getAvailableCategories = () => {
  const categories = new Set();
  Object.values(metadata).forEach(table => {
    table.categories.forEach(cat => categories.add(cat));
  });
  return Array.from(categories).sort();
};

/**
 * Get all unique countries from all tables (uses metadata, not data)
 */
export const getAvailableCountries = () => {
  const countries = new Set();
  Object.values(metadata).forEach(table => {
    if (table.country) countries.add(table.country);
  });
  return Array.from(countries).sort();
};

/**
 * Get database metadata (without records)
 * Useful for displaying database tabs before data is loaded
 */
export function getDatabaseMetadata() {
  return [
    { id: 'db1', name: dbConfig.db1.name, description: dbConfig.db1.description },
    { id: 'db2', name: dbConfig.db2.name, description: dbConfig.db2.description },
    { id: 'db3', name: dbConfig.db3.name, description: dbConfig.db3.description },
    { id: 'db4', name: dbConfig.db4.name, description: dbConfig.db4.description },
  ];
}

/**
 * Search tables and return matching table IDs (metadata only, no data)
 * This is step 1 of the two-step pagination query
 * @param {string} dbId - Database ID (db1, db2, db3, db4)
 * @param {string} query - Search query
 * @param {Object} filters - Filter criteria
 * @param {string} permutationId - Permutation to apply
 * @param {Object} permutationParams - Permutation parameters
 * @returns {Promise<Object>} Object with tableIds array and total count
 */
export async function searchTablesByQuery(dbId, query, filters, permutationId = 'none', permutationParams = {}) {
  // Get metadata for all tables in this database
  const tablesMetadata = getTablesMetadataForDatabase(dbId);

  // Create table objects with metadata but with empty data arrays
  // This allows us to use existing search/filter logic
  const tablesWithoutData = tablesMetadata.map(meta => ({
    ...meta,
    data: [] // Empty data array
  }));

  // If no search query, just apply filters
  if (!query || !query.trim()) {
    // Apply only filters (no search)
    const filtered = filters && Object.keys(filters).length > 0
      ? tablesWithoutData.filter(table => {
          const { tableName, year, category, country, selectedTables } = filters;

          if (selectedTables && selectedTables.length > 0 && !selectedTables.includes(table.id)) {
            return false;
          }
          if (tableName && !table.name.toLowerCase().includes(tableName.toLowerCase())) {
            return false;
          }
          if (year && year !== 'all' && table.year !== parseInt(year)) {
            return false;
          }
          if (category && category !== 'all' && !table.categories.includes(category)) {
            return false;
          }
          if (country && country !== 'all' && table.country !== country) {
            return false;
          }
          return true;
        })
      : tablesWithoutData;

    return {
      tableIds: filtered.map(t => t.id),
      total: filtered.length
    };
  }

  // For search queries with content search, we need to check records
  // NOTE: This is a mock limitation - real backend will search server-side
  // For now, we search in table metadata to keep it fast
  const matchingTables = tablesWithoutData.filter(table => {
    // Apply filters first
    if (filters && Object.keys(filters).length > 0) {
      const { tableName, year, category, country, selectedTables } = filters;

      if (selectedTables && selectedTables.length > 0 && !selectedTables.includes(table.id)) {
        return false;
      }
      if (tableName && !table.name.toLowerCase().includes(tableName.toLowerCase())) {
        return false;
      }
      if (year && year !== 'all' && table.year !== parseInt(year)) {
        return false;
      }
      if (category && category !== 'all' && !table.categories.includes(category)) {
        return false;
      }
      if (country && country !== 'all' && table.country !== country) {
        return false;
      }
    }

    // For search, check table name, country, and categories (metadata only)
    // Note: In real backend, search would happen server-side across all record content
    if (query) {
      const searchTerm = query.toLowerCase();
      const searchableText = [
        table.name,
        table.country,
        ...table.categories
      ].join(' ').toLowerCase();

      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });

  return {
    tableIds: matchingTables.map(t => t.id),
    total: matchingTables.length
  };
}

/**
 * Get table data by ID (step 2 of pagination query)
 * @param {string} tableId - Table ID
 * @returns {Promise<Object>} Table object with data
 */
export async function getTableDataById(tableId) {
  return await getTableData(tableId);
}

/**
 * Get multiple tables data for pagination
 * @param {Array} tableIds - Array of table IDs to fetch
 * @param {string} query - Optional search query to filter results
 * @param {Object} filters - Optional filters to apply
 * @param {string} permutationId - Optional permutation ID
 * @param {Object} permutationParams - Optional permutation parameters
 * @returns {Promise<Array>} Array of table objects with filtered data
 */
export async function getMultipleTablesData(tableIds, query = '', filters = {}, permutationId = 'none', permutationParams = {}) {
  const promises = tableIds.map(id => getTableData(id));
  const tables = await Promise.all(promises);

  // If no search query, return tables as-is
  if (!query || !query.trim()) {
    return tables;
  }

  // Apply search filtering to each table's data
  return tables.map(table => {
    const filteredData = applySearchAndFilters(
      [table],
      query,
      {},  // Don't apply filters again, they were applied in searchTablesByQuery
      permutationId,
      permutationParams
    );

    // If table matches, return it with filtered data
    if (filteredData.length > 0 && filteredData[0].data.length > 0) {
      return filteredData[0];
    }

    // Return table with empty data if no matches (shouldn't happen)
    return { ...table, data: [], matchCount: 0 };
  }).filter(table => table.data.length > 0);
}

/**
 * Get paginated table data by ID
 * @param {string} tableId - Table ID
 * @param {Object} paginationState - Current pagination state
 * @param {number} pageSize - Number of records to fetch
 * @returns {Promise<Object>} Table object with paginated data and pagination info
 */
export async function getTableDataPaginatedById(tableId, paginationState = {}, pageSize) {
  return await getTableDataPaginated(tableId, paginationState, pageSize);
}
