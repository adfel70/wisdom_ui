/**
 * Mock Database - UI Data Provider
 * Wraps the backend API and provides data in the UI's expected format
 *
 * IMPORTANT: This module provides lazy-loading functions.
 * Data is NOT loaded at module import time - it's fetched on-demand.
 */

import { get_tables_metadata, db1, db2, db3, db4, getDatabaseConfig } from '../api/backend.js';

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
