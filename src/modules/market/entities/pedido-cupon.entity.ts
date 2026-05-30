import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MarketPedido } from './pedido.entity';

@Entity('PedidoCupones')
export class MarketPedidoCupon {
  @PrimaryGeneratedColumn()
  Id: number;

  @Column({ type: 'nvarchar', length: 40, nullable: true })
  Cupon: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  MontoAplicado: number;

  @Column({ type: 'datetime', nullable: true })
  FechaAplicado: Date;

  @ManyToOne(() => MarketPedido, (pedido) => pedido.PedidoCupones)
  @JoinColumn({ name: 'PedidoId1', referencedColumnName: 'PedidoId' })
  Pedido: MarketPedido;
}
