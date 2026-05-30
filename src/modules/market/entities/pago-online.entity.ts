import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MarketPagoExtra } from './pago-extra.entity';
import { MarketPagoItem } from './pago-item.entity';

@Entity('Pagos')
export class MarketPagoOnline {
  @PrimaryGeneratedColumn()
  PagoId: number;

  @Column({ name: 'ref', type: 'nvarchar', length: 40, nullable: true })
  ref: string;

  @Column({ type: 'nvarchar', length: 40, nullable: true })
  uuid: string;

  @Column({ type: 'nvarchar', length: 40, nullable: true })
  status: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  description: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  note: string;

  @Column({ type: 'nvarchar', length: 40, nullable: true })
  currency: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  amount: number;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  customer_name: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  customer_email: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  customer_phone: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  client_ip: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  client_device: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  order: string;

  @Column({ type: 'datetime', nullable: true })
  created_at: Date;

  @Column({ type: 'datetime', nullable: true })
  paid_at: Date;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  transaction_id: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  card_account: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  card_brand: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  card_type: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  company_name: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  company_slug: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  company_key: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  payment_url: string;

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  attach_url: string;

  @Column({ type: 'int', nullable: true })
  ExtraId: number;

  @OneToMany(() => MarketPagoItem, (item) => item.Pago, { cascade: true })
  items: MarketPagoItem[];

  @OneToOne(() => MarketPagoExtra, (extra) => extra.Pago, { cascade: true })
  extra: MarketPagoExtra;
}
