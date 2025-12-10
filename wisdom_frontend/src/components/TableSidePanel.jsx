import React, { useMemo, memo, useState, useCallback } from 'react';
import {
  Paper,
  Box,
  Typography,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Skeleton,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  TableChart,
  ChevronLeft,
  ChevronRight,
  PlaylistPlay,
  Build,
  Search,
  Clear,
  FilterList,
} from '@mui/icons-material';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { getTablesMetadataForDatabase } from '../api/backend';
import FilterPanel from './FilterPanel';

// Panel width constants
const PANEL_EXPANDED_WIDTH = 320;
const PANEL_COLLAPSED_WIDTH = 0;

const PANEL_TABS = [
  { value: 'tableList', label: 'Table List', icon: <PlaylistPlay /> },
  { value: 'filters', label: 'Filters', icon: <FilterList /> }
];

// Animated panel row with motion support for reordering
const PanelRow = memo(({ item, onSelect, isCollapsed }) => {
  const handleClick = () => {
    onSelect?.(item.id);
  };

  if (isCollapsed) {
    return;
  }

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
        backgroundColor: 'transparent',
        '&.Mui-selected': {
          backgroundColor: 'transparent',
        },
        '&.Mui-selected:hover': {
          backgroundColor: 'action.hover',
        },
      }}
    >
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
      />
    </ListItemButton>
  );
});

PanelRow.displayName = 'PanelRow';

// Animated wrapper for each row
const AnimatedPanelRow = memo(({ item, onSelect, isCollapsed }) => {
  return (
    <motion.div>
      <PanelRow item={item} onSelect={onSelect} isCollapsed={isCollapsed} />
    </motion.div>
  );
});

AnimatedPanelRow.displayName = 'AnimatedPanelRow';

const TableSidePanel = ({
  databaseId,
  databaseName,
  tableIds = [],
  visibleTableIds = [],
  pendingTableIds = [],
  isSearching = false,
  onSelectTable,
  isCollapsed = false,
  onToggleCollapse,
  topOffset = 280,
  appliedFilters = {},
  onApplyFilters,
  facetSearchQuery,
}) => {
  const [activeTab, setActiveTab] = useState(PANEL_TABS[0].value);
  const [searchQuery, setSearchQuery] = useState('');

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


  const handleTabChange = useCallback((_, value) => {
    setActiveTab(value);
    setSearchQuery(''); // Clear search when switching tabs
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return panelItems;
    const query = searchQuery.toLowerCase();
    return panelItems.filter(item => 
      (item.name || '').toLowerCase().includes(query) || 
      (item.subtitle || '').toLowerCase().includes(query)
    );
  }, [panelItems, searchQuery]);

  return (
    <Paper
      component={motion.div}
      layout
      elevation={isCollapsed ? 0 : 2}
      sx={{
        width: isCollapsed ? PANEL_COLLAPSED_WIDTH : PANEL_EXPANDED_WIDTH,
        flexShrink: 0,
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: topOffset,
        bottom: 0,
        zIndex: 50,
        borderRadius: 0,
        overflow: 'visible',
        boxShadow: isCollapsed ? 'none' : '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: 'background.paper',
      }}
    >
      {/* Drawer Tab Toggle */}
      <Box
        onClick={onToggleCollapse}
        sx={{
          position: 'absolute',
          left: '100%',
          top: 32,
          width: 24,
          height: 48,
          backgroundColor: 'background.paper',
          borderRadius: '0 8px 8px 0',
          border: '1px solid',
          borderColor: 'divider',
          borderLeft: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '4px 0 8px rgba(0,0,0,0.05)',
          '&:hover': {
            backgroundColor: 'action.hover',
            width: 28, // slight hover effect
          },
          transition: 'width 0.2s',
        }}
      >
        {isCollapsed ? <ChevronRight fontSize="small" color="action" /> : <ChevronLeft fontSize="small" color="action" />}
      </Box>

      {/* Header */}
      <Box
        sx={{
          p: 2,
          pb: 1.5,
          display: isCollapsed ? 'none' : 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          opacity: isCollapsed ? 0 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        {/* Database Label */}
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
              Tables in {databaseName || databaseId?.toUpperCase()}
            </Typography>

            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              allowScrollButtonsMobile
              aria-label="Table side panel tabs"
              sx={{
                mt: 1,
                minHeight: 36,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  minHeight: 36,
                  minWidth: 'auto',
                  px: 1.5,
                  fontSize: '0.8rem'
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: 3
                }
              }}
            >
              {PANEL_TABS.map(tab => (
                <Tab
                  key={tab.value}
                  label={tab.label}
                  value={tab.value}
                  icon={tab.icon}
                  iconPosition="start"
                  sx={{ gap: 0.5, '& .MuiSvgIcon-root': { fontSize: '1rem' } }}
                />
              ))}
            </Tabs>

            {/* Search Bar */}
            {activeTab === 'tableList' && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search tables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setSearchQuery('')}
                          edge="end"
                        >
                          <Clear fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                    sx: {
                      borderRadius: 1.5,
                      backgroundColor: 'action.hover',
                      '& fieldset': { border: 'none' },
                      '&:hover': { backgroundColor: 'action.selected' },
                      fontSize: '0.875rem'
                    }
                  }}
                />
              </Box>
            )}
          </motion.div>
      </Box>

      {!isCollapsed && <Divider />}

      {/* Content Area */}
      {!isCollapsed && (
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          p: 1,
          '&::-webkit-scrollbar': {
            width: 6
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'action.disabled',
            borderRadius: 3,
            '&:hover': {
              backgroundColor: 'action.active'
            }
          }
        }}
      >
        {activeTab === 'tableList' ? (
          isSearching ? (
            // Loading skeleton
            <Stack spacing={1}>
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton
                  key={idx}
                  variant="rounded"
                  height={48}
                  width={'100%'}
                  animation="wave"
                  sx={{ borderRadius: 1.5 }}
                />
              ))}
            </Stack>
          ) : filteredItems.length === 0 ? (
            // Empty state
            <Box
              sx={{
                textAlign: 'center',
                py: 4,
                px: 2,
                color: 'text.secondary'
              }}
            >
              <Typography variant="body2" fontWeight={600} gutterBottom>
                {searchQuery ? 'No matching tables' : 'No tables yet'}
              </Typography>
              <Typography variant="caption">
                {searchQuery 
                  ? 'Try adjusting your search terms.' 
                  : 'Run a search or adjust filters to see tables listed here.'}
              </Typography>
            </Box>
          ) : (
            // Table list with animations
            <LayoutGroup>
              <List disablePadding dense>
                <AnimatePresence>
                  {filteredItems.map(item => (
                    <AnimatedPanelRow
                      key={item.id}
                      item={item}
                      onSelect={onSelectTable}
                      isCollapsed={isCollapsed}
                    />
                  ))}
                </AnimatePresence>
              </List>
            </LayoutGroup>
          )
        ) : (
          <FilterPanel
            appliedFilters={appliedFilters}
            onApplyFilters={onApplyFilters}
            activeDatabase={databaseId}
            searchQuery={facetSearchQuery}
          />
        )}
      </Box>
      )}
    </Paper>
  );
};

export default TableSidePanel;
