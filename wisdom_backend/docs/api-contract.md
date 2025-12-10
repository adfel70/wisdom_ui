# API Contract (v1)

## Shared types
- **QueryJSON**: array of elements (empty/null = match all)
  - Clause: `{ type: "clause", content: { value: string, bdt: string|null } }`
  - Operator: `{ type: "operator", content: { operator: "AND"|"OR" } }`
  - Subquery: `{ type: "subQuery", content: { elements: QueryJSON } }`
- **Filters** (all optional):
  ```json
  {
    "tableName": "string",
    "year": 2024 | "2024" | "all",
    "category": "string" | "all",
    "country": "string" | "all",
    "selectedTables": ["t1", "t2"],
    "categories": ["Finance"],
    "regions": ["USA"],
    "tableNames": ["Transactions_Q4"],
    "tableYears": ["2024", 2023]
  }
  ```
- **Pagination policy**: unified offset paging for all DBs. Requests use `pageNumber` (1-based) and/or `startRow` + `sizeLimit`. Responses include `pagination.nextOffset` and `hasMore`.
- **Error model**: `{ "error": string, "details"?: object }`

## Routes

### Version
- `GET /api/version`
- Returns: `{ "version": "v1" }`

### Health
- `GET /api/health`
- Returns: `{ "status": "ok" }`

### BDTs (column types)
- `GET /api/bdts`
- Use: populate the column-type dropdown.
- Returns:
  ```json
  {
    "bdts": ["amount","boolean","category","company","country","date", "..."]
  }
  ```

### Catalog
- `GET /api/catalog`
- Use: initial load of all tables metadata and database descriptors.
- Returns:
  ```json
  {
    "tables": [ { "id": "t1", "name": "...", "year": 2024, "country": "USA", "categories": ["Finance"], "count": 100, "columns": ["id","amount",...]} ],
    "databases": [ { "id": "db1", "name": "...", "description": "...", "tableKeys": ["t1","t2",...] } ]
  }
  ```

### searchTables
- `POST /api/search/tables`
- Use: step 1 search to find tables matching query/filters for a db; returns facets.
- Body:
  ```json
  {
    "db": "db1",
    "query": [ { "type": "clause", "content": { "value": "active", "bdt": null } } ],
    "filters": { "categories": ["Finance"], "year": "all" },
    "permutations": {
      "active": ["active", "ACTIVE"]  // term -> variants; OR’d per clause
    },
    "picked_tables": [
      { "db": "db1", "table": "t1" },
      { "db": "db1", "table": "t2" }
    ]
  }
  ```
- Returns:
  ```json
  {
    "tables": [ /* TableMeta objects */ ],
    "facets": {
      "categories": { "Finance": 3 },
      "regions": { "USA": 2 },
      "tableNames": { "Transactions_Q4": 1 },
      "tableYears": { "2024": 2 }
    },
    "total": 3
  }
  ```

### searchRows
- `POST /api/search/rows`
- Use: step 2 to fetch rows for one table with unified offset paging.
- Body:
  ```json
  {
    "query": [ { "type": "clause", "content": { "value": "active", "bdt": null } } ],
    "filters": {},
    "permutations": {
      "active": ["active", "ACTIVE"]
    },
    "picked_tables": [
      { "db": "db1", "table": "t1" }
    ],
    "options": {
      "db": "db1",
      "table": "t1",
      "pageNumber": 1,
      "startRow": 0,
      "sizeLimit": 20
    }
  }
  ```
- Returns:
  ```json
  {
    "columns": ["id","amount","country", "..."],
    "rows": [
      ["TX-000001","$80,194","Mexico", "..."],
      ["TX-000002","$3,238","Japan", "..."]
    ],
    "pagination": {
      "hasMore": true,
      "nextOffset": 20,
      "pageNumber": 1,
      "pageSize": 20,
      "totalRecords": 100
    }
  }
  ```

### permutations
- `POST /api/permutations`
- Use: expand search terms based on selected permutation.
- Body:
  ```json
  {
    "permutationId": "reverse",
    "terms": ["abc", "foo"],
    "params": {}
  }
  ```
- Returns:
  ```json
  {
    "permutations": {
      "abc": ["abc","cba"],
      "foo": ["foo","oof"]
    }
  }
  ```

## Notes for frontend integration
- Base URL comes from env (e.g., `http://localhost:8000`). CORS is open to `FRONTEND_ORIGIN`.
- `searchRows` returns rows as array-of-arrays plus `columns`, so the frontend should map columns to positions.
- Pagination: prefer `nextOffset`/`hasMore`; `pageNumber`/`pageSize` are echoed for convenience.
- Filters are optional; omit or pass empty to disable filtering.
- Query can be string (simple contains) or QueryJSON (AND/OR with nested subqueries; `bdt` restricts to column type).

