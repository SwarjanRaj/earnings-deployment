// AdminRoute.tsx
import { Outlet } from 'react-router-dom';
export default function AdminRoute() {
  // Temporarily allow access for testing
  return <Outlet />;
  
  // Original authentication logic (commented out for testing)
  /*
  if (!isAuth) {
    return <Navigate to="/signin" replace />;
  }
  
  // Check if user has admin or superadmin role
  if (user?.role === 'admin' || user?.role === 'superAdmin') {
    return <Outlet />;
  }
  
  // Redirect non-admin users to dashboard
  return <Navigate to="/dashboard" replace />;
  */
}
