import { HttpException, Inject, Injectable } from '@nestjs/common';
import * as sql from 'mssql';

type ProcedureParams = {
  option: string | number;
  param1?: string;
  param2?: string;
  param3?: string;
  param4?: string;
  param5?: string;
};

@Injectable()
export class MarketService {
  constructor(
    @Inject('SQL_SERVER') private readonly pool: sql.ConnectionPool,
  ) {}

  async executeProcedure(procedureName: string, params: ProcedureParams) {
    try {
      const request = this.pool.request();

      request.input('Option', sql.VarChar, String(params.option ?? ''));
      request.input('Param1', sql.VarChar, params.param1 ?? '');
      request.input('Param2', sql.VarChar, params.param2 ?? '');
      request.input('Param3', sql.VarChar, params.param3 ?? '');
      request.input('Param4', sql.VarChar, params.param4 ?? '');
      request.input('Param5', sql.VarChar, params.param5 ?? '');

      const result = await request.execute(procedureName);
      return result.recordset;
    } catch (error) {
      throw new HttpException(error.message, 500);
    }
  }

  getArticulos(params: ProcedureParams) {
    return this.executeProcedure('ISTMA_GET_ARTICULOS', params);
  }

  getMarket(params: ProcedureParams) {
    return this.executeProcedure('ISTMA_GET_MARKET', params);
  }

  getPedidos(params: ProcedureParams) {
    return this.executeProcedure('ISTMA_GET_PEDIDOS', params);
  }

  getAccounts(params: ProcedureParams) {
    return this.executeProcedure('ISTMA_GET_ACCOUNT', params);
  }
}
