import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { extname, join } from 'path';
import { Response } from 'express';
import { mkdirSync, writeFileSync } from 'fs';
import { MarketClientePos } from '../entities/cliente-pos.entity';
import { MarketPagoOnline } from '../entities/pago-online.entity';
import { MarketPedido } from '../entities/pedido.entity';
import { OrdersService } from './orders.service';

@ApiTags('Market Orders')
@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('Order')
  order(@Body() payload: Partial<MarketPedido>) {
    return this.ordersService.createOrder(payload);
  }

  @Post('InsertClientePOS')
  insertClientePos(@Body() payload: Partial<MarketClientePos>) {
    return this.ordersService.insertClientePos(payload);
  }

  @Post('UpdateClientePOS')
  updateClientePos(@Body() payload: Partial<MarketClientePos>) {
    return this.ordersService.updateClientePos(payload);
  }

  @Get('GetFile')
  async getFile(
    @Query('pedidoId') pedidoId: string,
    @Res() response: Response,
  ) {
    const file = await this.ordersService.getFileMetadata(pedidoId);
    return response.download(file.path, file.fileName);
  }

  @Post('UploadFile')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@Body('idOrder') idOrder: string, @UploadedFile() file) {
    const destination = process.env.MARKET_UPLOAD_DIR ?? '/tmp/market-transfer';
    mkdirSync(destination, { recursive: true });

    const extension = extname(file.originalname);
    const filePath = join(destination, `${idOrder}${extension}`);
    writeFileSync(filePath, file.buffer);

    return this.ordersService.registerUploadedFile(
      idOrder,
      filePath,
      extension,
    );
  }

  @Post('OrderPay')
  orderPay(@Body() payload: Partial<MarketPagoOnline>) {
    return this.ordersService.createOrderPay(payload);
  }

  @Get('OrderPayVerificacion')
  orderPayVerificacion(@Query('paymentHash') paymentHash: string) {
    return this.ordersService.verifyOrderPay(paymentHash);
  }

  @Post('CancelOrder')
  cancelOrder(@Body() payload: Partial<MarketPedido>) {
    return this.ordersService.cancelOrder(payload);
  }
}
