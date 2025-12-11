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
    // Parse query as JSON array
    const queryStr = searchParams.get('q') || '';
    let query = [];
    if (queryStr) {
      try {
        query = JSON.parse(queryStr);
        if (!Array.isArray(query)) {
          query = [];
        }
      } catch (e) {
        console.error('Failed to parse query from URL:', e);
        query = [];
      }
    }

    const permutation = searchParams.get('permutation') || 'none';
    const permParamsStr = searchParams.get('permutationParams') || '';
    let permParams = {};
    if (permParamsStr) {
      try {
        permParams = JSON.parse(permParamsStr);
      } catch (e) {
        console.error('Failed to parse permutationParams from URL:', e);
        permParams = {};
      }
    }

    // Picked tables (new table-picker flow)
    let pickedTables = [];
    const pickedTablesParam = searchParams.get('pickedTables');
    if (pickedTablesParam) {
      try {
        const parsed = JSON.parse(pickedTablesParam);
        if (Array.isArray(parsed)) {
          pickedTables = parsed.filter(
            (item) =>
              item &&
              typeof item === 'object' &&
              typeof item.db === 'string' &&
              typeof item.table === 'string',
          );
        }
      } catch (e) {
        console.error('Failed to parse pickedTables from URL:', e);
      }
    }

    // Prefer unified filters param; fall back to legacy individual params for backward compatibility
    const filtersParam = searchParams.get('filters');
    let filters = {};
    if (filtersParam) {
      try {
        const parsed = JSON.parse(filtersParam);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          filters = parsed;
        }
      } catch (e) {
        console.error('Failed to parse filters from URL:', e);
      }
    } else {
      const year = searchParams.get('year') || 'all';
      const category = searchParams.get('category') || 'all';
      const country = searchParams.get('country') || 'all';
      const tableName = searchParams.get('tableName') || '';
      const minDate = searchParams.get('minDate') || '';
      const maxDate = searchParams.get('maxDate') || '';
      const selectedTablesParam = searchParams.get('selectedTables') || '';
      const selectedTables = selectedTablesParam ? selectedTablesParam.split(',') : [];

      filters = {
        year: year !== 'all' ? year : 'all',
        category: category !== 'all' ? category : 'all',
        country: country !== 'all' ? country : 'all',
        tableName: tableName || '',
        minDate: minDate || '',
        maxDate: maxDate || '',
        selectedTables: selectedTables,
      };
    }

    const pageParam = searchParams.get('page');
    const page = pageParam ? parseInt(pageParam, 10) : 1;

    // Selected databases (JSON array)
    let dbs = [];
    const dbsParam = searchParams.get('dbs');
    if (dbsParam) {
      try {
        const parsed = JSON.parse(dbsParam);
        if (Array.isArray(parsed)) {
          dbs = parsed.filter((db) => typeof db === 'string' && db.trim().length > 0);
        }
      } catch (e) {
        console.error('Failed to parse dbs from URL:', e);
      }
    }

    return {
      query,
      permutation,
      permutationParams: permParams,
      filters,
      pickedTables,
      page,
      dbs,
    };
  }, [searchParams]);

  // Build URL params from state
  const buildURLParams = useCallback((state) => {
    const params = new URLSearchParams();

    // Add query (JSON array format)
    if (state.query && Array.isArray(state.query) && state.query.length > 0) {
      params.append('q', JSON.stringify(state.query));
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

    // Add filters as a single JSON param to support facet arrays and per-DB shape
    if (state.filters && Object.keys(state.filters).length > 0) {
      try {
        params.append('filters', JSON.stringify(state.filters));
      } catch (e) {
        console.error('Failed to stringify filters for URL:', e);
      }
    }

    // Add picked tables (new table-picker flow)
    if (state.pickedTables && Array.isArray(state.pickedTables) && state.pickedTables.length > 0) {
      try {
        params.append('pickedTables', JSON.stringify(state.pickedTables));
      } catch (e) {
        console.error('Failed to stringify pickedTables for URL:', e);
      }
    }

    // Add selected databases
    if (state.dbs && Array.isArray(state.dbs) && state.dbs.length > 0) {
      try {
        params.append('dbs', JSON.stringify(state.dbs));
      } catch (e) {
        console.error('Failed to stringify dbs for URL:', e);
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
