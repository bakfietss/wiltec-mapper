
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  email: string | null;
  username: string;
  loginTime: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Auto-login with system account
    const initSystemAuth = async () => {
      try {
        // Check if already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const authUser = {
            id: session.user.id,
            email: session.user.email,
            username: 'System User',
            loginTime: new Date().toISOString()
          };
          setUser(authUser);
          return;
        }

        // Auto-login with system account
        const { error } = await supabase.auth.signInWithPassword({
          email: 'bakfietss@hotmail.com',
          password: 'system123!@#'
        });

        if (error) {
          console.error('System auth error:', error);
          // If login fails, try to create the system account
          const { error: signUpError } = await supabase.auth.signUp({
            email: 'bakfietss@hotmail.com',
            password: 'system123!@#'
          });
          
          if (signUpError) {
            console.error('System account creation error:', signUpError);
          }
        }
      } catch (error) {
        console.error('System authentication failed:', error);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          const authUser = {
            id: session.user.id,
            email: session.user.email,
            username: 'System User',
            loginTime: new Date().toISOString()
          };
          setUser(authUser);
        } else {
          setUser(null);
          // Retry system auth if session lost
          setTimeout(initSystemAuth, 1000);
        }
      }
    );

    initSystemAuth();
    
    return () => subscription.unsubscribe();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    await supabase.auth.signOut();
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
