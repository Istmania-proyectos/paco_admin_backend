import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiUserGuard } from '../auth/api-user.guard';
import { JwtPayload } from '../auth/jwt.strategy';
import { TicketsVencimientoService } from './tickets-vencimiento.service';
type AuthRequest=Request&{user:JwtPayload};
@ApiTags('Tickets de vencimiento') @Controller('api/TicketsVencimiento')
export class TicketsVencimientoController {
 constructor(private readonly service:TicketsVencimientoService){}
 @Get() @ApiBearerAuth() @UseGuards(ApiUserGuard) get(@Query() q:any,@Req() r:AuthRequest){return this.service.get(q,r.user);}
 @Post() @ApiBearerAuth() @UseGuards(ApiUserGuard) create(@Body() body:any,@Req() r:AuthRequest){return this.service.create(body,r.user);}
 @Post(':id/respuesta-vendedor') @ApiBearerAuth() @UseGuards(ApiUserGuard) answer(@Param('id') id:string,@Body() body:any,@Req() r:AuthRequest){return this.service.vendor(id,body,r.user);}
 @Get('checkin/respuestas') @ApiBearerAuth() @UseGuards(ApiUserGuard) checkin(@Query('formulario') f?:string){return this.service.checkin(f);}
 @Get('aprobacion') approval(@Query('token') token:string){return this.service.approval(token);}
 @Post('aprobacion') approve(@Body() body:any){return this.service.approve(body);}
}
