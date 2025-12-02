/**
 * Token Validator Utilities
 * Pure functions for cleaning up and validating token sequences
 */

/**
 * Clean up tokens by removing invalid sequences
 * Removes leading/trailing keywords and consecutive keywords
 * @param {Array<{type: string, value: string}>} tokens - Array of tokens to clean
 * @param {boolean} removeTrailing - Whether to remove trailing keywords (default: true)
 * @returns {Array<{type: string, value: string}>} Cleaned token array
 */
export const cleanupTokens = (tokens, removeTrailing = true) => {
  if (tokens.length === 0) return tokens;

  let cleaned = [...tokens];

  // Remove leading keywords
  while (cleaned.length > 0 && cleaned[0].type === 'keyword') {
    cleaned.shift();
  }

  // Remove trailing keywords (optional - skip during auto-parsing)
  if (removeTrailing) {
    while (cleaned.length > 0 && cleaned[cleaned.length - 1].type === 'keyword') {
      cleaned.pop();
    }
  }

  // Remove consecutive keywords (keep first, remove rest)
  const result = [];
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i].type === 'keyword' && i > 0 && result[result.length - 1].type === 'keyword') {
      // Skip this keyword (it's consecutive to the previous one)
      continue;
    }
    result.push(cleaned[i]);
  }

  return result;
};

/**
 * Remove empty parenthesis groups from token array
 * Recursively removes () or groups containing only keywords
 * @param {Array<{type: string, value: string}>} tokens - Array of tokens to process
 * @returns {Array<{type: string, value: string}>} Tokens with empty groups removed
 */
export const removeEmptyParenthesisGroups = (tokens) => {
  let result = [...tokens];
  let changed = true;

  // Keep iterating until no more empty groups are found
  while (changed) {
    changed = false;
    const newResult = [];

    for (let i = 0; i < result.length; i++) {
      const token = result[i];

      // Check if this is an opening parenthesis
      if (token.type === 'parenthesis' && token.value === '(') {
        // Find the matching closing parenthesis
        let depth = 1;
        let closingIndex = -1;

        for (let j = i + 1; j < result.length; j++) {
          if (result[j].type === 'parenthesis') {
            if (result[j].value === '(') {
              depth++;
            } else if (result[j].value === ')') {
              depth--;
              if (depth === 0) {
                closingIndex = j;
                break;
              }
            }
          }
        }

        // If we found a matching closing parenthesis
        if (closingIndex !== -1) {
          // Extract tokens between parentheses
          const innerTokens = result.slice(i + 1, closingIndex);

          // Check if group is empty or contains only keywords
          const hasTerms = innerTokens.some(t => t.type === 'term');

          if (!hasTerms) {
            // Skip the opening paren, inner tokens, and closing paren
            changed = true;
            i = closingIndex; // Skip to closing paren (loop will increment)
            continue;
          }
        }
      }

      newResult.push(token);
    }

    result = newResult;
  }

  return result;
};
