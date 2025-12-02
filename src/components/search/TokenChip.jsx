import React from 'react';
import { Box } from '@mui/material';
import { Close } from '@mui/icons-material';

/**
 * TokenChip Component
 * Displays a single token (term, keyword, or parenthesis) with optional remove button
 *
 * @param {Object} token - Token object {type: 'term'|'keyword'|'parenthesis', value: string, quoted?: boolean}
 * @param {number} index - Token index in the array
 * @param {boolean} isHovered - Whether this token is currently hovered
 * @param {Function} onHoverChange - Callback when hover state changes
 * @param {Function} onRemove - Callback when token is removed
 * @param {boolean} isHome - Whether using home variant (affects sizing)
 */
const TokenChip = ({
  token,
  index,
  isHovered,
  onHoverChange,
  onRemove,
  isHome = true
}) => {
  const isTerm = token.type === 'term';
  const isKeywordOrParen = token.type === 'keyword' || token.type === 'parenthesis';

  return (
    <Box
      onMouseEnter={() => isTerm && onHoverChange(index)}
      onMouseLeave={() => onHoverChange(null)}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: isTerm ? 1 : 0.5,
        py: 0.5,
        backgroundColor: isTerm ? '#f0f7ff' : 'transparent',
        border: isTerm ? '1px solid' : 'none',
        borderColor: isTerm ? '#d0e4f7' : 'transparent',
        borderRadius: isTerm ? 1 : 0,
        fontSize: isHome ? '0.875rem' : '0.8125rem',
        color: isKeywordOrParen ? 'text.disabled' : 'text.primary',
        fontWeight: isTerm ? 500 : 400,
        cursor: isTerm ? 'pointer' : 'default',
        transition: 'all 0.2s',
        flexShrink: 0,
        '&:hover': isTerm ? {
          backgroundColor: '#e3f2fd',
          borderColor: '#90caf9',
        } : {},
      }}
    >
      {token.value}
      {isTerm && isHovered && (
        <Close
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
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
  );
};

export default TokenChip;
