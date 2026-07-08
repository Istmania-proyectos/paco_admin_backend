import { Module } from '@nestjs/common';
import { PunteoController } from './punteo.controller';

@Module({ controllers: [PunteoController] })
export class PunteoModule {}
