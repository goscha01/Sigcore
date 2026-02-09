import { Injectable, Logger, BadRequestException, NotFoundException, Inject, forwardRef, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CommunicationIntegration,
  CommunicationConversation,
  CommunicationMessage,
  Sender,
  Workspace,
  TenantPhoneNumber,
  TenantIntegration,
} from '../../database/entities';
import { ChannelType, SenderMode, SenderStatus } from '../../database/entities/sender.entity';
import { MessageDirection, MessageStatus } from '../../database/entities/communication-message.entity';
import { IntegrationStatus, ProviderType } from '../../database/entities/communication-integration.entity';
import { PhoneNumberProvider } from '../../database/entities/tenant-phone-number.entity';
import { WebhookEventType } from '../../database/entities/webhook-subscription.entity';
import { EncryptionService } from '../../common/services/encryption.service';
import { ProviderRegistry } from './providers/provider-registry.service';
import { OutboundWebhooksService } from '../webhooks/outbound-webhooks.service';
import { TenantsService } from '../tenants/tenants.service';
import {
  LeadBridgeSendMessageDto,
  LeadBridgeSendMessageResponse,
  LeadBridgeSenderMode,
} from './dto/leadbridge-send.dto';

@Injectable()
export class LeadBridgeService {
  private readonly logger = new Logger(LeadBridgeService.name);

  constructor(
    @InjectRepository(CommunicationIntegration)
    private integrationRepo: Repository<CommunicationIntegration>,
    @InjectRepository(CommunicationConversation)
    private conversationRepo: Repository<CommunicationConversation>,
    @InjectRepository(CommunicationMessage)
    private messageRepo: Repository<CommunicationMessage>,
    @InjectRepository(Sender)
    private senderRepo: Repository<Sender>,
    @InjectRepository(Workspace)
    private workspaceRepo: Repository<Workspace>,
    private encryptionService: EncryptionService,
    private providerRegistry: ProviderRegistry,
    @Optional()
    @Inject(forwardRef(() => OutboundWebhooksService))
    private outboundWebhooksService?: OutboundWebhooksService,
    @Optional()
    @Inject(forwardRef(() => TenantsService))
    private tenantsService?: TenantsService,
  ) {}

  /**
   * Unified send endpoint for LeadBridge integration
   * Handles all the complexity of contact/conversation management internally
   */
  async sendMessage(
    workspaceId: string,
    dto: LeadBridgeSendMessageDto,
  ): Promise<LeadBridgeSendMessageResponse> {
    this.logger.log(`LeadBridge send: workspaceId=${workspaceId}, to=${dto.to}, mode=${dto.sender.mode}`);

    // 1. Normalize phone number to E.164
    const toNumber = this.normalizePhoneNumber(dto.to);
    const channel = dto.channel === 'whatsapp' ? ChannelType.WHATSAPP : ChannelType.SMS;

    // 2. Select sender based on mode (with optional tenant phone number lookup)
    const { sender, fromNumber, provider, integration } = await this.selectSender(
      workspaceId,
      dto.sender.mode,
      dto.sender.fromNumber,
      channel,
      dto.metadata?.tenantId as string | undefined,
    );

    // 3. Contact management now in Callio service - use null contactId
    const contactId: string | null = null;

    // 4. Find or create conversation
    const conversation = await this.findOrCreateConversation(
      workspaceId,
      fromNumber,
      toNumber,
      contactId,
      provider,
      channel,
    );

    // 5. Send message via provider
    const providerInstance = this.providerRegistry.getProvider(provider);
    if (!providerInstance) {
      throw new BadRequestException(`Provider ${provider} not found`);
    }

    const credentials = this.encryptionService.decrypt(integration.credentialsEncrypted);
    let providerMessageId: string;
    let status = MessageStatus.PENDING;

    try {
      const result = await providerInstance.sendMessage({
        workspaceId: credentials, // TwilioProvider expects credentials as workspaceId
        from: fromNumber,
        to: toNumber,
        body: dto.body,
        channel,
      });
      providerMessageId = result.providerMessageId;
      status = MessageStatus.SENT;
      this.logger.log(`Message sent via ${provider}: ${providerMessageId}`);
    } catch (error) {
      this.logger.error(`Failed to send message via ${provider}:`, error);
      status = MessageStatus.FAILED;
      providerMessageId = `failed_${Date.now()}`;
    }

    // 6. Store message with metadata
    const message = this.messageRepo.create({
      conversationId: conversation.id,
      direction: MessageDirection.OUT,
      channel,
      body: dto.body,
      fromNumber,
      toNumber,
      providerMessageId,
      status,
      metadata: {
        ...dto.metadata,
        senderMode: dto.sender.mode,
        senderId: sender?.id,
      },
    });
    await this.messageRepo.save(message);

    // 7. Update conversation metadata
    conversation.metadata = {
      ...conversation.metadata,
      lastMessageAt: new Date().toISOString(),
      lastMessageBody: dto.body,
    };
    await this.conversationRepo.save(conversation);

    // 8. Emit webhook event (fire and forget)
    if (this.outboundWebhooksService) {
      const eventType = status === MessageStatus.FAILED
        ? WebhookEventType.MESSAGE_FAILED
        : WebhookEventType.MESSAGE_SENT;

      this.outboundWebhooksService
        .emitMessageEvent(workspaceId, eventType, message)
        .catch((err) => {
          this.logger.error(`Failed to emit webhook event: ${err.message}`);
        });
    }

    // 9. Return response
    return {
      success: status !== MessageStatus.FAILED,
      data: {
        conversationId: conversation.id,
        messageId: message.id,
        provider,
        status,
        fromNumber,
        toNumber,
      },
    };
  }

