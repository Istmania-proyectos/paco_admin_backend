import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { MarketService } from '../../database/market/market.service';
import { JwtAuthGuard } from '../../jwt-auth/guard/jwt-auth.guard';
import { MarketCliente } from '../entities/cliente.entity';
import { MarketDireccion } from '../entities/direccion.entity';
import { MarketValoracionPedido } from '../entities/valoracion-pedido.entity';
import { MarketValoracionProducto } from '../entities/valoracion-producto.entity';
import { MarketValoracionReceta } from '../entities/valoracion-receta.entity';
import { DashboardService } from './dashboard.service';

@ApiTags('Market Dashboard')
@Controller('api/dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly marketService: MarketService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('Home')
  home(@Req() request) {
    return this.dashboardService.home(request.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('GetUserInfo')
  getUserInfo(@Req() request) {
    return this.dashboardService.getUserInfo(request.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('InsertInfoUser')
  insertInfoUser(@Body() payload: Partial<MarketCliente>) {
    return this.dashboardService.insertInfoUser(payload);
  }

  @UseGuards(JwtAuthGuard)
  @Post('UpdateInfoUser')
  updateInfoUser(@Req() request, @Body() payload: Partial<MarketCliente>) {
    return this.dashboardService.updateInfoUser(request.user, payload);
  }

  @UseGuards(JwtAuthGuard)
  @Get('GetDireccionUser')
  getDireccionUser(@Req() request) {
    return this.dashboardService.getDireccionUser(request.user);
  }

  @Get('GetFile')
  async getFile(
    @Query('idDocumento') idDocumento: string,
    @Res() response: Response,
  ) {
    const rows = await this.marketService.getMarket({
      option: 9,
      param2: idDocumento,
    });
    const file = rows?.[0];
    return response.download(file.Path, file.FileName);
  }

  @UseGuards(JwtAuthGuard)
  @Post('CreateDireccionUser')
  createDireccionUser(
    @Req() request,
    @Body() payload: Partial<MarketDireccion>,
  ) {
    return this.dashboardService.createDireccionUser(request.user, payload);
  }

  @UseGuards(JwtAuthGuard)
  @Post('UpdateDireccionUser')
  updateDireccionUser(@Body() payload: Partial<MarketDireccion>) {
    return this.dashboardService.updateDireccionUser(payload);
  }

  @UseGuards(JwtAuthGuard)
  @Post('DeleteDireccionUser')
  deleteDireccionUser(@Body() payload: Partial<MarketDireccion>) {
    return this.dashboardService.deleteDireccionUser(payload);
  }

  @UseGuards(JwtAuthGuard)
  @Get('GetOrderUser')
  getOrderUser(@Req() request, @Query() query: any) {
    return this.dashboardService.getOrderUser(request.user, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('ChangePasswordAsync')
  changePasswordAsync() {
    return this.dashboardService.changePasswordAsync();
  }

  @UseGuards(JwtAuthGuard)
  @Get('GetOrderUserDetails')
  getOrderUserDetails(@Query('id') id: string) {
    return this.dashboardService.getOrderUserDetails(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('InsertFavoritoSKU')
  insertFavoritoSku(@Req() request, @Query('sku') sku: string) {
    return this.dashboardService.insertFavoritoSku(request.user, sku);
  }

  @UseGuards(JwtAuthGuard)
  @Post('InsertComentarioUser')
  insertComentarioUser(
    @Req() request,
    @Body() payload: Partial<MarketValoracionProducto>,
  ) {
    return this.dashboardService.insertComentarioUser(request.user, payload);
  }

  @UseGuards(JwtAuthGuard)
  @Post('InsertComentarioRecetaUser')
  insertComentarioRecetaUser(
    @Req() request,
    @Body() payload: Partial<MarketValoracionReceta>,
  ) {
    return this.dashboardService.insertComentarioRecetaUser(
      request.user,
      payload,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('InsertComentarioOrderUser')
  insertComentarioOrderUser(
    @Req() request,
    @Body() payload: Partial<MarketValoracionPedido>,
  ) {
    return this.dashboardService.insertComentarioOrderUser(
      request.user,
      payload,
    );
  }

  @Post('ForgotPassword')
  forgotPassword(@Body() model: { Email?: string }) {
    return this.dashboardService.forgotPassword(model);
  }
}
