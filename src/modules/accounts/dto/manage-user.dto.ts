import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateManagedUserDto {
  @IsEmail()
  Email: string;

  @IsString()
  @MinLength(6)
  Password: string;

  @IsOptional()
  @IsString()
  NombreContacto?: string;

  @IsOptional()
  @IsString()
  Celular?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  Roles?: string[];

  @IsOptional()
  @IsBoolean()
  Activo?: boolean;
}

export class UpdateManagedUserDto {
  @IsOptional()
  @IsEmail()
  Email?: string;

  @IsOptional()
  @IsString()
  NombreContacto?: string;

  @IsOptional()
  @IsString()
  Celular?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  Roles?: string[];

  @IsOptional()
  @IsBoolean()
  Activo?: boolean;
}
