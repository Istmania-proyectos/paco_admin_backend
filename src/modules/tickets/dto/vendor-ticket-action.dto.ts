import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VendorTicketActionDto {
  @IsIn(['CERRAR', 'REABRIR'])
  accion: 'CERRAR' | 'REABRIR';

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  comentario: string;
}
