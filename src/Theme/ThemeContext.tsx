
import React, { createContext, useContext, ReactNode } from 'react';

interface Theme {
  canvas: {
    background: string;
  };
}

interface ThemeContextType {
  theme: Theme;
}

const defaultTheme: Theme = {
  canvas: {
    background: '#f8f9fa',
  },
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <ThemeContext.Provider value={{ theme: defaultTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
