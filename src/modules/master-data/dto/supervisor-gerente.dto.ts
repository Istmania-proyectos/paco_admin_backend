import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateSupervisorGerenteDto {
  @IsString()
  @Length(1, 10)
  codigo_vendedor: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email_supervisor?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email_gerente?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo_supervisor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo_gerente?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nombre_supervisor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nombre_gerente?: string;
}

export class UpdateSupervisorGerenteDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email_supervisor?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email_gerente?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo_supervisor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo_gerente?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nombre_supervisor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nombre_gerente?: string;
}
