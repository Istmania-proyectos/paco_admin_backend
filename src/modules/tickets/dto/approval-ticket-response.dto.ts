import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ApprovalProductResponseDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idTicketProducto: number;

  @IsIn(['PROPONER_PLAN', 'APROBAR', 'RECHAZAR', 'INICIAR_EJECUCION'])
  decision:
    | 'PROPONER_PLAN'
    | 'APROBAR'
    | 'RECHAZAR'
    | 'INICIAR_EJECUCION';

  @IsOptional()
  @IsIn([
    'CAMBIO',
    'DEVOLUCION',
    'DESCUENTO',
    'REUBICACION',
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

export class ApprovalTicketTokenDto {
  @IsString()
  @MinLength(40)
  @MaxLength(200)
  token: string;
}

export class ApprovalTicketResponseDto extends ApprovalTicketTokenDto {
  @IsOptional()
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
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ApprovalProductResponseDto)
  productos?: ApprovalProductResponseDto[];

  @IsOptional()
  @IsIn([
    'CAMBIO',
    'DEVOLUCION',
    'DESCUENTO',
    'REUBICACION',
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
  @IsArray()
  @ArrayMaxSize(20)
  @IsEmail({}, { each: true })
  correosCc?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comentario?: string;
}
