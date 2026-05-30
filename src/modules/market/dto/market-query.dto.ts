import { IsOptional, IsString } from 'class-validator';

export class MarketQueryDto {
  @IsOptional()
  @IsString()
  Opcion?: string;

  @IsOptional()
  @IsString()
  opcion?: string;

  @IsOptional()
  @IsString()
  param1?: string;

  @IsOptional()
  @IsString()
  Param1?: string;

  @IsOptional()
  @IsString()
  param2?: string;

  @IsOptional()
  @IsString()
  Param2?: string;

  @IsOptional()
  @IsString()
  param3?: string;

  @IsOptional()
  @IsString()
  Param3?: string;

  @IsOptional()
  @IsString()
  param4?: string;

  @IsOptional()
  @IsString()
  Param4?: string;

  @IsOptional()
  @IsString()
  param5?: string;

  @IsOptional()
  @IsString()
  Param5?: string;
}
