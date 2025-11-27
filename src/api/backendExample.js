/**
 * Backend API Usage Examples
 * This file demonstrates how to use the backend mock API
 */

import {
  get_tables_metadata,
  db1, db2, db3, db4,
  getDatabaseConfig,
  getTableRecords,
  getDataStats
} from './backend.js';

/**
 * Example 1: Get table metadata on app start
 */
export function exampleGetMetadata() {
  // This should be called once when the app starts
  const metadata = get_tables_metadata();

  console.log('=== Table Metadata ===');
  console.log(`Total tables: ${Object.keys(metadata).length}`);

  // Example: Get metadata for a specific table
  const table1 = metadata['t1'];
  console.log('\nExample table (t1):', {
    name: table1.name,
    columns: table1.columns,
    recordCount: table1.recordCount
  });

  return metadata;
}

/**
 * Example 2: Query a database tab
 */
export function exampleQueryDatabase() {
  console.log('\n=== Database Query Examples ===');

  // Query db1 without search
  const allDb1Records = db1();
  console.log(`\ndb1() - All records: ${allDb1Records.length}`);
  console.log('Sample record:', allDb1Records[0]);

  // Query db1 with search
  const searchResults = db1('active');
  console.log(`\ndb1('active') - Search results: ${searchResults.length}`);
  if (searchResults.length > 0) {
    console.log('Sample search result:', searchResults[0]);
  }

  // Query different databases
  const db2Records = db2('2024');
  console.log(`\ndb2('2024') - Records: ${db2Records.length}`);

  return { allRecords: allDb1Records, searchResults };
}

/**
 * Example 3: Get records by table key
 */
export function exampleGetTableRecords() {
  console.log('\n=== Get Table Records ===');

  const t1Records = getTableRecords('t1');
  console.log(`\nTable t1 records: ${t1Records.length}`);
  console.log('Sample record:', t1Records[0]);

  return t1Records;
}

/**
 * Example 4: Get database configuration
 */
export function exampleGetConfig() {
  console.log('\n=== Database Configuration ===');

  const config = getDatabaseConfig();
  Object.entries(config).forEach(([dbKey, dbInfo]) => {
    console.log(`\n${dbKey}:`, {
      name: dbInfo.name,
      tables: dbInfo.tableKeys.length
    });
  });

  return config;
}

/**
 * Example 5: Get data statistics
 */
export function exampleGetStats() {
  console.log('\n=== Data Statistics ===');

  const stats = getDataStats();
  console.log('Stats:', stats);

  return stats;
}

/**
 * Example 6: Search across multiple databases
 */
export function exampleMultiDatabaseSearch(query) {
  console.log(`\n=== Multi-Database Search: "${query}" ===`);

  const databases = [db1, db2, db3, db4];
  const results = databases.map((dbFunc, idx) => {
    const records = dbFunc(query);
    return {
      database: `db${idx + 1}`,
      count: records.length,
      records: records.slice(0, 5) // First 5 results
    };
  });

  results.forEach(result => {
    if (result.count > 0) {
      console.log(`\n${result.database}: ${result.count} matches`);
      console.log('Sample:', result.records[0]);
    }
  });

  return results;
}

/**
 * Run all examples
 */
export function runAllExamples() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Backend Mock API - Usage Examples       ║');
  console.log('╚════════════════════════════════════════════╝');

  exampleGetMetadata();
  exampleGetConfig();
  exampleGetStats();
  exampleQueryDatabase();
  exampleGetTableRecords();
  exampleMultiDatabaseSearch('active');

  console.log('\n✓ All examples completed!');
}

// Uncomment to run examples
// runAllExamples();
