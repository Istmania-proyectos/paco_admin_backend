import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTicketDetailDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  idDetalleOrigen?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  idPreguntaOrigen?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pregunta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipoRespuesta?: string;

  @IsString()
  valor: string;
}

export class CreateTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sistemaOrigen?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  idRespuestaOrigen?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  idFormularioOrigen?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigoCliente: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombreCliente: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigoVendedor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombreVendedor?: string;

  @IsEmail()
  @MaxLength(256)
  correoVendedor: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipoTicket: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsIn(['BAJA', 'NORMAL', 'ALTA', 'URGENTE'])
  prioridad?: string;

  @IsOptional()
  @IsDateString()
  fechaRespuestaOrigen?: string;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTicketDetailDto)
  detalles: CreateTicketDetailDto[];
}
