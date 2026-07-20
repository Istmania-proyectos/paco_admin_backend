import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TicketQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  opcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(450)
  param1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(450)
  param2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(450)
  param3?: string;

  @IsOptional()
  @IsString()
  @MaxLength(450)
  param4?: string;

  @IsOptional()
  @IsString()
  @MaxLength(450)
  param5?: string;
}
