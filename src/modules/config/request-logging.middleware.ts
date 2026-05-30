/* eslint-disable prefer-rest-params */
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as chalk from 'chalk';
import { LoggerwinstonService } from 'src/utils/service/loggerwinston/loggerwinston.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');
  constructor(private readonly winstonService: LoggerwinstonService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();
    let body = '';
    const oldSend = res.send;

    res.send = function (data) {
      body = data;
      return oldSend.apply(res, arguments);
    };

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');
      const responseTime = Date.now() - start;

      let statusColor;

      switch (true) {
        case statusCode >= 200 && statusCode < 300:
          statusColor = chalk.green;
          break;
        case statusCode >= 300 && statusCode < 400:
          statusColor = chalk.yellow;
          break;
        case statusCode >= 400:
          statusColor = chalk.red;
          break;
        default:
          statusColor = chalk.white;
      }

      const logMessage = `${statusColor(method)} ${statusColor(
        originalUrl,
      )} ${statusColor(statusCode)} ${statusColor(
        contentLength,
      )} - ${responseTime}ms`;
      this.logger.log(logMessage);
      this.winstonService.log(
        `${method} ${originalUrl} ${statusCode} ${contentLength} - ${responseTime}ms}, body: ${body}`,
      );
      if (statusCode >= 400) {
        this.winstonService.error(
          `${method} ${originalUrl} ${statusCode} ${contentLength} - ${responseTime}ms, body: ${body}`,
        );
      }
    });
    next();
  }
}
