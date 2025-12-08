/**
 * Search and filter utilities for database operations
 * Updated to handle JSON query format:
 * [
 *   { type: 'clause', content: { value: string, bdt: string|null } },
 *   { type: 'operator', content: { operator: 'AND'|'OR' } },
 *   { type: 'subQuery', content: { elements: [...] } }
 * ]
 */

import { applyPermutation } from './permutationUtils';

/**
 * Evaluate a JSON query element against a row
 * @param {Object} element - Query element (clause, operator, or subQuery)
 * @param {Object} row - Table row object
 * @param {Object} metadata - Table metadata (for bdt filtering)
 * @param {Object} expandedTerms - Optional expanded terms with permutations {original: [variants]}
 * @returns {boolean|null} True if matches, false if doesn't match, null for operators
 */
const evaluateElement = (element, row, metadata, expandedTerms = {}) => {
  if (element.type === 'clause') {
    const { value, bdt } = element.content;

    // For Phase 1, bdt is always null - search all fields
    // Later, bdt will filter to specific column types

    // Check if we have expanded terms (permutations)
    if (expandedTerms[value]) {
      // Check if ANY permutation variant matches
      return expandedTerms[value].some(variant => {
        const lowerVariant = variant.toLowerCase();
        return Object.values(row).some(fieldValue =>
          String(fieldValue).toLowerCase().includes(lowerVariant)
        );
      });
    }

    // No permutation - check original term
    const lowerTerm = value.toLowerCase();
    return Object.values(row).some(fieldValue =>
      String(fieldValue).toLowerCase().includes(lowerTerm)
    );
  }

  if (element.type === 'operator') {
    // Operators don't evaluate - they're handled by evaluateQueryElements
    return null;
  }

  if (element.type === 'subQuery') {
    // Recursively evaluate the subquery
    return evaluateQueryElements(element.content.elements, row, metadata, expandedTerms);
  }

  return false;
};

/**
 * Evaluate a JSON query array against a row
 * Processes clauses, operators, and subQueries in sequence
 * @param {Array} elements - Array of query elements
 * @param {Object} row - Table row object
 * @param {Object} metadata - Table metadata
 * @param {Object} expandedTerms - Optional expanded terms with permutations
 * @returns {boolean} True if row matches the query
 */
const evaluateQueryElements = (elements, row, metadata, expandedTerms = {}) => {
  if (!elements || elements.length === 0) return true;

  let result = null;
  let pendingOperator = null;

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];

    if (element.type === 'operator') {
      pendingOperator = element.content.operator;
      continue;
    }

    // Evaluate this element
    const elementResult = evaluateElement(element, row, metadata, expandedTerms);

    if (result === null) {
      // First element - just store the result
      result = elementResult;
    } else if (pendingOperator) {
      // Apply the operator
      if (pendingOperator === 'AND') {
        result = result && elementResult;
      } else if (pendingOperator === 'OR') {
        result = result || elementResult;
      }
      pendingOperator = null;
    }
  }

  return result !== null ? result : true;
};

/**
 * Extract all search terms from a JSON query
 * @param {Array} elements - Array of query elements
 * @returns {Array} Array of term strings
 */
const extractTermsFromQuery = (elements) => {
  const terms = [];

  if (!elements || !Array.isArray(elements)) return terms;

  for (const element of elements) {
    if (element.type === 'clause') {
      terms.push(element.content.value);
    } else if (element.type === 'subQuery') {
      terms.push(...extractTermsFromQuery(element.content.elements));
    }
  }

  return terms;
};

/**
 * Convert JSON query array to a display string
 * For showing in the search input field
 * @param {Array} queryJSON - JSON query array
 * @returns {string} Display string (e.g., "john AND marketing")
 */
