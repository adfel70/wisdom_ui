const REGION_COUNTRY_MAP = {
  US: [
    'United States',
    'United States of America',
    'USA',
    'Mexico',
    'Brazil',
    'Canada',
    'Argentina',
    'Colombia',
    'Chile',
    'Peru',
    'Venezuela',
    'Costa Rica',
    'Panama'
  ],
  EU: [
    'France',
    'Germany',
    'Spain',
    'Italy',
    'Sweden',
    'Denmark',
    'Norway',
    'Finland',
    'Netherlands',
    'Belgium',
    'Switzerland',
    'Austria',
    'Portugal',
    'Poland',
    'Czech Republic',
    'Ireland',
    'Greece'
  ],
  APAC: [
    'Japan',
    'Australia',
    'India',
    'China',
    'South Korea',
    'Singapore',
    'Indonesia',
    'Vietnam',
    'Philippines',
    'Malaysia',
    'Thailand',
    'New Zealand',
    'Taiwan',
    'Hong Kong'
  ]
};

export const inferRegionFromCountry = (country = '') => {
  const normalized = (country || '').trim().toLowerCase();
  if (!normalized) {
    return 'Other';
  }

  for (const [region, countries] of Object.entries(REGION_COUNTRY_MAP)) {
    if (countries.some((name) => name.toLowerCase() === normalized)) {
      return region;
    }
  }

  return 'Other';
};

