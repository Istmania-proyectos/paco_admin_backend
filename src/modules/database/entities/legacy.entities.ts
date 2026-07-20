import {
  Column,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  ViewColumn,
  ViewEntity,
} from 'typeorm';

@Entity({ name: 'AspNetRoleClaims', schema: 'dbo', synchronize: false })
export class AspNetRoleClaimEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  Id: number;

  @Column({ type: 'nvarchar', length: 450 })
  RoleId: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  ClaimType?: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  ClaimValue?: string;
}

@Entity({ name: 'AspNetRoles', schema: 'dbo', synchronize: false })
export class AspNetRoleEntity {
  @PrimaryColumn({ type: 'nvarchar', length: 450 })
  Id: string;

  @Column({ type: 'nvarchar', length: 256, nullable: true })
  Name?: string;

  @Column({ type: 'nvarchar', length: 256, nullable: true })
  NormalizedName?: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  ConcurrencyStamp?: string;
}

@Entity({ name: 'AspNetUserClaims', schema: 'dbo', synchronize: false })
export class AspNetUserClaimEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  Id: number;

  @Column({ type: 'nvarchar', length: 450 })
  UserId: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  ClaimType?: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  ClaimValue?: string;
}

@Entity({ name: 'AspNetUserLogins', schema: 'dbo', synchronize: false })
export class AspNetUserLoginEntity {
  @PrimaryColumn({ type: 'nvarchar', length: 450 })
  LoginProvider: string;

  @PrimaryColumn({ type: 'nvarchar', length: 450 })
  ProviderKey: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  ProviderDisplayName?: string;

  @Column({ type: 'nvarchar', length: 450 })
  UserId: string;
}

@Entity({ name: 'AspNetUserRoles', schema: 'dbo', synchronize: false })
export class AspNetUserRoleEntity {
  @PrimaryColumn({ type: 'nvarchar', length: 450 })
  UserId: string;

  @PrimaryColumn({ type: 'nvarchar', length: 450 })
  RoleId: string;
}

@Entity({ name: 'AspNetUsers', schema: 'dbo', synchronize: false })
export class AspNetUserEntity {
  @PrimaryColumn({ type: 'nvarchar', length: 450 })
  Id: string;

  @Column({ type: 'nvarchar', length: 256, nullable: true })
  UserName?: string;

  @Column({ type: 'nvarchar', length: 256, nullable: true })
  NormalizedUserName?: string;

  @Column({ type: 'nvarchar', length: 256, nullable: true })
  Email?: string;

  @Column({ type: 'nvarchar', length: 256, nullable: true })
  NormalizedEmail?: string;

  @Column({ type: 'bit' })
  EmailConfirmed: boolean;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  PasswordHash?: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  SecurityStamp?: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  ConcurrencyStamp?: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  PhoneNumber?: string;

  @Column({ type: 'bit' })
  PhoneNumberConfirmed: boolean;

  @Column({ type: 'bit' })
  TwoFactorEnabled: boolean;

  @Column({ type: 'datetimeoffset', nullable: true })
  LockoutEnd?: Date;

  @Column({ type: 'bit' })
  LockoutEnabled: boolean;

  @Column({ type: 'int' })
  AccessFailedCount: number;

  @Column({ type: 'datetime', nullable: true })
  CreationDate?: Date;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  Negocio?: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  NombreContacto?: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  Celular?: string;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  Cliente?: string;
}

@Entity({ name: 'AspNetUserTokens', schema: 'dbo', synchronize: false })
export class AspNetUserTokenEntity {
  @PrimaryColumn({ type: 'nvarchar', length: 450 })
  UserId: string;

  @PrimaryColumn({ type: 'nvarchar', length: 450 })
  LoginProvider: string;

  @PrimaryColumn({ type: 'nvarchar', length: 450 })
  Name: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  Value?: string;
}

@Entity({ name: 'tbl_Casa_Usuario', schema: 'dbo', synchronize: false })
export class CasaUsuarioEntity {
  @PrimaryColumn({ type: 'nvarchar', length: 450 })
  UserId: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  Casa?: string;

