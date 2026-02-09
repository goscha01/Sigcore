import { Navigate } from 'react-router-dom';
import { portalApi } from '../../services/portalApi';

export default function TenantPortalProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!portalApi.isAuthenticated()) {
    return <Navigate to="/portal/login" replace />;
  }
  return <>{children}</>;
}
