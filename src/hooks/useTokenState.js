import { useState, useEffect } from 'react';
import { parseValueToTokens, parseInput, hasUnclosedQuote, isKeyword } from '../utils/tokenParser';
import { cleanupTokens, removeEmptyParenthesisGroups } from '../utils/tokenValidator';
import { applyTransformation } from '../utils/transformUtils';

/**
 * Custom hook for managing token-based search state
 * Encapsulates all state logic for the SearchBar component
 *
 * @param {string} value - External value prop (e.g., from Query Builder)
 * @param {Function} onChange - Callback when tokens/input changes
 * @param {Function} onSubmit - Callback when search is executed
 * @returns {Object} Token state and handlers
 */
export const useTokenState = (value, onChange, onSubmit) => {
  const [tokens, setTokens] = useState([]); // Array of {type: 'term'|'keyword'|'parenthesis', value: string}
  const [currentInput, setCurrentInput] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [originalTokens, setOriginalTokens] = useState([]);
  const [hasTransformed, setHasTransformed] = useState(false);

  // Normalize whitespace for comparison to avoid infinite loops
  const normalize = (str) => str.trim().replace(/\s+/g, ' ');

  // Build query string from tokens
  const buildQueryFromTokens = () => {
    const tokenString = tokens.map(token => {
      // Wrap quoted terms in quotes to preserve them
      if (token.quoted) {
        return `"${token.value}"`;
      }
      // Parentheses and keywords
      return token.value;
    }).join(' ');
    return tokenString + (currentInput ? ' ' + currentInput : '');
  };

  // Update tokens when external value changes (e.g., from Query Builder)
  useEffect(() => {
    if (value && typeof value === 'string') {
      const currentQuery = buildQueryFromTokens();

      // Only re-parse if value is different from our current state
      // (normalized to avoid infinite loops from whitespace differences)
      if (normalize(value) !== normalize(currentQuery)) {
        const parsedTokens = parseValueToTokens(value);
        setTokens(cleanupTokens(parsedTokens));
        setCurrentInput('');
      }
    } else if (!value || value === '') {
      // Value is empty, clear tokens if we have any
      if (tokens.length > 0 || currentInput.trim()) {
        setTokens([]);
        setCurrentInput('');
      }
    }
  }, [value]);

  // Reset transform state when search bar becomes completely empty
  useEffect(() => {
    if (tokens.length === 0 && currentInput === '' && hasTransformed) {
      setOriginalText('');
      setOriginalTokens([]);
      setHasTransformed(false);
    }
  }, [tokens, currentInput, hasTransformed]);

  // Notify parent component of changes to keep state synchronized
  // Debounced to prevent excessive re-renders and improve typing performance
  useEffect(() => {
    if (onChange) {
      const timeoutId = setTimeout(() => {
        const query = buildQueryFromTokens().trim();
        onChange(query);
      }, 50); // 50ms debounce for smooth typing

      return () => clearTimeout(timeoutId);
    }
  }, [tokens, currentInput]);

  // Anchor current input as a term
  const anchorCurrentInput = () => {
    if (!currentInput.trim()) return false;

    const trimmed = currentInput.trim();
    const parsed = parseInput(trimmed);
    const newTokens = [];

    parsed.forEach(part => {
      if (part.type === 'quoted') {
        // Quoted strings are anchored as-is with a quoted flag
        newTokens.push({ type: 'term', value: part.value, quoted: true });
      } else {
        // Split by spaces and check for keywords
        const words = part.value.split(/\s+/).filter(w => w);
        words.forEach((word, index) => {
          if (isKeyword(word)) {
            newTokens.push({ type: 'keyword', value: word.toLowerCase() });
          } else {
            // Add 'or' before this term if:
            // 1. It's not the first word
            // 2. The previous token is not a keyword
            if (index > 0 && newTokens.length > 0 && newTokens[newTokens.length - 1].type !== 'keyword') {
              newTokens.push({ type: 'keyword', value: 'or' });
            }
            newTokens.push({ type: 'term', value: word });
          }
        });
      }
    });

    if (newTokens.length > 0) {
      setTokens(prev => {
        // Only insert 'or' if:
        // 1. There are existing tokens
        // 2. The last existing token is a term
        // 3. The first new token is a term (not a keyword)
        let combined;
        if (prev.length > 0 && prev[prev.length - 1].type === 'term' && newTokens[0].type === 'term') {
          combined = [...prev, { type: 'keyword', value: 'or' }, ...newTokens];
        } else {
          combined = [...prev, ...newTokens];
        }
        return cleanupTokens(combined);
      });
      setCurrentInput('');
      return true;
    }
    return false;
  };

  // Execute search with current tokens
  const executeSearch = () => {
    const query = buildQueryFromTokens().trim();
    if (query && onSubmit) {
      // Pass query string for backward compatibility
      onSubmit(query);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;

    // Check if user just typed a space after a keyword
    if (newValue.endsWith(' ')) {
      // Don't auto-parse if we're inside an open quote
      if (hasUnclosedQuote(newValue)) {
        setCurrentInput(newValue);
        return;
      }

      // Replace commas with spaces for parsing
      const normalized = newValue.replace(/,/g, ' ');
      const words = normalized.trim().split(/\s+/).filter(w => w);
      const lastWord = words[words.length - 1];

      if (isKeyword(lastWord) && words.length > 1) {
        // Auto-anchor: parse all words before the keyword, then add keyword
        const termsBeforeKeyword = words.slice(0, -1);
        const newTokens = [];

        // Process each word - could be a keyword or term
        termsBeforeKeyword.forEach((word, index) => {
          if (isKeyword(word)) {
            newTokens.push({ type: 'keyword', value: word.toLowerCase() });
          } else {
            // Add 'or' before this term if previous token is not a keyword
            if (index > 0 && newTokens.length > 0 && newTokens[newTokens.length - 1].type !== 'keyword') {
              newTokens.push({ type: 'keyword', value: 'or' });
            }
            newTokens.push({ type: 'term', value: word });
          }
        });

        // Add the final keyword
        newTokens.push({ type: 'keyword', value: lastWord.toLowerCase() });

        setTokens(prev => {
          // Only insert 'or' if:
          // 1. There are existing tokens
          // 2. The last existing token is a term
          // 3. The first new token is a term (not a keyword)
          let combined;
          if (prev.length > 0 && prev[prev.length - 1].type === 'term' && newTokens[0].type === 'term') {
            combined = [...prev, { type: 'keyword', value: 'or' }, ...newTokens];
          } else {
            combined = [...prev, ...newTokens];
          }
          return cleanupTokens(combined, false); // Don't remove trailing during auto-parse
        });
        setCurrentInput('');
        return;
      } else if (isKeyword(lastWord) && words.length === 1 && tokens.length > 0) {
        // Single keyword after existing tokens (e.g., typing "or " after pressing Enter)
        setTokens(prev => cleanupTokens([...prev, { type: 'keyword', value: lastWord.toLowerCase() }], false)); // Don't remove trailing during auto-parse
        setCurrentInput('');
        return;
      }
    }

    setCurrentInput(newValue);
  };

  // Handle key down events
  const handleKeyDown = (e) => {
    // Enter key
    if (e.key === 'Enter') {
      e.preventDefault();

      // If there's text to anchor, just anchor it
      if (currentInput.trim()) {
        anchorCurrentInput();
      } else if (tokens.length > 0) {
        // Nothing to anchor, execute search
        executeSearch();
      }
      return;
    }

    // Backspace key
    if (e.key === 'Backspace' && currentInput === '' && tokens.length > 0) {
      e.preventDefault();
      // Delete the last token
      setTokens(prev => cleanupTokens(prev.slice(0, -1)));
      return;
    }
  };

  // Remove a specific token and its adjacent keyword
  const removeToken = (index) => {
    setTokens(prev => {
      const token = prev[index];
      let filtered;

      if (token.type === 'term') {
        // If removing the first term and next token is a keyword, remove both
        if (index === 0 && prev.length > 1 && prev[1].type === 'keyword') {
          filtered = prev.filter((_, i) => i !== 0 && i !== 1);
        }
        // If removing a non-first term with a preceding keyword, remove both
        else if (index > 0 && prev[index - 1].type === 'keyword') {
          filtered = prev.filter((_, i) => i !== index - 1 && i !== index);
        }
        // Otherwise just remove the token
        else {
          filtered = prev.filter((_, i) => i !== index);
        }
      } else {
        // Otherwise just remove the token
        filtered = prev.filter((_, i) => i !== index);
      }

      // Clean up and check for empty parenthesis groups
      const cleaned = cleanupTokens(filtered);
      return removeEmptyParenthesisGroups(cleaned);
    });
  };

  // Clear all tokens and input
  const clearAll = () => {
    setTokens([]);
    setCurrentInput('');
    // Reset transform state when clearing
    setOriginalText('');
    setOriginalTokens([]);
    setHasTransformed(false);
  };

  // Apply transformation to tokens and current input
  const handleTransformChange = (transformId) => {
    if (!transformId) return;

    // Store original text and tokens before first transformation
    if (!hasTransformed) {
      setOriginalText(currentInput);
      setOriginalTokens(tokens);
      setHasTransformed(true);
    }

    // Apply transformation to each token separately (only term tokens, not keywords)
    const transformedTokens = tokens.map(token => {
      if (token.type === 'term') {
        return {
          ...token,
          value: applyTransformation(token.value, transformId)
        };
      }
      return token; // Keep keywords unchanged
    });
    setTokens(cleanupTokens(transformedTokens));

    // Apply transformation to current input text (chainable)
    const transformed = applyTransformation(currentInput, transformId);
    setCurrentInput(transformed);
  };

  // Revert to original state before transformations
  const handleRevert = () => {
    setCurrentInput(originalText);
    setTokens(cleanupTokens(originalTokens));
    setOriginalText('');
    setOriginalTokens([]);
    setHasTransformed(false);
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    // Anchor current input and search
    anchorCurrentInput();
    // Small delay to let state update
    setTimeout(executeSearch, 0);
  };

  return {
    tokens,
    currentInput,
    setCurrentInput,
    hasTransformed,
    buildQueryFromTokens,
    anchorCurrentInput,
    removeToken,
    clearAll,
    handleTransformChange,
    handleRevert,
    handleInputChange,
    handleKeyDown,
    executeSearch,
    handleSubmit,
  };
};
