import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CommunicationIntegration,
  Sender,
} from '../../database/entities';
import { ChannelType, SenderMode, SenderStatus } from '../../database/entities/sender.entity';
import { IntegrationStatus, ProviderType } from '../../database/entities/communication-integration.entity';
import { EncryptionService } from '../../common/services/encryption.service';
import { TwilioProvider } from './providers/twilio.provider';
import {
  ProvisionPhoneNumberDto,
  AssignPhoneNumberDto,
  ReleasePhoneNumberDto,
  ListPhoneNumbersQueryDto,
  PhoneNumberResponse,
} from './dto/phone-number.dto';

@Injectable()
export class PhoneNumbersService {
  private readonly logger = new Logger(PhoneNumbersService.name);

  constructor(
    @InjectRepository(CommunicationIntegration)
    private integrationRepo: Repository<CommunicationIntegration>,
    @InjectRepository(Sender)
    private senderRepo: Repository<Sender>,
    private encryptionService: EncryptionService,
    private twilioProvider: TwilioProvider,
  ) {}

  /**
   * List phone numbers for a workspace
   */
  async listPhoneNumbers(
    workspaceId: string,
    query: ListPhoneNumbersQueryDto,
  ): Promise<PhoneNumberResponse[]> {
    const where: Record<string, unknown> = { workspaceId };

    if (query.mode) {
      where.mode = query.mode;
    }

    if (query.channel) {
      where.channel = query.channel;
    }

    if (query.assigned === 'true') {
      where.status = SenderStatus.ACTIVE;
    } else if (query.assigned === 'false') {
      where.status = SenderStatus.INACTIVE;
    }

    const senders = await this.senderRepo.find({ where });

    return senders.map((sender) => ({
      id: sender.id,
      number: sender.address,
      provider: sender.provider,
      mode: sender.mode,
      channel: sender.channel,
      name: sender.name,
      status: sender.status,
      workspaceId: sender.workspaceId,
      capabilities: sender.metadata?.capabilities as string[] || [],
      createdAt: sender.createdAt,
    }));
  }

  /**
   * Provision a new phone number from Twilio
   */
  async provisionPhoneNumber(
    workspaceId: string,
    dto: ProvisionPhoneNumberDto,
  ): Promise<PhoneNumberResponse> {
    this.logger.log(`Provisioning phone number: workspace=${workspaceId}, country=${dto.country}, areaCode=${dto.areaCode}`);

    // Get Twilio integration
    const integration = await this.integrationRepo.findOne({
      where: { workspaceId, provider: ProviderType.TWILIO, status: IntegrationStatus.ACTIVE },
    });

    if (!integration) {
      throw new BadRequestException('No active Twilio integration found. Please connect Twilio first.');
    }

    const credentials = this.encryptionService.decrypt(integration.credentialsEncrypted);

    // Search for available numbers
    const availableNumbers = await this.twilioProvider.searchAvailableNumbers(
      credentials,
      dto.country,
      dto.areaCode,
    );

    if (!availableNumbers || availableNumbers.length === 0) {
      throw new BadRequestException(`No phone numbers available in ${dto.country} ${dto.areaCode || ''}`);
    }

    // Purchase the first available number
    const numberToPurchase = availableNumbers[0];
    const purchasedNumber = await this.twilioProvider.purchasePhoneNumber(
      credentials,
      numberToPurchase.phoneNumber,
    );

    // Create sender record
    const sender = this.senderRepo.create({
      workspaceId,
      channel: ChannelType.SMS,
      address: purchasedNumber.phoneNumber,
      provider: 'twilio',
      providerRef: purchasedNumber.sid,
      status: SenderStatus.ACTIVE,
      mode: dto.mode || SenderMode.DEDICATED,
      name: dto.name || `Phone ${purchasedNumber.phoneNumber}`,
      metadata: {
        capabilities: purchasedNumber.capabilities || ['sms', 'voice'],
        friendlyName: purchasedNumber.friendlyName,
        purchasedAt: new Date().toISOString(),
      },
    });
    await this.senderRepo.save(sender);

    this.logger.log(`Provisioned phone number: ${purchasedNumber.phoneNumber} as sender ${sender.id}`);

    return {
      id: sender.id,
      number: sender.address,
      provider: sender.provider,
      mode: sender.mode,
      channel: sender.channel,
      name: sender.name,
      status: sender.status,
      workspaceId: sender.workspaceId,
      capabilities: sender.metadata?.capabilities as string[] || [],
      createdAt: sender.createdAt,
    };
  }

  /**
   * Assign a phone number (update its mode)
   */
  async assignPhoneNumber(
    workspaceId: string,
    dto: AssignPhoneNumberDto,
  ): Promise<PhoneNumberResponse> {
    const sender = await this.senderRepo.findOne({
      where: { id: dto.senderId, workspaceId },
    });

    if (!sender) {
      throw new NotFoundException('Phone number not found');
    }

    sender.mode = dto.mode;
    sender.status = SenderStatus.ACTIVE;
    if (dto.name) {
      sender.name = dto.name;
    }

    await this.senderRepo.save(sender);

    this.logger.log(`Assigned phone number ${sender.address} as ${dto.mode}`);

    return {
      id: sender.id,
      number: sender.address,
      provider: sender.provider,
      mode: sender.mode,
      channel: sender.channel,
      name: sender.name,
      status: sender.status,
      workspaceId: sender.workspaceId,
      capabilities: sender.metadata?.capabilities as string[] || [],
      createdAt: sender.createdAt,
    };
  }

  /**
   * Release a phone number
   */
  async releasePhoneNumber(
    workspaceId: string,
    dto: ReleasePhoneNumberDto,
  ): Promise<{ success: boolean; message: string }> {
    const sender = await this.senderRepo.findOne({
      where: { id: dto.senderId, workspaceId },
    });

    if (!sender) {
      throw new NotFoundException('Phone number not found');
    }

    // For Twilio numbers, optionally release the number back to Twilio
    if (sender.provider === 'twilio' && sender.providerRef) {
      const integration = await this.integrationRepo.findOne({
        where: { workspaceId, provider: ProviderType.TWILIO, status: IntegrationStatus.ACTIVE },
      });

      if (integration) {
        try {
          const credentials = this.encryptionService.decrypt(integration.credentialsEncrypted);
          await this.twilioProvider.releasePhoneNumber(credentials, sender.providerRef);
          this.logger.log(`Released Twilio number: ${sender.address}`);
        } catch (error) {
          this.logger.error(`Failed to release Twilio number: ${error.message}`);
          // Continue to mark as inactive even if Twilio release fails
        }
      }
    }

    // Mark sender as inactive
    sender.status = SenderStatus.INACTIVE;
    sender.metadata = {
      ...sender.metadata,
      releasedAt: new Date().toISOString(),
      releaseReason: dto.reason,
    };
    await this.senderRepo.save(sender);

    return {
      success: true,
      message: `Phone number ${sender.address} has been released`,
    };
  }

  /**
   * Get available numbers from Twilio without purchasing
   */
  async searchAvailableNumbers(
    workspaceId: string,
    country: string,
    areaCode?: string,
  ): Promise<Array<{ phoneNumber: string; locality?: string; region?: string }>> {
    const integration = await this.integrationRepo.findOne({
      where: { workspaceId, provider: ProviderType.TWILIO, status: IntegrationStatus.ACTIVE },
    });

    if (!integration) {
      throw new BadRequestException('No active Twilio integration found');
    }

    const credentials = this.encryptionService.decrypt(integration.credentialsEncrypted);
    return this.twilioProvider.searchAvailableNumbers(credentials, country, areaCode);
  }
}
