import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import type { PricingConfig } from '../../types';

export default function AdminPricingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [pricingType, setPricingType] = useState('fixed_markup');
  const [markupAmount, setMarkupAmount] = useState('0.50');
  const [markupPercent, setMarkupPercent] = useState('0');
  const [basePrice, setBasePrice] = useState('');
  const [setupFee, setSetupFee] = useState('0');
  const [allowPurchase, setAllowPurchase] = useState(true);
  const [allowRelease, setAllowRelease] = useState(true);
  const [pricingSaved, setPricingSaved] = useState(false);

  const loadPricing = async () => {
    setLoading(true);
    setError(null);
    try {
      const pricingData = await adminApi.getPricingConfig();
      setPricing(pricingData);
      setPricingType(pricingData.pricingType);
      setMarkupAmount(String(pricingData.monthlyMarkupAmount));
      setMarkupPercent(String(pricingData.monthlyMarkupPercentage));
      setBasePrice(pricingData.monthlyBasePrice ? String(pricingData.monthlyBasePrice) : '');
      setSetupFee(String(pricingData.setupFee));
      setAllowPurchase(pricingData.allowTenantPurchase);
      setAllowRelease(pricingData.allowTenantRelease);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPricing();
  }, []);

  const savePricing = async () => {
    setLoading(true);
    setPricingSaved(false);
    try {
      const data: any = {
        pricingType,
        setupFee: parseFloat(setupFee) || 0,
        allowTenantPurchase: allowPurchase,
        allowTenantRelease: allowRelease,
      };
      if (pricingType === 'fixed_markup') data.monthlyMarkupAmount = parseFloat(markupAmount) || 0;
      if (pricingType === 'percentage_markup') data.monthlyMarkupPercentage = parseFloat(markupPercent) || 0;
      if (pricingType === 'fixed_price') data.monthlyBasePrice = parseFloat(basePrice) || 0;

      const updated = await adminApi.updatePricingConfig(data);
      setPricing(updated);
      setPricingSaved(true);
      setTimeout(() => setPricingSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricing</h1>
          <p className="text-sm text-gray-500">Configure phone number pricing for tenants</p>
        </div>
        <button onClick={loadPricing} className="btn-secondary flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
      )}

      {/* Current Config */}
      {pricing && (
        <div className="card p-6 bg-blue-50 border-2 border-blue-200">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">Current Configuration</h2>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-blue-600">Pricing Type</p>
              <p className="font-medium text-blue-900">{pricing.pricingType.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-blue-600">Setup Fee</p>
              <p className="font-medium text-blue-900">${pricing.setupFee}</p>
            </div>
            <div>
              <p className="text-blue-600">Tenant Purchase</p>
              <p className={`font-medium ${pricing.allowTenantPurchase ? 'text-green-700' : 'text-red-700'}`}>
                {pricing.allowTenantPurchase ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div>
              <p className="text-blue-600">Tenant Release</p>
              <p className={`font-medium ${pricing.allowTenantRelease ? 'text-green-700' : 'text-red-700'}`}>
                {pricing.allowTenantRelease ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Update Form */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Pricing</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Type</label>
            <select className="input w-full" value={pricingType} onChange={e => setPricingType(e.target.value)}>
              <option value="fixed_markup">Fixed Markup ($/month added)</option>
              <option value="percentage_markup">Percentage Markup (%)</option>
              <option value="fixed_price">Fixed Price (flat $/month)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Setup Fee ($)</label>
            <input type="text" className="input w-full" placeholder="0.00" value={setupFee} onChange={e => setSetupFee(e.target.value)} />
          </div>
        </div>

        {pricingType === 'fixed_markup' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Markup ($)</label>
            <input type="text" className="input w-full" placeholder="0.50" value={markupAmount} onChange={e => setMarkupAmount(e.target.value)} />
            <p className="text-xs text-gray-500 mt-1">Added on top of Twilio base cost (~$1.15/month for US local)</p>
          </div>
        )}
        {pricingType === 'percentage_markup' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Markup (%)</label>
            <input type="text" className="input w-full" placeholder="20" value={markupPercent} onChange={e => setMarkupPercent(e.target.value)} />
          </div>
        )}
        {pricingType === 'fixed_price' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Fixed Price ($)</label>
            <input type="text" className="input w-full" placeholder="5.00" value={basePrice} onChange={e => setBasePrice(e.target.value)} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={allowPurchase} onChange={e => setAllowPurchase(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
            <div>
              <span className="text-sm font-medium">Allow Tenant Purchase</span>
              <p className="text-xs text-gray-500">Tenants can buy numbers via API</p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" checked={allowRelease} onChange={e => setAllowRelease(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
            <div>
              <span className="text-sm font-medium">Allow Tenant Release</span>
              <p className="text-xs text-gray-500">Tenants can release numbers via API</p>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={savePricing} className="btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Pricing'}
          </button>
          {pricingSaved && <span className="text-sm text-green-600 font-medium">Saved successfully</span>}
        </div>
      </div>
    </div>
  );
}
