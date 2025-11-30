/**
 * Search and filter utilities for database operations
 */

import { applyPermutation } from './permutationUtils';

/**
 * Expand all terms in groups with permutations
 * @param {Array} groups - Array of AND groups (each group is an array of terms)
 * @param {string} permutationId - The permutation to apply (e.g., 'reverse', 'double', 'none')
 * @returns {Object} Object containing expanded groups and all variants for display
 */
const expandGroupsWithPermutations = (groups, permutationId) => {
  if (!permutationId || permutationId === 'none') {
    return {
      expandedGroups: groups,
      allVariants: {}
    };
  }

  const allVariants = {}; // Track all variants for each original term
  const expandedGroups = groups.map(group => {
    return group.map(term => {
      const variants = applyPermutation(term, permutationId);
      allVariants[term] = variants;
      return variants;
    });
  });

  return {
    expandedGroups,
    allVariants
  };
};

/**
 * Parse tokens into OR groups, where each group contains AND-connected terms
 * Example: [jake, and, sarah, or, mike, and, john] => [[jake, sarah], [mike, john]]
 * @param {Array} tokens - Array of token objects {type: 'term'|'keyword', value: string}
 * @returns {Array} Array of arrays, where each inner array is an AND group
 */
const parseTokensToGroups = (tokens) => {
  const groups = [];
  let currentGroup = [];

  tokens.forEach(token => {
    if (token.type === 'keyword' && token.value === 'or') {
      // 'or' separates groups
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
    } else if (token.type === 'term') {
      // Add term to current group
      currentGroup.push(token.value);
    }
    // 'and' keywords are implicit - they just connect terms in the same group
  });

  // Add the last group
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
};

/**
 * Check if a row matches a group of AND-connected terms
 * @param {Object} row - Table row object
 * @param {Array} terms - Array of search terms or arrays of term variants (all must match)
 * @returns {boolean} True if row matches all terms
 */
const rowMatchesAndGroup = (row, terms) => {
  return terms.every(term => {
    // If term is an array (permutation variants), check if ANY variant matches (OR)
    if (Array.isArray(term)) {
      return term.some(variant => {
        const lowerVariant = variant.toLowerCase();
        return Object.values(row).some(value =>
          String(value).toLowerCase().includes(lowerVariant)
        );
      });
    }

    // Single term (no permutation)
    const lowerTerm = term.toLowerCase();
    return Object.values(row).some(value =>
      String(value).toLowerCase().includes(lowerTerm)
    );
  });
};

/**
 * Check if a row matches the query (OR of AND groups)
 * @param {Object} row - Table row object
 * @param {Array} groups - Array of AND groups
 * @returns {boolean} True if row matches any group
 */
const rowMatchesQuery = (row, groups) => {
  if (groups.length === 0) return false;

  // Row matches if it matches ANY of the OR groups
  return groups.some(group => rowMatchesAndGroup(row, group));
};

/**
 * Parse a query string into tokens by detecting AND/OR keywords
 * Handles quoted strings to escape keywords
 * @param {string} queryString - The search query string
 * @returns {Array} Array of token objects {type: 'term'|'keyword', value: string}
 */
const parseQueryString = (queryString) => {
  const tokens = [];
  const quotedRegex = /"([^"]*)"/g;
  let remaining = queryString;
  let match;
  let lastIndex = 0;

  // Extract quoted strings first
  const quotedParts = [];
  while ((match = quotedRegex.exec(queryString)) !== null) {
    quotedParts.push({
      start: match.index,
      end: match.index + match[0].length,
      value: match[1]
    });
  }

  // Build tokens by processing non-quoted and quoted parts
  let currentPos = 0;
  quotedParts.forEach(quoted => {
    // Process non-quoted part before this quote
    if (quoted.start > currentPos) {
      const nonQuoted = queryString.substring(currentPos, quoted.start);
      const words = nonQuoted.trim().split(/\s+/).filter(w => w);
      words.forEach(word => {
        const lower = word.toLowerCase();
        if (lower === 'and' || lower === 'or') {
          tokens.push({ type: 'keyword', value: lower });
        } else {
          tokens.push({ type: 'term', value: word });
        }
      });
    }
    // Add quoted part as a term
    if (quoted.value) {
      tokens.push({ type: 'term', value: quoted.value });
    }
    currentPos = quoted.end;
  });

  // Process remaining non-quoted part
  if (currentPos < queryString.length) {
    const remaining = queryString.substring(currentPos);
    const words = remaining.trim().split(/\s+/).filter(w => w);
    words.forEach(word => {
      const lower = word.toLowerCase();
      if (lower === 'and' || lower === 'or') {
        tokens.push({ type: 'keyword', value: lower });
      } else {
        tokens.push({ type: 'term', value: word });
      }
    });
  }

  return tokens;
};

