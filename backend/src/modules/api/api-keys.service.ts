import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../../database/entities/api-key.entity';
import { randomBytes } from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  async getApiKeys(workspaceId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      where: { workspaceId, scope: 'workspace' },
      order: { createdAt: 'DESC' },
    });
  }

  async createApiKey(workspaceId: string, name: string): Promise<{ apiKey: ApiKey; key: string }> {
    // Generate a secure random API key
    const key = `callio_${randomBytes(32).toString('hex')}`;

    const apiKey = this.apiKeyRepository.create({
      workspaceId,
      name,
      key,
      scope: 'workspace',
      active: true,
    });

    await this.apiKeyRepository.save(apiKey);

    // Return the full key only on creation (it won't be shown again)
    return { apiKey, key };
  }

  async deleteApiKey(workspaceId: string, keyId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: keyId, workspaceId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.apiKeyRepository.remove(apiKey);
  }

  async toggleApiKey(workspaceId: string, keyId: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: keyId, workspaceId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    apiKey.active = !apiKey.active;
    return this.apiKeyRepository.save(apiKey);
  }

  // ==================== Tenant API Keys ====================

  async createTenantApiKey(
    workspaceId: string,
    tenantId: string,
    name: string,
  ): Promise<{ apiKey: ApiKey; key: string }> {
    const key = `callio_tenant_${randomBytes(32).toString('hex')}`;

    const apiKey = this.apiKeyRepository.create({
      workspaceId,
      tenantId,
      name,
      key,
      scope: 'tenant',
      active: true,
    });

    await this.apiKeyRepository.save(apiKey);

    return { apiKey, key };
  }

  async getTenantApiKeys(workspaceId: string, tenantId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      where: { workspaceId, tenantId, scope: 'tenant' },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteTenantApiKey(
    workspaceId: string,
    tenantId: string,
    keyId: string,
  ): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: keyId, workspaceId, tenantId, scope: 'tenant' },
    });

    if (!apiKey) {
      throw new NotFoundException('Tenant API key not found');
    }

    await this.apiKeyRepository.remove(apiKey);
  }

  async validateTenantApiKey(key: string): Promise<ApiKey | null> {
    return this.apiKeyRepository.findOne({
      where: { key, active: true, scope: 'tenant' },
      relations: ['tenant'],
    });
  }
}
