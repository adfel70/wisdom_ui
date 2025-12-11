import React, { createContext, useContext, useState, useCallback } from 'react';

const TableContext = createContext();

export const useTableContext = () => {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error('useTableContext must be used within a TableProvider');
  }
  return context;
};

// Panel width constants (shared with TableSidePanel)
export const PANEL_EXPANDED_WIDTH = 320;
export const PANEL_COLLAPSED_WIDTH = 60;

export const TableProvider = ({ children }) => {
  // Store matching table IDs for unified search (persists across navigations)
  const [matchingTableIds, setMatchingTableIds] = useState([]);

  // Track if we have performed an initial search/load for a specific query/filter combo
  // This helps avoid overwriting our custom order with a fresh search if the criteria haven't changed
  const [lastSearchSignature, setLastSearchSignature] = useState('');

  // Side panel collapse state - persists across navigations
  const [isSidePanelCollapsed, setIsSidePanelCollapsed] = useState(false);

  const toggleSidePanel = useCallback(() => {
    setIsSidePanelCollapsed(prev => !prev);
  }, []);

  const arraysAreEqual = (a = [], b = []) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  };

  const updateTableOrder = useCallback((newOrderOrUpdater) => {
    setMatchingTableIds(prev => {
      const nextOrder =
        typeof newOrderOrUpdater === 'function'
          ? newOrderOrUpdater(prev)
          : newOrderOrUpdater;

      if (!nextOrder || arraysAreEqual(prev, nextOrder)) {
        return prev;
      }

      return nextOrder;
    });
  }, []);

  const value = {
    matchingTableIds,
    setMatchingTableIds,
    updateTableOrder,
    lastSearchSignature,
    setLastSearchSignature,
    isSidePanelCollapsed,
    setIsSidePanelCollapsed,
    toggleSidePanel
  };

  return (
    <TableContext.Provider value={value}>
      {children}
    </TableContext.Provider>
  );
};

