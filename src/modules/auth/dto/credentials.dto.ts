import { IsNotEmpty, IsString } from 'class-validator';

export class CredentialsDto {
  @IsString()
  @IsNotEmpty()
  UserName: string;

  @IsString()
  @IsNotEmpty()
  Password: string;
}
