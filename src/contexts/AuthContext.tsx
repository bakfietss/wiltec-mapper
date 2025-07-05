
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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          const authUser = {
            id: session.user.id,
            email: session.user.email,
            username: session.user.email?.split('@')[0] || 'user',
            loginTime: new Date().toISOString()
          };
          setUser(authUser);
        } else {
          setUser(null);
        }
      }
    );

    const initAuth = async () => {
      // Check for existing Supabase session first
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const authUser = {
          id: session.user.id,
          email: session.user.email,
          username: session.user.email?.split('@')[0] || 'user',
          loginTime: new Date().toISOString()
        };
        setUser(authUser);
        return;
      }

      // If no session and in development mode, auto-login with test user
      const isDevelopment = import.meta.env.DEV;
      if (isDevelopment) {
        console.log('Development mode: Signing in with test user');
        
        // Try to sign in with test credentials
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'test@example.com',
          password: 'testpassword123'
        });
        
        if (error) {
          console.log('Test user not found, creating...');
          // If sign in fails, create the test user
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'test@example.com',
            password: 'testpassword123',
            options: {
              emailRedirectTo: `${window.location.origin}/`
            }
          });
          
          if (signUpError) {
            console.error('Failed to create test user:', signUpError);
            return;
          }
          
          console.log('Test user created, please check email to confirm (or disable email confirmation in Supabase)');
        }
      }
    };

    initAuth();
    
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
