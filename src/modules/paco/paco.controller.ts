import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiUserGuard } from '../auth/api-user.guard';
import { PacoParams, PacoService } from './paco.service';

@ApiTags('Paco')
@ApiBearerAuth()
@UseGuards(ApiUserGuard)
@Controller('api/Paco')
export class PacoController {
  constructor(private readonly paco: PacoService) {}

  @Get('GetPACO')
  getPaco(@Query() query: PacoParams) {
    return this.paco.get(query);
  }

  @Post('PostPACO')
  @HttpCode(HttpStatus.OK)
  postPaco(@Body() value: unknown) {
    return this.paco.post(value);
  }

  @Get('Correo')
  correo(@Query() query: PacoParams) {
    return this.paco.sendMail(query);
  }
}
