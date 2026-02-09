import { useState, useEffect } from 'react';
import { PhoneCall, RefreshCw, Star } from 'lucide-react';
import { portalApi } from '../../services/portalApi';
import type { PortalPhoneNumber } from '../../types';

export default function TenantPhoneNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PortalPhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPhoneNumbers = async () => {
    setLoading(true);
    try {
      const data = await portalApi.getPhoneNumbers();
      setPhoneNumbers(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load phone numbers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhoneNumbers();
  }, []);

  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

  const providerColor: Record<string, string> = {
    twilio: 'bg-red-100 text-red-700',
    openphone: 'bg-blue-100 text-blue-700',
    whatsapp: 'bg-green-100 text-green-700',
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
        <h1 className="text-2xl font-bold text-gray-900">Phone Numbers</h1>
        <button onClick={fetchPhoneNumbers} className="text-gray-400 hover:text-gray-600">
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {phoneNumbers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <PhoneCall className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No phone numbers</h3>
          <p className="text-sm text-gray-500">
            No phone numbers have been allocated to your account yet.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  A2P Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly Cost
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {phoneNumbers.map((pn) => (
                <tr key={pn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{pn.phoneNumber}</span>
                      {pn.isDefault && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    {pn.friendlyName && (
                      <p className="text-xs text-gray-500">{pn.friendlyName}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${providerColor[pn.provider] || 'bg-gray-100 text-gray-700'}`}>
                      {pn.provider}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 uppercase">
                    {pn.channel}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[pn.status] || 'bg-gray-100 text-gray-700'}`}>
                      {pn.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {pn.a2pStatus === 'ready' && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Ready
                      </span>
                    )}
                    {pn.a2pStatus === 'failed' && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Failed
                      </span>
                    )}
                    {pn.a2pStatus === 'pending' && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                    {(!pn.a2pStatus || pn.a2pStatus === 'not_applicable') && (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {pn.monthlyCost ? `$${Number(pn.monthlyCost).toFixed(2)}/mo` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
