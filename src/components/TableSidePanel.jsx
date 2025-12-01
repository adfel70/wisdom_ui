import React, { useMemo, memo } from 'react';
import {
  Paper,
  Box,
  Typography,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Stack,
  Skeleton
} from '@mui/material';
import { TableChart } from '@mui/icons-material';
import { getTablesMetadataForDatabase } from '../api/backend';

const PanelRow = memo(({ item, onSelect }) => {
  const handleClick = () => {
    onSelect?.(item.id);
  };

  return (
    <ListItemButton
      dense
      onClick={handleClick}
      selected={item.isVisible}
      sx={{
        borderRadius: 1.5,
        mb: 0.5,
        alignItems: 'flex-start',
        gap: 1.5,
        backgroundColor: item.isVisible ? 'action.selected' : 'transparent',
        '&.Mui-selected': {
          backgroundColor: 'action.selected',
        },
        '&.Mui-selected:hover': {
          backgroundColor: 'action.hover',
        }
      }}
    >
      <Box sx={{ minWidth: 28 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {item.position}
        </Typography>
      </Box>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TableChart sx={{ fontSize: '1rem', color: 'primary.main' }} />
            <Typography variant="body2" fontWeight={600} noWrap>
              {item.name}
            </Typography>
          </Box>
        }
        secondary={
          item.subtitle ? (
            <Typography variant="caption" color="text.secondary" noWrap>
              {item.subtitle}
            </Typography>
          ) : null
        }
        primaryTypographyProps={{ component: 'div' }}
        secondaryTypographyProps={{ component: 'div' }}
      />
      <Stack direction="row" spacing={0.5} alignItems="center">
        {item.isPending && (
          <Chip label="Loading" size="small" color="warning" variant="outlined" />
        )}
        {item.isVisible && !item.isPending && (
          <Chip label="Visible" size="small" color="primary" variant="outlined" />
        )}
      </Stack>
    </ListItemButton>
  );
});

PanelRow.displayName = 'PanelRow';

const PANEL_MAX_HEIGHT = 'calc(100vh - 140px)';

const TableSidePanel = ({
  databaseId,
  databaseName,
  tableIds = [],
  visibleTableIds = [],
  pendingTableIds = [],
  isSearching = false,
  onSelectTable
}) => {
  const metadataMap = useMemo(() => {
    if (!databaseId) return new Map();
    const metadata = getTablesMetadataForDatabase(databaseId) || [];
    return new Map(metadata.map(meta => [meta.id, meta]));
  }, [databaseId]);

  const visibleSet = useMemo(() => new Set(visibleTableIds), [visibleTableIds]);
  const pendingSet = useMemo(() => new Set(pendingTableIds), [pendingTableIds]);

  const panelItems = useMemo(() => {
    return (tableIds || []).map((id, index) => {
      const meta = metadataMap.get(id);
      const categories = meta?.categories?.slice(0, 2) || [];
      const subtitleParts = [];
      if (meta?.year) subtitleParts.push(meta.year);
      if (meta?.country) subtitleParts.push(meta.country);
      if (categories.length > 0) subtitleParts.push(categories.join(', '));

      return {
        id,
        position: index + 1,
        name: meta?.name || id,
        subtitle: subtitleParts.join(' • '),
        isVisible: visibleSet.has(id),
        isPending: pendingSet.has(id)
      };
    });
  }, [tableIds, metadataMap, visibleSet, pendingSet]);

  return (
    <Paper
      elevation={1}
      sx={{
        width: 320,
        flexShrink: 0,
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        alignSelf: 'flex-start',
        position: 'sticky',
        top: 96,
        maxHeight: PANEL_MAX_HEIGHT,
        borderRadius: 3,
        overflow: 'hidden'
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">
          Tables in {databaseName || databaseId?.toUpperCase()}
        </Typography>
        <Typography variant="h6" fontWeight={600}>
          Live Order
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {tableIds.length} table{tableIds.length === 1 ? '' : 's'} tracked
        </Typography>
      </Box>

      <Divider />

      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
        {isSearching ? (
          <Stack spacing={1}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton
                key={idx}
                variant="rounded"
                height={48}
                animation="wave"
                sx={{ borderRadius: 1.5 }}
              />
            ))}
          </Stack>
        ) : panelItems.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
              px: 2,
              color: 'text.secondary'
            }}
          >
            <Typography variant="body2" fontWeight={600} gutterBottom>
              No tables yet
            </Typography>
            <Typography variant="caption">
              Run a search or adjust filters to see tables listed here.
            </Typography>
          </Box>
        ) : (
          <List disablePadding dense>
            {panelItems.map(item => (
              <PanelRow key={item.id} item={item} onSelect={onSelectTable} />
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
};

export default TableSidePanel;

