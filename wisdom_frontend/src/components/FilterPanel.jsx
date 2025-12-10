import React, { useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';
import { getFacetAggregatesForDb } from '../api/backendClient';
import FacetGroup from './FacetGroup';

const emptyFacets = {
  categories: {},
  regions: {},
  tableNames: {},
  tableYears: {},
};

const normalizeArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const buildFacetPayload = (filters = {}) => {
  const payload = {};
  const categories = normalizeArray(filters.categories);
  const regions = normalizeArray(filters.regions);
  const tableNames = normalizeArray(filters.tableNames);
  const tableYears = normalizeArray(filters.tableYears).map(String);

  if (categories.length) payload.categories = categories;
  if (regions.length) payload.regions = regions;
  if (tableNames.length) payload.tableNames = tableNames;
  if (tableYears.length) payload.tableYears = tableYears;

  return payload;
};

const FilterPanel = ({ onApplyFilters, appliedFilters = {}, activeDatabase, searchQuery }) => {
  const [facetData, setFacetData] = useState(emptyFacets);
  const [loading, setLoading] = useState(false);

  const [categoriesSelected, setCategoriesSelected] = useState([]);
  const [regionsSelected, setRegionsSelected] = useState([]);
  const [tableNamesSelected, setTableNamesSelected] = useState([]);
  const [tableYearsSelected, setTableYearsSelected] = useState([]);

  // Keep local selections in sync when applied filters come from parent (e.g., on load)
  useEffect(() => {
    setCategoriesSelected(normalizeArray(appliedFilters.categories));
    setRegionsSelected(normalizeArray(appliedFilters.regions));
    setTableNamesSelected(normalizeArray(appliedFilters.tableNames));
    setTableYearsSelected(normalizeArray(appliedFilters.tableYears));
  }, [appliedFilters]);

  useEffect(() => {
    setLoading(true);
    const payload = buildFacetPayload(appliedFilters);
    getFacetAggregatesForDb(activeDatabase, searchQuery, payload)
      .then((data) => {
        setFacetData(data);
      })
      .catch((error) => {
        console.error('Failed to load facet aggregates:', error);
        setFacetData(emptyFacets);
      })
      .finally(() => setLoading(false));
  }, [appliedFilters, activeDatabase, searchQuery]);

  const toOptionsWithSelections = (obj, selected) => {
    const map = new Map();
    Object.entries(obj || {}).forEach(([label, count]) => {
      map.set(label, { label, count });
    });
    (selected || []).forEach((label) => {
      if (!map.has(label)) {
        map.set(label, { label, count: 0 });
      }
    });
    return Array.from(map.values());
  };

  const handleApply = () => {
    const nextFilters = buildFacetPayload({
      categories: categoriesSelected,
      regions: regionsSelected,
      tableNames: tableNamesSelected,
      tableYears: tableYearsSelected,
    });
    onApplyFilters?.(nextFilters);
  };

  const handleClear = () => {
    setCategoriesSelected([]);
    setRegionsSelected([]);
    setTableNamesSelected([]);
    setTableYearsSelected([]);
    onApplyFilters?.({});
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          pr: 0.5,
          pb: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        <FacetGroup
          title="Categories"
          options={toOptionsWithSelections(facetData.categories, categoriesSelected)}
          selected={categoriesSelected}
          onChange={setCategoriesSelected}
          onClear={() => setCategoriesSelected([])}
          loading={loading}
        />
        <FacetGroup
          title="Regions"
          options={toOptionsWithSelections(facetData.regions, regionsSelected)}
          selected={regionsSelected}
          onChange={setRegionsSelected}
          onClear={() => setRegionsSelected([])}
          loading={loading}
        />
        <FacetGroup
          title="Table Names"
          options={toOptionsWithSelections(facetData.tableNames, tableNamesSelected)}
          selected={tableNamesSelected}
          onChange={setTableNamesSelected}
          onClear={() => setTableNamesSelected([])}
          loading={loading}
        />
        <FacetGroup
          title="Table Years"
          options={toOptionsWithSelections(facetData.tableYears, tableYearsSelected)}
          selected={tableYearsSelected}
          onChange={setTableYearsSelected}
          onClear={() => setTableYearsSelected([])}
          loading={loading}
        />
      </Box>

      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          p: 1,
          backgroundColor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
          display: 'flex',
          gap: 1,
        }}
      >
        <Button
          variant="outlined"
          color="inherit"
          fullWidth
          onClick={handleClear}
          disabled={loading}
        >
          Clear Filters
        </Button>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleApply}
          disabled={loading}
        >
          Apply Filters
        </Button>
      </Box>
    </Box>
  );
};

export default FilterPanel;

