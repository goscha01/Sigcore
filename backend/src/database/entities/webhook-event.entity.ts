import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('webhook_events')
@Index(['provider', 'externalId'], { unique: true })
@Index(['processedAt'])
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  provider: string;

  @Column({ name: 'external_id', type: 'text' })
  externalId: string;

  @Column({ name: 'event_type', type: 'text', nullable: true })
  eventType?: string;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId?: string;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, unknown>;
}
