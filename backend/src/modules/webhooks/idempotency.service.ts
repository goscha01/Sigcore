import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { WebhookEvent } from '../../database/entities/webhook-event.entity';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(
    @InjectRepository(WebhookEvent)
    private readonly webhookEventRepo: Repository<WebhookEvent>,
  ) {}

  /**
   * Check if an event has already been processed
   * If not, mark it as processed and return false
   * If yes, return true (indicating duplicate)
   */
  async isDuplicate(
    provider: string,
    externalId: string,
    options?: {
      eventType?: string;
      workspaceId?: string;
      payload?: Record<string, unknown>;
    },
  ): Promise<boolean> {
    try {
      // Try to find existing event
      const existing = await this.webhookEventRepo.findOne({
        where: { provider, externalId },
      });

      if (existing) {
        this.logger.log(`Duplicate webhook detected: ${provider}/${externalId}`);
        return true;
      }

      // Create new event record
      const event = this.webhookEventRepo.create({
        provider,
        externalId,
        eventType: options?.eventType,
        workspaceId: options?.workspaceId,
        payload: options?.payload,
      });

      await this.webhookEventRepo.save(event);
      this.logger.debug(`Webhook event recorded: ${provider}/${externalId}`);
      return false;
    } catch (error) {
      // If there's a unique constraint violation, it's a duplicate
      if (error.code === '23505') {
        this.logger.log(`Duplicate webhook (race condition): ${provider}/${externalId}`);
        return true;
      }
      throw error;
    }
  }

  /**
   * Check if an event exists without creating it
   */
  async exists(provider: string, externalId: string): Promise<boolean> {
    const count = await this.webhookEventRepo.count({
      where: { provider, externalId },
    });
    return count > 0;
  }

  /**
   * Clean up old webhook events (e.g., older than 7 days)
   * Should be called periodically via a cron job
   */
  async cleanup(olderThanDays: number = 7): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await this.webhookEventRepo.delete({
      processedAt: LessThan(cutoff),
    });

    const deleted = result.affected || 0;
    if (deleted > 0) {
      this.logger.log(`Cleaned up ${deleted} old webhook events`);
    }
    return deleted;
  }
}
