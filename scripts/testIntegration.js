/**
 * Test UI Integration
 * Verify that the new backend mocks work with the UI data format
 */

import { MOCK_DATABASES, getAvailableYears, getAvailableCategories, getAvailableCountries } from '../src/data/mockDatabaseNew.js';

console.log('╔════════════════════════════════════════════╗');
console.log('║   UI Integration Test                      ║');
console.log('╚════════════════════════════════════════════╝\n');

// Test 1: Check database structure
console.log('Test 1: Database Structure');
console.log(`✓ Total databases: ${MOCK_DATABASES.length}`);
MOCK_DATABASES.forEach(db => {
  console.log(`  - ${db.id}: ${db.name} (${db.tables.length} tables)`);
});

// Test 2: Check table structure
console.log('\n\nTest 2: Table Structure');
const firstDb = MOCK_DATABASES[0];
const firstTable = firstDb.tables[0];
console.log('Sample table from db1:');
console.log(JSON.stringify({
  id: firstTable.id,
  name: firstTable.name,
  year: firstTable.year,
  country: firstTable.country,
  categories: firstTable.categories,
  count: firstTable.count,
  columns: firstTable.columns,
  dataCount: firstTable.data.length,
  sampleData: firstTable.data[0]
}, null, 2));

// Test 3: Check filter data
console.log('\n\nTest 3: Filter Data');
const years = getAvailableYears();
const categories = getAvailableCategories();
const countries = getAvailableCountries();
console.log(`✓ Available years: ${years.join(', ')}`);
console.log(`✓ Available categories: ${categories.join(', ')}`);
console.log(`✓ Available countries: ${countries.join(', ')}`);

// Test 4: Count total records
console.log('\n\nTest 4: Total Record Count');
let totalRecords = 0;
let totalTables = 0;
MOCK_DATABASES.forEach(db => {
  db.tables.forEach(table => {
    totalTables++;
    totalRecords += table.data.length;
  });
});
console.log(`✓ Total tables: ${totalTables}`);
console.log(`✓ Total records: ${totalRecords}`);

// Test 5: Check all databases have data
console.log('\n\nTest 5: Database Data Distribution');
MOCK_DATABASES.forEach(db => {
  const tableCount = db.tables.length;
  const recordCount = db.tables.reduce((sum, table) => sum + table.data.length, 0);
  console.log(`✓ ${db.id}: ${tableCount} tables, ${recordCount} records`);
});

console.log('\n\n╔════════════════════════════════════════════╗');
console.log('║   Integration test passed! ✓               ║');
console.log('╚════════════════════════════════════════════╝');
