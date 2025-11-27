/**
 * Backend API Module
 * Simulates backend database queries for different database types (Elastic, Mongo, etc.)
 */

import generatedData from '../data/generatedData.json' with { type: 'json' };

// Cache for metadata (loaded once on app start)
let metadataCache = null;
let recordsCache = null;

// Database organization (matching the UI tabs)
const DATABASE_CONFIG = {
  db1: { name: 'Sales Database', description: 'Contains sales transactions, inventory, and customer data', tableKeys: [] },
  db2: { name: 'HR & Personnel', description: 'Human resources and employee management data', tableKeys: [] },
  db3: { name: 'Marketing Analytics', description: 'Marketing campaigns, leads, and analytics data', tableKeys: [] },
  db4: { name: 'Legacy Archives', description: 'Historical data and archived records', tableKeys: [] },
};

/**
 * Initialize database configuration by distributing tables across databases
 */
function initializeDatabaseConfig() {
  const tableKeys = Object.keys(metadataCache);
  const dbKeys = Object.keys(DATABASE_CONFIG);
  const tablesPerDb = Math.ceil(tableKeys.length / dbKeys.length);

  tableKeys.forEach((tableKey, idx) => {
    const dbIdx = Math.floor(idx / tablesPerDb);
    const dbKey = dbKeys[Math.min(dbIdx, dbKeys.length - 1)];
    DATABASE_CONFIG[dbKey].tableKeys.push(tableKey);
  });
}

/**
 * Get all table metadata
 * Simulates loading metadata from backend on app start
 * @returns {Object} Map of tableKey to metadata
 */
export function get_tables_metadata() {
  if (!metadataCache) {
    metadataCache = generatedData.metadata;
    recordsCache = generatedData.records;
    initializeDatabaseConfig();
  }
  return metadataCache;
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
 * @param {string} dbKey - Database key (e.g., 'db1')
 * @param {string} query - Search query string
 * @returns {Array} List of matching records with tableKey field
 */
function queryDatabase(dbKey, query = '') {
  // Ensure metadata is loaded
  if (!metadataCache) {
    get_tables_metadata();
  }

  const config = DATABASE_CONFIG[dbKey];
  if (!config) {
    throw new Error(`Database ${dbKey} not found`);
  }

  // Get all records for tables in this database
  const dbRecords = recordsCache.filter(record =>
    config.tableKeys.includes(record.tableKey)
  );

  // Apply search filter
  return searchRecords(dbRecords, query);
}

/**
 * Database query functions (simulating different backend types)
 * Each function represents a different database tab in the UI
 */

export function db1(query) {
  return queryDatabase('db1', query);
}

export function db2(query) {
  return queryDatabase('db2', query);
}

export function db3(query) {
  return queryDatabase('db3', query);
}

export function db4(query) {
  return queryDatabase('db4', query);
}

/**
 * Get database configuration
 * @returns {Object} Database configuration with table assignments
 */
export function getDatabaseConfig() {
  if (!metadataCache) {
    get_tables_metadata();
  }
  return DATABASE_CONFIG;
}

/**
 * Get all records for a specific table
 * @param {string} tableKey - Table key (e.g., 't1')
 * @returns {Array} All records for the table
 */
export function getTableRecords(tableKey) {
  if (!recordsCache) {
    get_tables_metadata();
  }
  return recordsCache.filter(record => record.tableKey === tableKey);
}

/**
 * Get statistics about the data
 * @returns {Object} Data statistics
 */
export function getDataStats() {
  if (!metadataCache) {
    get_tables_metadata();
  }
  return {
    totalTables: Object.keys(metadataCache).length,
    totalRecords: recordsCache.length,
    databases: Object.keys(DATABASE_CONFIG).map(dbKey => ({
      key: dbKey,
      name: DATABASE_CONFIG[dbKey].name,
      tableCount: DATABASE_CONFIG[dbKey].tableKeys.length
    }))
  };
}
