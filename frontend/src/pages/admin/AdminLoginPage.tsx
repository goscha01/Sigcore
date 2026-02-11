import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, AlertCircle } from 'lucide-react';
import { useAdminAuthStore } from '../../store/adminAuthStore';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, clearError, isAuthenticated, loadFromStorage } = useAdminAuthStore();
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!apiKey.trim()) return;

    try {
      await login(apiKey.trim());
      navigate('/admin/dashboard', { replace: true });
    } catch {
      // Error is set in the store
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img src="/logo.png" alt="Sigcore" className="h-14 w-auto" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Sign in with your workspace API key
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                Workspace API Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="apiKey"
                  type="password"
                  className="input w-full pl-10"
                  placeholder="callio_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use a workspace-scoped API key to access admin features
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading || !apiKey.trim()}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
