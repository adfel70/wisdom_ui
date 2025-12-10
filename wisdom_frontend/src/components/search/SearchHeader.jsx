import React from 'react';
import { Box, Container, Paper, Typography, IconButton, Divider } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';

/**
 * SearchHeader - Top navigation bar with branding
 * Small, focused component for the sticky header
 */
const SearchHeader = ({ onBackToHome }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton
          onClick={onBackToHome}
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: 'primary.main',
              backgroundColor: 'primary.light',
            },
          }}
        >
          <HomeIcon />
        </IconButton>

        <Divider orientation="vertical" flexItem />

        <Typography variant="h6" fontWeight={600} color="text.primary">
          Wisdom UI
        </Typography>

        <Box sx={{ flex: 1 }} />

        <Typography variant="body2" color="text.secondary">
          Search Results
        </Typography>
      </Box>
    </motion.div>
  );
};

export default SearchHeader;
