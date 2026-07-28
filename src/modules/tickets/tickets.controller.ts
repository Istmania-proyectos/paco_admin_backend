import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiUserGuard } from '../auth/api-user.guard';
import { AdminGuard } from '../auth/admin.guard';
import { JwtPayload } from '../auth/jwt.strategy';
import { CreateTicketDto } from './dto/create-ticket.dto';
import {
  TicketAutomationQueryDto,
  TicketRenewalQueryDto,
} from './dto/ticket-automation.dto';
import { StartTicketDemoDto } from './dto/ticket-demo.dto';
import { TicketActionDto } from './dto/ticket-action.dto';
import { TicketQueryDto } from './dto/ticket-query.dto';
import { TicketsService } from './tickets.service';

type AuthenticatedRequest = Request & { user: JwtPayload };

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(ApiUserGuard)
@Controller('api/Tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get('configuracion/enlaces-publicos')
  getPublicLinkConfiguration() {
    return this.tickets.getPublicLinkConfiguration();
  }

  @Get()
  getTickets(
    @Query() query: TicketQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tickets.get(query, request.user);
  }

  @Get('exportar')
  exportTickets(
    @Query('estado') estado?: string,
    @Query('buscar') buscar?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.tickets.export(estado, buscar, fechaDesde, fechaHasta);
  }

  @Get('checkin/respuestas')
  getCheckinResponses(@Query('formulario') formulario?: string) {
    return this.tickets.getCheckinResponses(Number(formulario ?? 14));
  }

  @Get('automatizacion/simulacion')
  simulateAutomation(@Query() query: TicketAutomationQueryDto) {
    return this.tickets.runCheckinAutomation(false, query.formulario ?? 14, {
      respuesta: query.respuesta,
      dependencia: query.dependencia,
    });
  }

  @Post('automatizacion/ejecutar')
  @UseGuards(AdminGuard)
  executeAutomation(@Body() query: TicketAutomationQueryDto) {
    return this.tickets.runCheckinAutomation(true, query.formulario ?? 14);
  }

  @Get('automatizacion/renovaciones/simulacion')
  simulateRenewals(@Query() query: TicketRenewalQueryDto) {
    return this.tickets.runMonthlyRenewals(false, query.dias ?? 30);
  }

  @Post('automatizacion/renovaciones/ejecutar')
  @UseGuards(AdminGuard)
  executeRenewals(@Body() query: TicketRenewalQueryDto) {
    return this.tickets.runMonthlyRenewals(true, query.dias ?? 30);
  }

  @Get('demo/estado')
  getDemoStatus() {
    return this.tickets.getDemoStatus();
  }

  @Post('demo/iniciar')
  startDemo(
    @Body() dto: StartTicketDemoDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tickets.startDemo(dto.codigo, request.user);
  }

  @Post('demo/limpiar')
  clearDemo(
    @Body() dto: StartTicketDemoDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tickets.clearDemo(dto.codigo, request.user);
  }

  @Post()
  createTicket(
    @Body() dto: CreateTicketDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tickets.create(dto, request.user);
  }

  @Post(':id/transiciones')
  transition(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TicketActionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tickets.transition(String(id), dto, request.user);
  }

  @Get(':id/productos')
  getProducts(@Param('id', ParseIntPipe) id: number) {
    return this.tickets.getProducts(String(id));
  }

  @Post(':id/reenviar-notificacion')
  resendNotification(@Param('id', ParseIntPipe) id: number) {
    return this.tickets.resendNotification(String(id));
  }
}
