import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Phone,
  Trash2,
  Check,
  X,
  Star,
  Building2,
  Loader2,
  AlertCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Key,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import type { Tenant, AvailablePhoneNumber, TenantApiKeyInfo } from '../../types';

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [availablePhoneNumbers, setAvailablePhoneNumbers] = useState<AvailablePhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTenantExternalId, setNewTenantExternalId] = useState('');
  const [newTenantName, setNewTenantName] = useState('');
  const [creating, setCreating] = useState(false);

  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocatingTenantId, setAllocatingTenantId] = useState<string | null>(null);
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<AvailablePhoneNumber | null>(null);
  const [allocating, setAllocating] = useState(false);

  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);

  const [tenantApiKeys, setTenantApiKeys] = useState<Record<string, TenantApiKeyInfo[]>>({});
  const [newKeyFullValue, setNewKeyFullValue] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tenantsData, phoneNumbersData] = await Promise.all([
        adminApi.getTenants(),
        adminApi.getAvailablePhoneNumbers(),
      ]);
      setTenants(tenantsData);
      setAvailablePhoneNumbers(phoneNumbersData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    if (!newTenantExternalId.trim() || !newTenantName.trim()) return;
    try {
      setCreating(true);
      const tenant = await adminApi.createTenant({
        externalId: newTenantExternalId.trim(),
        name: newTenantName.trim(),
      });
      setTenants([tenant, ...tenants]);
      setShowCreateModal(false);
      setNewTenantExternalId('');
      setNewTenantName('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant? This will also remove all phone number allocations.')) return;
    try {
      await adminApi.deleteTenant(tenantId);
      setTenants(tenants.filter(t => t.id !== tenantId));
      const phoneNumbersData = await adminApi.getAvailablePhoneNumbers();
      setAvailablePhoneNumbers(phoneNumbersData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete tenant');
    }
  };

  const openAllocateModal = (tenantId: string) => {
    setAllocatingTenantId(tenantId);
    setSelectedPhoneNumber(null);
    setShowAllocateModal(true);
  };

  const handleAllocatePhoneNumber = async () => {
    if (!allocatingTenantId || !selectedPhoneNumber) return;
    try {
      setAllocating(true);
      const allocation = await adminApi.allocatePhoneNumber(allocatingTenantId, {
        phoneNumber: selectedPhoneNumber.phoneNumber,
        provider: selectedPhoneNumber.provider,
        providerId: selectedPhoneNumber.providerId,
        friendlyName: selectedPhoneNumber.friendlyName || undefined,
        isDefault: true,
      });
      setTenants(tenants.map(t => {
        if (t.id === allocatingTenantId) {
          return { ...t, phoneNumbers: [...(t.phoneNumbers || []), allocation] };
        }
        return t;
      }));
      setAvailablePhoneNumbers(availablePhoneNumbers.map(pn => {
        if (pn.phoneNumber === selectedPhoneNumber.phoneNumber) {
          return { ...pn, allocated: true, allocatedTo: { tenantId: allocatingTenantId, tenantName: tenants.find(t => t.id === allocatingTenantId)?.name || '' } };
        }
        return pn;
      }));
      setShowAllocateModal(false);
      setAllocatingTenantId(null);
      setSelectedPhoneNumber(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to allocate phone number');
    } finally {
      setAllocating(false);
    }
  };

  const handleDeallocatePhoneNumber = async (tenantId: string, allocationId: string, phoneNumber: string) => {
    if (!confirm('Are you sure you want to remove this phone number from the tenant?')) return;
    try {
      await adminApi.deallocatePhoneNumber(tenantId, allocationId);
      setTenants(tenants.map(t => {
        if (t.id === tenantId) {
          return { ...t, phoneNumbers: (t.phoneNumbers || []).filter(pn => pn.id !== allocationId) };
        }
        return t;
      }));
      setAvailablePhoneNumbers(availablePhoneNumbers.map(pn => {
        if (pn.phoneNumber === phoneNumber) {
          return { ...pn, allocated: false, allocatedTo: undefined };
        }
        return pn;
      }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deallocate phone number');
    }
  };

  const handleSetDefault = async (tenantId: string, allocationId: string) => {
    try {
      await adminApi.setDefaultPhoneNumber(tenantId, allocationId);
      setTenants(tenants.map(t => {
        if (t.id === tenantId) {
          return { ...t, phoneNumbers: (t.phoneNumbers || []).map(pn => ({ ...pn, isDefault: pn.id === allocationId })) };
        }
        return t;
      }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set default phone number');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const loadTenantApiKeys = async (tenantId: string) => {
    try {
      const keys = await adminApi.getTenantApiKeys(tenantId);
      setTenantApiKeys((prev) => ({ ...prev, [tenantId]: keys }));
    } catch {
      // Silently fail
    }
  };

  const handleGenerateApiKey = async (tenantId: string) => {
    try {
      setGeneratingKey(true);
      setNewKeyFullValue(null);
      const result = await adminApi.createTenantApiKey(tenantId, 'Portal Key');
      setNewKeyFullValue(result.key);
      await loadTenantApiKeys(tenantId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate API key');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleRevokeApiKey = async (tenantId: string, keyId: string) => {
    if (!confirm('Are you sure? The tenant will lose access to the portal.')) return;
    try {
      await adminApi.deleteTenantApiKey(tenantId, keyId);
      await loadTenantApiKeys(tenantId);
      setNewKeyFullValue(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to revoke API key');
    }
  };

  const handleRetryA2P = async (tenantId: string, allocationId: string) => {
    try {
      const result = await adminApi.retryA2PAttachment(tenantId, allocationId);
      setTenants(tenants.map(t => {
        if (t.id === tenantId) {
          return { ...t, phoneNumbers: (t.phoneNumbers || []).map(pn => pn.id === allocationId ? { ...pn, a2pStatus: result.a2pStatus } : pn) };
        }
        return t;
      }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to retry A2P attachment');
    }
  };

  const handleToggleExpand = (tenantId: string) => {
    const isExpanding = expandedTenantId !== tenantId;
    setExpandedTenantId(isExpanding ? tenantId : null);
    setNewKeyFullValue(null);
    if (isExpanding) {
      loadTenantApiKeys(tenantId);
    }
  };

  const unallocatedPhoneNumbers = availablePhoneNumbers.filter(pn => !pn.allocated);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage clients and their phone number allocations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Tenant
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Tenants</p>
              <p className="text-2xl font-bold">{tenants.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Available Numbers</p>
              <p className="text-2xl font-bold">{unallocatedPhoneNumbers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Allocations</p>
              <p className="text-2xl font-bold">
                {availablePhoneNumbers.filter(pn => pn.allocated).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tenants List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Tenants</h2>
        </div>
        {tenants.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No tenants yet. Create your first tenant to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => handleToggleExpand(tenant.id)}
                  >
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Building2 className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{tenant.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          tenant.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : tenant.status === 'suspended'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {tenant.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>ID: {tenant.externalId}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(tenant.id); }}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Copy tenant ID"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <span className="text-gray-300">|</span>
                        <span>{(tenant.phoneNumbers || []).length} phone numbers</span>
                      </div>
                    </div>
                    {expandedTenantId === tenant.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openAllocateModal(tenant.id)}
                      className="btn btn-secondary btn-sm flex items-center gap-1"
                      disabled={unallocatedPhoneNumbers.length === 0}
                    >
                      <Plus className="h-3 w-3" />
                      Add Number
                    </button>
                    <button
                      onClick={() => handleDeleteTenant(tenant.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                      title="Delete tenant"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {expandedTenantId === tenant.id && (
                  <div className="mt-4 pl-12">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Phone Numbers</h4>
                    {(tenant.phoneNumbers || []).length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No phone numbers allocated. Click "Add Number" to allocate one.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(tenant.phoneNumbers || []).map((pn) => (
                          <div key={pn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{pn.phoneNumber}</span>
                                  {pn.isDefault && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                                      <Star className="h-3 w-3" />
                                      Default
                                    </span>
                                  )}
                                  {pn.a2pStatus === 'ready' && (
                                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">A2P Ready</span>
                                  )}
                                  {pn.a2pStatus === 'pending' && (
                                    <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">A2P Pending</span>
                                  )}
                                  {pn.a2pStatus === 'failed' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                                      A2P Failed
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleRetryA2P(tenant.id, pn.id); }}
                                        className="ml-1 flex items-center gap-0.5 underline hover:no-underline"
                                      >
                                        <RefreshCw className="h-3 w-3" />
                                        Retry
                                      </button>
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {pn.friendlyName || pn.provider} - {pn.channel}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!pn.isDefault && (
                                <button
                                  onClick={() => handleSetDefault(tenant.id, pn.id)}
                                  className="p-1 text-yellow-500 hover:bg-yellow-50 rounded"
                                  title="Set as default"
                                >
                                  <Star className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeallocatePhoneNumber(tenant.id, pn.id, pn.phoneNumber)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                title="Remove"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* API Keys Section */}
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Portal API Keys
                      </h4>

                      {newKeyFullValue && (
                        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs font-medium text-green-800 mb-1">
                            API key generated! Copy it now — it won't be shown again.
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono bg-white px-2 py-1 rounded border border-green-200 flex-1 break-all">
                              {newKeyFullValue}
                            </code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(newKeyFullValue);
                                setCopiedKey(true);
                                setTimeout(() => setCopiedKey(false), 2000);
                              }}
                              className="flex-shrink-0 p-1 text-green-700 hover:bg-green-100 rounded"
                              title="Copy"
                            >
                              {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </button>
                          </div>
                          <p className="text-xs text-green-700 mt-2">
                            Portal URL: <code className="bg-white px-1 rounded">{window.location.origin}/portal/login</code>
                          </p>
                        </div>
                      )}

                      {(tenantApiKeys[tenant.id] || []).length > 0 ? (
                        <div className="space-y-2">
                          {(tenantApiKeys[tenant.id] || []).map((k) => (
                            <div key={k.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Key className="h-4 w-4 text-gray-400" />
                                <div>
                                  <span className="text-sm font-medium text-gray-900">{k.name}</span>
                                  <div className="text-xs text-gray-500 font-mono">{k.keyPreview}</div>
                                  {k.lastUsedAt && (
                                    <span className="text-xs text-gray-400">
                                      Last used: {new Date(k.lastUsedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRevokeApiKey(tenant.id, k.id)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded text-xs"
                                title="Revoke key"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No API keys. Generate one to give the tenant portal access.
                        </p>
                      )}

                      <button
                        onClick={() => handleGenerateApiKey(tenant.id)}
                        disabled={generatingKey}
                        className="mt-3 btn btn-secondary btn-sm flex items-center gap-1"
                      >
                        {generatingKey ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                        Generate API Key
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Phone Numbers */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Available Phone Numbers</h2>
          <p className="text-sm text-gray-500">
            Phone numbers from connected integrations that can be allocated to tenants
          </p>
        </div>
        {availablePhoneNumbers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No phone numbers available. Connect an integration first.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {availablePhoneNumbers.map((pn) => (
              <div
                key={pn.phoneNumber}
                className={`p-4 flex items-center justify-between ${pn.allocated ? 'bg-gray-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <Phone className={`h-5 w-5 ${pn.allocated ? 'text-gray-300' : 'text-green-500'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{pn.phoneNumber}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        pn.provider === 'twilio'
                          ? 'bg-red-100 text-red-700'
                          : pn.provider === 'openphone'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {pn.provider}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">{pn.friendlyName || 'No name'}</span>
                  </div>
                </div>
                <div className="text-right">
                  {pn.allocated ? (
                    <div>
                      <span className="text-sm text-gray-500">Allocated to</span>
                      <p className="font-medium text-gray-700">{pn.allocatedTo?.tenantName}</p>
                    </div>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Available</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Create Tenant</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">External ID</label>
                <input
                  type="text"
                  value={newTenantExternalId}
                  onChange={(e) => setNewTenantExternalId(e.target.value)}
                  placeholder="e.g., client_123"
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">Unique identifier from your external system</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  placeholder="e.g., Acme Corp"
                  className="input w-full"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowCreateModal(false); setNewTenantExternalId(''); setNewTenantName(''); }}
                className="btn btn-secondary"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTenant}
                className="btn btn-primary flex items-center gap-2"
                disabled={creating || !newTenantExternalId.trim() || !newTenantName.trim()}
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Allocate Phone Number Modal */}
      {showAllocateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Allocate Phone Number</h2>
            <p className="text-sm text-gray-500 mb-4">Select a phone number to allocate to this tenant</p>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {unallocatedPhoneNumbers.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No available phone numbers</p>
              ) : (
                unallocatedPhoneNumbers.map((pn) => (
                  <button
                    key={pn.phoneNumber}
                    onClick={() => setSelectedPhoneNumber(pn)}
                    className={`w-full p-3 text-left rounded-lg border-2 transition-colors ${
                      selectedPhoneNumber?.phoneNumber === pn.phoneNumber
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{pn.phoneNumber}</div>
                        <div className="text-sm text-gray-500">{pn.friendlyName || pn.provider}</div>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        pn.provider === 'twilio' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {pn.provider}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowAllocateModal(false); setAllocatingTenantId(null); setSelectedPhoneNumber(null); }}
                className="btn btn-secondary"
                disabled={allocating}
              >
                Cancel
              </button>
              <button
                onClick={handleAllocatePhoneNumber}
                className="btn btn-primary flex items-center gap-2"
                disabled={allocating || !selectedPhoneNumber}
              >
                {allocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Allocate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
