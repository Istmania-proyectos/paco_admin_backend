import { Injectable } from '@nestjs/common';
import { MarketService } from '../../database/market/market.service';
import { FilterArticulosDto } from '../dto/filter-articulos.dto';
import { MarketQueryDto } from '../dto/market-query.dto';

@Injectable()
export class ArticulosService {
  constructor(private readonly marketService: MarketService) {}

  private pick<T extends Record<string, any>>(
    source: T,
    ...keys: string[]
  ): string {
    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null) {
        return String(value);
      }
    }

    return '';
  }

  getFilter() {
    return this.marketService.getArticulos({ option: 2 });
  }

  getTodo(valor = '', bodega = '') {
    return this.marketService.getArticulos({
      option: 4,
      param1: valor,
      param2: bodega,
    });
  }

  getTodoCombo(valor = '', bodega = '') {
    return this.marketService.getArticulos({
      option: 7,
      param1: valor,
      param2: bodega,
    });
  }

  getComentario(sku = '', indice = '') {
    return this.marketService.getArticulos({
      option: 6,
      param1: sku,
      param2: indice,
    });
  }

  getCupon(cupon = '', userId = '') {
    return this.marketService.getArticulos({
      option: 8,
      param1: cupon,
      param2: userId,
    });
  }

  getMarket(query: MarketQueryDto) {
    return this.marketService.getMarket({
      option: this.pick(query, 'Opcion', 'opcion'),
      param1: this.pick(query, 'param1', 'Param1'),
      param2: this.pick(query, 'param2', 'Param2'),
      param3: this.pick(query, 'param3', 'Param3'),
      param4: this.pick(query, 'param4', 'Param4'),
      param5: this.pick(query, 'param5', 'Param5'),
    });
  }

  postInicial(filter: FilterArticulosDto) {
    return this.marketService.getArticulos({
      option: 1,
      param1: this.pick(filter, 'nombre', 'Nombre'),
      param2: this.pick(filter, 'bodega', 'Bodega'),
      param3: this.pick(filter, 'usuario', 'Usuario'),
      param4: this.pick(filter, 'casa', 'Casa'),
    });
  }

  postFilter(filter: FilterArticulosDto) {
    return this.marketService.getArticulos({
      option: 3,
      param1: this.pick(filter, 'categoria', 'Categoria'),
      param2: this.pick(filter, 'casa', 'Casa'),
      param3: this.pick(filter, 'marca', 'Marca'),
      param4: this.pick(filter, 'nombre', 'Nombre'),
      param5: this.pick(filter, 'bodega', 'Bodega'),
    });
  }
}
