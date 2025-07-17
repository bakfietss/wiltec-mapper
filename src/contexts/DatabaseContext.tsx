import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type DatabaseType = 'supabase' | 'firebird';

interface DatabaseContextType {
  activeDatabase: DatabaseType;
  setActiveDatabase: (database: DatabaseType) => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [activeDatabase, setActiveDatabaseState] = useState<DatabaseType>(() => {
    const saved = localStorage.getItem('activeDatabase');
    return (saved as DatabaseType) || 'supabase';
  });

  const setActiveDatabase = (database: DatabaseType) => {
    setActiveDatabaseState(database);
    localStorage.setItem('activeDatabase', database);
    // Clear all queries when switching databases
    queryClient.clear();
  };

  // Ensure database selection persists across page reloads
  useEffect(() => {
    const saved = localStorage.getItem('activeDatabase');
    if (saved && (saved === 'supabase' || saved === 'firebird')) {
      setActiveDatabaseState(saved as DatabaseType);
    }
  }, []);

  return (
    <DatabaseContext.Provider value={{ activeDatabase, setActiveDatabase }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}