import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ArticulosController } from './articulos.controller';
import { ArticulosService } from './articulos.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ArticulosController],
  providers: [ArticulosService],
})
export class ArticulosModule {}
