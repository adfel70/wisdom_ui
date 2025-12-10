const DEFAULT_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

const API_BASE_URL = DEFAULT_BASE_URL;

const emptyFacets = {
  categories: {},
  regions: {},
  tableNames: {},
  tableYears: {},
};

let catalogCache = null;
let catalogPromise = null;
let bdtsCache = null;
let bdtsPromise = null;

const withJson = async (response) => {
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = json?.error || json?.detail || response.statusText;
    throw new Error(message);
  }
  return json;
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    signal: options.signal,
    ...options,
  });
  return withJson(response);
};

const buildCatalogCache = (payload) => {
  const tables = payload?.tables || [];
  const databases = payload?.databases || [];
  const tablesById = new Map();
  const tableToDb = new Map();

  tables.forEach((table) => {
    if (table?.id) {
      tablesById.set(table.id, table);
    }
  });

  databases.forEach((db) => {
    (db?.tableKeys || []).forEach((tableId) => {
      tableToDb.set(tableId, db.id);
    });
  });

  return { tables, databases, tablesById, tableToDb };
};

const ensureCatalog = async () => {
  if (catalogCache) return catalogCache;
  if (!catalogPromise) {
    catalogPromise = request('/api/catalog')
      .then((data) => {
        catalogCache = buildCatalogCache(data || {});
        return catalogCache;
      })
      .finally(() => {
        catalogPromise = null;
      });
  }
  return catalogPromise;
};

const updateTableMeta = (table, dbId) => {
  if (!catalogCache || !table?.id) return;
  const existing = catalogCache.tablesById.get(table.id) || {};
  const merged = { ...existing, ...table };

  catalogCache.tablesById.set(table.id, merged);

  // Update the tables list while preserving order if possible
  const idx = catalogCache.tables.findIndex((t) => t.id === table.id);
  if (idx >= 0) {
    catalogCache.tables[idx] = merged;
  } else {
    catalogCache.tables.push(merged);
  }

  if (dbId) {
    catalogCache.tableToDb.set(table.id, dbId);
  }
};

export const getCatalog = async () => {
  const catalog = await ensureCatalog();
  return { tables: catalog.tables, databases: catalog.databases };
};

export const getBdts = async () => {
  if (bdtsCache) return bdtsCache;
  if (!bdtsPromise) {
    bdtsPromise = request('/api/bdts')
      .then((data) => {
        bdtsCache = data?.bdts || [];
        return bdtsCache;
      })
      .finally(() => {
        bdtsPromise = null;
      });
  }
  return bdtsPromise;
};

export const getDatabaseMetadata = async () => {
  const catalog = await ensureCatalog();
  return catalog.databases;
};

export const getTablesMetadataForDatabase = async (dbId) => {
  const catalog = await ensureCatalog();
  const db = catalog.databases.find((d) => d.id === dbId);
  const keys = db?.tableKeys || [];
  return keys
    .map((id) => catalog.tablesById.get(id))
    .filter(Boolean);
};

export const getDatabaseForTable = async (tableId) => {
  const catalog = await ensureCatalog();
  return catalog.tableToDb.get(tableId) || null;
};

export const getDatabasesWithTables = async () => {
  const catalog = await ensureCatalog();
  return (catalog.databases || []).map((db) => {
    const tableKeys = db?.tableKeys || [];
    const tables = tableKeys
      .map((id) => catalog.tablesById.get(id))
      .filter(Boolean);
    return { ...db, tables };
  });
};

export const getAvailableYears = async () => {
  const catalog = await ensureCatalog();
  const years = new Set();
  catalog.tables.forEach((table) => {
    if (table?.year !== undefined && table?.year !== null) {
      years.add(table.year);
    }
  });
  return Array.from(years).sort((a, b) => b - a);
};

export const getAvailableCategories = async () => {
  const catalog = await ensureCatalog();
  const categories = new Set();
  catalog.tables.forEach((table) => {
    (table?.categories || []).forEach((cat) => categories.add(cat));
  });
  return Array.from(categories).sort();
};

export const getAvailableCountries = async () => {
  const catalog = await ensureCatalog();
  const countries = new Set();
  catalog.tables.forEach((table) => {
    if (table?.country) {
      countries.add(table.country);
    }
  });
  return Array.from(countries).sort();
};

export const getColumnTypes = async () => {
  const catalog = await ensureCatalog();
  const types = new Set();
  catalog.tables.forEach((table) => {
    (table?.columns || []).forEach((col) => {
      // If backend ever returns structured column metadata, keep type if present
      if (col && typeof col === 'object' && col.type) {
        types.add(col.type);
      }
    });
  });
  return Array.from(types).sort();
};

export const searchTables = async ({ db, query = null, filters = {}, permutations = null }) => {
  await ensureCatalog();
  const payload = {
    db,
    query: query ?? null,
    filters: filters || {},
    ...(permutations ? { permutations } : {}),
  };

  const result = await request('/api/search/tables', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const tables = result?.tables || [];
  tables.forEach((t) => updateTableMeta(t, db));

  return {
    tables,
    tableIds: tables.map((t) => t.id),
    facets: result?.facets || emptyFacets,
    total: result?.total ?? tables.length,
  };
};

const mapRowsToObjects = (columns, rows) => {
  return (rows || []).map((row) => {
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = row?.[idx] ?? '';
    });
    return obj;
  });
};

export const getTableDataPaginatedById = async (
  tableId,
  paginationState = {},
  pageSize = 20,
  query = null,
  filters = {},
  permutations = null,
  signal = undefined,
) => {
  const catalog = await ensureCatalog();
  const db = catalog.tableToDb.get(tableId);
  if (!db) {
    throw new Error(`Table ${tableId} is not assigned to a database`);
  }

  const startRow = paginationState?.offset ?? paginationState?.startRow ?? 0;
  const pageNumber =
    paginationState?.pageNumber ??
    (pageSize ? Math.floor(startRow / pageSize) + 1 : 1);

  const payload = {
    query: query ?? null,
    filters: filters || {},
    ...(permutations ? { permutations } : {}),
    options: {
      db,
      table: tableId,
      pageNumber,
      startRow,
      sizeLimit: pageSize,
    },
  };

  const result = await request('/api/search/rows', {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  });

  const columns = result?.columns || [];
  const rows = mapRowsToObjects(columns, result?.rows || []);
  const pagination = result?.pagination || {};

  const meta = catalog.tablesById.get(tableId) || { id: tableId };

  const paginationInfo = {
    hasMore: Boolean(pagination?.hasMore),
    nextPaginationState:
      pagination?.hasMore && pagination?.nextOffset !== undefined && pagination?.nextOffset !== null
        ? { offset: pagination.nextOffset, pageNumber: (pagination.pageNumber || 1) + 1 }
        : null,
    strategy: 'offset',
    loadedRecords: rows.length,
    totalRecords: pagination?.totalRecords ?? rows.length,
  };

  return {
    id: tableId,
    name: meta.name || tableId,
    year: meta.year,
    country: meta.country,
    categories: meta.categories || [],
    count: meta.count ?? meta.recordCount ?? pagination?.totalRecords ?? rows.length,
    columns,
    data: rows,
    paginationInfo,
  };
};

export const getPermutations = async (permutationId, terms = [], params = {}) => {
  if (!permutationId || permutationId === 'none' || !Array.isArray(terms) || terms.length === 0) {
    return {};
  }

  const payload = {
    permutationId,
    terms,
    params: params || {},
  };

  const result = await request('/api/permutations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return result?.permutations || {};
};

export const __internal = {
  ensureCatalog,
  updateTableMeta,
};

export { API_BASE_URL };

