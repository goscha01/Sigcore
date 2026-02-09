import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { OutboundWebhooksService } from './outbound-webhooks.service';
import { SigcoreAuthGuard } from '../auth/sigcore-auth.guard';
import { WorkspaceId } from '../auth/decorators/workspace-id.decorator';
import {
  WebhookEventType,
  WebhookSubscriptionStatus,
} from '../../database/entities/webhook-subscription.entity';
import { IsString, IsUrl, IsArray, IsEnum, IsOptional, IsObject } from 'class-validator';

class CreateWebhookSubscriptionDto {
  @IsString()
  name: string;

  @IsUrl()
  webhookUrl: string;

  @IsString()
  @IsOptional()
  secret?: string;

  @IsArray()
  @IsEnum(WebhookEventType, { each: true })
  events: WebhookEventType[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

class UpdateWebhookSubscriptionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUrl()
  @IsOptional()
  webhookUrl?: string;

  @IsString()
  @IsOptional()
  secret?: string;

  @IsArray()
  @IsEnum(WebhookEventType, { each: true })
  @IsOptional()
  events?: WebhookEventType[];

  @IsEnum(WebhookSubscriptionStatus)
  @IsOptional()
  status?: WebhookSubscriptionStatus;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * Webhook Subscriptions API
 *
 * Allows external systems like LeadBridge to register for outbound webhooks
 */
@Controller('webhook-subscriptions')
@UseGuards(SigcoreAuthGuard)
export class WebhookSubscriptionsController {
  constructor(private readonly outboundWebhooksService: OutboundWebhooksService) {}

  /**
   * List all webhook subscriptions
   */
  @Get()
  async listSubscriptions(@WorkspaceId() workspaceId: string) {
    const subscriptions = await this.outboundWebhooksService.getSubscriptions(workspaceId);
    return { data: subscriptions };
  }

  /**
   * Get a single subscription
   */
  @Get(':id')
  async getSubscription(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    const subscription = await this.outboundWebhooksService.getSubscription(workspaceId, id);
    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }
    return { data: subscription };
  }

  /**
   * Create a new webhook subscription
   *
   * @example
   * POST /api/webhook-subscriptions
   * {
   *   "name": "LeadBridge Notifications",
   *   "webhookUrl": "https://api.leadbridge.com/webhooks/callio",
   *   "secret": "your-webhook-secret",
   *   "events": ["message.delivered", "message.failed", "message.inbound"]
   * }
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateWebhookSubscriptionDto,
  ) {
    const subscription = await this.outboundWebhooksService.createSubscription(workspaceId, dto);
    return { data: subscription };
  }

  /**
   * Update a webhook subscription
   */
  @Patch(':id')
  async updateSubscription(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookSubscriptionDto,
  ) {
    const subscription = await this.outboundWebhooksService.updateSubscription(workspaceId, id, dto);
    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }
    return { data: subscription };
  }

  /**
   * Delete a webhook subscription
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSubscription(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    await this.outboundWebhooksService.deleteSubscription(workspaceId, id);
  }

  /**
   * Test a webhook subscription
   * Sends a test event to verify the webhook URL is working
   */
  @Post(':id/test')
  async testSubscription(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    const result = await this.outboundWebhooksService.testSubscription(workspaceId, id);
    return { data: result };
  }

  /**
   * Get available event types
   */
  @Get('events/types')
  getEventTypes() {
    return {
      data: Object.values(WebhookEventType).map((event) => ({
        event,
        description: this.getEventDescription(event),
      })),
    };
  }

  private getEventDescription(event: WebhookEventType): string {
    const descriptions: Record<WebhookEventType, string> = {
      [WebhookEventType.MESSAGE_SENT]: 'Triggered when a message is sent',
      [WebhookEventType.MESSAGE_DELIVERED]: 'Triggered when a message is delivered',
      [WebhookEventType.MESSAGE_FAILED]: 'Triggered when a message fails to deliver',
      [WebhookEventType.MESSAGE_INBOUND]: 'Triggered when an inbound message is received',
      [WebhookEventType.CALL_STARTED]: 'Triggered when a call starts',
      [WebhookEventType.CALL_COMPLETED]: 'Triggered when a call completes',
      [WebhookEventType.CALL_MISSED]: 'Triggered when a call is missed',
    };
    return descriptions[event] || 'No description available';
  }
}

/**
 * Webhook Subscriptions API for external systems (API Key auth)
 */
@Controller('v1/webhook-subscriptions')
@UseGuards(SigcoreAuthGuard)
export class WebhookSubscriptionsV1Controller {
  constructor(private readonly outboundWebhooksService: OutboundWebhooksService) {}

  @Get()
  async listSubscriptions(@WorkspaceId() workspaceId: string) {
    const subscriptions = await this.outboundWebhooksService.getSubscriptions(workspaceId);
    return { data: subscriptions };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateWebhookSubscriptionDto,
  ) {
    const subscription = await this.outboundWebhooksService.createSubscription(workspaceId, dto);
    return { data: subscription };
  }

  @Patch(':id')
  async updateSubscription(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookSubscriptionDto,
  ) {
    const subscription = await this.outboundWebhooksService.updateSubscription(workspaceId, id, dto);
    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }
    return { data: subscription };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSubscription(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    await this.outboundWebhooksService.deleteSubscription(workspaceId, id);
  }

  @Post(':id/test')
  async testSubscription(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    const result = await this.outboundWebhooksService.testSubscription(workspaceId, id);
    return { data: result };
  }
}
