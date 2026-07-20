import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { MailModule } from '../mail/mail.module';
import { SellerTicketResponseController } from './seller-ticket-response.controller';

@Module({
  imports: [MailModule],
  controllers: [TicketsController, SellerTicketResponseController],
  providers: [TicketsService],
})
export class TicketsModule {}
