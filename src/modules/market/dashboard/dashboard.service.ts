import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketService } from '../../database/market/market.service';
import { SmtpMailerService } from '../../mail/smtp-mailer.service';
import { MarketCliente } from '../entities/cliente.entity';
import { MarketDireccion } from '../entities/direccion.entity';
import { MarketValoracionPedido } from '../entities/valoracion-pedido.entity';
import { MarketValoracionProducto } from '../entities/valoracion-producto.entity';
import { MarketValoracionReceta } from '../entities/valoracion-receta.entity';

@Injectable()
export class DashboardService {
  constructor(
    private readonly marketService: MarketService,
    private readonly mailerService: SmtpMailerService,
    private readonly jwtService: JwtService,
    @InjectRepository(MarketCliente)
    private readonly clienteRepo: Repository<MarketCliente>,
    @InjectRepository(MarketDireccion)
    private readonly direccionRepo: Repository<MarketDireccion>,
    @InjectRepository(MarketValoracionProducto)
    private readonly valoracionProductoRepo: Repository<MarketValoracionProducto>,
    @InjectRepository(MarketValoracionReceta)
    private readonly valoracionRecetaRepo: Repository<MarketValoracionReceta>,
    @InjectRepository(MarketValoracionPedido)
    private readonly valoracionPedidoRepo: Repository<MarketValoracionPedido>,
  ) {}

  private response(msg: string) {
    return { success: true, msg, error: '' };
  }

  private getIdentityId(user: any): string {
    const id = user?.id ?? user?.sub ?? user?.userId;
    if (!id) {
      throw new BadRequestException('Usuario no identificado');
    }
    return String(id);
  }

  async home(user: any) {
    const identityId = this.getIdentityId(user);
    const customer = await this.clienteRepo.count({
      where: { IdentityId: identityId },
    });

    return {
      UserName: user?.sub ?? user?.username,
      Email: user?.email ?? user?.usermail,
      informacionUsuario: customer > 0,
    };
  }

  async getUserInfo(user: any) {
    const identityId = this.getIdentityId(user);
    const customer = await this.clienteRepo.findOne({
      where: { IdentityId: identityId },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return {
      Nombre: customer.Nombre,
      Apellido: customer.Apellido,
      Celular: customer.Celular,
      Nacimiento: customer.Nacimiento,
      Identidad: customer.Identidad,
      Genero: customer.Genero,
    };
  }

  async insertInfoUser(payload: Partial<MarketCliente>) {
    await this.clienteRepo.save(this.clienteRepo.create(payload));
    return this.response('User Update');
  }

  async updateInfoUser(user: any, payload: Partial<MarketCliente>) {
    const identityId = this.getIdentityId(user);
    const cliente = await this.clienteRepo.findOne({
      where: { IdentityId: identityId },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    await this.clienteRepo.save({
      ...cliente,
      Nombre: payload.Nombre,
      Apellido: payload.Apellido,
      Celular: payload.Celular,
      Nacimiento: payload.Nacimiento,
      Identidad: payload.Identidad,
      Genero: payload.Genero,
    });

    return this.response('Customer Update');
  }

  getDireccionUser(user: any) {
    return this.marketService.getAccounts({
      option: 2,
      param1: this.getIdentityId(user),
    });
  }

  async createDireccionUser(user: any, payload: Partial<MarketDireccion>) {
    const identityId = this.getIdentityId(user);
    const customer = await this.clienteRepo.findOne({
      where: { IdentityId: identityId },
    });

    const direccion = this.direccionRepo.create({
      ...payload,
      IdentityId: identityId,
      Clientes: customer ?? undefined,
    });

    await this.direccionRepo.save(direccion);
    return this.response('Address Create');
  }

  async updateDireccionUser(payload: Partial<MarketDireccion>) {
    if (!payload.Id) {
      throw new BadRequestException('Id es requerido');
    }

    const direccion = await this.direccionRepo.findOne({
      where: { Id: payload.Id },
    });
    if (!direccion) {
      throw new NotFoundException('Direccion no encontrada');
    }

    await this.direccionRepo.save({ ...direccion, ...payload });
    return this.response('Address Update');
  }

  async deleteDireccionUser(payload: Partial<MarketDireccion>) {
    if (!payload.Id) {
      throw new BadRequestException('Id es requerido');
    }

    await this.direccionRepo.delete(payload.Id);
    return this.response('Address Delete');
  }

  getOrderUser(user: any, query: any) {
    return this.marketService.getPedidos({
      option: query.opcion,
      param1: this.getIdentityId(user),
      param2: query.param2,
      param3: query.param3,
      param4: query.param4,
      param5: query.param5,
    });
  }

  getOrderUserDetails(id: string) {
    return this.marketService.getPedidos({
      option: 3,
      param1: id,
    });
  }

  insertFavoritoSku(user: any, sku: string) {
    return this.marketService.getArticulos({
      option: 5,
      param1: sku,
      param2: this.getIdentityId(user),
    });
  }

  async insertComentarioUser(
    user: any,
    payload: Partial<MarketValoracionProducto>,
  ) {
    await this.valoracionProductoRepo.save(
      this.valoracionProductoRepo.create({
        ...payload,
        Cliente: this.getIdentityId(user),
      }),
    );

    return this.response('Comentario Create');
  }

  async insertComentarioRecetaUser(
    user: any,
    payload: Partial<MarketValoracionReceta>,
  ) {
    await this.valoracionRecetaRepo.save(
      this.valoracionRecetaRepo.create({
        ...payload,
        Cliente: this.getIdentityId(user),
      }),
    );

    return this.response('Comentario Receta Create');
  }

  async insertComentarioOrderUser(
    user: any,
    payload: Partial<MarketValoracionPedido>,
  ) {
    await this.valoracionPedidoRepo.save(
      this.valoracionPedidoRepo.create({
        ...payload,
        Cliente: this.getIdentityId(user),
      }),
    );

    return this.response('Comentario order Create');
  }

  changePasswordAsync() {
    return this.response('Password Change');
  }

  async forgotPassword(model: { Email?: string }) {
    const token = this.jwtService.sign(
      { email: model.Email, purpose: 'password-reset' },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN ?? '2h',
      },
    );
    const baseUrl =
      process.env.MARKET_FRONTEND_URL ??
      process.env.ISTMA_FRONTEND_URL ??
      'https://market.istmania.hn';
    const url = new URL('restorePassword', `${baseUrl.replace(/\/$/, '')}/`);
    url.searchParams.set('token', token);
    url.searchParams.set('email', model.Email);

    await this.mailerService.send({
      to: model.Email,
      subject: 'Reset password token',
      html: `<p>Para cambiar tu contraseña, abre el siguiente enlace:</p><p><a href="${url.toString()}">Restaurar contraseña</a></p>`,
    });

    return { success: true, msg: 'Correo Valido', error: '' };
  }
}
