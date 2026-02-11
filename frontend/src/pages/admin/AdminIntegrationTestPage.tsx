import { useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, Phone, MessageSquare, Loader2, Plug } from 'lucide-react';
import { adminApi } from '../../services/adminApi';

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  data?: any;
}

export default function AdminIntegrationTestPage() {
  // Connection forms state
  const [openPhoneApiKey, setOpenPhoneApiKey] = useState('');
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState('');

  // Connection status
  const [connectingOpenPhone, setConnectingOpenPhone] = useState(false);
  const [connectingTwilio, setConnectingTwilio] = useState(false);
  const [connectionResult, setConnectionResult] = useState<TestResult>({ status: 'idle' });

  // Test results state
  const [openPhoneTest, setOpenPhoneTest] = useState<TestResult>({ status: 'idle' });
  const [openPhoneConversationsTest, setOpenPhoneConversationsTest] = useState<TestResult>({ status: 'idle' });
  const [twilioTest, setTwilioTest] = useState<TestResult>({ status: 'idle' });
  const [syncTest, setSyncTest] = useState<TestResult>({ status: 'idle' });
  const [integrationsData, setIntegrationsData] = useState<any>(null);

  // Connect OpenPhone
  const handleConnectOpenPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectingOpenPhone(true);
    setConnectionResult({ status: 'loading' });
    try {
      const result = await adminApi.connectOpenPhone(openPhoneApiKey);
      setConnectionResult({
        status: 'success',
        message: 'OpenPhone connected successfully!',
        data: result,
      });
      loadIntegrations();
    } catch (err: any) {
      setConnectionResult({
        status: 'error',
        message: err.response?.data?.message || err.message || 'Failed to connect OpenPhone',
      });
    } finally {
      setConnectingOpenPhone(false);
    }
  };

  // Connect Twilio
  const handleConnectTwilio = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectingTwilio(true);
    setConnectionResult({ status: 'loading' });
    try {
      const result = await adminApi.setupTwilio({
        accountSid: twilioAccountSid,
        authToken: twilioAuthToken,
        phoneNumber: twilioPhoneNumber || undefined,
      });
      setConnectionResult({
        status: 'success',
        message: 'Twilio connected successfully!',
        data: result,
      });
      loadIntegrations();
    } catch (err: any) {
      setConnectionResult({
        status: 'error',
        message: err.response?.data?.message || err.message || 'Failed to connect Twilio',
      });
    } finally {
      setConnectingTwilio(false);
    }
  };

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

  // Test OpenPhone Conversations
  const testOpenPhoneConversations = async () => {
    setOpenPhoneConversationsTest({ status: 'loading' });
    try {
      const result = await adminApi.getConversations({ provider: 'openphone', limit: 3 });
      const conversations = result.data || [];
      setOpenPhoneConversationsTest({
        status: 'success',
        message: `Found ${conversations.length} recent conversations from OpenPhone`,
        data: { conversations, meta: result.meta },
      });
    } catch (err: any) {
      setOpenPhoneConversationsTest({
        status: 'error',
        message: err.response?.data?.message || err.message || 'Failed to fetch OpenPhone conversations',
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
      // Step 1: Fetch Twilio phone numbers
      const twilioNumbers = await adminApi.getTwilioPhoneNumbers();

      // Step 2: Trigger sync to propagate conversations/messages into the system
      const syncResult = await adminApi.startSync({ provider: 'twilio', limit: 10 });

      // Step 3: Wait a bit for sync to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 4: Check sync status
      const status = await adminApi.getSyncStatus();

      // Step 5: Fetch conversations to see if they were propagated
      const conversations = await adminApi.getConversations({ provider: 'twilio', limit: 5 });

      setSyncTest({
        status: 'success',
        message: `Phone propagation test complete! Found ${twilioNumbers.length} Twilio numbers, synced ${conversations.data?.length || 0} conversations into the system.`,
        data: {
          twilioNumbers: twilioNumbers.slice(0, 3), // Show first 3 numbers
          syncResult,
          syncStatus: status,
          propagatedConversations: conversations.data || [],
        },
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
          <p className="text-sm text-gray-500">Connect and test OpenPhone, Twilio integrations</p>
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

      {connectionResult.status !== 'idle' && connectionResult.status !== 'loading' && (
        <div className={`card p-5 ${
          connectionResult.status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {connectionResult.status === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                connectionResult.status === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {connectionResult.message}
              </p>
              {connectionResult.data && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                    View Details
                  </summary>
                  <pre className="mt-2 text-xs bg-white p-3 rounded border border-gray-200 overflow-auto max-h-48">
                    {JSON.stringify(connectionResult.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connection Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OpenPhone Connection */}
        <div className="card">
          <div className="p-5 border-b border-gray-200 bg-purple-50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Plug className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Connect OpenPhone</h3>
                <p className="text-sm text-gray-500">Setup OpenPhone integration</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleConnectOpenPhone} className="p-5 space-y-4">
            <div>
              <label htmlFor="openphone-api-key" className="block text-sm font-medium text-gray-700 mb-1">
                OpenPhone API Key
              </label>
              <input
                id="openphone-api-key"
                type="password"
                value={openPhoneApiKey}
                onChange={(e) => setOpenPhoneApiKey(e.target.value)}
                placeholder="Enter your OpenPhone API key"
                className="input w-full"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your API key from OpenPhone dashboard
              </p>
            </div>
            <button
              type="submit"
              disabled={connectingOpenPhone || !openPhoneApiKey}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {connectingOpenPhone ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plug className="h-4 w-4" />
                  Connect OpenPhone
                </>
              )}
            </button>
          </form>
        </div>

        {/* Twilio Connection */}
        <div className="card">
          <div className="p-5 border-b border-gray-200 bg-red-50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-600">
                <Plug className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Connect Twilio</h3>
                <p className="text-sm text-gray-500">Setup Twilio integration</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleConnectTwilio} className="p-5 space-y-4">
            <div>
              <label htmlFor="twilio-account-sid" className="block text-sm font-medium text-gray-700 mb-1">
                Account SID
              </label>
              <input
                id="twilio-account-sid"
                type="text"
                value={twilioAccountSid}
                onChange={(e) => setTwilioAccountSid(e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="input w-full"
                required
              />
            </div>
            <div>
              <label htmlFor="twilio-auth-token" className="block text-sm font-medium text-gray-700 mb-1">
                Auth Token
              </label>
              <input
                id="twilio-auth-token"
                type="password"
                value={twilioAuthToken}
                onChange={(e) => setTwilioAuthToken(e.target.value)}
                placeholder="Enter your Twilio Auth Token"
                className="input w-full"
                required
              />
            </div>
            <div>
              <label htmlFor="twilio-phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (Optional)
              </label>
              <input
                id="twilio-phone"
                type="text"
                value={twilioPhoneNumber}
                onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                E.164 format (e.g., +1234567890)
              </p>
            </div>
            <button
              type="submit"
              disabled={connectingTwilio || !twilioAccountSid || !twilioAuthToken}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {connectingTwilio ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plug className="h-4 w-4" />
                  Connect Twilio
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Test Cards */}
      <div className="border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Integrations</h2>

        {/* Connection Tests */}
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

        {/* OpenPhone Conversations Test */}
        <div className="grid grid-cols-1 mt-6">
          {renderTestCard(
            'OpenPhone Last 3 Conversations',
            'Fetch the 3 most recent conversations from OpenPhone',
            MessageSquare,
            openPhoneConversationsTest,
            testOpenPhoneConversations,
            'bg-purple-100 text-purple-600'
          )}
        </div>

        {/* Propagation Test */}
        <div className="grid grid-cols-1 mt-6">
          {renderTestCard(
            'Phone Propagation from Twilio',
            'Test syncing Twilio conversations into the system database',
            RefreshCw,
            syncTest,
            testPhonePropagation,
            'bg-blue-100 text-blue-600'
          )}
        </div>
      </div>

      <div className="card p-5 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Instructions</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">1.</span>
            <span>Connect OpenPhone by entering your API key from the OpenPhone dashboard.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">2.</span>
            <span>Connect Twilio by entering your Account SID and Auth Token from Twilio console (use real or trial account credentials, not test credentials).</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">3.</span>
            <span>After connecting, test each integration to verify the connection and fetch phone numbers.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">4.</span>
            <span>Test OpenPhone conversations to see the 3 most recent conversations.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">5.</span>
            <span><strong>Test Phone Propagation:</strong> This will sync Twilio conversations and messages into your system's database. The test shows: (a) Twilio phone numbers, (b) sync status, (c) conversations now stored in your database.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">6.</span>
            <span>Click "Load Integrations" to see all configured integrations.</span>
          </li>
        </ul>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-xs font-semibold text-blue-900 mb-1">What is Propagation?</h4>
          <p className="text-xs text-blue-800">
            Propagation means syncing data from Twilio/OpenPhone into your Sigcore database. When you click "Test Phone Propagation",
            the system will fetch conversations and messages from Twilio and save them locally. This allows you to query, search,
            and analyze the data without making repeated API calls to Twilio.
          </p>
        </div>
      </div>
    </div>
  );
}
