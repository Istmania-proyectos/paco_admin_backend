import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ValoracionReceta')
export class MarketValoracionReceta {
  @PrimaryGeneratedColumn()
  Id: number;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  Comentario: string;

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  Receta: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  Cliente: string;

  @Column({ type: 'int', nullable: true })
  Valoracion: number;

  @Column({ type: 'datetime', nullable: true })
  FechaCreacion: Date;
}
