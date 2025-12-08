import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControlLabel,
  Checkbox,
  Skeleton,
  Stack,
  Box
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const FacetGroup = ({
  title,
  options = [],
  selected = [],
  onChange = () => {},
  loading = false
}) => {
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
          pt: 0
        }}
      >
        {loading ? (
          <Stack spacing={1}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rectangular"
                height={28}
                sx={{ borderRadius: 1 }}
              />
            ))}
          </Stack>
        ) : (
          <Stack spacing={0.5}>
            {options.map(({ label, count }) => (
              <FormControlLabel
                key={label}
                control={
                  <Checkbox
                    size="small"
                    checked={selected.includes(label)}
                    onChange={() => handleToggle(label)}
                  />
                }
                label={
                  <Box component="span" sx={{ typography: 'body2', flex: 1 }}>
                    {`${label} (${count})`}
                  </Box>
                }
                sx={{
                  width: '100%',
                  borderRadius: 1,
                  px: 0.5,
                  '& .MuiFormControlLabel-label': {
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 400
                  }
                }}
              />
            ))}
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default FacetGroup;

