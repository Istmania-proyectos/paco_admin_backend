import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { MarketDireccion } from './direccion.entity';

@Entity('Clientes')
export class MarketCliente {
  @PrimaryGeneratedColumn()
  Id: number;

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  Cliente: string;

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  Email: string;

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  Nombre: string;

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  Apellido: string;

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  Identidad: string;

  @Column({ type: 'datetime', nullable: true })
  Nacimiento: Date;

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  Celular: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  ListaPrecio: string;

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  Clave: string;

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  Llave: string;

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  Genero: string;

  @Column({ type: 'nvarchar', length: 450, nullable: true })
  IdentityId: string;

  @OneToMany(() => MarketDireccion, (direccion) => direccion.Clientes)
  Direcciones: MarketDireccion[];
}
