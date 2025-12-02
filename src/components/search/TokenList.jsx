import React from 'react';
import { Box } from '@mui/material';
import TokenChip from './TokenChip';

/**
 * TokenList Component
 * Scrollable area containing token chips and the input field
 *
 * @param {Array} tokens - Array of token objects
 * @param {string} currentInput - Current input value
 * @param {number} hoveredTokenIndex - Index of currently hovered token
 * @param {Function} onHoverChange - Callback when token hover changes
 * @param {Function} onRemoveToken - Callback to remove a token
 * @param {Function} onInputChange - Callback when input changes
 * @param {Function} onKeyDown - Callback for keyboard events
 * @param {Function} onQueryBuilderClick - Callback for double-click (opens query builder)
 * @param {Object} inputRef - Ref for the input field
 * @param {string} placeholder - Input placeholder text
 * @param {boolean} isHome - Whether using home variant (affects sizing)
 */
const TokenList = ({
  tokens,
  currentInput,
  hoveredTokenIndex,
  onHoverChange,
  onRemoveToken,
  onInputChange,
  onKeyDown,
  onQueryBuilderClick,
  inputRef,
  placeholder,
  isHome = true
}) => {
  return (
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
        <TokenChip
          key={index}
          token={token}
          index={index}
          isHovered={hoveredTokenIndex === index}
          onHoverChange={onHoverChange}
          onRemove={onRemoveToken}
          isHome={isHome}
        />
      ))}

      {/* Current input field */}
      <input
        ref={inputRef}
        type="text"
        value={currentInput}
        onChange={onInputChange}
        onKeyDown={onKeyDown}
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
  );
};

export default TokenList;
