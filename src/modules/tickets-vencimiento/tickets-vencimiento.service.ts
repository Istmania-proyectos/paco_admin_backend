import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { JwtPayload } from '../auth/jwt.strategy';
import { DatabaseService } from '../database/database.service';
@Injectable()
export class TicketsVencimientoService {
 constructor(private readonly db:DatabaseService){}
 get(q:any,u:JwtPayload){const o=[1,2,3,4,5].includes(Number(q.opcion))?Number(q.opcion):1;return this.db.executeProcedure('PACO_TICKET_VENCIMIENTO_GET',{Option:String(o),Param1:q.param1??'',Param2:q.param2??'1',Param3:q.param3??'',Param4:q.param4??'',Param5:u.id});}
 create(body:any,u:JwtPayload){return this.db.executeProcedure('PACO_TICKET_VENCIMIENTO_CREATE',{Json:JSON.stringify(body),UsuarioId:u.id,NombreUsuario:u.sub??u.id});}
 vendor(id:string,body:any,u:JwtPayload){return this.db.executeProcedure('PACO_TICKET_VENCIMIENTO_RESPUESTA_VENDEDOR',{IdTicket:id,UsuarioId:u.id,Accion:body.accion,Comentario:body.comentario,NombreUsuario:u.sub??u.id});}
 checkin(formulario?:string){return this.db.executeProcedure('PACO_TICKET_VENCIMIENTO_CHECKIN_RESPUESTAS',{Formulario:String(Number(formulario)||14)});}
 async approval(token:string){const rows=await this.db.executeProcedure<any>('PACO_TICKET_GET_APROBACION',{HashHex:this.hash(token)});const item=rows[0];if(!item)throw new NotFoundException('Enlace inexistente.');if(item.TokenEstado!=='VALIDO')throw new ConflictException('El enlace ya no está disponible.');return item;}
 async approve(body:any){const rows=await this.db.executeProcedure<any>('PACO_TICKET_RESPONDER_APROBACION',{HashHex:this.hash(body.token),Json:JSON.stringify(body)});return {estado:rows[0]?.Estado};}
 private hash(value:string){return createHash('sha256').update(value??'','utf8').digest('hex');}
}
