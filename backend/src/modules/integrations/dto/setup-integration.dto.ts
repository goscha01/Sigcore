import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ProviderType } from '../../../database/entities/communication-integration.entity';

export class SetupIntegrationDto {
  @IsEnum(ProviderType)
  provider: ProviderType;

  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @IsString()
  @IsOptional()
  webhookSecret?: string;

  @IsString()
  @IsOptional()
  externalWorkspaceId?: string;
}
