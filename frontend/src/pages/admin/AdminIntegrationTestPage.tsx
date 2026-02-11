import { useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, Phone, MessageSquare, Loader2 } from 'lucide-react';
import { adminApi } from '../../services/adminApi';

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  data?: any;
}

export default function AdminIntegrationTestPage() {
  const [openPhoneTest, setOpenPhoneTest] = useState<TestResult>({ status: 'idle' });
  const [twilioTest, setTwilioTest] = useState<TestResult>({ status: 'idle' });
  const [syncTest, setSyncTest] = useState<TestResult>({ status: 'idle' });
  const [integrationsData, setIntegrationsData] = useState<any>(null);

  // Test OpenPhone Connection
  const testOpenPhone = async () => {
    setOpenPhoneTest({ status: 'loading' });
    try {
      const numbers = await adminApi.getOpenPhoneNumbers();
      setOpenPhoneTest({
        status: 'success',
        message: `Connected successfully! Found ${numbers.length} phone numbers`,
        data: numbers,
      });
    } catch (err: any) {
      setOpenPhoneTest({
        status: 'error',
        message: err.response?.data?.message || err.message || 'Failed to connect to OpenPhone',
      });
    }
  };

  // Test Twilio Connection
  const testTwilio = async () => {
    setTwilioTest({ status: 'loading' });
    try {
      const numbers = await adminApi.getTwilioPhoneNumbers();
      setTwilioTest({
        status: 'success',
        message: `Connected successfully! Found ${numbers.length} phone numbers`,
        data: numbers,
      });
    } catch (err: any) {
      setTwilioTest({
        status: 'error',
        message: err.response?.data?.message || err.message || 'Failed to connect to Twilio',
      });
    }
  };

  // Test Phone Propagation from Twilio
  const testPhonePropagation = async () => {
    setSyncTest({ status: 'loading' });
    try {
      // First, get Twilio numbers
      const twilioNumbers = await adminApi.getTwilioPhoneNumbers();

      // Then trigger a sync
      const syncResult = await adminApi.startSync({ provider: 'twilio', limit: 10 });

      // Get sync status
      const status = await adminApi.getSyncStatus();

      setSyncTest({
        status: 'success',
        message: `Sync started! Found ${twilioNumbers.length} Twilio numbers. Sync status: ${status.status || 'running'}`,
        data: { twilioNumbers, syncResult, status },
      });
    } catch (err: any) {
      setSyncTest({
        status: 'error',
        message: err.response?.data?.message || err.message || 'Failed to test phone propagation',
      });
    }
  };

  // Load All Integrations
  const loadIntegrations = async () => {
    try {
      const integrations = await adminApi.getIntegrations();
      setIntegrationsData(integrations);
    } catch (err: any) {
      console.error('Failed to load integrations:', err);
    }
  };

  const renderTestCard = (
    title: string,
    description: string,
    icon: any,
    testResult: TestResult,
    onTest: () => void,
    color: string
  ) => {
    const Icon = icon;

    return (
      <div className="card">
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <button
            onClick={onTest}
            disabled={testResult.status === 'loading'}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {testResult.status === 'loading' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Test Connection
              </>
            )}
          </button>

          {testResult.status !== 'idle' && testResult.status !== 'loading' && (
            <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
              testResult.status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              {testResult.status === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  testResult.status === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {testResult.message}
                </p>
                {testResult.data && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                      View Details
                    </summary>
                    <pre className="mt-2 text-xs bg-white p-3 rounded border border-gray-200 overflow-auto max-h-64">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integration Tests</h1>
          <p className="text-sm text-gray-500">Test OpenPhone, Twilio, and phone propagation</p>
        </div>
        <button
          onClick={loadIntegrations}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Load Integrations
        </button>
      </div>

      {integrationsData && (
        <div className="card p-5 bg-blue-50 border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Active Integrations</h3>
          <pre className="text-xs bg-white p-3 rounded border border-blue-200 overflow-auto max-h-48">
            {JSON.stringify(integrationsData, null, 2)}
          </pre>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderTestCard(
          'OpenPhone Connection',
          'Test connection to OpenPhone and fetch phone numbers',
          Phone,
          openPhoneTest,
          testOpenPhone,
          'bg-purple-100 text-purple-600'
        )}

        {renderTestCard(
          'Twilio Connection',
          'Test connection to Twilio and fetch phone numbers',
          MessageSquare,
          twilioTest,
          testTwilio,
          'bg-red-100 text-red-600'
        )}
      </div>

      <div className="grid grid-cols-1">
        {renderTestCard(
          'Phone Propagation from Twilio',
          'Test fetching Twilio numbers and syncing them to the system',
          RefreshCw,
          syncTest,
          testPhonePropagation,
          'bg-blue-100 text-blue-600'
        )}
      </div>

      <div className="card p-5 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Test Instructions</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">1.</span>
            <span>Make sure you have configured integrations with valid OpenPhone and Twilio credentials in the workspace settings.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">2.</span>
            <span>Test OpenPhone connection to verify API key is valid and fetch available phone numbers.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">3.</span>
            <span>Test Twilio connection to verify Account SID and Auth Token are correct and fetch phone numbers.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">4.</span>
            <span>Test phone propagation to verify that Twilio numbers can be synced and used in the system.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">5.</span>
            <span>Click "Load Integrations" to see all configured integrations in the workspace.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
