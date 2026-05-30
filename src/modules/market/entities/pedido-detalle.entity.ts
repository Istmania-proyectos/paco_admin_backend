import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MarketPedido } from './pedido.entity';

@Entity('PedidoDetalle')
export class MarketPedidoDetalle {
  @PrimaryGeneratedColumn()
  PedidoDetalleId: number;

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  SKU: string;

  @Column({ type: 'int' })
  Cantidad: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  PrecioUnit: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  SubTotal: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  Descuento: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  Impuesto: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  Total: number;

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  Cupon: string;

  @ManyToOne(() => MarketPedido, (pedido) => pedido.PedidoDetalle)
  @JoinColumn({ name: 'PedidoId', referencedColumnName: 'PedidoId' })
  Pedido: MarketPedido;
}
