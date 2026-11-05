import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { ApiUserGuard } from '../auth/api-user.guard';
import {
  QuitarFacturaDto,
  ReingresarPagoDto,
  ReingresarPedidoDto,
} from './dto/pagos-s4hana.dto';
import { PagosS4hanaService } from './pagos-s4hana.service';

@ApiTags('Pagos S4HANA')
@ApiBearerAuth()
@UseGuards(ApiUserGuard)
@Controller('api/pagos-s4hana')
export class PagosS4hanaController {
  constructor(private readonly service: PagosS4hanaService) {}

  @Get('pagos')
  listarPagos() {
    return this.service.listarPagos();
  }

  @Get('facturas')
  listarFacturas() {
    return this.service.listarFacturas();
  }

  @Patch('pedidos/reingresar')
  @UseGuards(AdminGuard)
  reingresarPedido(@Body() value: ReingresarPedidoDto) {
    return this.service.reingresarPedido(value);
  }

  @Patch('pagos/reingresar')
  @UseGuards(AdminGuard)
  reingresarPago(@Body() value: ReingresarPagoDto) {
    return this.service.reingresarPago(value);
  }

  @Patch('facturas/quitar')
  @UseGuards(AdminGuard)
  quitarFactura(@Body() value: QuitarFacturaDto) {
    return this.service.quitarFactura(value);
  }
}
