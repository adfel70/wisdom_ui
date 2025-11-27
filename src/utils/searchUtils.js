/**
 * Search and filter utilities for database operations
 */

/**
 * Search through table data for matching values
 * @param {Array} tables - Array of table objects
 * @param {string} query - Search query string
 * @returns {Array} Filtered tables with matching data
 */
export const searchTables = (tables, query) => {
  if (!query || !query.trim()) return tables;

  const lowerQuery = query.toLowerCase().trim();

  return tables
    .map(table => {
      const filteredData = table.data.filter(row => {
        return Object.values(row).some(value =>
          String(value).toLowerCase().includes(lowerQuery)
        );
      });

      return {
        ...table,
        data: filteredData,
        matchCount: filteredData.length
      };
    })
    .filter(table => table.data.length > 0);
};

/**
 * Filter tables by various criteria
 * @param {Array} tables - Array of table objects
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered tables
 */
export const filterTables = (tables, filters) => {
  const { tableName, year, category, country, selectedTables, minDate, maxDate } = filters;

  return tables.filter(table => {
    // Filter by selected tables (if any are selected)
    if (selectedTables && selectedTables.length > 0 && !selectedTables.includes(table.id)) {
      return false;
    }

    // Filter by table name
    if (tableName && !table.name.toLowerCase().includes(tableName.toLowerCase())) {
      return false;
    }

    // Filter by year
    if (year && year !== 'all' && table.year !== parseInt(year)) {
      return false;
    }

    // Filter by category
    if (category && category !== 'all' && !table.categories.includes(category)) {
      return false;
    }

    // Filter by country
    if (country && country !== 'all' && table.country !== country) {
      return false;
    }

    // Filter by date range
    if (table.indexingDate) {
      const tableDate = new Date(table.indexingDate);
      
      if (minDate) {
        const min = new Date(minDate);
        if (tableDate < min) return false;
      }

      if (maxDate) {
        const max = new Date(maxDate);
        if (tableDate > max) return false;
      }
    }

    return true;
  });
};

/**
 * Apply both search and filters to tables
 * @param {Array} tables - Array of table objects
 * @param {string} query - Search query
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered and searched tables
 */
export const applySearchAndFilters = (tables, query, filters) => {
  let result = tables;

  // Apply filters first
  if (filters && Object.keys(filters).length > 0) {
    result = filterTables(result, filters);
  }

  // Then apply search
  if (query && query.trim()) {
    result = searchTables(result, query);
  }

  return result;
};

/**
 * Highlight matching text in search results
 * @param {string} text - Text to highlight
 * @param {string} query - Search query
 * @returns {Array} Array of text parts with highlighting info
 */
export const highlightText = (text, query) => {
  if (!query || !text) return [{ text, highlight: false }];

  const parts = String(text).split(new RegExp(`(${query})`, 'gi'));
  return parts.map(part => ({
    text: part,
    highlight: part.toLowerCase() === query.toLowerCase()
  }));
};

export default {
  searchTables,
  filterTables,
  applySearchAndFilters,
  highlightText
};
