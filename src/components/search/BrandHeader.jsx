import React from 'react';
import { Box, Container, Typography, IconButton, Avatar } from '@mui/material';
import { Home as HomeIcon, AccountCircle } from '@mui/icons-material';
import { motion } from 'framer-motion';

/**
 * BrandHeader - Prominent dark blue header with branding
 * Features home navigation, app title, and user info
 */
const BrandHeader = ({ onBackToHome }) => {
  return (
    <Box
      sx={{
        backgroundColor: '#1e40af', // Deep blue
        color: 'white',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      <Container maxWidth="xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1.5,
            }}
          >
            {/* Left: Home button and Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={onBackToHome}
                sx={{
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                <HomeIcon />
              </IconButton>

              <Typography variant="h6" fontWeight={700} color="white">
                Wisdom UI
              </Typography>
            </Box>

            {/* Right: User info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AccountCircle sx={{ fontSize: 28 }} />
              <Typography variant="body2" fontWeight={500}>
                John Doe
              </Typography>
            </Box>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default BrandHeader;
