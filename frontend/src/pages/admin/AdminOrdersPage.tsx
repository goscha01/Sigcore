import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import type { PhoneNumberOrder } from '../../types';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<PhoneNumberOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const ordersData = await adminApi.getWorkspaceOrders();
      setOrders(ordersData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

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
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">All phone number purchase and release orders</p>
        </div>
        <button onClick={loadOrders} className="btn-secondary flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tenant</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone Number</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Twilio Cost</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Markup</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(order.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{order.tenant?.name || order.tenantId?.slice(0, 8) || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{order.phoneNumber || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      order.orderType === 'purchase' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {order.orderType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{order.twilioCost ? `$${Number(order.twilioCost).toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{order.markupAmount ? `$${Number(order.markupAmount).toFixed(2)}` : '-'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{order.totalPrice ? `$${Number(order.totalPrice).toFixed(2)}` : '-'}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No orders yet. Orders appear when phone numbers are purchased or released.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
