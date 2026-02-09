import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PricingType {
  FIXED_MARKUP = 'fixed_markup',
  PERCENTAGE_MARKUP = 'percentage_markup',
  FIXED_PRICE = 'fixed_price',
}

export interface CountryPricing {
  country: string;
  pricingType?: PricingType;
  monthlyBasePrice?: number;
  monthlyMarkupAmount?: number;
  monthlyMarkupPercentage?: number;
  setupFee?: number;
}

@Entity('phone_number_pricing')
@Index(['workspaceId'], { unique: true })
export class PhoneNumberPricing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @Column({
    name: 'pricing_type',
    type: 'enum',
    enum: PricingType,
    default: PricingType.FIXED_MARKUP,
  })
  pricingType: PricingType;

  @Column({ name: 'monthly_base_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyBasePrice?: number;

  @Column({ name: 'monthly_markup_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  monthlyMarkupAmount: number;

  @Column({ name: 'monthly_markup_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  monthlyMarkupPercentage: number;

  @Column({ name: 'setup_fee', type: 'decimal', precision: 10, scale: 2, default: 0 })
  setupFee: number;

  @Column({ name: 'allow_tenant_purchase', default: false })
  allowTenantPurchase: boolean;

  @Column({ name: 'allow_tenant_release', default: false })
  allowTenantRelease: boolean;

  @Column({ name: 'country_pricing', type: 'jsonb', nullable: true })
  countryPricing?: CountryPricing[];

  @Column({ name: 'messaging_service_sid', nullable: true })
  messagingServiceSid?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
