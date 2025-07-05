
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
    console.log('=== AUTH CONTEXT INITIALIZING ===');
    
    // Auto-login with system account
    const initSystemAuth = async () => {
      console.log('=== ATTEMPTING SYSTEM AUTH ===');
      try {
        // Check if already authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Current session check:', { session: !!session, sessionError });
        
        if (session?.user) {
          console.log('Existing session found, setting user');
          const authUser = {
            id: session.user.id,
            email: session.user.email,
            username: 'System User',
            loginTime: new Date().toISOString()
          };
          setUser(authUser);
          console.log('User set from existing session:', authUser);
          return;
        }

        console.log('No existing session, attempting system login...');
        // Auto-login with system account
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'bakfietss@hotmail.com',
          password: 'system123!@#'
        });

        console.log('Login attempt result:', { data: !!data, error });

        if (error) {
          console.error('System auth error:', error);
          console.log('Attempting to create system account...');
          // If login fails, try to create the system account
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'bakfietss@hotmail.com',
            password: 'system123!@#',
            options: {
              emailRedirectTo: `${window.location.origin}/`
            }
          });
          
          console.log('Sign up result:', { signUpData: !!signUpData, signUpError });
          if (signUpError) {
            console.error('System account creation error:', signUpError);
          } else {
            console.log('System account created, check email for confirmation');
          }
        } else {
          console.log('System login successful');
        }
      } catch (error) {
        console.error('System authentication failed:', error);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('=== AUTH STATE CHANGED ===', { event, session: !!session });
        if (session?.user) {
          const authUser = {
            id: session.user.id,
            email: session.user.email,
            username: 'System User',
            loginTime: new Date().toISOString()
          };
          setUser(authUser);
          console.log('User set from auth state change:', authUser);
        } else {
          setUser(null);
          console.log('User cleared, session lost');
          // Retry system auth if session lost
          setTimeout(() => {
            console.log('Retrying system auth after session loss...');
            initSystemAuth();
          }, 2000);
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
