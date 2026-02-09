import { useState, useEffect } from 'react';
import { DollarSign, RefreshCw, PhoneCall, ShoppingCart, TrendingUp } from 'lucide-react';
import { portalApi } from '../../services/portalApi';
import type { PortalBilling } from '../../types';

export default function TenantBillingPage() {
  const [billing, setBilling] = useState<PortalBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBilling = async () => {
    setLoading(true);
    try {
      const data = await portalApi.getBilling();
      setBilling(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load billing info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const pricingTypeLabels: Record<string, string> = {
    fixed_markup: 'Fixed Markup',
    percentage_markup: 'Percentage Markup',
    fixed_price: 'Fixed Price',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <button onClick={fetchBilling} className="text-gray-400 hover:text-gray-600">
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {billing && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <PhoneCall className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-gray-500 uppercase">Active Numbers</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{billing.summary.activeNumbers}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-gray-500 uppercase">Monthly Cost</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${billing.summary.totalMonthlyCost.toFixed(2)}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-gray-500 uppercase">Total Orders</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{billing.summary.totalOrders}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium text-gray-500 uppercase">Total Spent</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${billing.summary.totalSpent.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing Plan</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pricing Model</label>
                <p className="mt-1 text-sm text-gray-900">
                  {pricingTypeLabels[billing.pricing.pricingType] || billing.pricing.pricingType}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Setup Fee</label>
                <p className="mt-1 text-sm text-gray-900">
                  {billing.pricing.setupFee > 0 ? `$${billing.pricing.setupFee.toFixed(2)}` : 'None'}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Provisioned Numbers</label>
                <p className="mt-1 text-sm text-gray-900">{billing.summary.provisionedNumbers}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
