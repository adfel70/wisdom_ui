import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { LocalOfferOutlined } from '@mui/icons-material';
import CompactChipList from '../components/CompactChipList';

/**
 * Builds ag-grid column definitions with shared filter header wiring.
 */
const useTableColumns = ({
  headerParams,
  availableYears,
  availableCountries,
  availableCategories,
  availableColumnTags,
  formatDate,
}) => {
  return useMemo(() => {
    const withFilterConfig = (column, filterConfig) => ({
      ...column,
      headerComponentParams: {
        ...headerParams,
        filterConfig,
      },
    });

    return [
      withFilterConfig(
        {
          headerName: 'Name',
          field: 'name',
          checkboxSelection: true,
          headerCheckboxSelection: true,
          headerCheckboxSelectionFilteredOnly: true,
          minWidth: 220,
          flex: 1.3,
          cellRenderer: (params) => (
            <Box sx={{ maxWidth: '100%' }}>
              <Typography
                variant="body2"
                fontWeight={600}
                title={params.data?.name}
                sx={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                  maxWidth: '100%',
                }}
              >
                {params.data?.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                title={params.data?.databaseName}
                sx={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'block',
                  maxWidth: '100%',
                }}
              >
                {params.data?.databaseName}
              </Typography>
            </Box>
          ),
        },
        {
          key: 'tableName',
          type: 'text',
          label: 'Search',
          placeholder: 'Name, database, country, category, tags',
        }
      ),
      withFilterConfig(
        {
          headerName: 'Year',
          field: 'year',
          width: 110,
          valueFormatter: ({ value }) => value ?? '—',
        },
        {
          key: 'year',
          type: 'multiselect',
          label: 'Years',
          options: availableYears,
          placeholder: 'Search years',
        }
      ),
      withFilterConfig(
        {
          headerName: 'Country',
          field: 'country',
          width: 140,
          valueFormatter: ({ value }) => value ?? '—',
        },
        {
          key: 'country',
          type: 'multiselect',
          label: 'Countries',
          options: availableCountries,
          placeholder: 'Search countries',
        }
      ),
      withFilterConfig(
        {
          headerName: 'Categories',
          field: 'categories',
          flex: 1.2,
          minWidth: 200,
          cellRenderer: ({ value }) => (
            <CompactChipList
              items={Array.isArray(value) ? value : []}
              emptyPlaceholder="—"
              tooltipPlacement="right"
            />
          ),
        },
        {
          key: 'category',
          type: 'multiselect',
          label: 'Categories',
          options: availableCategories,
          placeholder: 'Search categories',
        }
      ),
      withFilterConfig(
        {
          headerName: 'Column Tags',
          field: 'columnTags',
          flex: 1.2,
          minWidth: 220,
          cellRenderer: ({ value }) => (
            <CompactChipList
              items={Array.isArray(value) ? value : []}
              icon={<LocalOfferOutlined fontSize="inherit" sx={{ fontSize: '0.9rem' }} />}
              emptyPlaceholder="—"
              tooltipPlacement="right"
            />
          ),
        },
        {
          key: 'columnTags',
          type: 'multiselect',
          label: 'Column Tags',
          options: availableColumnTags,
          placeholder: 'Search tags',
        }
      ),
      withFilterConfig(
        {
          headerName: 'Indexing Date',
          field: 'indexingDate',
          width: 170,
          valueFormatter: ({ value }) => formatDate(value),
        },
        {
          type: 'dateRange',
          minKey: 'minDate',
          maxKey: 'maxDate',
        }
      ),
      withFilterConfig(
        {
          headerName: 'Records',
          field: 'count',
          width: 140,
          type: 'rightAligned',
          valueFormatter: ({ value }) => {
            if (value === undefined || value === null || Number.isNaN(Number(value))) return '—';
            return Number(value).toLocaleString();
          },
        },
        { disableFilter: true }
      ),
    ];
  }, [
    availableCategories,
    availableColumnTags,
    availableCountries,
    availableYears,
    formatDate,
    headerParams,
  ]);
};

export default useTableColumns;

