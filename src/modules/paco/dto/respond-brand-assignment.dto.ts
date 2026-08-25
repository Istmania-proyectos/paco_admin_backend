import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RespondBrandAssignmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  marca: string;

  @IsBoolean()
  aceptar: boolean;
}
