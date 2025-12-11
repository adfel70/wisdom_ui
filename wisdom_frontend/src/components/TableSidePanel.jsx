import React, { useMemo, memo, useState, useCallback, useEffect, useRef } from 'react';
import {
  Paper,
  Box,
  Typography,
  Divider,
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
  Chip,
} from '@mui/material';
import {
  TableChart,
  ChevronLeft,
  ChevronRight,
  PlaylistPlay,
  Search,
  Clear,
  FilterList,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import FilterPanel from './FilterPanel';

// Panel width constants
const PANEL_EXPANDED_WIDTH = 320;
const PANEL_COLLAPSED_WIDTH = 0;

const PANEL_TABS = [
  { value: 'tableList', label: 'Tables', icon: <PlaylistPlay /> },
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

const isFacetValueActive = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).length > 0;
  }
  if (value && typeof value === 'object') {
    const objectValues = Object.values(value);
    if (objectValues.length === 0) return false;
    return objectValues.some(isFacetValueActive);
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized === 'all') return false;
  }
  return Boolean(value);
};

const TableSidePanel = ({
  tableIds = [],
  tableMetadata = new Map(),
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
  facetData = null,
}) => {
  const [activeTab, setActiveTab] = useState(PANEL_TABS[0].value);
  const [searchQuery, setSearchQuery] = useState('');
  const totalTables = tableIds?.length ?? 0;
  const listContainerRef = useRef(null);
  const [listHeight, setListHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const ROW_HEIGHT = 56;
  const OVERSCAN = 3; // smaller buffer to reduce extra rendering

  // Detect if any facet filters are currently applied for this database
  const hasActiveFacetFilters = useMemo(() => {
    const filters = appliedFilters || {};
    return Object.values(filters).some(isFacetValueActive);
  }, [appliedFilters]);

  const visibleSet = useMemo(() => new Set(visibleTableIds), [visibleTableIds]);
  const pendingSet = useMemo(() => new Set(pendingTableIds), [pendingTableIds]);

  const panelItems = useMemo(() => {
    return (tableIds || []).map((id, index) => {
      const meta = tableMetadata.get(id);
      const subtitleParts = [];
      if (meta?.year) subtitleParts.push(meta.year);
      if (meta?.country) subtitleParts.push(meta.country);
      if (meta?.dbName || meta?.dbId) subtitleParts.push(meta.dbName || meta.dbId);

      return {
        id,
        position: index + 1,
        name: meta?.name || id,
        subtitle: subtitleParts.join(' • '),
        isVisible: visibleSet.has(id),
        isPending: pendingSet.has(id)
      };
    });
  }, [tableIds, tableMetadata, visibleSet, pendingSet]);


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

  const totalRows = filteredItems.length;
  const effectiveHeight = listHeight || 360;
  const visibleCount = Math.ceil(effectiveHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(totalRows, startIndex + visibleCount);
  const offsetY = startIndex * ROW_HEIGHT;
  const visibleItems = filteredItems.slice(startIndex, endIndex);
  const spacerHeight = totalRows * ROW_HEIGHT;

  // Measure available height for virtualization
  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const update = () => {
      const h = el.clientHeight || 0;
      if (h > 0) setListHeight(h);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Row = useCallback(
    ({ index, style, data }) => {
      const item = data.items[index];
      if (!item) return null;
      return (
        <div style={style}>
          <PanelRow item={item} onSelect={data.onSelectTable} isCollapsed={false} />
        </div>
      );
    },
    []
  );

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
        {isCollapsed && hasActiveFacetFilters && (
          <Box
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'error.main',
              boxShadow: (theme) => `0 0 0 2px ${theme.palette.background.paper}`,
            }}
          />
        )}
        {isCollapsed ? <ChevronRight fontSize="small" color="action" /> : <ChevronLeft fontSize="small" color="action" />}
      </Box>

      {/* Header */}
      <Box
        sx={{
          p: 1.5,
          pb: 1,
          display: isCollapsed ? 'none' : 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          opacity: isCollapsed ? 0 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="fullWidth"
              centered
              aria-label="Table side panel tabs"
              sx={{
                mt: 0,
                minHeight: 40,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  minHeight: 40,
                  minWidth: 'auto',
                  px: 2,
                  fontSize: '0.85rem',
                  justifyContent: 'center'
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
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box component="span">{tab.label}</Box>
                      {tab.value === 'tableList' && (
                        <Chip
                          label={totalTables}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{
                            height: 18,
                            minWidth: 18,
                            fontSize: '0.7rem',
                            px: 0.5,
                            fontWeight: 700,
                            lineHeight: 1,
                          }}
                        />
                      )}
                      {tab.value === 'filters' && hasActiveFacetFilters && (
                        <Box
                          component="span"
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'error.main',
                            boxShadow: (theme) => `0 0 0 2px ${theme.palette.background.paper}`,
                          }}
                        />
                      )}
                    </Box>
                  }
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
      <Box
        ref={listContainerRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          p: 1,
          opacity: isCollapsed ? 0 : 1,
          transition: 'opacity 0.2s',
          pointerEvents: isCollapsed ? 'none' : 'auto',
        }}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        {activeTab === 'tableList' ? (
          isSearching ? (
            <Stack spacing={1}>
              {Array.from({ length: 10 }).map((_, idx) => (
                <Skeleton
                  key={idx}
                  variant="rounded"
                  height={48}
                  width={'100%'}
                  animation="wave"
                  sx={{
                    borderRadius: 1.5,
                    bgcolor: (theme) => theme.palette.action.hover, // lighter skeleton tone
                  }}
                />
              ))}
            </Stack>
          ) : filteredItems.length === 0 ? (
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
            <Box
              sx={{
                position: 'relative',
                height: spacerHeight || effectiveHeight,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: offsetY,
                  left: 0,
                  right: 0,
                }}
              >
                {visibleItems.map((item) => (
                  <PanelRow
                    key={item.id}
                    item={item}
                    onSelect={onSelectTable}
                    isCollapsed={false}
                  />
                ))}
              </Box>
            </Box>
          )
        ) : (
          <FilterPanel
            appliedFilters={appliedFilters}
            onApplyFilters={onApplyFilters}
            activeDatabase={null}
            searchQuery={facetSearchQuery}
            facetData={facetData}
          />
        )}
      </Box>
    </Paper>
  );
};

export default TableSidePanel;
