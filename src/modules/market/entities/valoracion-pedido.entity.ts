import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ValoracionPedido')
export class MarketValoracionPedido {
  @PrimaryGeneratedColumn()
  Id: number;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  Comentario: string;

  @Column({ type: 'int', nullable: true })
  Pedido: number;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  Cliente: string;

  @Column({ type: 'int', nullable: true })
  Valoracion: number;

  @Column({ type: 'datetime', nullable: true })
  FechaCreacion: Date;
}
