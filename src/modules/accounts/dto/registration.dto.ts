import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegistrationDto {
  @IsEmail()
  Email: string;

  @IsString()
  @MinLength(6)
  Password: string;
}
