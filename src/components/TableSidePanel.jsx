import React, { useMemo, memo, useState, useCallback } from 'react';
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
  Skeleton,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  TableChart,
  ChevronLeft,
  ChevronRight,
  PlaylistPlay,
  Build,
  Visibility,
  HourglassEmpty
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
    // Mini version for collapsed state
    return (
      <Tooltip title={`${item.position}. ${item.name}`} placement="right" arrow>
        <ListItemButton
          dense
          onClick={handleClick}
          selected={item.isVisible}
          sx={{
            borderRadius: 1.5,
            mb: 0.5,
            minHeight: 40,
            justifyContent: 'center',
            px: 1,
            backgroundColor: item.isVisible 
              ? 'primary.light' 
              : item.isPending 
                ? 'warning.light' 
                : 'transparent',
            opacity: item.isVisible || item.isPending ? 1 : 0.6,
            '&.Mui-selected': {
              backgroundColor: 'primary.light',
            },
            '&:hover': {
              backgroundColor: item.isVisible ? 'primary.main' : 'action.hover',
              '& .MuiTypography-root': {
                color: item.isVisible ? 'white' : 'inherit'
              }
            }
          }}
        >
          <Badge
            badgeContent={item.isPending ? '...' : null}
            color="warning"
            variant="dot"
            invisible={!item.isPending}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{
                color: item.isVisible ? 'primary.contrastText' : 'text.secondary',
                fontSize: '0.7rem'
              }}
            >
              {item.position}
            </Typography>
          </Badge>
        </ListItemButton>
      </Tooltip>
    );
  }

  // Full version for expanded state
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
        transition: 'all 0.2s ease',
        '&.Mui-selected': {
          backgroundColor: 'action.selected',
        },
        '&.Mui-selected:hover': {
          backgroundColor: 'action.hover',
        },
        '&:hover': {
          transform: 'translateX(4px)',
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
          <Chip 
            icon={<HourglassEmpty sx={{ fontSize: '0.8rem' }} />}
            label="Loading" 
            size="small" 
            color="warning" 
            variant="outlined" 
            sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.65rem' } }}
          />
        )}
        {item.isVisible && !item.isPending && (
          <Chip 
            icon={<Visibility sx={{ fontSize: '0.8rem' }} />}
            label="Visible" 
            size="small" 
            color="primary" 
            variant="outlined"
            sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.65rem' } }}
          />
        )}
      </Stack>
    </ListItemButton>
  );
});

PanelRow.displayName = 'PanelRow';

// Animated wrapper for each row
const AnimatedPanelRow = memo(({ item, onSelect, isCollapsed }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{
        layout: { type: 'spring', stiffness: 350, damping: 30 },
        opacity: { duration: 0.2 },
        x: { duration: 0.2 }
      }}
    >
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

  const visibleCount = visibleTableIds.length;
  const pendingCount = pendingTableIds.length;

  const handleTabChange = useCallback((_, value) => {
    setActiveTab(value);
  }, []);

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
        left: 24,
        top: 300,
        bottom: 80,
        zIndex: 50,
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider'
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
          </motion.div>
        )}

        {/* Tabs */}
        {isCollapsed ? (
          // Collapsed tab icons
          <Stack spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
            {PANEL_TABS.map(tab => {tab.icon})}
          </Stack>
        ) : (
          // Expanded tabs
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
        )}

        {/* Stats summary */}
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Chip
                size="small"
                label={`${tableIds.length} total`}
                variant="outlined"
                sx={{ fontSize: '0.65rem', height: 20 }}
              />
              {visibleCount > 0 && (
                <Chip
                  size="small"
                  label={`${visibleCount} visible`}
                  color="primary"
                  variant="filled"
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
              )}
              {pendingCount > 0 && (
                <Chip
                  size="small"
                  label={`${pendingCount} loading`}
                  color="warning"
                  variant="filled"
                  sx={{ fontSize: '0.65rem', height: 20 }}
                />
              )}
            </Stack>
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
          ) : panelItems.length === 0 ? (
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
                    No tables yet
                  </Typography>
                  <Typography variant="caption">
                    Run a search or adjust filters to see tables listed here.
                  </Typography>
                </>
              )}
              {isCollapsed && (
                <Tooltip title="No tables yet" placement="right">
                  <TableChart color="disabled" />
                </Tooltip>
              )}
            </Box>
          ) : (
            // Table list with animations
            <LayoutGroup>
              <List disablePadding dense>
                <AnimatePresence mode="popLayout">
                  {panelItems.map(item => (
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

      {/* Footer */}
      {!isCollapsed && (
        <Box
          sx={{
            p: 1.5,
            pt: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'action.hover'
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
            {activeTab === 'liveOrder'
              ? 'Click a table to scroll to it. Order updates live.'
              : 'Workbench tools available soon.'}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default TableSidePanel;
