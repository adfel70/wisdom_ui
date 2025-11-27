/**
 * Mock Data Generator
 * Generates large-scale mock database tables and records
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const NUM_TABLES = 100;
const RECORDS_PER_TABLE = 100; // Reduced for browser performance

// Data generation helpers
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[randomInt(0, arr.length - 1)];
const randomBool = () => Math.random() > 0.5;

// Sample data pools (compact for efficiency)
const FIRST_NAMES = ['Alice','Bob','Carol','Dan','Eve','Frank','Grace','Hank','Ivy','Jack','Kate','Leo','Mia','Noah','Olivia','Paul','Quinn','Rose','Sam','Tina'];
const LAST_NAMES = ['Smith','Jones','Brown','Davis','Wilson','Moore','Taylor','Lee','White','Harris','Clark','Lewis','Young','King','Scott','Green','Adams','Baker','Nelson','Hill'];
const COMPANIES = ['TechCorp','DataSys','CloudNet','InfoHub','LogicLab','NetWorks','SysCore','CodeBase','ByteOps','DevTeam','AppForge','WebDev','SoftLab','DigitalPro','CyberTech','SmartSys'];
const CITIES = ['NY','LA','Chicago','Houston','Phoenix','Philly','SanAnt','SanDiego','Dallas','SanJose','Austin','Jacksonville','FortWorth','Columbus','Charlotte','SFran'];
const STATUSES = ['Active','Inactive','Pending','Complete','Cancelled','Processing','Approved','Rejected','Draft','Published'];
const CATEGORIES = ['Finance','HR','Sales','Marketing','Operations','IT','Legal','Compliance','Analytics','Support'];
const COUNTRIES = ['USA','UK','Canada','Germany','France','Japan','Australia','Brazil','India','Mexico'];
const DEPARTMENTS = ['Engineering','Sales','Marketing','Finance','HR','Operations','IT','Legal','Support','Product'];

// Field type generators
const generators = {
  id: (prefix, i) => `${prefix}-${String(i).padStart(6, '0')}`,
  email: (name) => `${name.toLowerCase().replace(' ', '.')}@company.com`,
  name: () => `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
  company: () => randomChoice(COMPANIES),
  amount: () => `$${randomInt(100, 99999).toLocaleString()}`,
  number: () => randomInt(1, 10000),
  percentage: () => `${randomInt(0, 100)}%`,
  date: () => {
    const year = randomInt(2020, 2024);
    const month = String(randomInt(1, 12)).padStart(2, '0');
    const day = String(randomInt(1, 28)).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  boolean: () => randomBool(),
  status: () => randomChoice(STATUSES),
  category: () => randomChoice(CATEGORIES),
  city: () => randomChoice(CITIES),
  country: () => randomChoice(COUNTRIES),
  department: () => randomChoice(DEPARTMENTS),
  score: () => randomInt(0, 100),
  text: (words = 5) => {
    const vocab = ['data','process','system','user','report','update','review','check','send','create'];
    return Array.from({length: words}, () => randomChoice(vocab)).join(' ');
  }
};

// Table name generators
const TABLE_PREFIXES = ['Transactions','Records','Users','Products','Orders','Inventory','Accounts','Reports','Analytics','Logs'];
const TABLE_SUFFIXES = ['2024','Q1','Q2','Q3','Q4','Master','Archive','Active','Historical','Summary'];

// Generate field definitions for a table
function generateTableFields(tableIdx) {
  const numFields = randomInt(5, 10);
  const fields = [];

  // Always start with an ID field
  const idPrefix = ['TX','REC','USR','PRD','ORD','INV','ACC','RPT','ANA','LOG'][tableIdx % 10];
  fields.push({ name: 'id', type: 'id', generator: (i) => generators.id(idPrefix, i) });

  // Add varied field types
  const fieldTypes = [
    { name: 'name', type: 'name', generator: () => generators.name() },
    { name: 'email', type: 'email', generator: () => generators.email(generators.name()) },
    { name: 'company', type: 'company', generator: () => generators.company() },
    { name: 'amount', type: 'amount', generator: () => generators.amount() },
    { name: 'value', type: 'number', generator: () => generators.number() },
    { name: 'percent', type: 'percentage', generator: () => generators.percentage() },
    { name: 'date', type: 'date', generator: () => generators.date() },
    { name: 'active', type: 'boolean', generator: () => generators.boolean() },
    { name: 'status', type: 'status', generator: () => generators.status() },
    { name: 'category', type: 'category', generator: () => generators.category() },
    { name: 'city', type: 'city', generator: () => generators.city() },
    { name: 'country', type: 'country', generator: () => generators.country() },
    { name: 'dept', type: 'department', generator: () => generators.department() },
    { name: 'score', type: 'score', generator: () => generators.score() },
    { name: 'notes', type: 'text', generator: () => generators.text(3) },
  ];

  // Randomly select fields
  const selectedTypes = new Set();
  while (fields.length < numFields && selectedTypes.size < fieldTypes.length) {
    const ft = randomChoice(fieldTypes);
    if (!selectedTypes.has(ft.name)) {
      selectedTypes.add(ft.name);
      fields.push(ft);
    }
  }

  return fields;
}

// Generate metadata for all tables
function generateMetadata() {
  const metadata = {};

  for (let i = 0; i < NUM_TABLES; i++) {
    const tableKey = `t${i + 1}`;
    const tableName = `${randomChoice(TABLE_PREFIXES)}_${randomChoice(TABLE_SUFFIXES)}_${randomInt(1, 999)}`;
    const fields = generateTableFields(i);

    metadata[tableKey] = {
      name: tableName,
      columns: fields.map(f => ({ name: f.name, type: f.type })),
      categories: Array.from({length: randomInt(1, 3)}, () => randomChoice(CATEGORIES)),
      year: randomChoice([2020, 2021, 2022, 2023, 2024]),
      country: randomChoice(COUNTRIES),
      recordCount: RECORDS_PER_TABLE
    };

    // Store generators for later use
    metadata[tableKey]._generators = fields;
  }

  return metadata;
}

// Generate records for all tables
function generateRecords(metadata) {
  const records = [];

  for (let tableIdx = 0; tableIdx < NUM_TABLES; tableIdx++) {
    const tableKey = `t${tableIdx + 1}`;
    const tableMetadata = metadata[tableKey];
    const fields = tableMetadata._generators;

    for (let i = 0; i < RECORDS_PER_TABLE; i++) {
      const record = { tableKey };

      fields.forEach(field => {
        if (field.name === 'id') {
          record[field.name] = field.generator(i + 1);
        } else {
          record[field.name] = field.generator();
        }
      });

      records.push(record);
    }
  }

  return records;
}

// Database configuration
const DATABASE_CONFIG = {
  db1: { name: 'Sales Database', description: 'Contains sales transactions, inventory, and customer data' },
  db2: { name: 'HR & Personnel', description: 'Human resources and employee management data' },
  db3: { name: 'Marketing Analytics', description: 'Marketing campaigns, leads, and analytics data' },
  db4: { name: 'Legacy Archives', description: 'Historical data and archived records' },
};

// Distribute tables across databases
function assignTablesToDatabases(numTables) {
  const dbKeys = Object.keys(DATABASE_CONFIG);
  const tablesPerDb = Math.ceil(numTables / dbKeys.length);
  const assignments = {};

  dbKeys.forEach(dbKey => {
    assignments[dbKey] = [];
  });

  for (let i = 0; i < numTables; i++) {
    const tableKey = `t${i + 1}`;
    const dbIdx = Math.floor(i / tablesPerDb);
    const dbKey = dbKeys[Math.min(dbIdx, dbKeys.length - 1)];
    assignments[dbKey].push(tableKey);
  }

  return assignments;
}

// Main generation function
function generateMockData() {
  console.log('Generating mock data...');
  console.log(`Tables: ${NUM_TABLES}`);
  console.log(`Records per table: ${RECORDS_PER_TABLE}`);
  console.log(`Total records: ${NUM_TABLES * RECORDS_PER_TABLE}`);

  // Generate metadata once with generators
  const metadataWithGenerators = generateMetadata();

  console.log('Generating records...');
  const records = generateRecords(metadataWithGenerators);

  // Clean up internal generators for final output
  const metadata = {};
  Object.keys(metadataWithGenerators).forEach(key => {
    const { _generators, ...rest } = metadataWithGenerators[key];
    metadata[key] = rest;
  });

  // Assign tables to databases
  const dbAssignments = assignTablesToDatabases(NUM_TABLES);

  // Create output directory structure
  const dataDir = path.join(__dirname, '..', 'src', 'data');
  const recordsDir = path.join(dataDir, 'records');

  if (!fs.existsSync(recordsDir)) {
    fs.mkdirSync(recordsDir, { recursive: true });
  }

  // Write metadata file
  const metadataOutput = {
    metadata,
    databaseConfig: DATABASE_CONFIG,
    databaseAssignments: dbAssignments,
    generatedAt: new Date().toISOString(),
    stats: {
      totalTables: NUM_TABLES,
      totalRecords: records.length,
      recordsPerTable: RECORDS_PER_TABLE
    }
  };

  const metadataPath = path.join(dataDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadataOutput, null, 2));
  console.log(`✓ Saved metadata to ${metadataPath}`);
  console.log(`✓ Metadata size: ${(fs.statSync(metadataPath).size / 1024).toFixed(2)} KB`);

  // Write records files per database
  Object.keys(DATABASE_CONFIG).forEach(dbKey => {
    const tableKeys = dbAssignments[dbKey];
    const dbRecords = records.filter(record => tableKeys.includes(record.tableKey));

    const recordsOutput = {
      databaseKey: dbKey,
      records: dbRecords,
      stats: {
        tableCount: tableKeys.length,
        recordCount: dbRecords.length
      }
    };

    const dbPath = path.join(recordsDir, `${dbKey}.json`);
    fs.writeFileSync(dbPath, JSON.stringify(recordsOutput, null, 2));
    console.log(`✓ Saved ${dbKey} records to ${dbPath} (${dbRecords.length} records, ${(fs.statSync(dbPath).size / 1024).toFixed(2)} KB)`);
  });

  console.log(`\n✓ Generated ${records.length} records across ${NUM_TABLES} tables`);
  console.log(`✓ Split into ${Object.keys(DATABASE_CONFIG).length} database files`);
}

// Run generator
generateMockData();
