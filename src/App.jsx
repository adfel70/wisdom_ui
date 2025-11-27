import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { theme } from './theme/theme';
import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';

/**
 * AnimatedRoutes Component
 * Wrapper for routes to enable page transitions
 */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <LayoutGroup>
      <AnimatePresence mode="popLayout" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchResultsPage />} />
        </Routes>
      </AnimatePresence>
    </LayoutGroup>
  );
}

/**
 * Main App Component
 * Sets up routing and theme for the application
 */
function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AnimatedRoutes />
      </Router>
    </ThemeProvider>
  );
}

export default App;
