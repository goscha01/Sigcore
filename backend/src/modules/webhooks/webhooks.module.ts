import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksController } from './webhooks.controller';
import { WebhookSubscriptionsController, WebhookSubscriptionsV1Controller } from './webhook-subscriptions.controller';
import { WebhooksService } from './webhooks.service';
import { TwilioWebhooksService } from './twilio-webhooks.service';
import { TenantWebhooksService } from './tenant-webhooks.service';
import { IdempotencyService } from './idempotency.service';
import { OutboundWebhooksService } from './outbound-webhooks.service';
import { WebhookRateLimitGuard } from './webhook-rate-limit.guard';
import { EncryptionService } from '../../common/services/encryption.service';
import { OpenPhoneProvider } from '../communication/providers/openphone.provider';
import {
  CommunicationIntegration,
  CommunicationConversation,
  CommunicationMessage,
  CommunicationCall,
  Workspace,
  WebhookEvent,
  WebhookSubscription,
  ApiKey,
  Tenant,
  ContactIdentity,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommunicationIntegration,
      CommunicationConversation,
      CommunicationMessage,
      CommunicationCall,
      Workspace,
      WebhookEvent,
      WebhookSubscription,
      ApiKey,
      Tenant,
      ContactIdentity,
    ]),
  ],
  controllers: [WebhooksController, WebhookSubscriptionsController, WebhookSubscriptionsV1Controller],
  providers: [
    WebhooksService,
    TwilioWebhooksService,
    TenantWebhooksService,
    IdempotencyService,
    OutboundWebhooksService,
    WebhookRateLimitGuard,
    EncryptionService,
    OpenPhoneProvider,
  ],
  exports: [TwilioWebhooksService, TenantWebhooksService, IdempotencyService, OutboundWebhooksService],
})
export class WebhooksModule {}
