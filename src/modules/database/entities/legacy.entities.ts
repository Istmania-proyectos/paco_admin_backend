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
];