export const queryJSONToString = (queryJSON) => {
  if (!queryJSON || !Array.isArray(queryJSON) || queryJSON.length === 0) {
    return '';
  }

  const buildString = (elements) => {
    const parts = [];

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      if (element.type === 'clause') {
        parts.push(element.content.value);
      } else if (element.type === 'operator') {
        parts.push(element.content.operator);
      } else if (element.type === 'subQuery') {
        const subString = buildString(element.content.elements);
        parts.push(`(${subString})`);
      }
    }

    return parts.join(' ');
  };

  return buildString(queryJSON);
};

/**
 * Convert a query string to JSON query array
 * Simple parser for basic AND/OR queries with parentheses
 * @param {string} queryString - Query string (e.g., "john AND marketing")
 * @returns {Array} JSON query array
 */
export const queryStringToJSON = (queryString) => {
  if (!queryString || !queryString.trim()) {
    return [];
  }

  // Use the existing parseQueryString and parseTokensToAST functions
  const tokens = parseQueryString(queryString);

  // Convert tokens to JSON format
  const convertTokensToJSON = (tokens) => {
    const elements = [];
    let i = 0;
    const stack = [elements]; // Stack to handle nested groups

    while (i < tokens.length) {
      const token = tokens[i];
      const currentElements = stack[stack.length - 1];

      if (token.type === 'term') {
        currentElements.push({
          type: 'clause',
          content: {
            value: token.value,
            bdt: null
          }
        });
      } else if (token.type === 'keyword') {
        currentElements.push({
          type: 'operator',
          content: {
            operator: token.value.toUpperCase()
          }
        });
      } else if (token.type === 'parenthesis' && token.value === '(') {
        // Start a new subQuery
        const subElements = [];
        stack.push(subElements);
      } else if (token.type === 'parenthesis' && token.value === ')') {
        // Close the subQuery
        if (stack.length > 1) {
          const subElements = stack.pop();
          const parentElements = stack[stack.length - 1];
          parentElements.push({
            type: 'subQuery',
            content: {
              elements: subElements
            }
          });
        }
      }

      i++;
    }

    return elements;
  };

  return convertTokensToJSON(tokens);
};

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
 * @param {Array} query - JSON query array format
 * @param {string} permutationId - Optional permutation to apply to search terms
 * @param {Object} permutationParams - Optional parameters for the permutation function
 * @returns {Array} Filtered tables with matching data
 */
export const searchTables = (tables, query, permutationId = 'none', permutationParams = {}) => {
  // Handle empty query
  if (!query || !Array.isArray(query) || query.length === 0) {
    return tables;
  }

  // Extract all terms from query and apply permutations
  const allTerms = extractTermsFromQuery(query);
  const expandedTerms = {};

  if (permutationId && permutationId !== 'none') {
    allTerms.forEach(term => {
      expandedTerms[term] = applyPermutation(term, permutationId, permutationParams);
    });
  }

  // Filter tables using query evaluation
  return tables
    .map(table => {
      const filteredData = table.data.filter(row =>
        evaluateQueryElements(query, row, table, expandedTerms)
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
 * @param {Array} query - JSON query array
 * @param {string} permutationId - The permutation ID to apply
 * @param {Object} permutationParams - Optional parameters for the permutation function
 * @returns {Object} Object with original terms and their variants
 */
export const getExpandedQueryInfo = (query, permutationId, permutationParams = {}) => {
  if (!query || !Array.isArray(query) || query.length === 0 || !permutationId || permutationId === 'none') {
    return null;
  }

  const allTerms = extractTermsFromQuery(query);

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
 * @param {Array} query - JSON query array
 * @param {string} permutationId - Optional permutation to apply to search terms
 * @param {Object} permutationParams - Optional parameters for the permutation function
 * @returns {Array} Array of text parts with highlighting info
 */
export const highlightText = (text, query, permutationId = 'none', permutationParams = {}) => {
  if (!query || !Array.isArray(query) || query.length === 0 || !text) {
    return [{ text, highlight: false }];
  }

  // Extract search terms from JSON query
  const searchTerms = extractTermsFromQuery(query);

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
  getExpandedQueryInfo,
  queryJSONToString,
  queryStringToJSON
};
