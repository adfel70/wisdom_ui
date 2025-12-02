import { useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

/**
 * Hook to sync search state with URL parameters
 * Handles reading URL params on mount and updating URL when state changes
 */
export const useURLSync = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read all search-related params from URL
  const readParamsFromURL = useCallback(() => {
    const query = searchParams.get('q') || '';
    const permutation = searchParams.get('permutation') || 'none';
    const permParamsStr = searchParams.get('permutationParams') || '';
    const permParams = permParamsStr ? JSON.parse(permParamsStr) : {};
    const year = searchParams.get('year') || 'all';
    const category = searchParams.get('category') || 'all';
    const country = searchParams.get('country') || 'all';
    const tableName = searchParams.get('tableName') || '';
    const minDate = searchParams.get('minDate') || '';
    const maxDate = searchParams.get('maxDate') || '';
    const selectedTablesParam = searchParams.get('selectedTables') || '';
    const selectedTables = selectedTablesParam ? selectedTablesParam.split(',') : [];
    const pageParam = searchParams.get('page');
    const page = pageParam ? parseInt(pageParam, 10) : 1;

    return {
      query,
      permutation,
      permutationParams: permParams,
      filters: {
        year: year !== 'all' ? year : 'all',
        category: category !== 'all' ? category : 'all',
        country: country !== 'all' ? country : 'all',
        tableName: tableName || '',
        minDate: minDate || '',
        maxDate: maxDate || '',
        selectedTables: selectedTables,
      },
      page,
    };
  }, [searchParams]);

  // Build URL params from state
  const buildURLParams = useCallback((state) => {
    const params = new URLSearchParams();

    // Add query
    if (state.query) {
      params.append('q', state.query);
    }

    // Add page
    if (state.page) {
      params.append('page', state.page.toString());
    }

    // Add permutation
    if (state.permutationId && state.permutationId !== 'none') {
      params.append('permutation', state.permutationId);

      // Add permutation parameters if any
      if (state.permutationParams && Object.keys(state.permutationParams).length > 0) {
        params.append('permutationParams', JSON.stringify(state.permutationParams));
      }
    }

    // Add filters
    if (state.filters) {
      if (state.filters.year && state.filters.year !== 'all') {
        params.append('year', state.filters.year);
      }
      if (state.filters.category && state.filters.category !== 'all') {
        params.append('category', state.filters.category);
      }
      if (state.filters.country && state.filters.country !== 'all') {
        params.append('country', state.filters.country);
      }
      if (state.filters.tableName) {
        params.append('tableName', state.filters.tableName);
      }
      if (state.filters.minDate) {
        params.append('minDate', state.filters.minDate);
      }
      if (state.filters.maxDate) {
        params.append('maxDate', state.filters.maxDate);
      }
      if (state.filters.selectedTables && state.filters.selectedTables.length > 0) {
        params.append('selectedTables', state.filters.selectedTables.join(','));
      }
    }

    return params;
  }, []);

  // Update URL with new state
  const updateURL = useCallback((state, options = { replace: true }) => {
    const params = buildURLParams(state);
    navigate(`/search?${params.toString()}`, { replace: options.replace });
  }, [navigate, buildURLParams]);

  return {
    readParamsFromURL,
    buildURLParams,
    updateURL,
    searchParams,
  };
};
