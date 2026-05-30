import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MarketCliente } from './cliente.entity';

@Entity('Direcciones')
export class MarketDireccion {
  @PrimaryGeneratedColumn()
  Id: number;

  @Column({ type: 'nvarchar', length: 40, nullable: true })
  Departamento: string;

  @Column({ type: 'nvarchar', length: 40, nullable: true })
  Municipio: string;

  @Column({ type: 'nvarchar', length: 40, nullable: true })
  Colonia: string;

  @Column({ type: 'nvarchar', length: 40, nullable: true })
  Calle: string;

  @Column({ type: 'nvarchar', length: 40, nullable: true })
  Avenida: string;

  @Column({ type: 'nvarchar', length: 95, nullable: true })
  NumCasa: string;

  @Column({ type: 'nvarchar', length: 450, nullable: true })
  IdentityId: string;

  @ManyToOne(() => MarketCliente, (cliente) => cliente.Direcciones)
  Clientes: MarketCliente;
}
