import { useState, useCallback } from 'react';

/**
 * Hook to manage search-related state (query, filters, permutations)
 * Keeps all search state in one place for easy management
 */
export const useSearchState = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [filters, setFilters] = useState({});
  const [pickedTables, setPickedTables] = useState([]);
  const [permutationId, setPermutationId] = useState('none');
  const [permutationParams, setPermutationParams] = useState({});

  // Reset all search state to initial values
  const resetSearchState = useCallback(() => {
    setSearchQuery('');
    setInputValue('');
    setFilters({});
    setPickedTables([]);
    setPermutationId('none');
    setPermutationParams({});
  }, []);

  // Initialize search state from values (typically from URL params)
  const initializeSearchState = useCallback((values) => {
    if (values.query !== undefined) setSearchQuery(values.query);
    if (values.inputValue !== undefined) setInputValue(values.inputValue);
    if (values.filters !== undefined) setFilters(values.filters);
    if (values.pickedTables !== undefined) setPickedTables(values.pickedTables);
    if (values.permutationId !== undefined) setPermutationId(values.permutationId);
    if (values.permutationParams !== undefined) setPermutationParams(values.permutationParams);
  }, []);

  return {
    // State
    searchQuery,
    inputValue,
    filters,
    pickedTables,
    permutationId,
    permutationParams,

    // Setters
    setSearchQuery,
    setInputValue,
    setFilters,
    setPickedTables,
    setPermutationId,
    setPermutationParams,

    // Utilities
    resetSearchState,
    initializeSearchState,
  };
};
