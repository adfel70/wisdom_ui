/**
 * Token Parser Utilities
 * Pure functions for parsing search queries into structured tokens
 */

/**
 * Check if a word is a keyword (case-insensitive)
 * @param {string} word - Word to check
 * @returns {boolean} True if word is 'and' or 'or'
 */
export const isKeyword = (word) => {
  const lower = word.toLowerCase();
  return lower === 'and' || lower === 'or';
};

/**
 * Check if there's an unclosed quote in the input
 * @param {string} str - Input string to check
 * @returns {boolean} True if there's an odd number of quotes
 */
export const hasUnclosedQuote = (str) => {
  const quoteCount = (str.match(/"/g) || []).length;
  return quoteCount % 2 !== 0;
};

/**
 * Parse quoted strings and regular tokens from input
 * Handles commas as separators and preserves quoted strings
 * @param {string} input - Input string to parse
 * @returns {Array<{type: 'normal'|'quoted', value: string}>} Parsed parts
 */
export const parseInput = (input) => {
  // Replace commas with spaces (treat commas as separators)
  const normalized = input.replace(/,/g, ' ');

  // Handle quoted strings
  const quotedRegex = /"([^"]*)"/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = quotedRegex.exec(normalized)) !== null) {
    // Add non-quoted part before this quote
    if (match.index > lastIndex) {
      parts.push({ type: 'normal', value: normalized.substring(lastIndex, match.index) });
    }
    // Add quoted part
    parts.push({ type: 'quoted', value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining non-quoted part
  if (lastIndex < normalized.length) {
    parts.push({ type: 'normal', value: normalized.substring(lastIndex) });
  }

  return parts;
};

/**
 * Parse a value string into structured tokens
 * Handles quoted strings, keywords (AND/OR), parentheses, and regular terms
 * @param {string} str - Query string to parse
 * @returns {Array<{type: 'term'|'keyword'|'parenthesis', value: string, quoted?: boolean}>} Array of tokens
 */
export const parseValueToTokens = (str) => {
  const quotedRegex = /"([^"]*)"/g;
  const quotedParts = [];
  let match;

  // Extract quoted strings with their positions
  while ((match = quotedRegex.exec(str)) !== null) {
    quotedParts.push({
      start: match.index,
      end: match.index + match[0].length,
      value: match[1],
      quoted: true
    });
  }

  const tokens = [];
  let currentPos = 0;

  // Helper to parse non-quoted text
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

  // Process quoted and non-quoted parts
  quotedParts.forEach(quoted => {
    if (quoted.start > currentPos) {
      const nonQuoted = str.substring(currentPos, quoted.start);
      tokens.push(...parseNonQuoted(nonQuoted));
    }
    if (quoted.value) {
      tokens.push({ type: 'term', value: quoted.value, quoted: true });
    }
    currentPos = quoted.end;
  });

  // Process remaining text
  if (currentPos < str.length) {
    const remaining = str.substring(currentPos);
    tokens.push(...parseNonQuoted(remaining));
  }

  return tokens;
};
