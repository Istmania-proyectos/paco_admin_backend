import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CredentialsDto {
  @ApiProperty({
    default: 'yovanni.amador@istmania.hn',
    example: 'yovanni.amador@istmania.hn',
  })
  @IsString()
  @IsNotEmpty()
  UserName: string;

  @ApiProperty({
    default: 'Ticket2026!',
    example: 'Ticket2026!',
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  Password: string;
}
