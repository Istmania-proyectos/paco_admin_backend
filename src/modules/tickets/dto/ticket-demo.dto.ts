import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class StartTicketDemoDto {
  @ApiProperty({
    example: 'TEST',
    description: 'Código de confirmación para iniciar la demostración.',
  })
  @IsString()
  @MaxLength(20)
  codigo: string;
}
