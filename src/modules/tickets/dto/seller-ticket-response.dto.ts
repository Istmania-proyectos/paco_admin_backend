import { IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SellerTicketTokenDto {
  @IsString()
  @MinLength(40)
  @MaxLength(200)
  token: string;
}

export class SellerTicketResponseDto extends SellerTicketTokenDto {
  @IsIn(['CERRAR', 'REABRIR'])
  accion: 'CERRAR' | 'REABRIR';

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  comentario: string;
}
