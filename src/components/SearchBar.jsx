import React, { useState, useRef, useEffect } from 'react';
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
  const [hasTransformed, setHasTransformed] = useState(false);
  const [transformValue, setTransformValue] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize tokens from external value prop on mount
  useEffect(() => {
    if (!isInitialized && value && typeof value === 'string') {
      // Parse the value string into tokens
      const parseValueToTokens = (str) => {
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
            tokens.push({ type: 'term', value: quoted.value });
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
      };

      const parsedTokens = parseValueToTokens(value);
      setTokens(parsedTokens);
      setCurrentInput('');
      setIsInitialized(true);
    }
  }, [value, isInitialized]);

  // Check if a word is a keyword (case-insensitive)
  const isKeyword = (word) => {
    const lower = word.toLowerCase();
    return lower === 'and' || lower === 'or';
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
        // Quoted strings are anchored as-is
        newTokens.push({ type: 'term', value: part.value });
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
        if (prev.length > 0 && prev[prev.length - 1].type === 'term' && newTokens[0].type === 'term') {
          return [...prev, { type: 'keyword', value: 'or' }, ...newTokens];
        }
        return [...prev, ...newTokens];
      });
      setCurrentInput('');
      return true;
    }
    return false;
  };

  // Build query string from tokens for submission
  const buildQueryFromTokens = () => {
    return tokens.map(token => token.value).join(' ') + (currentInput ? ' ' + currentInput : '');
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
          if (prev.length > 0 && prev[prev.length - 1].type === 'term' && newTokens[0].type === 'term') {
            return [...prev, { type: 'keyword', value: 'or' }, ...newTokens];
          }
          return [...prev, ...newTokens];
        });
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
      setTokens(prev => prev.slice(0, -1));
      return;
    }
  };

  // Remove a specific token and its adjacent keyword
  const removeToken = (index) => {
    setTokens(prev => {
      const token = prev[index];

      if (token.type === 'term') {
        // If removing the first term and next token is a keyword, remove both
        if (index === 0 && prev.length > 1 && prev[1].type === 'keyword') {
          return prev.filter((_, i) => i !== 0 && i !== 1);
        }

        // If removing a non-first term with a preceding keyword, remove both
        if (index > 0 && prev[index - 1].type === 'keyword') {
          return prev.filter((_, i) => i !== index - 1 && i !== index);
        }
      }

      // Otherwise just remove the token
      return prev.filter((_, i) => i !== index);
    });
  };

  // Clear all tokens and input
  const clearAll = () => {
    setTokens([]);
    setCurrentInput('');
    // Don't reset isInitialized - we only want to initialize from value prop on mount
  };

  const handleTransformChange = (e) => {
    const transformId = e.target.value;

    // Reset dropdown to empty after selection
    setTransformValue('');

    if (!transformId) return;

    // Store original text before first transformation
    if (!hasTransformed) {
      setOriginalText(currentInput);
      setHasTransformed(true);
    }

    // Apply transformation to current input text (chainable)
    const transformed = applyTransformation(currentInput, transformId);
    setCurrentInput(transformed);
  };

  const handleRevert = () => {
    setCurrentInput(originalText);
    setOriginalText('');
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
          py: isHome ? 2 : 1,
          px: 2,
          gap: 1,
          minHeight: isHome ? 56 : 48,
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
            fontSize: isHome ? '1.5rem' : '1.25rem',
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
              fontSize: isHome ? '1rem' : '0.875rem',
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
            fontSize: isHome ? '1.125rem' : '1rem',
            fontFamily: 'inherit',
            color: 'inherit',
          }}
        />

        {/* Transform dropdown and revert button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
          {(tokens.length > 0 || currentInput.trim()) && (
            <Tooltip title="Clear all">
              <IconButton
                onClick={clearAll}
                size="small"
                sx={{
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: 'error.light',
                    color: 'error.main',
                  },
                }}
              >
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {hasTransformed && (
            <Tooltip title="Revert to original">
              <IconButton
                onClick={handleRevert}
                size="small"
                sx={{
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    color: 'primary.dark',
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

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          type="button"
          variant="outlined"
          onClick={onFilterClick}
          startIcon={<FilterList />}
          sx={{
            py: isHome ? 2 : 1.25,
            px: 3,
            whiteSpace: 'nowrap',
            minWidth: 'fit-content',
          }}
        >
          Filter Tables
        </Button>

        <Button
          type="submit"
          variant="contained"
          endIcon={isHome ? <ArrowForward /> : <SearchIcon />}
          sx={{
            py: isHome ? 2 : 1.25,
            px: isHome ? 4 : 3,
            fontSize: isHome ? '1rem' : '0.875rem',
            fontWeight: 600,
          }}
        >
          Search
        </Button>
      </Box>
    </Box>
  );
};

export default SearchBar;
