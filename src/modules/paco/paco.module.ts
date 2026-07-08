import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { PacoController } from './paco.controller';
import { PacoService } from './paco.service';

@Module({
  imports: [MailModule],
  controllers: [PacoController],
  providers: [PacoService],
})
export class PacoModule {}
