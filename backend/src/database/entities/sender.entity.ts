import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ChannelType {
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  VOICE = 'voice',
}

export enum SenderStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  ERROR = 'error',
}

export enum SenderMode {
  SHARED = 'shared',
  DEDICATED = 'dedicated',
  OPENPHONE = 'openphone',
}

@Entity('senders')
@Index(['workspaceId', 'channel', 'address'], { unique: true })
@Index(['workspaceId', 'channel'])
export class Sender {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id' })
  @Index()
  workspaceId: string;

  @Column({
    type: 'enum',
    enum: ChannelType,
  })
  channel: ChannelType;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'text' })
  provider: string;

  @Column({ name: 'provider_ref', type: 'text', nullable: true })
  providerRef?: string;

  @Column({
    type: 'enum',
    enum: SenderStatus,
    default: SenderStatus.ACTIVE,
  })
  status: SenderStatus;

  @Column({
    type: 'enum',
    enum: SenderMode,
    default: SenderMode.SHARED,
  })
  mode: SenderMode;

  @Column({ type: 'text', nullable: true })
  name?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
