import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { User, PhoneCall, ClipboardList, DollarSign, LogOut } from 'lucide-react';
import { useTenantAuthStore } from '../../store/tenantAuthStore';

export default function TenantPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantProfile, logout } = useTenantAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-primary-50 text-primary-700'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Sigcore" className="h-9 w-auto" />
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                Portal
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {tenantProfile?.name}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          <nav className="w-56 flex-shrink-0">
            <div className="space-y-1">
              <Link to="/portal/account" className={navLinkClass('/portal/account')}>
                <User className="h-4 w-4" />
                Account
              </Link>
              <Link to="/portal/phone-numbers" className={navLinkClass('/portal/phone-numbers')}>
                <PhoneCall className="h-4 w-4" />
                Phone Numbers
              </Link>
              <Link to="/portal/orders" className={navLinkClass('/portal/orders')}>
                <ClipboardList className="h-4 w-4" />
                Orders
              </Link>
              <Link to="/portal/billing" className={navLinkClass('/portal/billing')}>
                <DollarSign className="h-4 w-4" />
                Billing
              </Link>
            </div>
          </nav>

          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
