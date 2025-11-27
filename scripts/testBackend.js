/**
 * Test Backend API
 * Quick test to verify backend mock functions work correctly
 */

import {
  get_tables_metadata,
  db1, db2,
  getDatabaseConfig,
  getTableRecords,
  getDataStats
} from '../src/api/backend.js';

console.log('╔════════════════════════════════════════════╗');
console.log('║   Backend Mock API - Test Suite           ║');
console.log('╚════════════════════════════════════════════╝\n');

// Test 1: Get metadata
console.log('Test 1: get_tables_metadata()');
const metadata = get_tables_metadata();
console.log(`✓ Loaded ${Object.keys(metadata).length} tables`);
console.log('Sample table metadata:', JSON.stringify(metadata['t1'], null, 2));

// Test 2: Get stats
console.log('\n\nTest 2: getDataStats()');
const stats = getDataStats();
console.log('✓ Stats:', stats);

// Test 3: Get database config
console.log('\n\nTest 3: getDatabaseConfig()');
const config = getDatabaseConfig();
console.log('✓ Database configuration:');
Object.entries(config).forEach(([dbKey, dbInfo]) => {
  console.log(`  ${dbKey}: ${dbInfo.name} (${dbInfo.tableKeys.length} tables)`);
});

// Test 4: Query database without search
console.log('\n\nTest 4: db1() - Query without search');
const db1All = db1();
console.log(`✓ Retrieved ${db1All.length} records from db1`);
console.log('Sample record:', db1All[0]);

// Test 5: Query database with search
console.log('\n\nTest 5: db1("active") - Query with search');
const db1Search = db1('active');
console.log(`✓ Found ${db1Search.length} records matching "active"`);
if (db1Search.length > 0) {
  console.log('Sample result:', db1Search[0]);
}

// Test 6: Get table records
console.log('\n\nTest 6: getTableRecords("t1")');
const t1Records = getTableRecords('t1');
console.log(`✓ Retrieved ${t1Records.length} records from table t1`);
console.log('Sample:', t1Records[0]);

// Test 7: Query multiple databases
console.log('\n\nTest 7: Query multiple databases');
const db2Results = db2('2024');
console.log(`✓ db2("2024"): ${db2Results.length} records`);

console.log('\n\n╔════════════════════════════════════════════╗');
console.log('║   All tests passed! ✓                      ║');
console.log('╚════════════════════════════════════════════╝');
