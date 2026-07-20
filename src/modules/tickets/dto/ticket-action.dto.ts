import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class TicketActionDto {
  @IsIn([
    'PROPONER_PLAN',
    'APROBAR_MERCADEO',
    'RECHAZAR_MERCADEO',
    'APROBAR_GERENCIA',
    'RECHAZAR_GERENCIA',
    'INICIAR_EJECUCION',
    'SOLICITAR_CIERRE',
    'CANCELAR',
  ])
  accion: string;

  @IsOptional()
  @IsString()
  comentario?: string;

  @IsOptional()
  @IsIn(['CAMBIO', 'DEVOLUCION', 'DESCUENTO', 'REUBICACION', 'PROMOCION', 'OTRO'])
  tipoAccion?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  descripcionPlan?: string;

  @IsOptional()
  @IsDateString()
  fechaCompromiso?: string;

  @IsOptional()
  @IsString()
  @MaxLength(450)
  responsable?: string;
}
