import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiUserGuard } from '../auth/api-user.guard';
import { JwtPayload } from '../auth/jwt.strategy';
import { RespondBrandAssignmentDto } from './dto/respond-brand-assignment.dto';
import { PacoParams, PacoService } from './paco.service';

type AuthenticatedRequest = Request & { user: JwtPayload };

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

  @Get('MarcasSinResponsable')
  getUnassignedBrands(@Req() request: AuthenticatedRequest) {
    return this.paco.getUnassignedBrands(request.user.id);
  }

  @Post('ResponderAsignacionMarca')
  @HttpCode(HttpStatus.OK)
  respondBrandAssignment(
    @Req() request: AuthenticatedRequest,
    @Body() value: RespondBrandAssignmentDto,
  ) {
    return this.paco.respondBrandAssignment(
      request.user.id,
      value.marca,
      value.aceptar,
    );
  }

  @Get('Correo')
  correo(@Query() query: PacoParams) {
    return this.paco.sendMail(query);
  }
}