  @PrimaryColumn({ type: 'nvarchar', length: 100 })
  Marca: string;

  @Column({ type: 'real', nullable: true })
  LimiteDescuento?: number;

  @Column({ type: 'datetime', nullable: true })
  FechaCreacion?: Date;

  @Column({ type: 'int', nullable: true })
  Activo?: number;
}

@Entity({ name: 'tbl_Casa_Usuario2', schema: 'dbo', synchronize: false })
export class CasaUsuario2Entity {
  @PrimaryColumn({ type: 'nvarchar', length: 450 })
  UserId: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  Casa?: string;

  @PrimaryColumn({ type: 'nvarchar', length: 100 })
  Marca: string;

  @Column({ type: 'real', nullable: true })
  LimiteDescuento?: number;

  @Column({ type: 'datetime', nullable: true })
  FechaCreacion?: Date;

  @Column({ type: 'int', nullable: true })
  Activo?: number;
}

@Entity({
  name: 'tbl_CodigosMarcas_Usuario',
  schema: 'dbo',
  synchronize: false,
})
export class CodigoMarcaUsuarioEntity {
  @PrimaryColumn({ type: 'nvarchar', length: 450 })
  UserId: string;

  @PrimaryColumn({ type: 'nvarchar', length: 100 })
  CodigoCliente: string;

  @Column({ type: 'datetime', nullable: true })
  FechaCreacion?: Date;

  @Column({ type: 'int', nullable: true })
  Activo?: number;
}

@Entity({ name: 'tbl_correo_relacionados', schema: 'dbo', synchronize: false })
export class CorreoRelacionadoEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'nvarchar', length: 256 })
  correoprincipal: string;

  @Column({ type: 'nvarchar', length: 256 })
  correorelacionado: string;

  @Column({ type: 'datetime', nullable: true })
  fechainicio?: Date;

  @Column({ type: 'datetime', nullable: true })
  fechafinal?: Date;
}

@Entity({ name: 'tbl_Pedido_Usuario', schema: 'dbo', synchronize: false })
export class PedidoUsuarioEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  Id: number;

  @Column({ type: 'nvarchar', length: 450 })
  UserId: string;

  @Column({ type: 'int' })
  IdPedido: number;

  @Column({ type: 'int', nullable: true })
  IdDetallePedido?: number;

  @Column({ type: 'float', nullable: true })
  DescAutorizado?: number;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  Marca?: string;

  @Column({ type: 'datetime', nullable: true })
  FechaCreacion?: Date;

  @Column({ type: 'datetime', nullable: true })
  FechaAutorizacion?: Date;

  @Column({ type: 'datetime', nullable: true })
  FechaMigrado?: Date;

  @Column({ type: 'datetime', nullable: true })
  EnvioNotificacion?: Date;

  @Column({ type: 'int', nullable: true })
  EstadoNotificacion?: number;

  @Column({ type: 'nvarchar', length: 50, nullable: true })
  Tipo?: string;

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  NombreCliente?: string;

  @Column({ type: 'int', nullable: true })
  LimiteDescuento?: number;
}

@Entity({ name: 'tbl_Supervisor_Gerente', schema: 'dbo', synchronize: false })
export class SupervisorGerenteEntity {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  codigo_vendedor: string;

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  email_supervisor?: string;

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  email_gerente?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  codigo_supervisor?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  codigo_gerente?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nombre_supervisor?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nombre_gerente?: string;
}

@Entity({ name: 'tbl_Vendedor', schema: 'dbo', synchronize: false })
export class VendedorEntity {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  id_sap_vendedor: string;

  @Column({ type: 'varchar', length: 10 })
  codigo_vendedor: string;

  @Column({ type: 'nvarchar', length: 120, nullable: true })
  nombre_vendedor?: string;

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  email?: string;

  @Column({ type: 'bit', nullable: true })
  aplica_desc_adicional?: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  codigo_supervisor?: string;
}

@ViewEntity({ name: 'VW_PEDIDO_USUARIO', schema: 'dbo', synchronize: false })
export class PedidoUsuarioViewEntity {
  @ViewColumn()
  IdPedido: number;

