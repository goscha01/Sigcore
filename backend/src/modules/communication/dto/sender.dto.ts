import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ChannelType, SenderStatus } from '../../../database/entities/sender.entity';

export class CreateSenderDto {
  @IsEnum(ChannelType)
  channel: ChannelType;

  @IsString()
  address: string;

  @IsString()
  provider: string;

  @IsString()
  @IsOptional()
  providerRef?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateSenderDto {
  @IsEnum(SenderStatus)
  @IsOptional()
  status?: SenderStatus;

  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
