import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApprovalTicketResponseDto, ApprovalTicketTokenDto } from './dto/approval-ticket-response.dto';
import { TicketsService } from './tickets.service';
@Controller('api/Tickets/aprobacion')
export class ApprovalTicketResponseController {
 constructor(private readonly tickets:TicketsService){}
 @Get() get(@Query() q:ApprovalTicketTokenDto){return this.tickets.getApprovalTicket(q.token);}
 @Post() answer(@Body() dto:ApprovalTicketResponseDto){return this.tickets.respondApproval(dto);}
}