  @ViewColumn()
  IdDetallePedido?: number;

  @ViewColumn()
  Tipo?: string;

  @ViewColumn()
  codigoCliente?: string;

  @ViewColumn()
  NombreCliente?: string;

  @ViewColumn()
  slpcode?: string;

  @ViewColumn()
  UserId: string;

  @ViewColumn()
  ApproverUser?: string;

  @ViewColumn()
  ApproverEmail?: string;

  @ViewColumn()
  ApproverPhone?: string;

  @ViewColumn()
  Marca?: string;

  @ViewColumn()
  Casa?: string;

  @ViewColumn()
  LimiteDescuento?: number;

  @ViewColumn()
  DescAutorizado?: number;

  @ViewColumn()
  SobreLimite: number;

  @ViewColumn()
  ItemsTotal?: number;

  @ViewColumn()
  ItemsConAU?: number;

  @ViewColumn()
  MaxDescAU?: number;

  @ViewColumn()
  PromDescAU?: number;

  @ViewColumn()
  TotalBruto?: number;

  @ViewColumn()
  TotalConDescuento?: number;

  @ViewColumn()
  TotalDescuento?: number;

  @ViewColumn()
  FechaCreacion?: Date;

  @ViewColumn()
  FechaAutorizacion?: Date;

  @ViewColumn()
  FechaMigrado?: Date;

  @ViewColumn()
  estadoAutorizado?: string;

  @ViewColumn()
  EstadoNotificacion?: number;

  @ViewColumn()
  EnvioNotificacion?: Date;

  @ViewColumn()
  MinutosPendientes?: number;
}

@Entity({ name: 'tbl_Ticket', schema: 'dbo', synchronize: false })
export class TicketEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  IdTicket: string;

  @Column({ type: 'varchar', length: 30 })
  NumeroTicket: string;

  @Column({ type: 'varchar', length: 50 })
  SistemaOrigen: string;

  @Column({ type: 'bigint', nullable: true })
  IdRespuestaOrigen?: string;

  @Column({ type: 'int', nullable: true })
  IdFormularioOrigen?: number;

  @Column({ type: 'varchar', length: 50 })
  CodigoCliente: string;

  @Column({ type: 'nvarchar', length: 200 })
  NombreCliente: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  CodigoVendedor?: string;

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  NombreVendedor?: string;

  @Column({ type: 'nvarchar', length: 256, nullable: true })
  CorreoVendedor?: string;

  @Column({ type: 'varchar', length: 50 })
  TipoTicket: string;

  @Column({ type: 'nvarchar', length: 250 })
  Titulo: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  Descripcion?: string;

  @Column({ type: 'varchar', length: 20 })
  Prioridad: string;

  @Column({ type: 'varchar', length: 30 })
  Estado: string;

  @Column({ type: 'datetime2', precision: 3, nullable: true })
  FechaRespuestaOrigen?: Date;

  @Column({ type: 'datetime2', precision: 3 })
  FechaCreacion: Date;

  @Column({ type: 'datetime2', precision: 3, nullable: true })
  FechaActualizacion?: Date;

  @Column({ type: 'date', nullable: true })
  FechaVencimiento?: Date;

  @Column({ type: 'datetime2', precision: 3, nullable: true })
  FechaCierre?: Date;

  @Column({ type: 'nvarchar', length: 450 })
  CreadoPor: string;

  @Column({ type: 'nvarchar', length: 450, nullable: true })
  ResponsableActual?: string;

  @Column({ type: 'bit' })
  Activo: boolean;
}

@Entity({ name: 'tbl_Ticket_Detalle', schema: 'dbo', synchronize: false })
export class TicketDetalleEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  IdTicketDetalle: string;

  @Column({ type: 'bigint' })
  IdTicket: string;

  @Column({ type: 'bigint', nullable: true })
  IdDetalleOrigen?: string;

  @Column({ type: 'int', nullable: true })
  IdPreguntaOrigen?: number;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  Pregunta?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  TipoRespuesta?: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  Valor?: string;

  @Column({ type: 'datetime2', precision: 3 })
  FechaCreacion: Date;
}

