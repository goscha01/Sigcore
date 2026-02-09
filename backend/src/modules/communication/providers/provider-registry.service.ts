import { Injectable, Logger } from '@nestjs/common';
import { CommunicationProvider } from '../interfaces/communication-provider.interface';
import { ChannelType } from '../../../database/entities/sender.entity';
import { ProviderType } from '../../../database/entities/communication-integration.entity';

/**
 * Provider Registry
 *
 * Central registry for all communication providers.
 * Maps (provider, channel) -> provider adapter instance
 */
@Injectable()
export class ProviderRegistry {
  private readonly logger = new Logger(ProviderRegistry.name);
  private providers = new Map<string, CommunicationProvider>();

  /**
   * Register a provider implementation
   */
  registerProvider(provider: CommunicationProvider): void {
    const key = provider.providerName.toLowerCase();
    this.providers.set(key, provider);
    this.logger.log(
      `Registered provider: ${key} (channels: ${provider.supportedChannels.join(', ')})`,
    );
  }

  /**
   * Get provider by name
   */
  getProvider(providerName: ProviderType | string): CommunicationProvider | null {
    const name = typeof providerName === 'string' ? providerName.toLowerCase() : providerName;
    const provider = this.providers.get(name);
    if (!provider) {
      this.logger.warn(`Provider not found: ${providerName}`);
      return null;
    }
    return provider;
  }

  /**
   * Get provider for a specific channel
   *
   * @param providerName - Provider name (openphone, twilio, telegram)
   * @param channel - Channel type (sms, whatsapp, telegram, voice)
   * @returns Provider instance or null
   */
  getProviderForChannel(
    providerName: ProviderType | string,
    channel: ChannelType,
  ): CommunicationProvider | null {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return null;
    }

    if (!provider.supportedChannels.includes(channel)) {
      this.logger.warn(
        `Provider ${providerName} does not support channel ${channel}`,
      );
      return null;
    }

    return provider;
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): CommunicationProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Check if provider supports a channel
   */
  supportsChannel(providerName: ProviderType | string, channel: ChannelType): boolean {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return false;
    }
    return provider.supportsChannel
      ? provider.supportsChannel(channel)
      : provider.supportedChannels.includes(channel);
  }

  /**
   * List all providers that support a specific channel
   */
  listProvidersByChannel(channel: ChannelType): CommunicationProvider[] {
    return this.getAllProviders().filter(p => p.supportedChannels.includes(channel));
  }
}
