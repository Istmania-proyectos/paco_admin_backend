import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class ReingresarPedidoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}

export class ReingresarPagoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  numRecibo: string;
}

export class QuitarFacturaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagoId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}
