import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  SellerTicketResponseDto,
  SellerTicketTokenDto,
} from './dto/seller-ticket-response.dto';
import { TicketsService } from './tickets.service';

@ApiTags('Tickets - Respuesta vendedor')
@Controller('api/Tickets/respuesta-vendedor')
export class SellerTicketResponseController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  getTicket(@Query() query: SellerTicketTokenDto) {
    return this.tickets.getSellerTicket(query.token);
  }

  @Post()
  respond(@Body() dto: SellerTicketResponseDto) {
    return this.tickets.respondAsSeller(dto);
  }
}
