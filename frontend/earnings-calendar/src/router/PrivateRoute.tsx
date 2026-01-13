// PrivateRoute.tsx
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../app/useAuth';

export default function PrivateRoute() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  
  return <Outlet />;
}
