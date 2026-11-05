import { Module } from '@nestjs/common';
import { PagosS4hanaController } from './pagos-s4hana.controller';
import { PagosS4hanaService } from './pagos-s4hana.service';

@Module({
  controllers: [PagosS4hanaController],
  providers: [PagosS4hanaService],
})
export class PagosS4hanaModule {}
