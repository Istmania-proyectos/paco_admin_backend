import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { LibroRutaController } from './libro-ruta.controller';
import { LibroRutaService } from './libro-ruta.service';

@Module({
  imports: [MailModule],
  controllers: [LibroRutaController],
  providers: [LibroRutaService],
})
export class LibroRutaModule {}
