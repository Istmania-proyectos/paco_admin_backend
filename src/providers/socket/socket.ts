import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import * as chalk from 'chalk';
import { Server, Socket } from 'socket.io';
import { Observable } from 'rxjs';
import { SocketPayload } from 'src/utils/interfaces/socket-payload';
import { instrument } from '@socket.io/admin-ui';
import { SocketPayloadTo } from 'src/utils/interfaces/socket-payload-to.interface';

@WebSocketGateway({
  cors: {
    origin: [
      '*',
      'http://localhost:3001',
      'http://localhost:4200',
      'http://192.168.0.6:8081',
      'https://admin.socket.io/#/',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class SocketProvider
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private logger = new Logger('WebSocket');

  @WebSocketServer() serverglobal: Socket;

  @WebSocketServer() server: Server;

  /**
   * @param client : cliento que envia el mensaje
   * @param payload : payload que recibe el servidor
   * @description : evento que recibe el servidor, evento custom para que el backend escuche los eventos del frontend
   */
  @SubscribeMessage('message-from-server')
  onEvent(client: any, payload: any): Observable<WsResponse<any>> | any {
    //console.log(payload);
    //console.log(client);
    this.logger.log(chalk.magenta('message-from-server', payload.event));
    this.serverglobal.emit('message-response', payload);
  }

  /**
   * @param client : cliente que envia el mensaje
   * @param payload : payload que recibe el servidor
   * @description : evento que recibe el servidor, evento custom para que el backend escuche los eventos del frontend
   */
  @SubscribeMessage('join')
  handleJoin(client: Socket, payload: any): void {
    const { roomId } = payload;
    client.join(roomId);
    this.logger.log(chalk.magenta(`Client joined room: ${roomId}`));
  }

  /**
   * @param client : cliente que envia el mensaje
   * @param payload : payload que recibe el servidor
   * @description : evento que recibe el servidor, evento custom para que el backend escuche los eventos del frontend
   */
  @OnEvent('message')
  SendMessage(data: SocketPayload) {
    //console.log(data);
    this.logger.log(chalk.magenta('Event', data.event));
    this.serverglobal.emit(data.event, data.data);
  }

  @OnEvent('message-to')
  SendMessageTo(data: SocketPayloadTo) {
    this.logger.log(chalk.magenta('Event', data.event, 'to', data.to));

    this.serverglobal.to(data.to).emit(data.event, data.data);
  }

  /**
   * @param server : servidor que se inicializa
   * @description : evento que se ejecuta despues de que el servidor se inicializa
   * @returns : void
   * @example : onAfterInit(server)
   * @see : https://docs.nestjs.com/websockets/gateways
   * @see : https://docs.nestjs.com/websockets/gateways#server-instance
   * @see : https://docs.nestjs.com/websockets/gateways#advanced-gateways
   * */
  afterInit(server: any) {
    instrument(this.server, {
      auth: {
        type: 'basic',
        username: 'istma',
        password:
          '$2b$10$heqvAkYMez.Va6Et2uXInOnkCT6/uQj1brkrbyG3LpopDklcq7ZOS',
      },
      mode: 'development',
    });
    this.logger.log(chalk.green('Socket server initialized'));
  }

  /**
   * @param client : cliente que se conecta
   * @param args : argumentos que recibe el servidor
   * @description : evento que se ejecuta despues de que el cliente se conecta
   * @returns : void
   * @example : handleConnection(client, args)
   * @see : https://docs.nestjs.com/websockets/gateways
   * @see : https://docs.nestjs.com/websockets/gateways#connection
   * */
  handleConnection(client: any, ...args: any[]) {
    this.logger.log(chalk.blue(`Client connected: ${client.id}`));
  }

  /**
   * @param client : cliente que se desconecta
   * @description : evento que se ejecuta despues de que el cliente se desconecta
   * @returns : void
   * @example : handleDisconnect(client)
   * @see : https://docs.nestjs.com/websockets/gateways
   * @see : https://docs.nestjs.com/websockets/gateways#disconnect
   * */
  handleDisconnect(client: any) {
    this.logger.log(chalk.gray(`Client disconnected: ${client.id}`));
  }
}
