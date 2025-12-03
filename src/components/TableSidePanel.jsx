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
} from '@mui/icons-material';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { getTablesMetadataForDatabase } from '../api/backend';

// Panel width constants
const PANEL_EXPANDED_WIDTH = 320;
const PANEL_COLLAPSED_WIDTH = 60;

const PANEL_TABS = [
  { value: 'liveOrder', label: 'Live Order', icon: <PlaylistPlay /> },
  { value: 'workbench', label: 'Workbench', icon: <Build /> }
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
  onToggleCollapse
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
      elevation={2}
      sx={{
        width: isCollapsed ? PANEL_COLLAPSED_WIDTH : PANEL_EXPANDED_WIDTH,
        flexShrink: 0,
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 280,
        bottom: 0,
        zIndex: 50,
        borderRadius: 0,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: isCollapsed ? 1 : 2,
          pb: isCollapsed ? 1 : 1.5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: isCollapsed ? 'center' : 'stretch'
        }}
      >
        {/* Collapse Toggle Button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: isCollapsed ? 'center' : 'flex-end',
            mb: isCollapsed ? 1 : 0.5
          }}
        >
          <Tooltip title={isCollapsed ? 'Expand panel' : 'Collapse panel'} placement="right">
            <IconButton
              size="small"
              onClick={onToggleCollapse}
              sx={{
                backgroundColor: 'action.hover',
                '&:hover': {
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText'
                }
              }}
            >
              {isCollapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Database Label */}
        {!isCollapsed && (
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
            {activeTab === 'liveOrder' && (
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
        )}
      </Box>

      <Divider />

      {/* Content Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          p: isCollapsed ? 0.75 : 1.5,
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
        {activeTab === 'liveOrder' ? (
          isSearching ? (
            // Loading skeleton
            <Stack spacing={isCollapsed ? 0.5 : 1}>
              {Array.from({ length: isCollapsed ? 10 : 6 }).map((_, idx) => (
                <Skeleton
                  key={idx}
                  variant="rounded"
                  height={isCollapsed ? 32 : 48}
                  width={isCollapsed ? 40 : '100%'}
                  animation="wave"
                  sx={{ borderRadius: 1.5, mx: isCollapsed ? 'auto' : 0 }}
                />
              ))}
            </Stack>
          ) : filteredItems.length === 0 ? (
            // Empty state
            <Box
              sx={{
                textAlign: 'center',
                py: isCollapsed ? 2 : 4,
                px: isCollapsed ? 0.5 : 2,
                color: 'text.secondary'
              }}
            >
              {!isCollapsed && (
                <>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    {searchQuery ? 'No matching tables' : 'No tables yet'}
                  </Typography>
                  <Typography variant="caption">
                    {searchQuery 
                      ? 'Try adjusting your search terms.' 
                      : 'Run a search or adjust filters to see tables listed here.'}
                  </Typography>
                </>
              )}
              {isCollapsed && (
                <Tooltip title="No tables" placement="right">
                  <TableChart color="disabled" />
                </Tooltip>
              )}
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
          // Workbench tab placeholder
          <Box
            sx={{
              textAlign: 'center',
              py: isCollapsed ? 2 : 4,
              px: isCollapsed ? 0.5 : 2,
              color: 'text.secondary'
            }}
          >
            {!isCollapsed && (
              <>
                <Build sx={{ fontSize: 40, mb: 2, opacity: 0.3 }} />
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Workbench coming soon
                </Typography>
                <Typography variant="caption">
                  Use this tab to surface modeling tools or saved table groups.
                </Typography>
              </>
            )}
            {isCollapsed && (
              <Tooltip title="Workbench coming soon" placement="right">
                <Build color="disabled" />
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default TableSidePanel;
