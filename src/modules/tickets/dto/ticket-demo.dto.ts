import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class StartTicketDemoDto {
  @ApiProperty({
    example: 'TEST',
    description: 'Código de confirmación para iniciar la demostración.',
  })
  @IsString()
  @MaxLength(20)
  codigo: string;

  @ApiProperty({
    required: false,
    default: 1,
    minimum: 1,
    maximum: 2,
    description: 'Cantidad de tickets que se crearán para la demostración.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2)
  cantidad?: number;
}
