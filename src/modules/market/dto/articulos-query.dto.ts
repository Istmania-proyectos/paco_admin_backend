import { IsOptional, IsString } from 'class-validator';

export class ArticulosQueryDto {
  @IsOptional()
  @IsString()
  VAL?: string;

  @IsOptional()
  @IsString()
  BODEGA?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  indice?: string;

  @IsOptional()
  @IsString()
  cupon?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
