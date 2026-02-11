import { useState } from 'react';
import { Book, Copy, Check } from 'lucide-react';

interface Endpoint {
  method: string;
  path: string;
  description: string;
  auth: string;
  body?: any;
  response?: any;
}

export default function AdminApiDocsPage() {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const baseUrl = import.meta.env.VITE_API_URL || 'https://your-api-domain.com/api';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(id);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const endpoints: { category: string; items: Endpoint[] }[] = [
    {
      category: 'Authentication',
      items: [
        {
          method: 'POST',
          path: '/integrations/openphone/connect',
          description: 'Connect OpenPhone integration',
          auth: 'X-API-Key',
          body: { apiKey: 'your_openphone_api_key' },
          response: { id: 'int_123', provider: 'openphone', status: 'active' },
        },
        {
          method: 'POST',
          path: '/integrations/twilio',
          description: 'Setup Twilio integration',
          auth: 'X-API-Key',
          body: { accountSid: 'AC...', authToken: 'your_token', phoneNumber: '+1234567890' },
          response: { id: 'int_456', provider: 'twilio', status: 'active' },
        },
      ],
    },
    {
      category: 'Integrations',
      items: [
        {
          method: 'GET',
          path: '/integrations/all',
          description: 'Get all configured integrations',
          auth: 'X-API-Key',
          response: [{ id: 'int_123', provider: 'openphone', status: 'active' }],
        },
        {
          method: 'GET',
          path: '/integrations/openphone/numbers',
          description: 'Get OpenPhone phone numbers',
          auth: 'X-API-Key',
          response: [{ id: 'PN123', phoneNumber: '+1234567890', name: 'Main Line' }],
        },
        {
          method: 'GET',
          path: '/integrations/twilio/phone-numbers',
          description: 'Get Twilio phone numbers',
          auth: 'X-API-Key',
          response: [{ sid: 'PN...', phoneNumber: '+1234567890', capabilities: { sms: true, voice: true } }],
        },
        {
          method: 'DELETE',
          path: '/integrations/openphone/disconnect',
          description: 'Disconnect OpenPhone integration',
          auth: 'X-API-Key',
          response: { success: true },
        },
        {
          method: 'DELETE',
          path: '/integrations/twilio',
          description: 'Delete Twilio integration',
          auth: 'X-API-Key',
          response: { success: true },
        },
      ],
    },
    {
      category: 'Conversations',
      items: [
        {
          method: 'GET',
          path: '/v1/conversations?provider=openphone&limit=10',
          description: 'Get conversations from a provider',
          auth: 'X-API-Key',
          response: { data: [{ id: 'conv_123', participants: ['+1234567890'], lastMessageAt: '2026-02-10T...' }], meta: { total: 100, page: 1 } },
        },
        {
          method: 'GET',
          path: '/v1/conversations/:id',
          description: 'Get a specific conversation',
          auth: 'X-API-Key',
          response: { id: 'conv_123', participants: ['+1234567890'], messages: [] },
        },
        {
          method: 'GET',
          path: '/v1/conversations/:id/messages',
          description: 'Get messages in a conversation',
          auth: 'X-API-Key',
          response: { data: [{ id: 'msg_123', body: 'Hello', direction: 'inbound', createdAt: '2026-02-10T...' }] },
        },
        {
          method: 'POST',
          path: '/v1/conversations/:id/messages',
          description: 'Send a message to a conversation',
          auth: 'X-API-Key',
          body: { body: 'Hello, how can I help?', from: '+1234567890' },
          response: { id: 'msg_456', body: 'Hello, how can I help?', status: 'sent' },
        },
      ],
    },
    {
      category: 'Messages',
      items: [
        {
          method: 'POST',
          path: '/messages',
          description: 'Send a message',
          auth: 'X-API-Key',
          body: { to: '+1234567890', from: '+0987654321', body: 'Hello!', channel: 'sms' },
          response: { id: 'msg_789', status: 'sent', externalId: 'twilio_msg_id' },
        },
        {
          method: 'POST',
          path: '/v1/messages',
          description: 'Send message by phone number',
          auth: 'X-API-Key',
          body: { to: '+1234567890', from: '+0987654321', body: 'Hello!' },
          response: { success: true, messageId: 'msg_789' },
        },
      ],
    },
    {
      category: 'Calls',
      items: [
        {
          method: 'GET',
          path: '/v1/conversations/:id/calls',
          description: 'Get calls in a conversation',
          auth: 'X-API-Key',
          response: { data: [{ id: 'call_123', direction: 'inbound', duration: 120, status: 'completed' }] },
        },
        {
          method: 'POST',
          path: '/contacts/:contactId/calls/initiate',
          description: 'Initiate a call to a contact',
          auth: 'X-API-Key',
          body: { from: '+1234567890' },
          response: { type: 'deeplink', url: 'openphone://call?to=+1234567890' },
        },
        {
          method: 'GET',
          path: '/calls/:callId/transcript',
          description: 'Get call transcript',
          auth: 'X-API-Key',
          response: { transcript: 'Hello, how are you?', confidence: 0.95 },
        },
        {
          method: 'GET',
          path: '/calls/:callId/recordings',
          description: 'Get call recordings',
          auth: 'X-API-Key',
          response: [{ id: 'rec_123', url: 'https://...', duration: 120 }],
        },
      ],
    },
    {
      category: 'Phone Numbers',
      items: [
        {
          method: 'GET',
          path: '/tenants/phone-numbers/search?country=US&areaCode=415&smsCapable=true',
          description: 'Search available phone numbers',
          auth: 'X-API-Key',
          response: [{ phoneNumber: '+14155551234', locality: 'San Francisco', pricing: { twilioCost: 1.00, totalMonthlyPrice: 1.50 } }],
        },
        {
          method: 'POST',
          path: '/tenants/:id/phone-numbers/purchase',
          description: 'Purchase a phone number for tenant',
          auth: 'X-API-Key',
          body: { phoneNumber: '+14155551234', friendlyName: 'Support Line' },
          response: { success: true, order: { id: 'order_123', status: 'provisioning' } },
        },
        {
          method: 'GET',
          path: '/v1/phone-numbers',
          description: 'Get all phone numbers',
          auth: 'X-API-Key',
          response: [{ id: 'pn_123', phoneNumber: '+1234567890', provider: 'twilio', status: 'active' }],
        },
      ],
    },
    {
      category: 'Tenants',
      items: [
        {
          method: 'GET',
          path: '/tenants',
          description: 'Get all tenants',
          auth: 'X-API-Key (admin)',
          response: [{ id: 'ten_123', name: 'Acme Corp', status: 'active', phoneNumbers: [] }],
        },
        {
          method: 'POST',
          path: '/tenants',
          description: 'Create a new tenant',
          auth: 'X-API-Key (admin)',
          body: { externalId: 'acme_123', name: 'Acme Corp', metadata: {} },
          response: { id: 'ten_123', externalId: 'acme_123', name: 'Acme Corp' },
        },
        {
          method: 'DELETE',
          path: '/tenants/:id',
          description: 'Delete a tenant',
          auth: 'X-API-Key (admin)',
          response: { success: true },
        },
      ],
    },
    {
      category: 'Sync',
      items: [
        {
          method: 'POST',
          path: '/integrations/sync',
          description: 'Start background sync',
          auth: 'X-API-Key',
          body: { provider: 'openphone', limit: 10 },
          response: { started: true, message: 'Sync started in background' },
        },
        {
          method: 'GET',
          path: '/integrations/sync/status',
          description: 'Get sync status',
          auth: 'X-API-Key',
          response: { status: 'running', progress: 50, total: 100 },
        },
        {
          method: 'POST',
          path: '/integrations/sync/cancel',
          description: 'Cancel running sync',
          auth: 'X-API-Key',
          response: { success: true, cancelled: true },
        },
      ],
    },
    {
      category: 'API Keys',
      items: [
        {
          method: 'GET',
          path: '/api-keys',
          description: 'List all API keys',
          auth: 'X-API-Key (admin)',
          response: [{ id: 'key_123', name: 'Production Key', keyPreview: 'sk_...xyz', active: true }],
        },
        {
          method: 'POST',
          path: '/api-keys',
          description: 'Create a new API key',
          auth: 'X-API-Key (admin)',
          body: { name: 'Production Key' },
          response: { apiKey: { id: 'key_123', name: 'Production Key' }, fullKey: 'sk_live_abc123...' },
        },
        {
          method: 'DELETE',
          path: '/api-keys/:id',
          description: 'Delete an API key',
          auth: 'X-API-Key (admin)',
          response: { success: true },
        },
      ],
    },
  ];

  const methodColors: Record<string, string> = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    PATCH: 'bg-orange-100 text-orange-800',
    DELETE: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
          <p className="text-sm text-gray-500">Complete reference for Sigcore API endpoints</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Book className="h-4 w-4" />
          <span>v1.0</span>
        </div>
      </div>

      {/* Base URL */}
      <div className="card p-5 bg-blue-50 border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Base URL</h3>
        <div className="flex items-center gap-2">
          <code className="flex-1 p-2 bg-white rounded border border-blue-200 text-sm text-blue-900 font-mono">
            {baseUrl}
          </code>
          <button
            onClick={() => copyToClipboard(baseUrl, 'base-url')}
            className="p-2 hover:bg-blue-100 rounded"
            title="Copy"
          >
            {copiedEndpoint === 'base-url' ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-blue-600" />
            )}
          </button>
        </div>
      </div>

      {/* Authentication */}
      <div className="card p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Authentication</h3>
        <p className="text-sm text-gray-600 mb-3">
          All API requests require authentication using an API key. Include your API key in the request header:
        </p>
        <code className="block p-3 bg-gray-50 rounded border border-gray-200 text-sm font-mono">
          X-API-Key: your_api_key_here
        </code>
      </div>

      {/* Endpoints by Category */}
      {endpoints.map((category) => (
        <div key={category.category} className="card">
          <div className="p-5 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">{category.category}</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {category.items.map((endpoint, idx) => {
              const endpointId = `${category.category}-${idx}`;
              const curlCommand = `curl -X ${endpoint.method} "${baseUrl}${endpoint.path}" \\
  -H "X-API-Key: your_api_key_here"${endpoint.body ? ` \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(endpoint.body, null, 2)}'` : ''}`;

              return (
                <div key={idx} className="p-5 hover:bg-gray-50">
                  <div className="flex items-start gap-3 mb-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${methodColors[endpoint.method]}`}>
                      {endpoint.method}
                    </span>
                    <div className="flex-1">
                      <code className="text-sm font-mono text-gray-900">{endpoint.path}</code>
                      <p className="text-sm text-gray-600 mt-1">{endpoint.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        <strong>Auth:</strong> {endpoint.auth}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(curlCommand, endpointId)}
                      className="p-2 hover:bg-gray-200 rounded"
                      title="Copy cURL command"
                    >
                      {copiedEndpoint === endpointId ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-600" />
                      )}
                    </button>
                  </div>

                  {endpoint.body && (
                    <details className="mb-2">
                      <summary className="text-xs font-semibold text-gray-700 cursor-pointer hover:text-gray-900">
                        Request Body
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(endpoint.body, null, 2)}
                      </pre>
                    </details>
                  )}

                  {endpoint.response && (
                    <details>
                      <summary className="text-xs font-semibold text-gray-700 cursor-pointer hover:text-gray-900">
                        Response Example
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(endpoint.response, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Response Codes */}
      <div className="card p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Response Codes</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-3">
            <code className="px-2 py-1 bg-green-100 text-green-800 rounded font-mono text-xs">200</code>
            <span className="text-gray-600">Success - Request completed successfully</span>
          </div>
          <div className="flex items-start gap-3">
            <code className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-mono text-xs">201</code>
            <span className="text-gray-600">Created - Resource created successfully</span>
          </div>
          <div className="flex items-start gap-3">
            <code className="px-2 py-1 bg-red-100 text-red-800 rounded font-mono text-xs">400</code>
            <span className="text-gray-600">Bad Request - Invalid request parameters</span>
          </div>
          <div className="flex items-start gap-3">
            <code className="px-2 py-1 bg-red-100 text-red-800 rounded font-mono text-xs">401</code>
            <span className="text-gray-600">Unauthorized - Invalid or missing API key</span>
          </div>
          <div className="flex items-start gap-3">
            <code className="px-2 py-1 bg-red-100 text-red-800 rounded font-mono text-xs">404</code>
            <span className="text-gray-600">Not Found - Resource not found</span>
          </div>
          <div className="flex items-start gap-3">
            <code className="px-2 py-1 bg-red-100 text-red-800 rounded font-mono text-xs">500</code>
            <span className="text-gray-600">Server Error - Internal server error</span>
          </div>
        </div>
      </div>
    </div>
  );
}
