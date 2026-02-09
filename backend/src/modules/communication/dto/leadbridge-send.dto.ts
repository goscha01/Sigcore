import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Sender mode for LeadBridge integration
 */
export enum LeadBridgeSenderMode {
  SHARED = 'shared',
  DEDICATED = 'dedicated',
  OPENPHONE = 'openphone',
}

/**
 * Sender configuration for LeadBridge messages
 */
export class LeadBridgeSenderDto {
  @IsEnum(LeadBridgeSenderMode)
  mode: LeadBridgeSenderMode;

  @IsString()
  @IsOptional()
  fromNumber?: string;
}

/**
 * Metadata for LeadBridge messages
 */
export class LeadBridgeMetadataDto {
  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsString()
  @IsOptional()
  leadId?: string;

  @IsString()
  @IsOptional()
  source?: string;

  // Allow additional properties
  [key: string]: unknown;
}

/**
 * DTO for the unified send endpoint
 * POST /api/v1/messages/send
 *
 * This endpoint allows LeadBridge to send messages without managing contacts/conversations
 */
export class LeadBridgeSendMessageDto {
  /**
   * Recipient phone number in E.164 format
   * Example: "+15551234567"
   */
  @IsString()
  @IsNotEmpty()
  to: string;

  /**
   * Message body/content
   */
  @IsString()
  @IsNotEmpty()
  body: string;

  /**
   * Sender configuration
   */
  @ValidateNested()
  @Type(() => LeadBridgeSenderDto)
  sender: LeadBridgeSenderDto;

  /**
   * Optional metadata (tenantId, leadId, etc.)
   */
  @IsObject()
  @IsOptional()
  metadata?: LeadBridgeMetadataDto;

  /**
   * Optional channel override (defaults to SMS)
   */
  @IsString()
  @IsOptional()
  channel?: 'sms' | 'whatsapp';
}

/**
 * Response for the unified send endpoint
 */
export interface LeadBridgeSendMessageResponse {
  success: boolean;
  data: {
    conversationId: string;
    messageId: string;
    provider: string;
    status: string;
    fromNumber?: string;
    toNumber?: string;
  };
}
