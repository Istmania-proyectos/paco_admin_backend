import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class TicketProductActionItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idTicketProducto: number;

  @IsOptional()
  @IsIn([
    'CAMBIO',
    'DEVOLUCION',
    'DESCUENTO',
    'PROMOCION',
    'DEGUSTACION',
    'NOTA_CREDITO',
    'OTRO',
  ])
  tipoAccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  descripcionPlan?: string;

  @IsOptional()
  @IsDateString()
  fechaCompromiso?: string;

  @IsOptional()
  @IsString()
  @MaxLength(450)
  responsable?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comentario?: string;
}

/** Acción parcial desde la bandeja autenticada; no invalida el enlace de correo. */
export class TicketProductActionDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsEmail({}, { each: true })
  correosCc?: string[];

  @IsIn([
    'PROPONER_PLAN',
    'APROBAR_MERCADEO',
    'RECHAZAR_MERCADEO',
    'APROBAR_GERENCIA',
    'RECHAZAR_GERENCIA',
    'INICIAR_EJECUCION',
  ])
  accion: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TicketProductActionItemDto)
  productos: TicketProductActionItemDto[];
}
