import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  Password: string;
}

export class ResetPasswordAdminDto extends ResetPasswordDto {
  @IsString()
  UserName: string;

  @IsString()
  ClaveSecreta: string;
}