@Entity({ name: 'tbl_Ticket_Plan_Accion', schema: 'dbo', synchronize: false })
export class TicketPlanAccionEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  IdPlanAccion: string;

  @Column({ type: 'bigint' })
  IdTicket: string;

  @Column({ type: 'varchar', length: 50 })
  TipoAccion: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  Descripcion: string;

  @Column({ type: 'date', nullable: true })
  FechaCompromiso?: Date;

  @Column({ type: 'nvarchar', length: 450, nullable: true })
  Responsable?: string;

  @Column({ type: 'varchar', length: 30 })
  Estado: string;

  @Column({ type: 'nvarchar', length: 450 })
  CreadoPor: string;

  @Column({ type: 'datetime2', precision: 3 })
  FechaCreacion: Date;

  @Column({ type: 'datetime2', precision: 3, nullable: true })
  FechaActualizacion?: Date;
}

@Entity({ name: 'tbl_Ticket_Historial', schema: 'dbo', synchronize: false })
export class TicketHistorialEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  IdHistorial: string;

  @Column({ type: 'bigint' })
  IdTicket: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  EstadoAnterior?: string;

  @Column({ type: 'varchar', length: 30 })
  EstadoNuevo: string;

  @Column({ type: 'varchar', length: 50 })
  Accion: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  Comentario?: string;

  @Column({ type: 'nvarchar', length: 450 })
  UsuarioId: string;

  @Column({ type: 'nvarchar', length: 256, nullable: true })
  NombreUsuario?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  RolUsuario?: string;

  @Column({ type: 'datetime2', precision: 3 })
  Fecha: Date;
}

@Entity({ name: 'tbl_Ticket_Notificacion', schema: 'dbo', synchronize: false })
export class TicketNotificacionEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  IdNotificacion: string;

  @Column({ type: 'bigint' })
  IdTicket: string;

  @Column({ type: 'nvarchar', length: 450, nullable: true })
  UsuarioDestino?: string;

  @Column({ type: 'nvarchar', length: 256 })
  CorreoDestino: string;

  @Column({ type: 'varchar', length: 30 })
  EstadoTicket: string;

  @Column({ type: 'varchar', length: 20 })
  EstadoEnvio: string;

  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  Error?: string;

  @Column({ type: 'datetime2', precision: 3 })
  FechaCreacion: Date;

  @Column({ type: 'datetime2', precision: 3, nullable: true })
  FechaEnvio?: Date;
}

@Entity({ name: 'tbl_Ticket_Token_Vendedor', schema: 'dbo', synchronize: false })
export class TicketSellerTokenEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  IdToken: string;

  @Column({ type: 'bigint' })
  IdTicket: string;

  @Column({ type: 'binary', length: 32 })
  TokenHash: Buffer;

  @Column({ type: 'varchar', length: 50, nullable: true })
  CodigoVendedor?: string;

  @Column({ type: 'nvarchar', length: 256 })
  CorreoVendedor: string;

  @Column({ type: 'datetime2', precision: 3 })
  FechaExpiracion: Date;

  @Column({ type: 'datetime2', precision: 3 })
  FechaCreacion: Date;

  @Column({ type: 'datetime2', precision: 3, nullable: true })
  FechaUso?: Date;
}

export const legacyEntities = [
  AspNetRoleClaimEntity,
  AspNetRoleEntity,
  AspNetUserClaimEntity,
  AspNetUserLoginEntity,
  AspNetUserRoleEntity,
  AspNetUserEntity,
  AspNetUserTokenEntity,
  CasaUsuarioEntity,
  CasaUsuario2Entity,
  CodigoMarcaUsuarioEntity,
  CorreoRelacionadoEntity,
  PedidoUsuarioEntity,
  SupervisorGerenteEntity,
  VendedorEntity,
  PedidoUsuarioViewEntity,
  TicketEntity,
  TicketDetalleEntity,
  TicketPlanAccionEntity,
  TicketHistorialEntity,
  TicketNotificacionEntity,
  TicketSellerTokenEntity,
];
