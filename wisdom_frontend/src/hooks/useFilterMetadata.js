import { useEffect, useState } from 'react';
import {
  getAvailableYears,
  getAvailableCategories,
  getAvailableCountries,
  getDatabasesWithTables,
} from '../api/backendClient';

/**
 * Fetches filter metadata (databases + facets) when the modal is open.
 * Encapsulates cancellation and error handling to keep FilterModal lean.
 */
const useFilterMetadata = (open) => {
  const [state, setState] = useState({
    allDatabases: [],
    availableYears: [],
    availableCategories: [],
    availableCountries: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!open) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: null,
      }));
      return;
    }

    let isCancelled = false;

    const loadData = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const [databases, years, categories, countries] = await Promise.all([
          getDatabasesWithTables(),
          getAvailableYears(),
          getAvailableCategories(),
          getAvailableCountries(),
        ]);

        if (isCancelled) return;
        setState({
          allDatabases: databases || [],
          availableYears: Array.isArray(years) ? years : [],
          availableCategories: Array.isArray(categories) ? categories : [],
          availableCountries: Array.isArray(countries) ? countries : [],
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Failed to load filter metadata:', error);
        if (isCancelled) return;
        setState({
          allDatabases: [],
          availableYears: [],
          availableCategories: [],
          availableCountries: [],
          loading: false,
          error,
        });
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [open]);

  return state;
};

export default useFilterMetadata;

