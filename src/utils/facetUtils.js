export const FACET_KEYS = ['categories', 'regions', 'tableNames', 'tableYears'];

export const normalizeFacetArray = (values) => {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => {
      if (value === null || value === undefined) return '';
      return String(value).trim();
    })
    .filter(Boolean);
};

export const sanitizeFacetFilters = (filters = {}) => {
  const cleaned = {};
  FACET_KEYS.forEach((key) => {
    const normalized = normalizeFacetArray(filters[key]);
    if (normalized.length > 0) {
      cleaned[key] = normalized;
    }
  });
  return cleaned;
};

export const serializeFacetFilters = (filters = {}) =>
  FACET_KEYS.map((key) => {
    const entries = normalizeFacetArray(filters[key]);
    return entries.sort().join(',');
  }).join('|');

export const getFacetSelections = (filters = {}) => {
  const selections = {};
  FACET_KEYS.forEach((key) => {
    selections[key] = normalizeFacetArray(filters[key]);
  });
  return selections;
};

