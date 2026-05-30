import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ArticulosQueryDto } from '../dto/articulos-query.dto';
import { FilterArticulosDto } from '../dto/filter-articulos.dto';
import { MarketQueryDto } from '../dto/market-query.dto';
import { ArticulosService } from './articulos.service';

@ApiTags('Market Articulos')
@Controller('api/listaarticulo')
export class ArticulosController {
  constructor(private readonly articulosService: ArticulosService) {}

  @Get('GetFilter')
  getFilter() {
    return this.articulosService.getFilter();
  }

  @Get('GetTodo')
  getTodo(@Query() query: ArticulosQueryDto) {
    return this.articulosService.getTodo(query.VAL, query.BODEGA);
  }

  @Get('GetTodoCombo')
  getTodoCombo(@Query() query: ArticulosQueryDto) {
    return this.articulosService.getTodoCombo(query.VAL, query.BODEGA);
  }

  @Get('GetComentario')
  getComentario(@Query() query: ArticulosQueryDto) {
    return this.articulosService.getComentario(query.sku, query.indice);
  }

  @Get('GetCupon')
  getCupon(@Query() query: ArticulosQueryDto) {
    return this.articulosService.getCupon(query.cupon, query.userId);
  }

  @Get('GetMarket')
  getMarket(@Query() query: MarketQueryDto) {
    return this.articulosService.getMarket(query);
  }

  @Post('PostInicial')
  postInicial(@Body() filter: FilterArticulosDto) {
    return this.articulosService.postInicial(filter);
  }

  @Post('PostFilter')
  postFilter(@Body() filter: FilterArticulosDto) {
    return this.articulosService.postFilter(filter);
  }
}
