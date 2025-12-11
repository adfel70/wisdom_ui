import React, { useMemo } from 'react';
import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';

/**
 * Compact list of chips with "+N" overflow indicator.
 * Keeps render logic consistent across table cells.
 */
const CompactChipList = ({
  items = [],
  icon = null,
  maxVisible = 2,
  emptyPlaceholder = '—',
  tooltipPlacement = 'right',
  chipSx = {},
}) => {
  const list = useMemo(() => (Array.isArray(items) ? items.filter(Boolean) : []), [items]);
  if (list.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyPlaceholder}
      </Typography>
    );
  }

  const visible = list.slice(0, maxVisible);
  const extra = Math.max(list.length - maxVisible, 0);

  const renderIcon = () => {
    if (!icon) return undefined;
    return React.cloneElement(icon, {
      fontSize: 'inherit',
      sx: { fontSize: '0.9rem', ...icon.props?.sx },
    });
  };

  const renderChip = (label, idx) => (
    <Chip
      key={`${label}-${idx}`}
      label={label}
      size="small"
      variant="outlined"
      icon={renderIcon()}
      sx={{ fontSize: '0.7rem', height: 20, ...chipSx }}
    />
  );

  const tooltipContent = (
    <Stack spacing={0.5}>
      {list.map((label, idx) => (
        <Box key={`${label}-${idx}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {renderIcon()}
          <span>{label}</span>
        </Box>
      ))}
    </Stack>
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%' }}>
      <Stack
        direction="row"
        spacing={0.5}
        flexWrap="nowrap"
        gap={0.5}
        alignItems="center"
        sx={{
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        {visible.map(renderChip)}
        {extra > 0 && (
          <Tooltip placement={tooltipPlacement} arrow enterDelay={300} title={tooltipContent}>
            <Chip
              label={`+${extra}`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20, cursor: 'pointer', ...chipSx }}
            />
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
};

export default CompactChipList;

