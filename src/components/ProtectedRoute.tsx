
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, login, user } = useAuth();
  
  // For development - bypass authentication if in dev mode
  const isDevelopment = import.meta.env.DEV;
  
  console.log('=== PROTECTED ROUTE DEBUG ===');
  console.log('isDevelopment:', isDevelopment);
  console.log('isAuthenticated:', isAuthenticated);
  console.log('user object:', user);
  console.log('user object keys:', user ? Object.keys(user) : 'null');
  
  // Auto-login with test user in development mode
  React.useEffect(() => {
    console.log('=== PROTECTED ROUTE EFFECT ===');
    console.log('isDevelopment:', isDevelopment);
    console.log('isAuthenticated:', isAuthenticated);
    
    if (isDevelopment && !isAuthenticated) {
      console.log('Auto-logging in with test user...');
      const testUser = {
        id: '12345678-1234-4123-8123-123456789012',
        email: 'testuser@test.com',
        username: 'testuser',
        loginTime: new Date().toISOString()
      };
      console.log('Test user being set:', testUser);
      login(testUser);
    }
  }, [isDevelopment, isAuthenticated, login]);
  
  if (!isAuthenticated && !isDevelopment) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