/**
 * Search through table data for matching values
 * @param {Array} tables - Array of table objects
 * @param {string|Object} query - Search query string OR object with {tokens, currentInput}
 * @param {string} permutationId - Optional permutation to apply to search terms
 * @returns {Array} Filtered tables with matching data
 */
export const searchTables = (tables, query, permutationId = 'none') => {
  // Handle empty query
  if (!query) return tables;

  let tokens = [];
  let currentInput = '';

  // Handle string queries (parse for AND/OR keywords)
  if (typeof query === 'string') {
    if (!query.trim()) return tables;
    tokens = parseQueryString(query);
  } else {
    // Handle token-based queries
    tokens = query.tokens || [];
    currentInput = query.currentInput || '';
  }

  // If no tokens and no input, return all tables
  if (tokens.length === 0 && !currentInput.trim()) {
    return tables;
  }

  // Parse tokens into OR groups
  const groups = parseTokensToGroups(tokens);

  // If there's current input, parse it and add to groups
  if (currentInput.trim()) {
    const inputTokens = parseQueryString(currentInput);
    const inputGroups = parseTokensToGroups(inputTokens);
    groups.push(...inputGroups);
  }

  // Apply permutations to expand terms
  const { expandedGroups } = expandGroupsWithPermutations(groups, permutationId);

  // Filter tables
  return tables
    .map(table => {
      const filteredData = table.data.filter(row =>
        rowMatchesQuery(row, expandedGroups)
      );

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
 * @param {string} permutationId - Optional permutation to apply to search terms
 * @returns {Array} Filtered and searched tables
 */
export const applySearchAndFilters = (tables, query, filters, permutationId = 'none') => {
  let result = tables;

  // Apply filters first
  if (filters && Object.keys(filters).length > 0) {
    result = filterTables(result, filters);
  }

  // Then apply search with permutations
  if (query && query.trim()) {
    result = searchTables(result, query, permutationId);
  }

  return result;
};

/**
 * Get expanded query information for display purposes
 * Returns the original terms and their permuted variants
 * @param {string} query - Search query string
 * @param {string} permutationId - The permutation ID to apply
 * @returns {Object} Object with original terms and their variants
 */
export const getExpandedQueryInfo = (query, permutationId) => {
  if (!query || !permutationId || permutationId === 'none') {
    return null;
  }

  const tokens = parseQueryString(query);
  const groups = parseTokensToGroups(tokens);
  const { allVariants } = expandGroupsWithPermutations(groups, permutationId);

  return allVariants;
};

/**
 * Highlight matching text in search results
 * Supports both simple queries and complex AND/OR queries with permutations
 * @param {string} text - Text to highlight
 * @param {string|Object} query - Search query (string or {tokens, currentInput})
 * @param {string} permutationId - Optional permutation to apply to search terms
 * @returns {Array} Array of text parts with highlighting info
 */
export const highlightText = (text, query, permutationId = 'none') => {
  if (!query || !text) return [{ text, highlight: false }];

  // Extract search terms from query (excluding keywords)
  let searchTerms = [];

  if (typeof query === 'string') {
    // Parse string query to extract terms
    const tokens = parseQueryString(query);
    searchTerms = tokens
      .filter(token => token.type === 'term')
      .map(token => token.value);
  } else {
    // Extract terms from token-based query
    const tokens = query.tokens || [];
    searchTerms = tokens
      .filter(token => token.type === 'term')
      .map(token => token.value);

    // Also include current input if present
    if (query.currentInput && query.currentInput.trim()) {
      searchTerms.push(query.currentInput.trim());
    }
  }

  if (searchTerms.length === 0) {
    return [{ text, highlight: false }];
  }

  // Expand search terms with permutations if applicable
  let allTermsToHighlight = searchTerms;
  if (permutationId && permutationId !== 'none') {
    allTermsToHighlight = [];
    searchTerms.forEach(term => {
      const variants = applyPermutation(term, permutationId);
      allTermsToHighlight.push(...variants);
    });
  }

  // Build regex pattern to match any of the search terms (including permutations)
  const escapedTerms = allTermsToHighlight.map(term =>
    term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const pattern = `(${escapedTerms.join('|')})`;
  const regex = new RegExp(pattern, 'gi');

  const parts = String(text).split(regex);
  return parts.map(part => {
    const shouldHighlight = allTermsToHighlight.some(term =>
      part.toLowerCase() === term.toLowerCase()
    );
    return {
      text: part,
      highlight: shouldHighlight
    };
  });
};

export default {
  searchTables,
  filterTables,
  applySearchAndFilters,
  highlightText,
  getExpandedQueryInfo
};
