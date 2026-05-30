import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MarketPagoOnline } from './pago-online.entity';

@Entity('PagoItems')
export class MarketPagoItem {
  @PrimaryGeneratedColumn()
  Id: number;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  tax: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  price: number;

  @Column({ type: 'int', nullable: true })
  qty: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  total: number;

  @ManyToOne(() => MarketPagoOnline, (pago) => pago.items)
  Pago: MarketPagoOnline;
}
