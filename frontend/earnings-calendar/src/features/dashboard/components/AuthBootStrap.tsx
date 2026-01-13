import { useEffect, createContext, useContext, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';

import { useRefreshMutation } from '../../../services/authApi';

// Create context to share auth loading state
const AuthLoadingContext = createContext(false);

export const useAuthLoading = () => useContext(AuthLoadingContext);

export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [refresh, { isLoading: isRefreshLoading }] = useRefreshMutation();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const attemptRefresh = async () => {
      // Check if there are any auth cookies before attempting refresh
      const hasAuthCookies = document.cookie.includes('refresh=') || document.cookie.includes('access=');
      
      if (!hasAuthCookies) {
        // No auth cookies, skip refresh attempt entirely
        setIsAuthChecking(false);
        return;
      }

      try {
        await refresh().unwrap();
        // The authApi onQueryStarted callback automatically handles setting credentials
      } catch (error: any) {
        // 500 errors might be due to backend not being ready yet
        if (error?.status === 500) {
          console.warn('Backend service not ready, retrying in 2 seconds...');
          setTimeout(attemptRefresh, 2000);
          return;
        }
        
        // 401 errors are expected when user is not logged in - no need to log them
        // Only log unexpected errors that aren't 401 or 500
        if (error?.status !== 401 && error?.status !== 500) {
          console.error('Unexpected error during refresh:', error);
        }
        
        // For 401 errors, just continue silently - user is not logged in
      } finally {
        // Always mark auth checking as complete, regardless of success/failure
        setIsAuthChecking(false);
      }
    };

    // Add a small delay to ensure backend services are ready
    const timer = setTimeout(attemptRefresh, 1000);
    
    return () => clearTimeout(timer);
  }, [refresh]);

  // Show loading spinner while auth is being checked OR refresh is in progress
  if (isAuthChecking || isRefreshLoading) {
    return (
      <Box sx={{ display:'flex', minHeight:'100vh', alignItems:'center', justifyContent:'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AuthLoadingContext.Provider value={isAuthChecking || isRefreshLoading}>
      {children}
    </AuthLoadingContext.Provider>
  );
}
