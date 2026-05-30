import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './modules/database/database.module';
import { LoggerMiddleware } from './modules/config/request-logging.middleware';
import { LoggerwinstonService } from './utils/service/loggerwinston/loggerwinston.service';
import { JwtAuthModule } from './modules/jwt-auth/jwt-auth.module';
import { SharedModule } from './modules/shared/shared.module';
import { SocketProvider } from './providers/socket/socket';
import { SocketService } from './utils/service/socket/socket.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MarketModule } from './modules/market/market.module';

@Module({
  imports: [
    DatabaseModule,
    JwtAuthModule,
    SharedModule,
    EventEmitterModule.forRoot(),
    MarketModule,
  ],
  controllers: [AppController],
  providers: [AppService, LoggerwinstonService, SocketProvider, SocketService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
