import { Navigate } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';

export default function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!adminApi.isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}
