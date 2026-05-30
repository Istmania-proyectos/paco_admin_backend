import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MarketPagoOnline } from './pago-online.entity';

@Entity('PagoExtra')
export class MarketPagoExtra {
  @PrimaryGeneratedColumn()
  Id: number;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  extra1: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  extra2: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  extra3: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  extra4: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  extra5: string;

  @OneToOne(() => MarketPagoOnline, (pago) => pago.extra)
  @JoinColumn({ name: 'Id', referencedColumnName: 'ExtraId' })
  Pago: MarketPagoOnline;
}
