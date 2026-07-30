import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiUserGuard } from '../auth/api-user.guard';
import { MasterDataGuard } from '../auth/master-data.guard';
import {
  CreateSupervisorGerenteDto,
  UpdateSupervisorGerenteDto,
} from './dto/supervisor-gerente.dto';
import { CreateVendedorDto, UpdateVendedorDto } from './dto/vendedor.dto';
import { MasterDataService } from './master-data.service';

@ApiTags('Datos maestros')
@ApiBearerAuth()
@UseGuards(ApiUserGuard, MasterDataGuard)
@Controller('api/master-data')
export class MasterDataController {
  constructor(private readonly masterData: MasterDataService) {}

  @Get('vendedores')
  listVendedores() {
    return this.masterData.listVendedores();
  }

  @Post('vendedores')
  createVendedor(@Body() value: CreateVendedorDto) {
    return this.masterData.createVendedor(value);
  }

  @Patch('vendedores/:idSapVendedor')
  updateVendedor(
    @Param('idSapVendedor') idSapVendedor: string,
    @Body() value: UpdateVendedorDto,
  ) {
    return this.masterData.updateVendedor(idSapVendedor, value);
  }

  @Get('supervisores-gerentes')
  listSupervisoresGerentes() {
    return this.masterData.listSupervisoresGerentes();
  }

  @Post('supervisores-gerentes')
  createSupervisorGerente(@Body() value: CreateSupervisorGerenteDto) {
    return this.masterData.createSupervisorGerente(value);
  }

  @Patch('supervisores-gerentes/:codigoVendedor')
  updateSupervisorGerente(
    @Param('codigoVendedor') codigoVendedor: string,
    @Body() value: UpdateSupervisorGerenteDto,
  ) {
    return this.masterData.updateSupervisorGerente(codigoVendedor, value);
  }
}
