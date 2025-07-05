
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, login } = useAuth();
  
  // For development - bypass authentication if in dev mode
  const isDevelopment = import.meta.env.DEV;
  
  // Auto-login with test user in development mode
  React.useEffect(() => {
    if (isDevelopment && !isAuthenticated) {
      const testUser = {
        id: '12345678-1234-4123-8123-123456789012',
        email: 'testuser@test.com',
        username: 'testuser',
        loginTime: new Date().toISOString()
      };
      login(testUser);
    }
  }, [isDevelopment, isAuthenticated, login]);
  
  if (!isAuthenticated && !isDevelopment) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
