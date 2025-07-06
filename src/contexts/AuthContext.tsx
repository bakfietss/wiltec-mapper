
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string | null;
  username: string;
  loginTime: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', { event, hasSession: !!session });
        
        if (session?.user) {
          const authUser = {
            id: session.user.id,
            email: session.user.email,
            username: session.user.email?.split('@')[0] || 'User',
            loginTime: new Date().toISOString()
          };
          setUser(authUser);
          console.log('User authenticated:', authUser.email);
        } else {
          setUser(null);
          console.log('User signed out');
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const authUser = {
          id: session.user.id,
          email: session.user.email,
          username: session.user.email?.split('@')[0] || 'User',
          loginTime: new Date().toISOString()
        };
        setUser(authUser);
        console.log('Existing session found:', authUser.email);
      }
      setLoading(false);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, logout, isAuthenticated }}>
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