  /**
   * Select appropriate sender based on mode
   * Supports tenant-based phone number allocation and tenant-owned integrations
   *
   * Priority order:
   * 1. Tenant's own integration (if tenant has their own Twilio/OpenPhone credentials)
   * 2. Tenant's default phone number allocation (from workspace integration)
   * 3. Workspace-level integration (fallback)
   */
  private async selectSender(
    workspaceId: string,
    mode: LeadBridgeSenderMode,
    requestedFromNumber: string | undefined,
    channel: ChannelType,
    tenantId?: string,
  ): Promise<{
    sender: Sender | null;
    fromNumber: string;
    provider: ProviderType;
    integration: CommunicationIntegration | TenantIntegration;
  }> {
    // PRIORITY 1: Check if tenant has their own integration
    if (tenantId && this.tenantsService) {
      const tenantIntegration = await this.trySelectFromTenantIntegration(
        workspaceId,
        tenantId,
        requestedFromNumber,
        channel,
      );
      if (tenantIntegration) {
        return tenantIntegration;
      }
    }

    // PRIORITY 2: If tenantId is provided and no specific fromNumber, try tenant's allocated phone number
    if (tenantId && !requestedFromNumber && this.tenantsService) {
      try {
        const tenantPhoneNumber = await this.tenantsService.getTenantDefaultPhoneNumber(workspaceId, tenantId);
        if (tenantPhoneNumber) {
          this.logger.log(`Using tenant ${tenantId} default allocated number: ${tenantPhoneNumber.phoneNumber}`);
          requestedFromNumber = tenantPhoneNumber.phoneNumber;
        }
      } catch (e) {
        this.logger.warn(`Failed to get tenant default phone number: ${e.message}`);
      }
    }

    // PRIORITY 3: If a specific fromNumber is requested, find workspace integration that has this number
    if (requestedFromNumber) {
      const normalizedFrom = this.normalizePhoneNumber(requestedFromNumber);

      // Find workspace integration that has this number
      const integrations = await this.integrationRepo.find({
        where: { workspaceId, status: IntegrationStatus.ACTIVE },
      });

      for (const integration of integrations) {
        try {
          const credentials = this.encryptionService.decrypt(integration.credentialsEncrypted);
          const provider = this.providerRegistry.getProvider(integration.provider);
          if (provider && provider.getPhoneNumbersFromCredentials) {
            const phoneNumbers = await provider.getPhoneNumbersFromCredentials(credentials);
            for (const pn of phoneNumbers.values()) {
              const pnObj = pn as Record<string, unknown>;
              const pnNumber = ('number' in pnObj ? pnObj.number : pnObj.phoneNumber) as string;
              if (this.normalizePhoneNumber(pnNumber) === normalizedFrom) {
                this.logger.log(`Using requested fromNumber ${normalizedFrom} from workspace ${integration.provider}`);
                return {
                  sender: null,
                  fromNumber: normalizedFrom,
                  provider: integration.provider,
                  integration,
                };
              }
            }
          }
        } catch (e) {
          this.logger.warn(`Failed to check workspace ${integration.provider} numbers: ${e.message}`);
        }
      }

      throw new BadRequestException(`Requested fromNumber ${normalizedFrom} not found in any connected integration.`);
    }

    // PRIORITY 4: No specific number requested - find first available from workspace integrations
    // Priority: Twilio for SMS, OpenPhone as fallback
    const providerOrder = channel === ChannelType.SMS
      ? [ProviderType.TWILIO, ProviderType.OPENPHONE]
      : [ProviderType.OPENPHONE, ProviderType.TWILIO];

    for (const providerType of providerOrder) {
      const integration = await this.integrationRepo.findOne({
        where: { workspaceId, provider: providerType, status: IntegrationStatus.ACTIVE },
      });

      if (integration) {
        try {
          const credentials = this.encryptionService.decrypt(integration.credentialsEncrypted);
          const provider = this.providerRegistry.getProvider(providerType);
          if (provider && provider.getPhoneNumbersFromCredentials) {
            const phoneNumbers = await provider.getPhoneNumbersFromCredentials(credentials);
            const firstNumber = phoneNumbers.values().next().value;
            if (firstNumber) {
              const pnObj = firstNumber as Record<string, unknown>;
              const fromNumber = ('number' in pnObj ? pnObj.number : pnObj.phoneNumber) as string;
              this.logger.log(`Auto-selected fromNumber ${fromNumber} from workspace ${providerType}`);
              return {
                sender: null,
                fromNumber: this.normalizePhoneNumber(fromNumber),
                provider: providerType,
                integration,
              };
            }
          }
        } catch (e) {
          this.logger.warn(`Failed to get workspace ${providerType} numbers: ${e.message}`);
        }
      }
    }

    throw new BadRequestException(
      `No phone numbers found. Please connect OpenPhone or Twilio and ensure you have at least one phone number.`,
    );
  }

