import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { TenantPhoneNumber } from './tenant-phone-number.entity';

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('tenants')
@Index(['workspaceId', 'externalId'], { unique: true })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Cross-service reference to Callio's workspace (plain UUID, no FK)
  @Column({ name: 'workspace_id' })
  @Index()
  workspaceId: string;

  @Column({ name: 'external_id' })
  externalId: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Column({ name: 'webhook_url', type: 'text', nullable: true })
  webhookUrl?: string;

  @Column({ name: 'webhook_secret', type: 'text', nullable: true })
  webhookSecret?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @OneToMany(() => TenantPhoneNumber, (tpn) => tpn.tenant)
  phoneNumbers: TenantPhoneNumber[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
