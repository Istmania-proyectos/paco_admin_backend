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
import { JwtPayload } from '../auth/jwt.strategy';
import { CreateTicketDto } from './dto/create-ticket.dto';
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

  @Get()
  getTickets(
    @Query() query: TicketQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tickets.get(query, request.user);
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
}