  /**
   * Try to select sender from tenant's own integration
   * Returns null if tenant has no integration or integration has no usable numbers
   */
  private async trySelectFromTenantIntegration(
    workspaceId: string,
    tenantId: string,
    requestedFromNumber: string | undefined,
    channel: ChannelType,
  ): Promise<{
    sender: Sender | null;
    fromNumber: string;
    provider: ProviderType;
    integration: TenantIntegration;
  } | null> {
    if (!this.tenantsService) {
      return null;
    }

    // Provider priority for channel
    const providerOrder = channel === ChannelType.SMS
      ? [ProviderType.TWILIO, ProviderType.OPENPHONE]
      : [ProviderType.OPENPHONE, ProviderType.TWILIO];

    for (const providerType of providerOrder) {
      try {
        const tenantIntegration = await this.tenantsService.getTenantActiveIntegration(
          workspaceId,
          tenantId,
          providerType,
        );

        if (!tenantIntegration) {
          continue;
        }

        // Decrypt tenant's credentials
        const credentials = this.encryptionService.decrypt(tenantIntegration.credentialsEncrypted);
        const provider = this.providerRegistry.getProvider(providerType);

        if (!provider || !provider.getPhoneNumbersFromCredentials) {
          continue;
        }

        // Get phone numbers from tenant's integration
        const phoneNumbers = await provider.getPhoneNumbersFromCredentials(credentials);

        // If a specific fromNumber was requested, check if it's in tenant's integration
        if (requestedFromNumber) {
          const normalizedFrom = this.normalizePhoneNumber(requestedFromNumber);
          for (const pn of phoneNumbers.values()) {
            const pnObj = pn as Record<string, unknown>;
            const pnNumber = ('number' in pnObj ? pnObj.number : pnObj.phoneNumber) as string;
            if (this.normalizePhoneNumber(pnNumber) === normalizedFrom) {
              this.logger.log(`Using requested fromNumber ${normalizedFrom} from tenant's ${providerType} integration`);
              return {
                sender: null,
                fromNumber: normalizedFrom,
                provider: providerType,
                integration: tenantIntegration,
              };
            }
          }
          // Number not in this tenant integration, continue to next provider
          continue;
        }

        // No specific number requested - use first available from tenant's integration
        const firstNumber = phoneNumbers.values().next().value;
        if (firstNumber) {
          const pnObj = firstNumber as Record<string, unknown>;
          const fromNumber = ('number' in pnObj ? pnObj.number : pnObj.phoneNumber) as string;
          this.logger.log(`Auto-selected fromNumber ${fromNumber} from tenant's ${providerType} integration`);
          return {
            sender: null,
            fromNumber: this.normalizePhoneNumber(fromNumber),
            provider: providerType,
            integration: tenantIntegration,
          };
        }
      } catch (e) {
        this.logger.warn(`Failed to check tenant's ${providerType} integration: ${e.message}`);
      }
    }

    return null;
  }

  /**
   * Find or create conversation
   */
  private async findOrCreateConversation(
    workspaceId: string,
    fromNumber: string,
    toNumber: string,
    contactId: string | null,
    provider: ProviderType,
    channel: ChannelType,
  ): Promise<CommunicationConversation> {
    let conversation = await this.conversationRepo.findOne({
      where: {
        workspaceId,
        phoneNumber: fromNumber,
        participantPhoneNumber: toNumber,
        provider,
      },
    });

    if (!conversation) {
      conversation = this.conversationRepo.create({
        workspaceId,
        contactId,
        externalId: `lb_conv_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        phoneNumber: fromNumber,
        participantPhoneNumber: toNumber,
        provider,
        channel,
        metadata: {
          unreadCount: 0,
          lastMessageAt: new Date().toISOString(),
        },
      });
      await this.conversationRepo.save(conversation);
      this.logger.log(`Created new conversation: ${conversation.id}`);
    }

    return conversation;
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phone: string): string {
    if (!phone) return phone;

    // Remove any non-digit characters except leading +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Ensure it starts with +
    if (!normalized.startsWith('+')) {
      // Assume US number if 10 digits
      if (normalized.length === 10) {
        normalized = '+1' + normalized;
      } else if (normalized.length === 11 && normalized.startsWith('1')) {
        normalized = '+' + normalized;
      } else {
        normalized = '+' + normalized;
      }
    }

    return normalized;
  }

  /**
   * Get available senders for a workspace
   */
  async getAvailableSenders(workspaceId: string, mode?: SenderMode): Promise<Sender[]> {
    const where: Record<string, unknown> = {
      workspaceId,
      status: SenderStatus.ACTIVE,
    };

    if (mode) {
      where.mode = mode;
    }

    return this.senderRepo.find({ where });
  }
}
