import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { ProviderType, IntegrationStatus } from './communication-integration.entity';

@Entity('tenant_integrations')
@Index(['workspaceId', 'tenantId', 'provider'], { unique: true })
export class TenantIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id' })
  @Index()
  workspaceId: string;

  @Column({ name: 'tenant_id' })
  @Index()
  tenantId: string;

  @Column({ type: 'varchar', length: 50 })
  provider: ProviderType;

  @Column({ name: 'credentials_encrypted', type: 'text' })
  credentialsEncrypted: string;

  @Column({ name: 'webhook_secret_encrypted', type: 'text', nullable: true })
  webhookSecretEncrypted?: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: IntegrationStatus;

  @Column({ name: 'phone_number', nullable: true })
  phoneNumber?: string;

  @Column({ name: 'phone_number_sid', nullable: true })
  phoneNumberSid?: string;

  @Column({ name: 'friendly_name', nullable: true })
  friendlyName?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;
}
