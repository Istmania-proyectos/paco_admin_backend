import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SellerProductResponseDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idTicketProducto: number;

  @IsIn(['CERRAR', 'REABRIR'])
  accion: 'CERRAR' | 'REABRIR';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comentario?: string;
}

export class SellerTicketTokenDto {
  @IsString()
  @MinLength(40)
  @MaxLength(200)
  token: string;
}

export class SellerTicketResponseDto extends SellerTicketTokenDto {
  @IsOptional()
  @IsIn(['CERRAR', 'REABRIR'])
  accion?: 'CERRAR' | 'REABRIR';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comentario?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SellerProductResponseDto)
  productos?: SellerProductResponseDto[];
}
