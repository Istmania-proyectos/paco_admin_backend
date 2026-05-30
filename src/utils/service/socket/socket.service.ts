import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SocketPayload } from 'src/utils/interfaces/socket-payload';
import { SocketPayloadTo } from 'src/utils/interfaces/socket-payload-to.interface';

@Injectable()
export class SocketService {
  constructor(private eventEmitter: EventEmitter2) {}

  /**
   *@description Emits a socket event
   * @param data : {
   * event: string,
   * data: any}
   * @returns void
   * @memberof SocketService
   */
  socketEmitter(data: SocketPayload) {
    this.eventEmitter.emit('message', data);
  }

  /**
   * @description Emits a socket event to a specific user
   * @param data : {
   * event: string,
   * data: any,
   * to: string}
   * @returns void
   * @memberof SocketService
   */
  socketEmitterTo(data: SocketPayloadTo) {
    this.eventEmitter.emit('message-to', data);
  }
}
