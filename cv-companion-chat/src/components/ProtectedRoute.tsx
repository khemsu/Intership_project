import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  //While still loading from localStorage, show nothing or a spinner
  if (isLoading) {
    return <div>Loading...</div>; // or replace with <Spinner />
  }

  // Don't redirect unless we know user is not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role check
  if (requiredRole && user?.role !== requiredRole) {
    const redirectPath = user?.role === 'admin' ? '/admin' : '/user';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
