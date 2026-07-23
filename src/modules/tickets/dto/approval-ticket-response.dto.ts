import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ApprovalTicketTokenDto {
  @IsString()
  @MinLength(40)
  @MaxLength(200)
  token: string;
}

export class ApprovalTicketResponseDto extends ApprovalTicketTokenDto {
  @IsIn([
    'PROPONER_PLAN',
    'APROBAR',
    'RECHAZAR',
    'INICIAR_EJECUCION',
    'SOLICITAR_CIERRE',
  ])
  decision:
    | 'PROPONER_PLAN'
    | 'APROBAR'
    | 'RECHAZAR'
    | 'INICIAR_EJECUCION'
    | 'SOLICITAR_CIERRE';

  @IsOptional()
  @IsIn([
    'CAMBIO',
    'DEVOLUCION',
    'DESCUENTO',
    'REUBICACION',
    'PROMOCION',
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

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  comentario: string;
}
