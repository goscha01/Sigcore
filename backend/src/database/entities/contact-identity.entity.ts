import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ChannelType } from './sender.entity';

export enum IdentityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  UNVERIFIED = 'unverified',
}

@Entity('contact_identities')
@Index(['contactId', 'channel', 'identity'], { unique: true })
@Index(['contactId', 'channel'])
@Index(['workspaceId', 'channel', 'identity'])
export class ContactIdentity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Cross-service reference to Callio's contact (plain UUID, no FK)
  @Column({ name: 'contact_id' })
  @Index()
  contactId: string;

  @Column({ name: 'workspace_id' })
  @Index()
  workspaceId: string;

  @Column({
    type: 'enum',
    enum: ChannelType,
  })
  channel: ChannelType;

  @Column({ type: 'text' })
  identity: string;

  @Column({ type: 'text', nullable: true })
  display?: string;

  @Column({
    type: 'enum',
    enum: IdentityStatus,
    default: IdentityStatus.ACTIVE,
  })
  status: IdentityStatus;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date;

  @Column({ name: 'opt_in_at', type: 'timestamptz', nullable: true })
  optInAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
