import React, { createContext, useContext, useState, useCallback } from 'react';

const TableContext = createContext();

export const useTableContext = () => {
  const context = useContext(TableContext);
  if (!context) {
    throw new Error('useTableContext must be used within a TableProvider');
  }
  return context;
};

export const TableProvider = ({ children }) => {
  // Store matching table IDs per database
  // This state needs to persist across page navigations
  const [matchingTableIds, setMatchingTableIds] = useState({
    db1: [],
    db2: [],
    db3: [],
    db4: []
  });

  // Track if we have performed an initial search/load for a specific query/filter combo
  // This helps avoid overwriting our custom order with a fresh search if the criteria haven't changed
  const [lastSearchSignature, setLastSearchSignature] = useState('');

  const updateTableOrder = useCallback((dbId, newOrder) => {
    setMatchingTableIds(prev => ({
      ...prev,
      [dbId]: newOrder
    }));
  }, []);

  const setTablesForDatabase = useCallback((dbId, tableIds) => {
    setMatchingTableIds(prev => ({
      ...prev,
      [dbId]: tableIds
    }));
  }, []);

  const value = {
    matchingTableIds,
    setMatchingTableIds,
    updateTableOrder,
    setTablesForDatabase,
    lastSearchSignature,
    setLastSearchSignature
  };

  return (
    <TableContext.Provider value={value}>
      {children}
    </TableContext.Provider>
  );
};

