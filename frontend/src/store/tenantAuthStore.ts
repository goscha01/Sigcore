import { create } from 'zustand';
import { portalApi } from '../services/portalApi';
import type { PortalTenantProfile, PortalApiKeyInfo } from '../types';

interface TenantAuthState {
  tenantProfile: PortalTenantProfile | null;
  apiKeyInfo: PortalApiKeyInfo | null;
  loading: boolean;
  error: string | null;

  login: (apiKey: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
  isAuthenticated: () => boolean;
  clearError: () => void;
}

export const useTenantAuthStore = create<TenantAuthState>((set) => ({
  tenantProfile: null,
  apiKeyInfo: null,
  loading: false,
  error: null,

  login: async (apiKey: string) => {
    set({ loading: true, error: null });
    try {
      const result = await portalApi.authenticate(apiKey);

      portalApi.setApiKey(apiKey);

      localStorage.setItem('tenantProfile', JSON.stringify(result.tenant));
      localStorage.setItem('tenantApiKeyInfo', JSON.stringify(result.apiKey));

      set({
        tenantProfile: result.tenant,
        apiKeyInfo: result.apiKey,
        loading: false,
      });
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || 'Authentication failed';
      set({ error: message, loading: false });
      throw error;
    }
  },

  logout: () => {
    portalApi.clearAuth();
    set({
      tenantProfile: null,
      apiKeyInfo: null,
      error: null,
    });
  },

  loadFromStorage: () => {
    const profileStr = localStorage.getItem('tenantProfile');
    const apiKeyStr = localStorage.getItem('tenantApiKeyInfo');
    const apiKey = localStorage.getItem('tenantApiKey');

    if (profileStr && apiKey) {
      try {
        const tenantProfile = JSON.parse(profileStr);
        const apiKeyInfo = apiKeyStr ? JSON.parse(apiKeyStr) : null;
        set({ tenantProfile, apiKeyInfo });
      } catch {
        portalApi.clearAuth();
      }
    }
  },

  isAuthenticated: () => {
    return portalApi.isAuthenticated();
  },

  clearError: () => set({ error: null }),
}));
