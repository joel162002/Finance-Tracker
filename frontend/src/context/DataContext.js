import { createContext, useContext, useState, useCallback } from 'react';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Call this after any data mutation (add/edit/delete)
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setLastUpdate(Date.now());
  }, []);

  return (
    <DataContext.Provider value={{ refreshTrigger, lastUpdate, triggerRefresh }}>
      {children}
    </DataContext.Provider>
  );
};

export const useDataRefresh = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataRefresh must be used within a DataProvider');
  }
  return context;
};
