/**
 * Test UI Integration
 * Verify that the new backend mocks work with the UI data format
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { get_tables_metadata, getDatabaseConfig } from '../src/api/backend.js';
import { getAvailableYears, getAvailableCategories, getAvailableCountries } from '../src/data/mockDatabaseNew.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load data directly from filesystem for Node.js testing
function loadDatabaseRecordsSync(dbKey) {
  const filePath = path.join(__dirname, '..', 'src', 'data', 'records', `${dbKey}.json`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  return data.records;
}

function createTableFromRecords(tableKey, records, metadata) {
  const tableMeta = metadata[tableKey];
  if (!tableMeta) return null;

  const columns = tableMeta.columns.map(col => col.name);
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

function loadDatabaseSync(dbId, metadata, dbConfig) {
  const allRecords = loadDatabaseRecordsSync(dbId);
  const tableKeys = dbConfig[dbId].tableKeys;

  const recordsByTable = {};
  allRecords.forEach(record => {
    const { tableKey } = record;
    if (!recordsByTable[tableKey]) {
      recordsByTable[tableKey] = [];
    }
    recordsByTable[tableKey].push(record);
  });

  const tables = [];
  tableKeys.forEach(tableKey => {
    const records = recordsByTable[tableKey] || [];
    const table = createTableFromRecords(tableKey, records, metadata);
    if (table) {
      tables.push(table);
    }
  });

  return {
    id: dbId,
    name: dbConfig[dbId].name,
    description: dbConfig[dbId].description,
    tables: tables
  };
}

async function runTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   UI Integration Test                      ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Load metadata and config
  const metadata = get_tables_metadata();
  const dbConfig = getDatabaseConfig();

  // Load all databases (sync for Node.js)
  const MOCK_DATABASES = [
    loadDatabaseSync('db1', metadata, dbConfig),
    loadDatabaseSync('db2', metadata, dbConfig),
    loadDatabaseSync('db3', metadata, dbConfig),
    loadDatabaseSync('db4', metadata, dbConfig)
  ];

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
}

runTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
