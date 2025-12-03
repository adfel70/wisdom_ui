import React from 'react';
import { Box, Container, Typography, IconButton, Divider } from '@mui/material';
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
        backgroundColor: '#0E2659', // Dark blue
        color: 'white',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
      }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 } }}>
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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

              <Divider orientation="vertical" flexItem sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', height: 24, alignSelf: 'center' }} />

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
