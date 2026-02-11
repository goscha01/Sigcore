import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SigcoreAuthGuard } from '../auth/sigcore-auth.guard';
import { WorkspaceId } from '../auth/decorators/workspace-id.decorator';
import { ApiKeysService } from './api-keys.service';

@Controller('api-keys')
@UseGuards(SigcoreAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  async getApiKeys(@WorkspaceId() workspaceId: string) {
    const apiKeys = await this.apiKeysService.getApiKeys(workspaceId);

    // Return full keys - user is authenticated and owns these keys
    // Frontend will handle masking/unmasking display
    return { data: apiKeys };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createApiKey(
    @WorkspaceId() workspaceId: string,
    @Body() dto: { name: string },
  ) {
    const result = await this.apiKeysService.createApiKey(workspaceId, dto.name);

    return {
      data: {
        apiKey: {
          ...result.apiKey,
          key: `sc_${'*'.repeat(56)}${result.apiKey.key.slice(-8)}`,
        },
        // Full key is returned only once on creation
        fullKey: result.key,
      },
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteApiKey(
    @WorkspaceId() workspaceId: string,
    @Param('id') keyId: string,
  ) {
    await this.apiKeysService.deleteApiKey(workspaceId, keyId);
  }

  @Patch(':id/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleApiKey(
    @WorkspaceId() workspaceId: string,
    @Param('id') keyId: string,
  ) {
    const apiKey = await this.apiKeysService.toggleApiKey(workspaceId, keyId);

    // Return full key - user is authenticated and owns this key
    return { data: apiKey };
  }
}
