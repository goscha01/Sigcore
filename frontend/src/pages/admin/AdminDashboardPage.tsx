import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import type { Tenant, PhoneNumberOrder } from '../../types';

export default function AdminDashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [orders, setOrders] = useState<PhoneNumberOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tenantsData, ordersData] = await Promise.all([
        adminApi.getTenants(),
        adminApi.getWorkspaceOrders().catch(() => []),
      ]);
      setTenants(tenantsData);
      setOrders(ordersData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const totalAllocations = tenants.reduce((sum, t) => sum + (t.phoneNumbers?.length || 0), 0);
  const provisionedNumbers = tenants.reduce(
    (sum, t) => sum + (t.phoneNumbers?.filter((p: any) => p.provisionedViaCallio)?.length || 0), 0
  );

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': case 'provisioning': return 'bg-yellow-100 text-yellow-800';
      case 'failed': case 'cancelled': return 'bg-red-100 text-red-800';
      case 'released': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Platform overview</p>
        </div>
        <button onClick={loadDashboard} className="btn-secondary flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-1">Total Tenants</p>
          <p className="text-3xl font-bold text-gray-900">{tenants.length}</p>
          <p className="text-xs text-gray-400 mt-1">{activeTenants} active</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-1">Phone Allocations</p>
          <p className="text-3xl font-bold text-gray-900">{totalAllocations}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-1">Provisioned</p>
          <p className="text-3xl font-bold text-gray-900">{provisionedNumbers}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 mb-1">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="card">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tenants</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">External ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone Numbers</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map(tenant => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{tenant.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{tenant.externalId}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColor(tenant.status)}`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{tenant.phoneNumbers?.length || 0}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No tenants yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
