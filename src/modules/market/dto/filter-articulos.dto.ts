import { IsOptional, IsString } from 'class-validator';

export class FilterArticulosDto {
  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  Categoria?: string;

  @IsOptional()
  @IsString()
  casa?: string;

  @IsOptional()
  @IsString()
  Casa?: string;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  Marca?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  Nombre?: string;

  @IsOptional()
  @IsString()
  bodega?: string;

  @IsOptional()
  @IsString()
  Bodega?: string;

  @IsOptional()
  @IsString()
  usuario?: string;

  @IsOptional()
  @IsString()
  Usuario?: string;
}
