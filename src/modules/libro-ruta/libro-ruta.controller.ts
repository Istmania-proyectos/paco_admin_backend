import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LibroRutaService } from './libro-ruta.service';

@ApiTags('Libro de ruta')
@Controller('api/libro-ruta')
export class LibroRutaController {
  constructor(private readonly service: LibroRutaService) {}

  @Post('invitaciones')
  invitar(
    @Headers('x-paco-integration-key') integrationKey: string,
    @Body() body: { propuestaId: number; correo: string },
  ) {
    return this.service.invitar(body, integrationKey || '');
  }

  @Get('aprobacion')
  consultar(@Query('token') token: string) {
    return this.service.consultar(token || '');
  }

  @Post('aprobacion')
  responder(
    @Body()
    body: {
      token: string;
      accion: 'APROBAR' | 'RECHAZAR' | 'CAMBIOS';
      comentario?: string;
    },
  ) {
    return this.service.responder(body);
  }
}
