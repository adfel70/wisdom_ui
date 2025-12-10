import React, { createContext, useContext, useEffect, useState } from 'react';
import { getBdts } from '../api/backendClient';

const BdtsContext = createContext(null);

export const BdtsProvider = ({ children }) => {
  const [bdts, setBdts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    getBdts()
      .then((data) => {
        if (!isCancelled) {
          setBdts(data || []);
        }
      })
      .catch((error) => {
        console.error('Failed to load BDTs:', error);
        if (!isCancelled) {
          setBdts([]);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <BdtsContext.Provider value={{ bdts, loading }}>
      {children}
    </BdtsContext.Provider>
  );
};

export const useBdts = () => {
  const ctx = useContext(BdtsContext);
  if (!ctx) {
    throw new Error('useBdts must be used within a BdtsProvider');
  }
  return ctx;
};

