import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateVendedorDto {
  @IsString()
  @Length(1, 10)
  id_sap_vendedor: string;

  @IsString()
  @Length(1, 10)
  codigo_vendedor: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre_vendedor?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsBoolean()
  aplica_desc_adicional?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo_supervisor?: string;
}

export class UpdateVendedorDto {
  @IsString()
  @Length(1, 10)
  codigo_vendedor: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre_vendedor?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsBoolean()
  aplica_desc_adicional?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo_supervisor?: string;
}
