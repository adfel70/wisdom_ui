import React, { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControlLabel,
  Checkbox,
  Skeleton,
  Box,
  TextField,
  InputAdornment
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Search from '@mui/icons-material/Search';

const FacetGroup = ({
  title,
  options = [],
  selected = [],
  onChange = () => {},
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();
    if (!term) {
      return options;
    }
    return options.filter(({ label }) => label.toLowerCase().includes(term));
  }, [options, searchTerm]);

  const handleToggle = (label) => {
    const isSelected = selected.includes(label);
    const nextSelection = isSelected
      ? selected.filter(item => item !== label)
      : [...selected, label];
    onChange(nextSelection);
  };

  return (
    <Accordion
      disableGutters
      elevation={0}
      square
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        mb: 2,
        '&:before': {
          display: 'none'
        }
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          px: 2,
          py: 1,
          minHeight: 0,
          '& .MuiAccordionSummary-content': {
            margin: 0
          }
        }}
      >
        <Typography variant="subtitle2" fontWeight={600}>
          {title}
        </Typography>
      </AccordionSummary>

      <AccordionDetails
        sx={{
          px: 2,
          py: 1.5,
          pt: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        <TextField
          size="small"
          placeholder="Search options"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
            sx: {
              borderRadius: 2
            }
          }}
        />

        <Box
          sx={{
            flex: '1 1 auto',
            overflowY: 'auto',
            overflowX: 'hidden',
            pr: 0.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.75,
            maxHeight: 220
          }}
        >
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rectangular"
                height={28}
                sx={{ borderRadius: 1 }}
              />
            ))
          ) : filteredOptions.length === 0 ? (
            <Typography variant="caption" color="text.secondary" align="center">
              No options match “{searchTerm}”
            </Typography>
          ) : (
            filteredOptions.map(({ label, count }) => (
              <FormControlLabel
                key={label}
                control={
                  <Checkbox
                    size="small"
                    checked={selected.includes(label)}
                    onChange={() => handleToggle(label)}
                    sx={{ p: 0.5, mr: 0.75 }}
                  />
                }
                label={
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}
                  >
                    <Box component="span" sx={{ flex: 1 }}>
                      {label}
                    </Box>
                    <Box component="span" sx={{ color: 'text.secondary', ml: 1 }}>
                      ({count})
                    </Box>
                  </Typography>
                }
                sx={{
                  width: '100%',
                  borderRadius: 1,
                  px: 0.5,
                  '& .MuiFormControlLabel-label': {
                    width: '100%'
                  },
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  }
                }}
              />
            ))
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default FacetGroup;

