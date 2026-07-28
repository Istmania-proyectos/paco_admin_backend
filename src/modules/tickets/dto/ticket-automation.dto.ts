import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TicketAutomationQueryDto {
  @ApiPropertyOptional({
    default: 14,
    example: 14,
    description: 'Formulario de CheckIn que se desea simular.',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  formulario?: number = 14;

  @ApiPropertyOptional({
    default: 104760,
    example: 104760,
    description:
      'Respuesta específica. También incluye las demás respuestas de su dependencia.',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  respuesta?: number;

  @ApiPropertyOptional({
    example: '104707',
    description:
      'Dependencia específica. Dejar vacío cuando se filtre por respuesta.',
  })
  @IsOptional()
  @IsString()
  dependencia?: string;
}

export class TicketRenewalQueryDto {
  @ApiPropertyOptional({
    default: 30,
    example: 30,
    description: 'Días máximos sin resolución antes de renovar el ticket.',
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(365)
  dias?: number = 30;
}
