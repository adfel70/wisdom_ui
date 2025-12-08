import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button } from '@mui/material';
import FacetGroup from './FacetGroup';
import { fetchFacetAggregates } from '../api/backend';
import {
  getFacetSelections,
  sanitizeFacetFilters,
  serializeFacetFilters
} from '../utils/facetUtils';

const toFacetOptions = (bucket = {}) =>
  Object.entries(bucket).map(([label, count]) => ({
    label,
    count
  }));

const initialFacetData = {
  categories: {},
  regions: {},
  tableNames: {},
  tableYears: {}
};

const FilterPanel = ({ databaseId = 'db1', onApplyFilters = () => {}, activeFilters = {} }) => {
  const [facetData, setFacetData] = useState(initialFacetData);
  const [loading, setLoading] = useState(false);
  const [categoriesSelected, setCategoriesSelected] = useState([]);
  const [regionsSelected, setRegionsSelected] = useState([]);
  const [tableNamesSelected, setTableNamesSelected] = useState([]);
  const [tableYearsSelected, setTableYearsSelected] = useState([]);
  const [appliedFilters, setAppliedFilters] = useState(() => sanitizeFacetFilters(activeFilters));

  useEffect(() => {
    const sanitized = sanitizeFacetFilters(activeFilters);
    setAppliedFilters((prev) => {
      if (serializeFacetFilters(prev) === serializeFacetFilters(sanitized)) {
        return prev;
      }
      return sanitized;
    });
    const selections = getFacetSelections(activeFilters);
    setCategoriesSelected(selections.categories);
    setRegionsSelected(selections.regions);
    setTableNamesSelected(selections.tableNames);
    setTableYearsSelected(selections.tableYears);
  }, [activeFilters]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchFacetAggregates(databaseId, appliedFilters)
      .then((data) => {
        if (!isMounted) return;
        setFacetData(data || initialFacetData);
      })
      .catch(() => {
        if (!isMounted) return;
        setFacetData(initialFacetData);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [appliedFilters, databaseId]);

  const facetOptions = useMemo(
    () => ({
      categories: toFacetOptions(facetData.categories),
      regions: toFacetOptions(facetData.regions),
      tableNames: toFacetOptions(facetData.tableNames),
      tableYears: toFacetOptions(facetData.tableYears)
    }),
    [facetData]
  );

  const handleApplyFilters = () => {
    const nextFilters = {
      categories: categoriesSelected,
      regions: regionsSelected,
      tableNames: tableNamesSelected,
      tableYears: tableYearsSelected
    };
    const sanitized = sanitizeFacetFilters(nextFilters);
    onApplyFilters(sanitized);
  };

  return (
    <Box
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}
    >
      <Box
        component="section"
        sx={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          px: 2,
          py: 2
        }}
      >
        <FacetGroup
          title="Categories"
          options={facetOptions.categories}
          selected={categoriesSelected}
          loading={loading}
          onChange={setCategoriesSelected}
        />

        <FacetGroup
          title="Regions"
          options={facetOptions.regions}
          selected={regionsSelected}
          loading={loading}
          onChange={setRegionsSelected}
        />

        <FacetGroup
          title="Table Names"
          options={facetOptions.tableNames}
          selected={tableNamesSelected}
          loading={loading}
          onChange={setTableNamesSelected}
        />

        <FacetGroup
          title="Table Years"
          options={facetOptions.tableYears}
          selected={tableYearsSelected}
          loading={loading}
          onChange={setTableYearsSelected}
        />
      </Box>

      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          zIndex: 1,
          borderTop: '1px solid',
          borderColor: 'divider',
          px: 2,
          py: 1.5,
          bgcolor: 'background.paper'
        }}
      >
        <Button variant="contained" fullWidth onClick={handleApplyFilters} disabled={loading}>
          Apply Filters
        </Button>
      </Box>
    </Box>
  );
};

export default FilterPanel;
