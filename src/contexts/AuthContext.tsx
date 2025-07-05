
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  username: string;
  loginTime: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is stored in localStorage on app start
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Ensure the user object has all required fields
        if (parsedUser.id && parsedUser.email && parsedUser.username) {
          setUser(parsedUser);
        } else {
          console.log('Stored user missing required fields, clearing...');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('user');
      }
    }
    
    // If no valid user and in development mode, set up test user
    const isDevelopment = import.meta.env.DEV;
    if (isDevelopment && !storedUser) {
      console.log('Development mode: Creating test user');
      const testUser = {
        id: '12345678-1234-4123-8123-123456789012',
        email: 'testuser@test.com',
        username: 'testuser',
        loginTime: new Date().toISOString()
      };
      setUser(testUser);
      localStorage.setItem('user', JSON.stringify(testUser));
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
