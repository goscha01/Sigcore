import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LeadBridgeService } from './leadbridge.service';
import { LeadBridgeSendMessageDto } from './dto/leadbridge-send.dto';
import { SigcoreAuthGuard } from '../auth/sigcore-auth.guard';
import { WorkspaceId } from '../auth/decorators/workspace-id.decorator';
import { SenderMode } from '../../database/entities/sender.entity';

/**
 * LeadBridge Integration API (v1)
 *
 * These endpoints are designed for external integrations like LeadBridge
 * that need to send messages without managing contacts/conversations directly.
 *
 * Supports both JWT authentication (for UI) and API key authentication (for external systems)
 */
@Controller('v1/messages')
export class LeadBridgeController {
  constructor(private readonly leadBridgeService: LeadBridgeService) {}

  /**
   * Unified send endpoint for LeadBridge
   *
   * This endpoint handles:
   * - Phone number normalization (E.164)
   * - Contact find/create
   * - Conversation find/create
   * - Provider selection based on sender mode
   * - Message delivery
   * - Status tracking
   *
   * @example
   * POST /api/v1/messages/send
   * {
   *   "to": "+15551234567",
   *   "body": "New lead: John Smith\nPhone: +15559876543",
   *   "sender": {
   *     "mode": "shared",
   *     "fromNumber": "+15550001111"
   *   },
   *   "metadata": {
   *     "tenantId": "leadbridge_tenant_123",
   *     "leadId": "lead_987"
   *   }
   * }
   */
  @Post('send')
  @UseGuards(SigcoreAuthGuard)
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @WorkspaceId() workspaceId: string,
    @Body() dto: LeadBridgeSendMessageDto,
  ) {
    return this.leadBridgeService.sendMessage(workspaceId, dto);
  }

  /**
   * Get available senders for a workspace
   * Useful for LeadBridge to show available phone numbers to tenants
   */
  @Get('senders')
  @UseGuards(SigcoreAuthGuard)
  async getAvailableSenders(
    @WorkspaceId() workspaceId: string,
    @Query('mode') mode?: SenderMode,
  ) {
    const senders = await this.leadBridgeService.getAvailableSenders(workspaceId, mode);
    return { data: senders };
  }
}

/**
 * Alternative controller with JWT auth for internal/UI use
 */
@Controller('messages/leadbridge')
@UseGuards(SigcoreAuthGuard)
export class LeadBridgeInternalController {
  constructor(private readonly leadBridgeService: LeadBridgeService) {}

  /**
   * Same send endpoint but with JWT authentication
   * For use from the Callio UI or internal systems
   */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @WorkspaceId() workspaceId: string,
    @Body() dto: LeadBridgeSendMessageDto,
  ) {
    return this.leadBridgeService.sendMessage(workspaceId, dto);
  }

  @Get('senders')
  async getAvailableSenders(
    @WorkspaceId() workspaceId: string,
    @Query('mode') mode?: SenderMode,
  ) {
    const senders = await this.leadBridgeService.getAvailableSenders(workspaceId, mode);
    return { data: senders };
  }
}
