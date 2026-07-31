import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReopenTicketAnswerDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  IdTicket?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  IdTicketDetalle: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  IdDetalleOrigen: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  IdPreguntaOrigen: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  Pregunta?: string;

  @IsOptional()
  TipoRespuesta?: string | number;

  @IsString()
  @MaxLength(4000)
  Valor: string;
}

export class VendorTicketActionDto {
  @IsIn(['CERRAR', 'REABRIR'])
  accion: 'CERRAR' | 'REABRIR';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comentario?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  IdTicket?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  NumeroTicket?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  IdFormularioOrigen?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  IdRespuestaOrigen?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  TicketAnteriorId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  respuestasAnteriores?: unknown[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ReopenTicketAnswerDto)
  respuestasNuevas?: ReopenTicketAnswerDto[];
}
