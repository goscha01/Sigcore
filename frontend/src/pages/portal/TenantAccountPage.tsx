import { useState, useEffect } from 'react';
import { User, Copy, Check, Key, RefreshCw } from 'lucide-react';
import { portalApi } from '../../services/portalApi';
import { useTenantAuthStore } from '../../store/tenantAuthStore';
import type { PortalTenantProfile } from '../../types';

export default function TenantAccountPage() {
  const { apiKeyInfo } = useTenantAuthStore();
  const [account, setAccount] = useState<PortalTenantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const fetchAccount = async () => {
    setLoading(true);
    try {
      const data = await portalApi.getAccount();
      setAccount(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccount();
  }, []);

  const copyToClipboard = async (text: string, type: 'id' | 'key') => {
    await navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const apiKeyFromStorage = localStorage.getItem('tenantApiKey') || '';
  const maskedKey = apiKeyFromStorage
    ? `${apiKeyFromStorage.substring(0, 16)}...${apiKeyFromStorage.substring(apiKeyFromStorage.length - 8)}`
    : '';

  const statusColor = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    suspended: 'bg-red-100 text-red-800',
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
        <h1 className="text-2xl font-bold text-gray-900">Account</h1>
        <button onClick={fetchAccount} className="text-gray-400 hover:text-gray-600">
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {account && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{account.name}</h2>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[account.status]}`}>
                  {account.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tenant ID</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded font-mono">
                    {account.id}
                  </code>
                  <button
                    onClick={() => copyToClipboard(account.id, 'id')}
                    className="text-gray-400 hover:text-gray-600"
                    title="Copy Tenant ID"
                  >
                    {copiedId ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">External ID</label>
                <p className="mt-1 text-sm text-gray-900">{account.externalId}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone Numbers</label>
                <p className="mt-1 text-sm text-gray-900">{account.phoneNumberCount} allocated</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Member Since</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(account.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">API Key</h2>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{apiKeyInfo?.name || 'API Key'}</p>
                  <code className="text-sm font-mono text-gray-900">
                    {showKey ? apiKeyFromStorage : maskedKey}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {showKey ? 'Hide' : 'Reveal'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(apiKeyFromStorage, 'key')}
                    className="text-gray-400 hover:text-gray-600"
                    title="Copy API Key"
                  >
                    {copiedKey ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {apiKeyInfo?.lastUsedAt && (
                <p className="text-xs text-gray-400 mt-2">
                  Last used: {new Date(apiKeyInfo.lastUsedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
