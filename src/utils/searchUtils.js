/**
 * Search and filter utilities for database operations
 */

import { applyPermutation } from './permutationUtils';

/**
 * Expand all terms in groups with permutations
 * @param {Array} groups - Array of AND groups (each group is an array of terms)
 * @param {string} permutationId - The permutation to apply (e.g., 'reverse', 'double', 'none')
 * @param {Object} permutationParams - Parameters for the permutation function
 * @returns {Object} Object containing expanded groups and all variants for display
 */
const expandGroupsWithPermutations = (groups, permutationId, permutationParams = {}) => {
  if (!permutationId || permutationId === 'none') {
    return {
      expandedGroups: groups,
      allVariants: {}
    };
  }

  const allVariants = {}; // Track all variants for each original term
  const expandedGroups = groups.map(group => {
    return group.map(term => {
      const variants = applyPermutation(term, permutationId, permutationParams);
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
 * Parse a query string into tokens by detecting AND/OR keywords and parentheses
 * Handles quoted strings to escape keywords
 * @param {string} queryString - The search query string
 * @returns {Array} Array of token objects {type: 'term'|'keyword'|'parenthesis', value: string}
 */
const parseQueryString = (queryString) => {
  const tokens = [];
  const quotedRegex = /"([^"]*)"/g;
  let match;

  // Extract quoted strings first
  const quotedParts = [];
  while ((match = quotedRegex.exec(queryString)) !== null) {
    quotedParts.push({
      start: match.index,
      end: match.index + match[0].length,
      value: match[1]
    });
  }

  // Helper to parse non-quoted text (with parentheses support)
  const parseNonQuoted = (text) => {
    const result = [];
    let i = 0;
    let word = '';

    while (i < text.length) {
      const char = text[i];

      // Check for parentheses
      if (char === '(' || char === ')') {
        // Add accumulated word if any
        if (word.trim()) {
          const lower = word.trim().toLowerCase();
          if (lower === 'and' || lower === 'or') {
            result.push({ type: 'keyword', value: lower });
          } else {
            result.push({ type: 'term', value: word.trim() });
          }
          word = '';
        }
        // Add parenthesis token
        result.push({ type: 'parenthesis', value: char });
        i++;
      } else if (char === ' ' || char === '\t' || char === '\n') {
        // Whitespace - complete current word
        if (word.trim()) {
          const lower = word.trim().toLowerCase();
          if (lower === 'and' || lower === 'or') {
            result.push({ type: 'keyword', value: lower });
          } else {
            result.push({ type: 'term', value: word.trim() });
          }
          word = '';
        }
        i++;
      } else {
        word += char;
        i++;
      }
    }

    // Add final word if any
    if (word.trim()) {
      const lower = word.trim().toLowerCase();
      if (lower === 'and' || lower === 'or') {
        result.push({ type: 'keyword', value: lower });
      } else {
        result.push({ type: 'term', value: word.trim() });
      }
    }

    return result;
  };

  // Build tokens by processing non-quoted and quoted parts
  let currentPos = 0;
  quotedParts.forEach(quoted => {
    // Process non-quoted part before this quote
    if (quoted.start > currentPos) {
      const nonQuoted = queryString.substring(currentPos, quoted.start);
      tokens.push(...parseNonQuoted(nonQuoted));
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
    tokens.push(...parseNonQuoted(remaining));
  }

  return tokens;
};

/**
 * Parse tokens into an Abstract Syntax Tree (AST) that supports nested parentheses
 * AST nodes can be:
 * - {type: 'term', value: string} - a search term
 * - {type: 'and', left: node, right: node} - AND operation
 * - {type: 'or', left: node, right: node} - OR operation
 * @param {Array} tokens - Array of token objects
 * @returns {Object} AST root node
 */
const parseTokensToAST = (tokens) => {
  if (tokens.length === 0) return null;

  let index = 0;

  // Parse OR expression (lowest precedence)
  const parseOr = () => {
    let left = parseAnd();

    while (index < tokens.length && tokens[index].type === 'keyword' && tokens[index].value === 'or') {
      index++; // consume 'or'
      const right = parseAnd();
      left = { type: 'or', left, right };
    }

    return left;
  };

  // Parse AND expression (higher precedence than OR)
  const parseAnd = () => {
    let left = parsePrimary();

    while (index < tokens.length && tokens[index].type === 'keyword' && tokens[index].value === 'and') {
      index++; // consume 'and'
      const right = parsePrimary();
      left = { type: 'and', left, right };
    }

    return left;
  };

  // Parse primary expression (term or parenthesized expression)
  const parsePrimary = () => {
    // Handle parentheses
    if (index < tokens.length && tokens[index].type === 'parenthesis' && tokens[index].value === '(') {
      index++; // consume '('
      const expr = parseOr(); // Parse expression inside parentheses

      // Expect closing parenthesis
      if (index < tokens.length && tokens[index].type === 'parenthesis' && tokens[index].value === ')') {
        index++; // consume ')'
      }

      return expr;
    }

    // Handle term
    if (index < tokens.length && tokens[index].type === 'term') {
      const term = tokens[index];
      index++;
      return { type: 'term', value: term.value };
    }

    // Skip any unexpected tokens
    if (index < tokens.length) {
      index++;
      return parsePrimary();
    }

    return null;
  };

  return parseOr();
};

/**
 * Evaluate an AST node against a row to check if it matches
 * @param {Object} node - AST node
 * @param {Object} row - Table row object
 * @param {Array} expandedTerms - Optional expanded terms with permutations {original: [variants]}
 * @returns {boolean} True if row matches the node
 */
const evaluateAST = (node, row, expandedTerms = {}) => {
  if (!node) return true;

  if (node.type === 'term') {
    const term = node.value;

    // Check if we have expanded terms (permutations)
    if (expandedTerms[term]) {
      // Check if ANY permutation variant matches
      return expandedTerms[term].some(variant => {
        const lowerVariant = variant.toLowerCase();
        return Object.values(row).some(value =>
          String(value).toLowerCase().includes(lowerVariant)
        );
      });
    }

    // No permutation - check original term
    const lowerTerm = term.toLowerCase();
    return Object.values(row).some(value =>
      String(value).toLowerCase().includes(lowerTerm)
    );
  }

  if (node.type === 'and') {
    return evaluateAST(node.left, row, expandedTerms) && evaluateAST(node.right, row, expandedTerms);
  }

  if (node.type === 'or') {
    return evaluateAST(node.left, row, expandedTerms) || evaluateAST(node.right, row, expandedTerms);
  }

  return false;
};

/**
 * Extract all search terms from an AST
 * @param {Object} node - AST node
 * @returns {Array} Array of term strings
 */
const extractTermsFromAST = (node) => {
  if (!node) return [];

  if (node.type === 'term') {
    return [node.value];
  }

  if (node.type === 'and' || node.type === 'or') {
    return [...extractTermsFromAST(node.left), ...extractTermsFromAST(node.right)];
  }

  return [];
};

/**
 * Search through table data for matching values
 * @param {Array} tables - Array of table objects
 * @param {string|Object} query - Search query string OR object with {tokens, currentInput}
 * @param {string} permutationId - Optional permutation to apply to search terms
 * @param {Object} permutationParams - Optional parameters for the permutation function
 * @returns {Array} Filtered tables with matching data
 */
export const searchTables = (tables, query, permutationId = 'none', permutationParams = {}) => {
  // Handle empty query
  if (!query) return tables;

  let tokens = [];
  let currentInput = '';

  // Handle string queries (parse for AND/OR keywords and parentheses)
  if (typeof query === 'string') {
    if (!query.trim()) return tables;
    tokens = parseQueryString(query);
    console.log('[Search] Query:', query);
    console.log('[Search] Parsed tokens:', tokens);
  } else {
    // Handle token-based queries
    tokens = query.tokens || [];
    currentInput = query.currentInput || '';
  }

  // If no tokens and no input, return all tables
  if (tokens.length === 0 && !currentInput.trim()) {
    return tables;
  }

  // Parse tokens into AST (supports nested parentheses)
  const ast = parseTokensToAST(tokens);
  console.log('[Search] AST:', JSON.stringify(ast, null, 2));

  // If there's current input, parse it and combine with main AST using OR
  let finalAST = ast;
  if (currentInput.trim()) {
    const inputTokens = parseQueryString(currentInput);
    const inputAST = parseTokensToAST(inputTokens);
    if (inputAST) {
      finalAST = ast ? { type: 'or', left: ast, right: inputAST } : inputAST;
    }
  }

  if (!finalAST) return tables;

  // Extract all terms from AST and apply permutations
  const allTerms = extractTermsFromAST(finalAST);
  const expandedTerms = {};

  if (permutationId && permutationId !== 'none') {
    allTerms.forEach(term => {
      expandedTerms[term] = applyPermutation(term, permutationId, permutationParams);
    });
  }

  // Filter tables using AST evaluation
  return tables
    .map(table => {
      const filteredData = table.data.filter(row =>
        evaluateAST(finalAST, row, expandedTerms)
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
 * @param {Object} permutationParams - Optional parameters for the permutation function
 * @returns {Array} Filtered and searched tables
 */
export const applySearchAndFilters = (tables, query, filters, permutationId = 'none', permutationParams = {}) => {
  let result = tables;

  // Apply filters first
  if (filters && Object.keys(filters).length > 0) {
    result = filterTables(result, filters);
  }

  // Then apply search with permutations
  if (query && query.trim()) {
    result = searchTables(result, query, permutationId, permutationParams);
  }

  return result;
};

/**
 * Get expanded query information for display purposes
 * Returns the original terms and their permuted variants
 * @param {string} query - Search query string
 * @param {string} permutationId - The permutation ID to apply
 * @param {Object} permutationParams - Optional parameters for the permutation function
 * @returns {Object} Object with original terms and their variants
 */
export const getExpandedQueryInfo = (query, permutationId, permutationParams = {}) => {
  if (!query || !permutationId || permutationId === 'none') {
    return null;
  }

  const tokens = parseQueryString(query);
  const ast = parseTokensToAST(tokens);
  const allTerms = extractTermsFromAST(ast);

  const allVariants = {};
  allTerms.forEach(term => {
    allVariants[term] = applyPermutation(term, permutationId, permutationParams);
  });

  return allVariants;
};

/**
 * Highlight matching text in search results
 * Supports both simple queries and complex AND/OR queries with permutations
 * @param {string} text - Text to highlight
 * @param {string|Object} query - Search query (string or {tokens, currentInput})
 * @param {string} permutationId - Optional permutation to apply to search terms
 * @param {Object} permutationParams - Optional parameters for the permutation function
 * @returns {Array} Array of text parts with highlighting info
 */
export const highlightText = (text, query, permutationId = 'none', permutationParams = {}) => {
  if (!query || !text) return [{ text, highlight: false }];

  // Extract search terms from query (excluding keywords and parentheses)
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
      const inputTokens = parseQueryString(query.currentInput.trim());
      const inputTerms = inputTokens.filter(t => t.type === 'term').map(t => t.value);
      searchTerms.push(...inputTerms);
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
      const variants = applyPermutation(term, permutationId, permutationParams);
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
