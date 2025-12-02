import React, { useState, useRef } from 'react';
import { Box, Button, Select, MenuItem, IconButton, Tooltip } from '@mui/material';
import { Search as SearchIcon, ArrowForward, Undo, AutoAwesome, Close } from '@mui/icons-material';
import { TRANSFORMATIONS } from '../utils/transformUtils';
import { useTokenState } from '../hooks/useTokenState';

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

        {/* Scrollable middle section with tokens and input */}
        <Box
          onDoubleClick={() => {
            inputRef.current?.focus();
            onQueryBuilderClick?.();
          }}
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            overflowX: 'auto',
            minWidth: 0,
            '&::-webkit-scrollbar': {
              height: '6px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '3px',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
              },
            },
          }}
        >
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
                color: (token.type === 'keyword' || token.type === 'parenthesis') ? 'text.disabled' : 'text.primary',
                fontWeight: token.type === 'term' ? 500 : 400,
                cursor: token.type === 'term' ? 'pointer' : 'default',
                transition: 'all 0.2s',
                flexShrink: 0,
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
                  onDoubleClick={(e) => {
                    e.stopPropagation();
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
        </Box>

        {/* Pinned right section - Clear button and Transform */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            flexShrink: 0,
          }}
        >
          {/* Clear All button */}
          {(tokens.length > 0 || currentInput.trim()) && (
            <Tooltip title="Clear all">
              <IconButton
                onClick={clearAll}
                size="small"
                sx={{
                  color: 'text.secondary',
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
