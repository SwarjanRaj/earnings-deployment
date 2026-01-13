// ProtectedRoute.tsx - Full security for chat routes
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../app/useAuth';
import { Box, CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { accessToken, user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Clear storage if authentication is invalid
    if (!accessToken || !user?.id) {
      localStorage.clear();
      sessionStorage.clear();
    }
  }, [accessToken, user?.id]);

  // Strict check: both token AND userId must exist
  if (!accessToken || !user?.id) {
    // Clear storage before redirecting
    localStorage.clear();
    sessionStorage.clear();
    return <Navigate to="/signin" replace />;
  }

  // Show loading state while checking (though this should be instant)
  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}








