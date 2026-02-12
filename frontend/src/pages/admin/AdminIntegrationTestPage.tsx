import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, XCircle, RefreshCw, Phone, MessageSquare, Loader2, Plug, Search, ArrowUpRight, ArrowDownLeft, User, Wifi, WifiOff, Unplug } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { adminApi } from '../../services/adminApi';

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  data?: any;
}

export default function AdminIntegrationTestPage() {
  // Connection forms state - load from localStorage
  const [openPhoneApiKey, setOpenPhoneApiKey] = useState(() => localStorage.getItem('test_openphone_api_key') || '');
  const [twilioAccountSid, setTwilioAccountSid] = useState(() => localStorage.getItem('test_twilio_account_sid') || '');
  const [twilioAuthToken, setTwilioAuthToken] = useState(() => localStorage.getItem('test_twilio_auth_token') || '');
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState(() => localStorage.getItem('test_twilio_phone_number') || '');

  // Connection status
  const [connectingOpenPhone, setConnectingOpenPhone] = useState(false);
  const [connectingTwilio, setConnectingTwilio] = useState(false);
  const [disconnectingOpenPhone, setDisconnectingOpenPhone] = useState(false);
  const [disconnectingTwilio, setDisconnectingTwilio] = useState(false);
  const [connectionResult, setConnectionResult] = useState<TestResult>({ status: 'idle' });

  // Test results state
  const [openPhoneTest, setOpenPhoneTest] = useState<TestResult>({ status: 'idle' });
  const [openPhoneConversationsTest, setOpenPhoneConversationsTest] = useState<TestResult>({ status: 'idle' });
  const [twilioTest, setTwilioTest] = useState<TestResult>({ status: 'idle' });
  const [provisioningTest, setProvisioningTest] = useState<TestResult>({ status: 'idle' });
  const [integrationsData, setIntegrationsData] = useState<any>(null);

  // Phone number search filters
  const [searchAreaCode, setSearchAreaCode] = useState('');
  const [searchLocality, setSearchLocality] = useState('');
  const [searchRegion, setSearchRegion] = useState('');

  // Socket.IO state
  const socketRef = useRef<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastSocketEvent, setLastSocketEvent] = useState<string | null>(null);

  // Connect to Socket.IO when we have a workspace ID
  const connectSocket = useCallback(() => {
    const workspaceId = adminApi.getWorkspaceId();
    if (!workspaceId || socketRef.current?.connected) return;

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
    const socketUrl = apiUrl && apiUrl.startsWith('http')
      ? new URL(apiUrl).origin
      : undefined;

    const socket = io(socketUrl || window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join', workspaceId);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Listen for new messages - update conversation list in real time
    socket.on('message:new', (data: any) => {
      setLastSocketEvent(`New message from ${data.fromNumber || 'unknown'}`);
      updateConversationFromMessage(data);
    });

    socket.on('conversation:update', (data: any) => {
      setLastSocketEvent(`Conversation updated: ${data.participantPhoneNumber || 'unknown'}`);
      updateConversationFromWebhook(data);
    });

    socket.on('conversation:new', (data: any) => {
      setLastSocketEvent(`New conversation: ${data.participantPhoneNumber || 'unknown'}`);
      addNewConversation(data);
    });

    socketRef.current = socket;
  }, []);

  // Update conversations list from a message:new event
  const updateConversationFromMessage = (msg: any) => {
    setOpenPhoneConversationsTest(prev => {
      if (prev.status !== 'success' || !prev.data) return prev;
      const conversations = [...(prev.data as any[])];

      // Determine the participant phone (the external party, not our number)
      const participantPhone = msg.direction === 'incoming' ? msg.fromNumber : msg.toNumber;

      const idx = conversations.findIndex((c: any) =>
        c.participantPhone === participantPhone
      );

      if (idx >= 0) {
        // Move to top with updated info
        const conv = { ...conversations[idx] };
        conv.lastMessageAt = msg.createdAt;
        conv.lastMessagePreview = msg.body || '(no text content)';
        conv.lastMessageDirection = msg.direction;
        conversations.splice(idx, 1);
        conversations.unshift(conv);
      } else {
        // New conversation - add to top, keep max 10
        conversations.unshift({
          participantPhone,
          phoneNumber: msg.direction === 'incoming' ? msg.toNumber : msg.fromNumber,
          phoneNumberName: '',
          lastMessageAt: msg.createdAt,
          lastMessagePreview: msg.body || '(no text content)',
          lastMessageDirection: msg.direction,
          contactName: null,
        });
        if (conversations.length > 10) conversations.pop();
      }

      persistConversations(conversations);

      return {
        ...prev,
        message: `${conversations.length} conversations (live)`,
        data: conversations,
      };
    });
  };

  // Update conversations list from a conversation:update event
  const updateConversationFromWebhook = (data: any) => {
    setOpenPhoneConversationsTest(prev => {
      if (prev.status !== 'success' || !prev.data) return prev;
      const conversations = [...(prev.data as any[])];

      const idx = conversations.findIndex((c: any) =>
        c.participantPhone === data.participantPhoneNumber
      );

      if (idx >= 0) {
        const conv = { ...conversations[idx] };
        conv.lastMessageAt = data.lastMessageAt || conv.lastMessageAt;
        conv.lastMessagePreview = data.lastMessage || conv.lastMessagePreview;
        if (data.contactName) conv.contactName = data.contactName;
        if (data.phoneNumberName) conv.phoneNumberName = data.phoneNumberName;
        conversations.splice(idx, 1);
        conversations.unshift(conv);
      }

      persistConversations(conversations);

      return { ...prev, data: conversations };
    });
  };

  // Add a new conversation from conversation:new event
  const addNewConversation = (data: any) => {
    setOpenPhoneConversationsTest(prev => {
      if (prev.status !== 'success' || !prev.data) return prev;
      const conversations = [...(prev.data as any[])];

      // Don't add duplicates
      const exists = conversations.some((c: any) =>
        c.participantPhone === data.participantPhoneNumber
      );
      if (exists) return prev;

      conversations.unshift({
        participantPhone: data.participantPhoneNumber,
        phoneNumber: data.phoneNumber,
        phoneNumberName: data.phoneNumberName || '',
        lastMessageAt: data.lastMessageAt,
        lastMessagePreview: data.lastMessage || '(no text content)',
        lastMessageDirection: 'incoming',
        contactName: data.contactName || null,
      });
      if (conversations.length > 10) conversations.pop();

      persistConversations(conversations);

      return {
        ...prev,
        message: `${conversations.length} conversations (live)`,
        data: conversations,
      };
    });
  };

  // Persist conversations to localStorage
  const persistConversations = (conversations: any[]) => {
    localStorage.setItem('openphone_conversations', JSON.stringify(conversations));
    localStorage.setItem('openphone_conversations_updated', new Date().toISOString());
  };

  // Auto-load integrations and restore conversations on mount
  useEffect(() => {
    const autoRestore = async () => {
      try {
        const integrations = await adminApi.getIntegrations();
        setIntegrationsData(integrations);
        connectSocket();

        // If OpenPhone is connected, load conversations from localStorage
        const hasOpenPhone = Array.isArray(integrations)
          ? integrations.some((i: any) => i.provider === 'openphone' && i.status === 'active')
          : false;

        if (hasOpenPhone) {
          const stored = localStorage.getItem('openphone_conversations');
          const storedTime = localStorage.getItem('openphone_conversations_updated');

          if (stored) {
            try {
              const conversations = JSON.parse(stored);
              const timeLabel = storedTime
                ? `cached ${new Date(storedTime).toLocaleString()}`
                : 'cached';
              setOpenPhoneConversationsTest({
                status: 'success',
                message: `${conversations.length} conversations (${timeLabel})`,
                data: conversations,
              });
            } catch {
              localStorage.removeItem('openphone_conversations');
              setOpenPhoneConversationsTest({ status: 'success', message: 'No cached conversations. Click "Fetch Conversations" to load.', data: [] });
            }
          } else {
            setOpenPhoneConversationsTest({ status: 'success', message: 'No cached conversations. Click "Fetch Conversations" to load.', data: [] });
          }
        }
      } catch {
        // Not authenticated or server not running — ignore
      }
    };

    autoRestore();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connectSocket]);

  // Connect OpenPhone
  const handleConnectOpenPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectingOpenPhone(true);
    setConnectionResult({ status: 'loading' });
    try {
      const result = await adminApi.connectOpenPhone(openPhoneApiKey);
      // Save to localStorage on successful connection
      localStorage.setItem('test_openphone_api_key', openPhoneApiKey);
      setConnectionResult({
        status: 'success',
        message: 'OpenPhone connected successfully! Click "Fetch Conversations" to load.',
        data: result,
      });
      loadIntegrations();
      connectSocket();
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
      // Save to localStorage on successful connection
      localStorage.setItem('test_twilio_account_sid', twilioAccountSid);
      localStorage.setItem('test_twilio_auth_token', twilioAuthToken);
      localStorage.setItem('test_twilio_phone_number', twilioPhoneNumber);
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

  // Disconnect OpenPhone
  const handleDisconnectOpenPhone = async () => {
    if (!confirm('Disconnect OpenPhone? This will unregister webhooks and remove the integration.')) return;
    setDisconnectingOpenPhone(true);
    setConnectionResult({ status: 'loading' });
    try {
      await adminApi.disconnectOpenPhone();
      localStorage.removeItem('openphone_conversations');
      localStorage.removeItem('openphone_conversations_updated');
      localStorage.removeItem('test_openphone_api_key');
      setOpenPhoneApiKey('');
      setOpenPhoneConversationsTest({ status: 'idle' });
      setOpenPhoneTest({ status: 'idle' });
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketConnected(false);
      }
      setConnectionResult({ status: 'success', message: 'OpenPhone disconnected successfully.' });
      loadIntegrations();
    } catch (err: any) {
      setConnectionResult({
        status: 'error',
        message: err.response?.data?.message || err.message || 'Failed to disconnect OpenPhone',
      });
    } finally {
      setDisconnectingOpenPhone(false);
    }
  };

  // Disconnect Twilio
  const handleDisconnectTwilio = async () => {
    if (!confirm('Disconnect Twilio? This will remove the integration.')) return;
    setDisconnectingTwilio(true);
    setConnectionResult({ status: 'loading' });
    try {
      await adminApi.disconnectTwilio();
      localStorage.removeItem('test_twilio_account_sid');
      localStorage.removeItem('test_twilio_auth_token');
      localStorage.removeItem('test_twilio_phone_number');
      setTwilioAccountSid('');
      setTwilioAuthToken('');
      setTwilioPhoneNumber('');
      setTwilioTest({ status: 'idle' });
      setConnectionResult({ status: 'success', message: 'Twilio disconnected successfully.' });
      loadIntegrations();
    } catch (err: any) {
      setConnectionResult({
        status: 'error',
        message: err.response?.data?.message || err.message || 'Failed to disconnect Twilio',
      });
    } finally {
      setDisconnectingTwilio(false);
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

  // Fetch top 10 conversations directly from OpenPhone API (no DB)
  const testOpenPhoneConversations = async () => {
    setOpenPhoneConversationsTest({ status: 'loading', message: 'Fetching conversations from OpenPhone...' });
    try {
      const conversations = await adminApi.testOpenPhoneConversations(10);

      // Save to localStorage
      localStorage.setItem('openphone_conversations', JSON.stringify(conversations));
      localStorage.setItem('openphone_conversations_updated', new Date().toISOString());

      setOpenPhoneConversationsTest({
        status: 'success',
        message: `${conversations.length} conversations (from OpenPhone)`,
        data: conversations,
      });
      connectSocket();
    } catch (err: any) {
      setOpenPhoneConversationsTest({
        status: 'error',
        message: err.response?.data?.message || err.message || 'Failed to fetch OpenPhone conversations',
      });
    }
  };

  // Test Phone Number Provisioning
  const testPhoneProvisioning = async () => {
    setProvisioningTest({ status: 'loading' });
    try {
      const options: { areaCode?: string; locality?: string; region?: string } = {};
      if (searchAreaCode.trim()) options.areaCode = searchAreaCode.trim();
      if (searchLocality.trim()) options.locality = searchLocality.trim();
      if (searchRegion.trim()) options.region = searchRegion.trim();

      const availableNumbers = await adminApi.searchAvailablePhoneNumbers('US', Object.keys(options).length > 0 ? options : undefined);

      const filterDesc = [
        options.areaCode && `area code ${options.areaCode}`,
        options.locality && `city "${options.locality}"`,
        options.region && `state "${options.region}"`,
      ].filter(Boolean).join(', ');

      setProvisioningTest({
        status: 'success',
        message: `Found ${availableNumbers.length} available phone numbers${filterDesc ? ` for ${filterDesc}` : ''}.`,
        data: {
          searchFilters: { country: 'US', ...options },
          availableNumbers: availableNumbers.slice(0, 5),
          totalAvailable: availableNumbers.length,
        },
      });
    } catch (err: any) {
      setProvisioningTest({
        status: 'error',
        message: err.response?.data?.message || err.message || 'Failed to test phone number provisioning',
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


  // Load All Integrations
  const loadIntegrations = async () => {
    try {
      const integrations = await adminApi.getIntegrations();
      setIntegrationsData(integrations);
      // Connect Socket.IO once we have the workspace ID
      connectSocket();
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
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={connectingOpenPhone || !openPhoneApiKey}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
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
              {Array.isArray(integrationsData) && integrationsData.some((i: any) => i.provider === 'openphone') && (
                <button
                  type="button"
                  onClick={handleDisconnectOpenPhone}
                  disabled={disconnectingOpenPhone}
                  className="btn-secondary flex items-center justify-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
                >
                  {disconnectingOpenPhone ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unplug className="h-4 w-4" />
                  )}
                  Disconnect
                </button>
              )}
            </div>
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
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={connectingTwilio || !twilioAccountSid || !twilioAuthToken}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
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
              {Array.isArray(integrationsData) && integrationsData.some((i: any) => i.provider === 'twilio') && (
                <button
                  type="button"
                  onClick={handleDisconnectTwilio}
                  disabled={disconnectingTwilio}
                  className="btn-secondary flex items-center justify-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
                >
                  {disconnectingTwilio ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unplug className="h-4 w-4" />
                  )}
                  Disconnect
                </button>
              )}
            </div>
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
          <div className="card">
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">OpenPhone Recent Conversations</h3>
                    <p className="text-sm text-gray-500">Fetch and display last 10 conversations from OpenPhone (not stored in DB)</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {socketConnected && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <Wifi className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-green-600 font-medium">Live</span>
                      {lastSocketEvent && (
                        <span className="text-gray-400 ml-1 max-w-[200px] truncate">{lastSocketEvent}</span>
                      )}
                    </div>
                  )}
                  {!socketConnected && openPhoneConversationsTest.status === 'success' && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <WifiOff className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-400">Not connected</span>
                    </div>
                  )}
                  <button
                    onClick={testOpenPhoneConversations}
                    disabled={openPhoneConversationsTest.status === 'loading'}
                    className="btn-primary flex items-center gap-2"
                  >
                    {openPhoneConversationsTest.status === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Fetch Conversations
                  </button>
                </div>
              </div>
            </div>

            {openPhoneConversationsTest.status === 'loading' && (
              <div className="p-8 flex items-center justify-center text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Fetching conversations...
              </div>
            )}

            {openPhoneConversationsTest.status === 'error' && (
              <div className="p-5 bg-red-50">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-red-800">{openPhoneConversationsTest.message}</p>
                </div>
              </div>
            )}

            {openPhoneConversationsTest.status === 'success' && openPhoneConversationsTest.data && (
              <div>
                <div className="px-5 py-3 bg-green-50 border-b border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium text-green-800">{openPhoneConversationsTest.message}</p>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {(openPhoneConversationsTest.data as any[]).map((conv: any, idx: number) => (
                    <div key={idx} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-gray-100 flex-shrink-0">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">
                                {conv.contactName || conv.participantPhone}
                              </span>
                              {conv.contactName && (
                                <span className="text-xs text-gray-500">{conv.participantPhone}</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {new Date(conv.lastMessageAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            {conv.lastMessageDirection === 'outgoing' ? (
                              <ArrowUpRight className="h-3 w-3 text-blue-500 flex-shrink-0" />
                            ) : conv.lastMessageDirection === 'incoming' ? (
                              <ArrowDownLeft className="h-3 w-3 text-green-500 flex-shrink-0" />
                            ) : null}
                            <p className="text-sm text-gray-600 truncate">
                              {conv.lastMessagePreview || '(no text content)'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs text-gray-400">
                              via {conv.phoneNumberName || conv.phoneNumber}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Propagation Test */}
        <div className="grid grid-cols-1 mt-6">
          <div className="card">
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <Search className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Phone Number Provisioning from Twilio</h3>
                    <p className="text-sm text-gray-500">Search available Twilio phone numbers by area code, city, or state</p>
                  </div>
                </div>
                <button
                  onClick={testPhoneProvisioning}
                  disabled={provisioningTest.status === 'loading'}
                  className="btn-primary flex items-center gap-2"
                >
                  {provisioningTest.status === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search Numbers
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area Code</label>
                  <input
                    type="text"
                    value={searchAreaCode}
                    onChange={(e) => setSearchAreaCode(e.target.value)}
                    placeholder="e.g. 415, 212, 310"
                    className="input w-full"
                    maxLength={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={searchLocality}
                    onChange={(e) => setSearchLocality(e.target.value)}
                    placeholder="e.g. San Francisco"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State / Region</label>
                  <input
                    type="text"
                    value={searchRegion}
                    onChange={(e) => setSearchRegion(e.target.value)}
                    placeholder="e.g. CA, NY, TX"
                    className="input w-full"
                    maxLength={2}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">All filters are optional. Leave empty to search all available US numbers.</p>
            </div>
            {provisioningTest.status !== 'idle' && provisioningTest.status !== 'loading' && (
              <div className={`p-5 border-t ${
                provisioningTest.status === 'success' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className="flex items-start gap-3">
                  {provisioningTest.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      provisioningTest.status === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {provisioningTest.message}
                    </p>
                    {provisioningTest.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                          View Details
                        </summary>
                        <pre className="mt-2 text-xs bg-white p-3 rounded border border-gray-200 overflow-auto max-h-64">
                          {JSON.stringify(provisioningTest.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
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
            <span><strong>Test Phone Number Provisioning:</strong> This searches for available phone numbers from Twilio that can be purchased and assigned to users/tenants.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">5.</span>
            <span>Click "Load Integrations" to see all configured integrations.</span>
          </li>
        </ul>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-xs font-semibold text-blue-900 mb-1">What is Phone Number Provisioning/Propagation?</h4>
          <p className="text-xs text-blue-800">
            Phone number provisioning (propagation) is the process of purchasing phone numbers from Twilio and assigning them to your tenants/users.
            When you click "Test Phone Number Provisioning", the system searches for available phone numbers from Twilio's inventory that can be
            purchased. These numbers can then be assigned to tenants, allowing them to send/receive SMS and calls through your platform.
            The test shows available numbers with pricing information (Twilio cost + your markup).
          </p>
        </div>
      </div>
    </div>
  );
}
