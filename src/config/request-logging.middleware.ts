import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLoggingMiddleware');
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl: url, ip } = req;
    const userAgent = req.get('user-agent') || '';
    this.logger.log(`${method} ${url} from ${ip} - ${userAgent}`);
    next();
  }
}
