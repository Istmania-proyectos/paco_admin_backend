import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class VendorTicketActionDto {
  @IsIn(['CERRAR', 'REABRIR'])
  accion: 'CERRAR' | 'REABRIR';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comentario?: string;
}
