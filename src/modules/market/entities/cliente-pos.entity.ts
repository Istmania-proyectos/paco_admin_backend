import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ClientePOS')
export class MarketClientePos {
  @PrimaryGeneratedColumn('uuid')
  Id: string;

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

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  Genero: string;
}
