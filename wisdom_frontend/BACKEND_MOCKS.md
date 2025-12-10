# Backend Mock System

This document describes the backend mock system for the Wisdom UI application. The mocks are designed to accurately simulate the real backend that will be deployed on a different network.

## Overview

The backend mock system consists of:
1. **Data Generator** - Creates large-scale test data
2. **Backend API** - Provides query functions that simulate real backend databases
3. **Metadata Cache** - Loaded once on app start for performance

## Architecture

### Data Structure

The system uses two main data structures:

#### 1. Table Metadata
Loaded once on app start via `get_tables_metadata()`:

```javascript
{
  "t1": {
    "name": "Transactions_Q4_789",
    "columns": [
      { "name": "id", "type": "id" },
      { "name": "amount", "type": "amount" },
      { "name": "date", "type": "date" },
      ...
    ],
    "categories": ["Finance", "Sales"],
    "year": 2024,
    "country": "USA",
    "recordCount": 100
  },
  "t2": { ... },
  ...
}
```

#### 2. Records
Each record has a `tableKey` field to identify which table it belongs to:

```javascript
{
  "tableKey": "t1",
  "id": "TX-000001",
  "amount": "$5,432",
  "date": "2024-09-15",
  "status": "Active",
  ...
}
```

### Database Organization

The system organizes 100 tables across 10 databases:
- **db1**: Sales & Transactions
- **db2**: HR & Personnel
- **db3**: Marketing Analytics
- **db4**: Operations & Logistics
- **db5**: Financial Records
- **db6**: Customer Data
- **db7**: Product Catalog
- **db8**: Compliance & Legal
- **db9**: IT & Infrastructure
- **db10**: Analytics & Reporting

## API Functions

### Metadata Functions

#### `get_tables_metadata()`
Load table metadata (call once on app start):
```javascript
import { get_tables_metadata } from './api/backend.js';

const metadata = get_tables_metadata();
// Returns: { t1: {...}, t2: {...}, ... }
```

### Database Query Functions

Each database has its own query function that simulates different backend types (Elastic, Mongo, etc.):

#### `db1(query)` through `db10(query)`
Query a specific database tab:
```javascript
import { db1, db2 } from './api/backend.js';

// Get all records from db1
const allRecords = db1();

// Search db1 for records containing "active"
const searchResults = db1('active');

// Query returns records with tableKey field
// [
//   { tableKey: 't1', id: 'TX-001', ... },
//   { tableKey: 't5', id: 'ACC-002', ... },
//   ...
// ]
```

### Helper Functions

#### `getDatabaseConfig()`
Get database configuration and table assignments:
```javascript
import { getDatabaseConfig } from './api/backend.js';

const config = getDatabaseConfig();
// Returns database-to-table mapping
```

#### `getTableRecords(tableKey)`
Get all records for a specific table:
```javascript
import { getTableRecords } from './api/backend.js';

const records = getTableRecords('t1');
```

#### `getDataStats()`
Get statistics about the data:
```javascript
import { getDataStats } from './api/backend.js';

const stats = getDataStats();
// { totalTables: 100, totalRecords: 10000, databases: [...] }
```

## Data Generation

### Generating New Data

To generate fresh mock data:

```bash
npm run generate-data
```

This creates `src/data/generatedData.json` with:
- **100 tables** with varied metadata
- **100 records per table** (10,000 total)
- **Mixed data types**: strings, numbers, dates, booleans, etc.

### Customizing Data Generation

Edit `scripts/generateMockData.js`:

```javascript
const NUM_TABLES = 100;           // Number of tables
const RECORDS_PER_TABLE = 100;    // Records per table
```

**Note**: Keep `RECORDS_PER_TABLE` ≤ 200 for browser performance (file size < 5MB).

### Field Types

