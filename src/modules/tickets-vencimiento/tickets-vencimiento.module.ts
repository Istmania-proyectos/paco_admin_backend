import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { TicketsVencimientoController } from './tickets-vencimiento.controller';
import { TicketsVencimientoService } from './tickets-vencimiento.service';
@Module({imports:[MailModule],controllers:[TicketsVencimientoController],providers:[TicketsVencimientoService]})
export class TicketsVencimientoModule {}
