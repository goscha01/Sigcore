import axios, { AxiosInstance } from 'axios';
import type {
  Tenant,
  TenantPhoneNumber,
  AvailablePhoneNumber,
  CreateTenantDto,
  AllocatePhoneNumberDto,
  PricingConfig,
  UpdatePricingConfigDto,
  PhoneNumberOrder,
  TenantApiKeyResponse,
  TenantApiKeyInfo,
  WorkspaceApiKey,
  WorkspaceApiKeyCreateResponse,
  ApiResponse,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

class AdminApiService {
  private client: AxiosInstance;
  private apiKey: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load key from storage
    this.apiKey = localStorage.getItem('adminApiKey');
    if (this.apiKey) {
      this.client.defaults.headers.common['X-API-Key'] = this.apiKey;
    }

    // Response interceptor for 401
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearAuth();
          window.location.href = '/admin/login';
        }
        return Promise.reject(error);
      },
    );
  }

  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('adminApiKey', key);
    this.client.defaults.headers.common['X-API-Key'] = key;
  }

  clearAuth() {
    this.apiKey = null;
    localStorage.removeItem('adminApiKey');
    delete this.client.defaults.headers.common['X-API-Key'];
  }

  isAuthenticated(): boolean {
    return !!this.apiKey;
  }

  // Validate key by fetching tenants
  async validate(): Promise<boolean> {
    try {
      await this.client.get<ApiResponse<Tenant[]>>('/tenants');
      return true;
    } catch {
      return false;
    }
  }

  // ==================== Tenants ====================

  async getTenants(): Promise<Tenant[]> {
    const response = await this.client.get<ApiResponse<Tenant[]>>('/tenants');
    return response.data.data;
  }

  async createTenant(data: CreateTenantDto): Promise<Tenant> {
    const response = await this.client.post<ApiResponse<Tenant>>('/tenants', data);
    return response.data.data;
  }

  async deleteTenant(tenantId: string): Promise<void> {
    await this.client.delete(`/tenants/${tenantId}`);
  }

  // ==================== Phone Numbers ====================

  async getAvailablePhoneNumbers(): Promise<AvailablePhoneNumber[]> {
    const response = await this.client.get<ApiResponse<AvailablePhoneNumber[]>>('/tenants/phone-numbers/available');
    return response.data.data;
  }

  async allocatePhoneNumber(tenantId: string, data: AllocatePhoneNumberDto): Promise<TenantPhoneNumber> {
    const response = await this.client.post<ApiResponse<TenantPhoneNumber>>(`/tenants/${tenantId}/phone-numbers`, data);
    return response.data.data;
  }

  async deallocatePhoneNumber(tenantId: string, allocationId: string): Promise<void> {
    await this.client.delete(`/tenants/${tenantId}/phone-numbers/${allocationId}`);
  }

  async setDefaultPhoneNumber(tenantId: string, allocationId: string): Promise<TenantPhoneNumber> {
    const response = await this.client.post<ApiResponse<TenantPhoneNumber>>(`/tenants/${tenantId}/phone-numbers/${allocationId}/default`);
    return response.data.data;
  }

  async retryA2PAttachment(tenantId: string, allocationId: string): Promise<{ success: boolean; a2pStatus: string; error?: string }> {
    const response = await this.client.post<ApiResponse<{ success: boolean; a2pStatus: string; error?: string }>>(`/tenants/${tenantId}/phone-numbers/${allocationId}/retry-a2p`);
    return response.data.data;
  }

  // ==================== Pricing & Orders ====================

  async getPricingConfig(): Promise<PricingConfig> {
    const response = await this.client.get<ApiResponse<PricingConfig>>('/tenants/pricing');
    return response.data.data;
  }

  async updatePricingConfig(data: UpdatePricingConfigDto): Promise<PricingConfig> {
    const response = await this.client.put<ApiResponse<PricingConfig>>('/tenants/pricing', data);
    return response.data.data;
  }

  async getWorkspaceOrders(): Promise<PhoneNumberOrder[]> {
    const response = await this.client.get<ApiResponse<PhoneNumberOrder[]>>('/tenants/phone-numbers/orders');
    return response.data.data;
  }

  // ==================== Tenant API Keys ====================

  async createTenantApiKey(tenantId: string, name: string): Promise<TenantApiKeyResponse> {
    const response = await this.client.post<ApiResponse<TenantApiKeyResponse>>(`/tenants/${tenantId}/api-keys`, { name });
    return response.data.data;
  }

  async getTenantApiKeys(tenantId: string): Promise<TenantApiKeyInfo[]> {
    const response = await this.client.get<ApiResponse<TenantApiKeyInfo[]>>(`/tenants/${tenantId}/api-keys`);
    return response.data.data;
  }

  async deleteTenantApiKey(tenantId: string, keyId: string): Promise<void> {
    await this.client.delete(`/tenants/${tenantId}/api-keys/${keyId}`);
  }

  // ==================== Workspace API Keys ====================

  async getApiKeys(): Promise<WorkspaceApiKey[]> {
    const response = await this.client.get<{ data: WorkspaceApiKey[] }>('/api-keys');
    return response.data.data;
  }

  async createApiKey(name: string): Promise<WorkspaceApiKeyCreateResponse> {
    const response = await this.client.post<{ data: WorkspaceApiKeyCreateResponse }>('/api-keys', { name });
    return response.data.data;
  }

  async deleteApiKey(keyId: string): Promise<void> {
    await this.client.delete(`/api-keys/${keyId}`);
  }

  async toggleApiKey(keyId: string): Promise<WorkspaceApiKey> {
    const response = await this.client.patch<{ data: WorkspaceApiKey }>(`/api-keys/${keyId}/toggle`);
    return response.data.data;
  }

  // ==================== Integration Testing ====================

  async getIntegrations(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/integrations/all');
    return response.data.data;
  }

  async connectOpenPhone(apiKey: string): Promise<any> {
    const response = await this.client.post<ApiResponse<any>>('/integrations/openphone/connect', { apiKey });
    return response.data.data;
  }

  async setupTwilio(data: {
    accountSid: string;
    authToken: string;
    phoneNumber?: string;
    phoneNumberSid?: string;
    friendlyName?: string;
  }): Promise<any> {
    const response = await this.client.post<ApiResponse<any>>('/integrations/twilio', data);
    return response.data.data;
  }

  async getOpenPhoneNumbers(): Promise<any[]> {
    const response = await this.client.get<ApiResponse<any[]>>('/integrations/openphone/numbers');
    return response.data.data;
  }

  async getTwilioPhoneNumbers(): Promise<any[]> {
    const response = await this.client.get<ApiResponse<any[]>>('/integrations/twilio/phone-numbers');
    return response.data.data;
  }

  async startSync(options?: { provider?: string; limit?: number }): Promise<any> {
    const response = await this.client.post<ApiResponse<any>>('/integrations/sync', options);
    return response.data.data;
  }

  async getSyncStatus(): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>('/integrations/sync/status');
    return response.data.data;
  }

  async getConversations(params?: { provider?: string; limit?: number }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.provider) queryParams.append('provider', params.provider);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await this.client.get<any>(`/v1/conversations?${queryParams.toString()}`);
    return response.data;
  }
}

export const adminApi = new AdminApiService();
