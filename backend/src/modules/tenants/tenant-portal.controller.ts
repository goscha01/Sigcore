import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { PhoneNumberProvisioningService } from './phone-number-provisioning.service';
import { ApiKeysService } from '../api/api-keys.service';
import { SigcoreAuthGuard } from '../auth/sigcore-auth.guard';
import { WorkspaceId, TenantId } from '../auth/decorators/workspace-id.decorator';

/**
 * Tenant Portal Controller
 * Self-service portal endpoints authenticated with tenant API keys
 */
@Controller('portal')
export class TenantPortalController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly provisioningService: PhoneNumberProvisioningService,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  /**
   * Authenticate with a tenant API key
   * POST /api/portal/auth
   * No guard - validates the API key in the body
   */
  @Post('auth')
  @HttpCode(HttpStatus.OK)
  async authenticate(@Body() dto: { apiKey: string }) {
    if (!dto.apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    const keyRecord = await this.apiKeysService.validateTenantApiKey(dto.apiKey);

    if (!keyRecord || !keyRecord.tenantId || !keyRecord.tenant) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (keyRecord.tenant.status !== 'active') {
      throw new UnauthorizedException('Tenant account is not active');
    }

    // Get phone number count
    const phoneNumbers = await this.tenantsService.getTenantPhoneNumbers(
      keyRecord.workspaceId,
      keyRecord.tenantId,
    );

    return {
      data: {
        tenant: {
          id: keyRecord.tenant.id,
          name: keyRecord.tenant.name,
          externalId: keyRecord.tenant.externalId,
          status: keyRecord.tenant.status,
          createdAt: keyRecord.tenant.createdAt,
          phoneNumberCount: phoneNumbers.length,
        },
        apiKey: {
          id: keyRecord.id,
          name: keyRecord.name,
          createdAt: keyRecord.createdAt,
          lastUsedAt: keyRecord.lastUsedAt,
        },
      },
    };
  }

  /**
   * Get tenant account info
   * GET /api/portal/account
   */
  @Get('account')
  @UseGuards(SigcoreAuthGuard)
  async getAccount(
    @WorkspaceId() workspaceId: string,
    @TenantId() tenantId: string,
  ) {
    const tenant = await this.tenantsService.getTenant(workspaceId, tenantId);
    const phoneNumbers = await this.tenantsService.getTenantPhoneNumbers(workspaceId, tenantId);

    return {
      data: {
        id: tenant.id,
        name: tenant.name,
        externalId: tenant.externalId,
        status: tenant.status,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        phoneNumberCount: phoneNumbers.length,
      },
    };
  }

  /**
   * Get tenant's phone numbers
   * GET /api/portal/phone-numbers
   */
  @Get('phone-numbers')
  @UseGuards(SigcoreAuthGuard)
  async getPhoneNumbers(
    @WorkspaceId() workspaceId: string,
    @TenantId() tenantId: string,
  ) {
    const phoneNumbers = await this.tenantsService.getTenantPhoneNumbers(workspaceId, tenantId);
    return {
      data: phoneNumbers.map((pn) => ({
        id: pn.id,
        phoneNumber: pn.phoneNumber,
        friendlyName: pn.friendlyName,
        provider: pn.provider,
        channel: pn.channel,
        status: pn.status,
        isDefault: pn.isDefault,
        provisionedViaCallio: pn.provisionedViaCallio,
        monthlyCost: pn.monthlyCost,
        provisionedAt: pn.provisionedAt,
        createdAt: pn.createdAt,
        a2pStatus: pn.a2pStatus,
        messagingServiceSid: pn.messagingServiceSid,
        a2pAttachedAt: pn.a2pAttachedAt,
      })),
    };
  }

  /**
   * Get tenant's order history
   * GET /api/portal/orders
   */
  @Get('orders')
  @UseGuards(SigcoreAuthGuard)
  async getOrders(
    @WorkspaceId() workspaceId: string,
    @TenantId() tenantId: string,
  ) {
    const orders = await this.provisioningService.getTenantOrderHistory(workspaceId, tenantId);
    return { data: orders };
  }

  /**
   * Get billing info for the tenant
   * GET /api/portal/billing
   */
  @Get('billing')
  @UseGuards(SigcoreAuthGuard)
  async getBilling(
    @WorkspaceId() workspaceId: string,
    @TenantId() tenantId: string,
  ) {
    const pricingConfig = await this.provisioningService.getPricingConfig(workspaceId);
    const phoneNumbers = await this.tenantsService.getTenantPhoneNumbers(workspaceId, tenantId);
    const orders = await this.provisioningService.getTenantOrderHistory(workspaceId, tenantId);

    // Calculate monthly costs from active provisioned numbers
    const provisionedNumbers = phoneNumbers.filter((pn) => pn.provisionedViaCallio);
    const totalMonthlyCost = provisionedNumbers.reduce(
      (sum, pn) => sum + (Number(pn.monthlyCost) || 0),
      0,
    );

    const completedOrders = orders.filter((o) => o.status === 'active' || o.status === 'released');
    const totalSpent = completedOrders.reduce(
      (sum, o) => sum + (Number(o.totalPrice) || 0),
      0,
    );

    return {
      data: {
        pricing: {
          pricingType: pricingConfig.pricingType,
          setupFee: pricingConfig.setupFee,
        },
        summary: {
          activeNumbers: phoneNumbers.filter((pn) => pn.status === 'active').length,
          provisionedNumbers: provisionedNumbers.length,
          totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100,
          totalOrders: orders.length,
          totalSpent: Math.round(totalSpent * 100) / 100,
        },
      },
    };
  }
}
