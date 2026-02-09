import axios, { AxiosInstance } from 'axios';
import type {
  PortalTenantProfile,
  PortalAuthResponse,
  PortalPhoneNumber,
  PortalOrder,
  PortalBilling,
  ApiResponse,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

class PortalApiService {
  private client: AxiosInstance;
  private apiKey: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/portal`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load key from storage
    this.apiKey = localStorage.getItem('tenantApiKey');
    if (this.apiKey) {
      this.client.defaults.headers.common['X-API-Key'] = this.apiKey;
    }

    // Response interceptor for 401
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearAuth();
          window.location.href = '/portal/login';
        }
        return Promise.reject(error);
      },
    );
  }

  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('tenantApiKey', key);
    this.client.defaults.headers.common['X-API-Key'] = key;
  }

  clearAuth() {
    this.apiKey = null;
    localStorage.removeItem('tenantApiKey');
    localStorage.removeItem('tenantProfile');
    localStorage.removeItem('tenantApiKeyInfo');
    delete this.client.defaults.headers.common['X-API-Key'];
  }

  isAuthenticated(): boolean {
    return !!this.apiKey;
  }

  async authenticate(apiKey: string): Promise<PortalAuthResponse> {
    const response = await this.client.post<ApiResponse<PortalAuthResponse>>('/auth', { apiKey });
    return response.data.data;
  }

  async getAccount(): Promise<PortalTenantProfile> {
    const response = await this.client.get<ApiResponse<PortalTenantProfile>>('/account');
    return response.data.data;
  }

  async getPhoneNumbers(): Promise<PortalPhoneNumber[]> {
    const response = await this.client.get<ApiResponse<PortalPhoneNumber[]>>('/phone-numbers');
    return response.data.data;
  }

  async getOrders(): Promise<PortalOrder[]> {
    const response = await this.client.get<ApiResponse<PortalOrder[]>>('/orders');
    return response.data.data;
  }

  async getBilling(): Promise<PortalBilling> {
    const response = await this.client.get<ApiResponse<PortalBilling>>('/billing');
    return response.data.data;
  }
}

export const portalApi = new PortalApiService();
