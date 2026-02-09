import { create } from 'zustand';
import { adminApi } from '../services/adminApi';

interface AdminAuthState {
  authenticated: boolean;
  loading: boolean;
  error: string | null;

  login: (apiKey: string) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
  isAuthenticated: () => boolean;
  clearError: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  authenticated: false,
  loading: false,
  error: null,

  login: async (apiKey: string) => {
    set({ loading: true, error: null });
    try {
      adminApi.setApiKey(apiKey);
      const valid = await adminApi.validate();
      if (!valid) {
        adminApi.clearAuth();
        throw new Error('Invalid API key');
      }
      set({ authenticated: true, loading: false });
    } catch (error: any) {
      adminApi.clearAuth();
      const message =
        error.response?.data?.message || error.message || 'Authentication failed';
      set({ error: message, loading: false, authenticated: false });
      throw error;
    }
  },

  logout: () => {
    adminApi.clearAuth();
    set({ authenticated: false, error: null });
  },

  loadFromStorage: () => {
    if (adminApi.isAuthenticated()) {
      set({ authenticated: true });
    }
  },

  isAuthenticated: () => {
    return adminApi.isAuthenticated();
  },

  clearError: () => set({ error: null }),
}));
