import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { MarketPedidoCupon } from './pedido-cupon.entity';
import { MarketPedidoDetalle } from './pedido-detalle.entity';

@Entity('Pedido')
export class MarketPedido {
  @PrimaryGeneratedColumn()
  PedidoId: number;

  @Column({ type: 'nvarchar', length: 40, nullable: true })
  Cliente: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  ClientePOS: string;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  Direccion: string;

  @Column({ type: 'datetime', nullable: true })
  Fecha: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  MontoNeto: number;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  NombreCliente: string;

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  RTN: string;

  @Column({ type: 'nvarchar', length: 250, nullable: true })
  Comentario: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  Descuento: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  DescuentoAdicional: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  Impuesto: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  Envio: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  MontoTotal: number;

  @Column({ type: 'nvarchar', length: 10, nullable: true })
  Migrado: string;

  @Column({ type: 'datetime', nullable: true })
  FechaMigrado: Date;

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  NumFactura: string;

  @Column({ type: 'nvarchar', length: 10, nullable: true })
  Bodega: string;

  @Column({ type: 'nvarchar', length: 250, nullable: true })
  UrlBotonPago: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  ReferenciaPago: string;

  @Column({ type: 'int', nullable: true })
  Pagado: number;

  @Column({ type: 'int', nullable: true })
  Anulado: number;

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  IdPedidoSap: string;

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  TipoPago: string;

  @OneToMany(() => MarketPedidoDetalle, (detalle) => detalle.Pedido, {
    cascade: true,
  })
  PedidoDetalle: MarketPedidoDetalle[];

  @OneToMany(() => MarketPedidoCupon, (cupon) => cupon.Pedido, {
    cascade: true,
  })
  PedidoCupones: MarketPedidoCupon[];
}
