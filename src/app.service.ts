import { Injectable } from '@nestjs/common';
import { SocketService } from './utils/service/socket/socket.service';

@Injectable()
export class AppService {
  constructor(private socket$: SocketService) {}

  getHello(): string {
    this.socket$.socketEmitter({
      event: 'rifa',
      data: 'Hello from the server, rifa',
    });
    return 'Hello World!';
  }
}
