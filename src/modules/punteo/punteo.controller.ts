import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';

interface PunteoQuery {
  opcion?: string;
  param1?: string;
  param2?: string;
  param3?: string;
  param4?: string;
  param5?: string;
}

@ApiTags('Punteo')
@Controller('api/Punteo')
export class PunteoController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  getPaco(@Query() query: PunteoQuery) {
    return this.database.executeProcedure('PACO_GET_PUNTEO', {
      Option: query.opcion ?? '',
      Param1: query.param1 ?? '',
      Param2: query.param2 ?? '',
      Param3: query.param3 ?? '',
      Param4: query.param4 ?? '',
      Param5: query.param5 ?? '',
    });
  }
}
