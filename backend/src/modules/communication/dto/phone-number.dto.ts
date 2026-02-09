import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { SenderMode, ChannelType } from '../../../database/entities/sender.entity';

/**
 * DTO for provisioning a new phone number
 */
export class ProvisionPhoneNumberDto {
  @IsString()
  country: string; // e.g., 'US'

  @IsString()
  @IsOptional()
  areaCode?: string; // e.g., '813'

  @IsEnum(SenderMode)
  @IsOptional()
  mode?: SenderMode;

  @IsString()
  @IsOptional()
  name?: string; // Display name for the number
}

/**
 * DTO for assigning a phone number to a workspace
 */
export class AssignPhoneNumberDto {
  @IsUUID()
  senderId: string;

  @IsEnum(SenderMode)
  mode: SenderMode;

  @IsString()
  @IsOptional()
  name?: string;
}

/**
 * DTO for releasing a phone number
 */
export class ReleasePhoneNumberDto {
  @IsUUID()
  senderId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * Query params for listing phone numbers
 */
export class ListPhoneNumbersQueryDto {
  @IsEnum(SenderMode)
  @IsOptional()
  mode?: SenderMode;

  @IsEnum(ChannelType)
  @IsOptional()
  channel?: ChannelType;

  @IsString()
  @IsOptional()
  assigned?: 'true' | 'false';
}

/**
 * Response for phone number operations
 */
export interface PhoneNumberResponse {
  id: string;
  number: string;
  provider: string;
  mode: SenderMode;
  channel: ChannelType;
  name?: string;
  status: string;
  workspaceId: string;
  capabilities?: string[];
  createdAt: Date;
}
