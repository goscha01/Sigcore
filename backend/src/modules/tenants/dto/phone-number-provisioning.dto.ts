import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { PricingType } from '../../../database/entities';

export class SearchPhoneNumbersDto {
  @IsString()
  country: string;

  @IsString()
  @IsOptional()
  areaCode?: string;

  @IsBoolean()
  @IsOptional()
  smsCapable?: boolean;

  @IsBoolean()
  @IsOptional()
  voiceCapable?: boolean;
}

export class PurchasePhoneNumberDto {
  @IsString()
  phoneNumber: string;

  @IsString()
  @IsOptional()
  friendlyName?: string;
}

export class UpdatePricingConfigDto {
  @IsEnum(PricingType)
  @IsOptional()
  pricingType?: PricingType;

  @IsNumber()
  @IsOptional()
  @Min(0)
  monthlyBasePrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  monthlyMarkupAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1000)
  monthlyMarkupPercentage?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  setupFee?: number;

  @IsBoolean()
  @IsOptional()
  allowTenantPurchase?: boolean;

  @IsBoolean()
  @IsOptional()
  allowTenantRelease?: boolean;

  @IsString()
  @IsOptional()
  messagingServiceSid?: string;
}

// Response DTOs

export class AvailableNumberResponse {
  phoneNumber: string;
  locality?: string;
  region?: string;
  country: string;
  capabilities: string[];
  pricing: {
    twilioCost: number;
    markupAmount: number;
    totalMonthlyPrice: number;
    setupFee: number;
  };
}

export class PhoneNumberOrderResponse {
  id: string;
  workspaceId: string;
  tenantId?: string;
  phoneNumber?: string;
  orderType: string;
  status: string;
  twilioCost: number;
  markupAmount: number;
  totalPrice: number;
  createdAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export class PricingConfigResponse {
  pricingType: PricingType;
  monthlyBasePrice?: number;
  monthlyMarkupAmount: number;
  monthlyMarkupPercentage: number;
  setupFee: number;
  allowTenantPurchase: boolean;
  allowTenantRelease: boolean;
  messagingServiceSid?: string;
}

export class PurchaseResultResponse {
  success: boolean;
  order: PhoneNumberOrderResponse;
  allocation?: {
    id: string;
    phoneNumber: string;
    friendlyName?: string;
    provider: string;
    monthlyCost: number;
    provisionedAt: Date;
    a2pStatus?: string;
    messagingServiceSid?: string;
  };
  error?: string;
}

export class ReleaseResultResponse {
  success: boolean;
  order: PhoneNumberOrderResponse;
  error?: string;
}
