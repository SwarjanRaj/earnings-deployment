// src/app/useAuth.ts
import { useSelector } from 'react-redux';
import type { RootState } from './store';

export const useAuth = () => {
  const { user, accessToken } = useSelector((state: RootState) => state.auth);
  const role = user?.role?.toLowerCase() as 'user' | 'admin' | 'superadmin' | undefined;
  
  return {
    user,
    accessToken,
    role,
    isAuthenticated: !!accessToken,
  };
};