Generated fields include:
- **id**: Unique identifiers (TX-000001, ACC-000042, etc.)
- **name**: Random names
- **email**: Email addresses
- **company**: Company names
- **amount**: Currency values
- **number**: Numeric values
- **percentage**: Percentage values
- **date**: Dates (2020-2024)
- **boolean**: True/false values
- **status**: Status values (Active, Pending, etc.)
- **category**: Categories (Finance, HR, etc.)
- **city**: City names
- **country**: Country names
- **department**: Department names
- **score**: Numeric scores (0-100)
- **text**: Short text snippets

## Integration Guide

### Step 1: Initialize on App Start

In your main app component or startup logic:

```javascript
import { get_tables_metadata } from './api/backend.js';

// Load metadata once on app start
const metadata = get_tables_metadata();

// Cache metadata in your state/context
// This simulates the backend loading metadata into cache
```

### Step 2: Query Database Tabs

When a user selects a database tab:

```javascript
import { db1, db2, db3 } from './api/backend.js';

function loadDatabaseRecords(dbKey, searchQuery) {
  // Map database key to function
  const dbFunctions = { db1, db2, db3, /* ... */ };

  // Query the database
  const records = dbFunctions[dbKey](searchQuery);

  // Group records by tableKey
  const recordsByTable = {};
  records.forEach(record => {
    const { tableKey, ...data } = record;
    if (!recordsByTable[tableKey]) {
      recordsByTable[tableKey] = [];
    }
    recordsByTable[tableKey].push(data);
  });

  return recordsByTable;
}
```

### Step 3: Display Results

Combine metadata with records:

```javascript
const metadata = get_tables_metadata();
const recordsByTable = loadDatabaseRecords('db1', 'search query');

// For each table with matching records
Object.entries(recordsByTable).forEach(([tableKey, records]) => {
  const tableMeta = metadata[tableKey];

  console.log(`Table: ${tableMeta.name}`);
  console.log(`Columns:`, tableMeta.columns);
  console.log(`Records:`, records);

  // Display in UI...
});
```

## Query Behavior

### Simple Text Search

The query parameter performs simple text search:
- Searches across **all field values** in each record
- Case-insensitive matching
- Returns records where **any field** contains the query string

Example:
```javascript
// Finds records where any field contains "active"
db1('active')

// Finds records where any field contains "2024"
db2('2024')

// Returns all records
db3('')
```

### Highlighting Matches

To highlight search matches in the UI, iterate through field values:

```javascript
function highlightMatch(value, query) {
  if (!query) return value;
  const regex = new RegExp(`(${query})`, 'gi');
  return String(value).replace(regex, '<mark>$1</mark>');
}
```

## Real Backend Integration

When deploying with the real backend:

1. **Replace imports**: Change from `./api/backend.js` to real backend client
2. **Keep function signatures**: Use the same function names and parameters
3. **Update metadata loading**: Call real `get_tables_metadata()` endpoint
4. **Update query functions**: Point `db1()`, `db2()`, etc. to real endpoints

The mock API is designed to match the real backend interface exactly, so integration should be straightforward.

## Examples

See `src/api/backendExample.js` for comprehensive usage examples:

```javascript
import { runAllExamples } from './api/backendExample.js';

// Run all examples to see the API in action
runAllExamples();
```

## File Structure

```
wisdom_ui/
├── scripts/
│   └── generateMockData.js       # Data generator script
├── src/
│   ├── api/
│   │   ├── backend.js            # Backend API functions
│   │   └── backendExample.js     # Usage examples
│   └── data/
│       └── generatedData.json    # Generated mock data (2.4 MB)
└── BACKEND_MOCKS.md              # This file
```

## Performance Notes

- **Metadata caching**: Loaded once, reused for all queries
- **Record filtering**: Happens in-memory (fast for 10k records)
- **File size**: 2.4 MB JSON file (loads quickly)
- **Scalability**: For production with millions of records, use real backend pagination

## Troubleshooting

### File too large error
- Reduce `RECORDS_PER_TABLE` in the generator script
- Keep total records under 20,000 for browser performance

### Out of memory error
- Generated data is too large
- Reduce `NUM_TABLES` or `RECORDS_PER_TABLE`

### Slow queries
- With 10,000 records, queries should be fast
- Consider adding indexes or pagination for larger datasets
