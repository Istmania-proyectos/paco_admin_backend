import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRelatedEmailDto {
  @IsEmail()
  @MaxLength(256)
  correoprincipal: string;

  @IsEmail()
  @MaxLength(256)
  correorelacionado: string;

  @IsOptional()
  @IsDateString()
  fechainicio?: string;

  @IsOptional()
  @IsDateString()
  fechafinal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  app?: string;

  @IsOptional()
  @IsBoolean()
  esSuplentePrincipal?: boolean;
}

export class UpdateRelatedEmailDto extends CreateRelatedEmailDto {}

export class UpdateVacationsDto {
  @IsBoolean()
  vacaciones: boolean;
}

export class RelatedEmailQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  app?: string;

  @IsOptional()
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(256)
  correoprincipal?: string;
}
