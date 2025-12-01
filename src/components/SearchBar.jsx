import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, TextField, Button, InputAdornment, Select, MenuItem, IconButton, Tooltip, Chip } from '@mui/material';
import { Search as SearchIcon, FilterList, ArrowForward, Undo, AutoAwesome, Close } from '@mui/icons-material';
import { TRANSFORMATIONS, applyTransformation } from '../utils/transformUtils';

/**
 * SearchBar Component
 * Reusable search input with filter button and text transformation
 * Enhanced with token-based search supporting AND/OR operators
 */
const SearchBar = ({
  value,
  onChange,
  onSubmit,
  onFilterClick,
  variant = 'home', // 'home' or 'compact'
  placeholder = 'Search by Value (e.g., Name, ID, Location)...'
}) => {
  const [tokens, setTokens] = useState([]); // Array of {type: 'term'|'keyword', value: string}
  const [currentInput, setCurrentInput] = useState('');
  const [hoveredTokenIndex, setHoveredTokenIndex] = useState(null);
  const inputRef = useRef(null);

  const [originalText, setOriginalText] = useState('');
  const [originalTokens, setOriginalTokens] = useState([]);
  const [hasTransformed, setHasTransformed] = useState(false);
  const [transformValue, setTransformValue] = useState('');

  // Ref to track if we're updating from external value (to avoid infinite loops)
  const isUpdatingFromValueRef = useRef(false);
  const onChangeTimeoutRef = useRef(null);

  // Build query string from tokens - defined early so it can be used in effects
  const buildQueryFromTokens = useCallback(() => {
    const tokenString = tokens.map(token => {
      // Wrap quoted terms in quotes to preserve them
      if (token.quoted) {
        return `"${token.value}"`;
      }
      return token.value;
    }).join(' ');
    return tokenString + (currentInput ? ' ' + currentInput : '');
  }, [tokens, currentInput]);

  // Parse value string into tokens (helper function)
  const parseValueToTokens = useCallback((str) => {
    const quotedRegex = /"([^"]*)"/g;
    const quotedParts = [];
    let match;

    while ((match = quotedRegex.exec(str)) !== null) {
      quotedParts.push({
        start: match.index,
        end: match.index + match[0].length,
        value: match[1]
      });
    }

    const tokens = [];
    let currentPos = 0;

    quotedParts.forEach(quoted => {
      if (quoted.start > currentPos) {
        const nonQuoted = str.substring(currentPos, quoted.start);
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
      if (quoted.value) {
        tokens.push({ type: 'term', value: quoted.value, quoted: true });
      }
      currentPos = quoted.end;
    });

    if (currentPos < str.length) {
      const remaining = str.substring(currentPos);
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
  }, []);

  // Initialize tokens from external value prop on mount or when value changes
  useEffect(() => {
    // Only parse if value is provided and different from current state
    if (value && typeof value === 'string') {
      const currentQuery = buildQueryFromTokens().trim();

      // Only re-parse if the value is different from current query
      if (value !== currentQuery) {
        isUpdatingFromValueRef.current = true;
        const parsedTokens = parseValueToTokens(value);
        setTokens(cleanupTokens(parsedTokens));
        setCurrentInput('');
        // Reset flag after a short delay
        setTimeout(() => {
          isUpdatingFromValueRef.current = false;
        }, 100);
      }
    }
  }, [value, buildQueryFromTokens, parseValueToTokens]);

  // Reset transform state when search bar becomes completely empty
  useEffect(() => {
    if (tokens.length === 0 && currentInput === '' && hasTransformed) {
      setOriginalText('');
      setOriginalTokens([]);
      setHasTransformed(false);
    }
  }, [tokens, currentInput, hasTransformed]);

  // Notify parent component of changes with debouncing to prevent choppy typing
  useEffect(() => {
    // Don't notify if we're updating from external value (avoid infinite loop)
    if (isUpdatingFromValueRef.current) {
      return;
    }

    if (onChange) {
      // Clear existing timeout
      if (onChangeTimeoutRef.current) {
        clearTimeout(onChangeTimeoutRef.current);
      }

      // Debounce the onChange call to prevent excessive re-renders
      onChangeTimeoutRef.current = setTimeout(() => {
        const query = buildQueryFromTokens().trim();
        onChange(query);
      }, 150); // 150ms debounce
    }

    // Cleanup timeout on unmount
    return () => {
      if (onChangeTimeoutRef.current) {
        clearTimeout(onChangeTimeoutRef.current);
      }
    };
  }, [tokens, currentInput, onChange, buildQueryFromTokens]);

  // Check if a word is a keyword (case-insensitive)
  const isKeyword = (word) => {
    const lower = word.toLowerCase();
    return lower === 'and' || lower === 'or';
  };

  // Check if there's an unclosed quote in the input
  const hasUnclosedQuote = (str) => {
    const quoteCount = (str.match(/"/g) || []).length;
    return quoteCount % 2 !== 0;
  };

  // Clean up tokens: remove leading/trailing keywords and consecutive keywords
  const cleanupTokens = (tokens, removeTrailing = true) => {
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

  // Parse quoted strings and regular tokens
  const parseInput = (input) => {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    // Anchor current input and search
    anchorCurrentInput();
    // Small delay to let state update
    setTimeout(executeSearch, 0);
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

      return cleanupTokens(filtered);
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
    // Don't reset isInitialized - we only want to initialize from value prop on mount
  };

  const handleTransformChange = (e) => {
    const transformId = e.target.value;

    // Reset dropdown to empty after selection
    setTransformValue('');

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

  const handleRevert = () => {
    setCurrentInput(originalText);
    setTokens(cleanupTokens(originalTokens));
    setOriginalText('');
    setOriginalTokens([]);
    setHasTransformed(false);
  };

  const isHome = variant === 'home';

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        width: '100%',
      }}
    >
      {/* Custom search input with tokens */}
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          py: isHome ? 0.875 : 0.75,
          px: 1.25,
          gap: 0.75,
          minHeight: isHome ? 40 : 38,
          flexWrap: 'wrap',
          cursor: 'text',
          '&:hover': {
            borderColor: 'primary.main',
          },
          '&:focus-within': {
            borderColor: 'primary.main',
            outline: '2px solid',
            outlineColor: 'primary.light',
          },
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Search Icon */}
        <SearchIcon
          sx={{
            color: 'text.secondary',
            fontSize: isHome ? '1.125rem' : '1rem',
          }}
        />

        {/* Render tokens */}
        {tokens.map((token, index) => (
          <Box
            key={index}
            onMouseEnter={() => token.type === 'term' && setHoveredTokenIndex(index)}
            onMouseLeave={() => setHoveredTokenIndex(null)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: token.type === 'term' ? 1 : 0.5,
              py: 0.5,
              backgroundColor: token.type === 'term' ? '#f0f7ff' : 'transparent',
              border: token.type === 'term' ? '1px solid' : 'none',
              borderColor: token.type === 'term' ? '#d0e4f7' : 'transparent',
              borderRadius: token.type === 'term' ? 1 : 0,
              fontSize: isHome ? '0.875rem' : '0.8125rem',
              color: token.type === 'keyword' ? 'text.disabled' : 'text.primary',
              fontWeight: token.type === 'term' ? 500 : 400,
              cursor: token.type === 'term' ? 'pointer' : 'default',
              transition: 'all 0.2s',
              '&:hover': token.type === 'term' ? {
                backgroundColor: '#e3f2fd',
                borderColor: '#90caf9',
              } : {},
            }}
          >
            {token.value}
            {token.type === 'term' && hoveredTokenIndex === index && (
              <Close
                onClick={(e) => {
                  e.stopPropagation();
                  removeToken(index);
                }}
                sx={{
                  fontSize: '1rem',
                  cursor: 'pointer',
                  color: 'inherit',
                }}
              />
            )}
          </Box>
        ))}

        {/* Current input field */}
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={tokens.length === 0 ? placeholder : ''}
          style={{
            flex: 1,
            minWidth: '100px',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            fontSize: isHome ? '0.875rem' : '0.8125rem',
            fontFamily: 'inherit',
            color: 'inherit',
          }}
        />

        {/* Clear All button - before divider */}
        {(tokens.length > 0 || currentInput.trim()) && (
          <Tooltip title="Clear all">
            <IconButton
              onClick={clearAll}
              size="small"
              sx={{
                color: 'text.secondary',
                ml: 'auto',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(244, 67, 54, 0.08)',
                  color: 'error.main',
                  transform: 'scale(1.05)',
                },
              }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {/* Transform dropdown and revert button */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          ml: (tokens.length > 0 || currentInput.trim()) ? 0 : 'auto',
          borderLeft: '1px solid',
          borderColor: 'divider',
          pl: 1.5,
        }}>
          {hasTransformed && (
            <Tooltip title="Revert to original">
              <IconButton
                onClick={handleRevert}
                size="small"
                sx={{
                  color: 'primary.main',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    color: 'primary.dark',
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <Undo fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Select
            value={transformValue}
            onChange={handleTransformChange}
            displayEmpty
            size="small"
            renderValue={() => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <AutoAwesome sx={{ fontSize: '1rem' }} />
                <span>Transform</span>
              </Box>
            )}
            sx={{
              minWidth: 'fit-content',
              borderRadius: '12px',
              transition: 'all 0.2s',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider',
              },
              '& .MuiSelect-select': {
                py: 0.75,
                px: 1.5,
                fontSize: '0.875rem',
                color: 'text.primary',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
              },
              '&:hover': {
                backgroundColor: 'action.hover',
                transform: 'translateY(-1px)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                },
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
            }}
          >
            <MenuItem value="" disabled>
              Transform...
            </MenuItem>
            {TRANSFORMATIONS.map((transform) => (
              <MenuItem key={transform.id} value={transform.id}>
                {transform.label}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Box>

      <Button
        type="submit"
        variant="contained"
        endIcon={isHome ? <ArrowForward /> : <SearchIcon />}
        sx={{
          py: isHome ? 0.75 : 0.625,
          px: isHome ? 2 : 1.75,
          fontSize: isHome ? '0.8125rem' : '0.75rem',
          fontWeight: 600,
          transition: 'all 0.2s',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          },
        }}
      >
        Search
      </Button>
    </Box>
  );
};

export default SearchBar;
