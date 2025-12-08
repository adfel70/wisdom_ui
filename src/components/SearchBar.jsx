import React, { useState, useRef, useEffect } from 'react';
import { Box, Button } from '@mui/material';
import { Search as SearchIcon, ArrowForward } from '@mui/icons-material';
import { useTokenState } from '../hooks/useTokenState';
import { TRANSFORMATIONS } from '../utils/transformUtils';
import TokenList from './search/TokenList';
import SearchActions from './search/SearchActions';

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
  onQueryBuilderClick,
  variant = 'home', // 'home' or 'compact'
  placeholder = 'Search by Value (e.g., Name, ID, Location)...'
}) => {
  // UI-only state
  const [hoveredTokenIndex, setHoveredTokenIndex] = useState(null);
  const [transformValue, setTransformValue] = useState('');
  const inputRef = useRef(null);

  // Token state management from custom hook
  const {
    tokens,
    currentInput,
    hasTransformed,
    removeToken,
    clearAll,
    handleTransformChange: applyTransform,
    handleRevert,
    handleInputChange,
    handleKeyDown,
    handleSubmit,
  } = useTokenState(value, onChange, onSubmit);

  // Wrapper for transform dropdown to handle UI state
  const handleTransformChange = (e) => {
    const transformId = e.target.value;
    setTransformValue(''); // Reset dropdown to empty after selection
    applyTransform(transformId);
  };

  // Keyboard shortcuts for transformations
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only trigger if Ctrl is pressed and we're not in an input field
      if (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        const shortcutMap = {
          'a': 'reverse',
          'b': 'removeEven',
          'c': 'alternating'
        };

        if (shortcutMap[key]) {
          e.preventDefault();
          applyTransform(shortcutMap[key]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [applyTransform]);

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
          flex: 1,
          minWidth: 0,
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
        {/* Search Icon - pinned left */}
        <SearchIcon
          sx={{
            color: 'text.secondary',
            fontSize: isHome ? '1.125rem' : '1rem',
            flexShrink: 0,
          }}
        />

        {/* Token list with input field */}
        <TokenList
          tokens={tokens}
          currentInput={currentInput}
          hoveredTokenIndex={hoveredTokenIndex}
          onHoverChange={setHoveredTokenIndex}
          onRemoveToken={removeToken}
          onInputChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onQueryBuilderClick={onQueryBuilderClick}
          inputRef={inputRef}
          placeholder={placeholder}
          isHome={isHome}
        />

        {/* Search actions: clear, transform, revert */}
        <SearchActions
          showClear={tokens.length > 0 || currentInput.trim()}
          onClear={clearAll}
          hasTransformed={hasTransformed}
          onRevert={handleRevert}
          transformValue={transformValue}
          onTransformChange={handleTransformChange}
        />
      </Box>

      {/* Submit button */}
      <Button
        type="submit"
        variant="contained"
        endIcon={isHome ? <ArrowForward /> : <SearchIcon />}
        sx={{
          py: isHome ? 0.75 : 0.625,
          px: isHome ? 2 : 1.75,
          fontSize: isHome ? '0.8125rem' : '0.75rem',
          fontWeight: 600,
          flexShrink: 0,
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
