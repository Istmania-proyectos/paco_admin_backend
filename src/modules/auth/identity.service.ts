import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  AspNetRoleEntity,
  AspNetUserEntity,
  AspNetUserRoleEntity,
} from '../database/entities/legacy.entities';
import { AspNetPasswordService } from './aspnet-password.service';

export interface IdentityUser {
  Id: string;
  UserName: string;
  Email: string;
  EmailConfirmed: boolean;
  PasswordHash?: string;
}

type ManagedUserModel = {
  Email?: string;
  Password?: string;
  NombreContacto?: string;
  Celular?: string;
  Roles?: string[];
  Activo?: boolean;
};

const RESERVED_MANAGEMENT_ROLES = new Set(['ADMIN', 'SUPERUSUARIO']);

@Injectable()
export class IdentityService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AspNetUserEntity)
    private readonly users: Repository<AspNetUserEntity>,
    @InjectRepository(AspNetRoleEntity)
    private readonly roles: Repository<AspNetRoleEntity>,
    @InjectRepository(AspNetUserRoleEntity)
    private readonly userRoles: Repository<AspNetUserRoleEntity>,
    private readonly passwords: AspNetPasswordService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const password = this.config.get<string>('ADMIN_INITIAL_PASSWORD');
    if (!password) return;

    const userName =
      this.config.get<string>('ADMIN_INITIAL_USERNAME') ?? 'manager';
    await this.ensureSingleAdmin(userName, password);
  }

  async findByUserName(
    userName: string,
    includePassword = false,
  ): Promise<IdentityUser | undefined> {
    const user = await this.users.findOne({
      where: { NormalizedUserName: userName.toUpperCase() },
    });

    return user
      ? {
          Id: user.Id,
          UserName: user.UserName,
          Email: user.Email,
          EmailConfirmed: user.EmailConfirmed,
          ...(includePassword ? { PasswordHash: user.PasswordHash } : {}),
        }
      : undefined;
  }

  async findById(id: string): Promise<IdentityUser | undefined> {
    const user = await this.users.findOne({ where: { Id: id } });

    return user
      ? {
          Id: user.Id,
          UserName: user.UserName,
          Email: user.Email,
          EmailConfirmed: user.EmailConfirmed,
        }
      : undefined;
  }

  async getRoles(userId: string): Promise<string[]> {
    const userRoles = await this.userRoles.find({ where: { UserId: userId } });
    const roleIds = userRoles.map((role) => role.RoleId);
    if (!roleIds.length) return [];

    const roles = await this.roles.find({ where: { Id: In(roleIds) } });
    return roles.map((role) => role.Name).filter(Boolean);
  }

  async listAssignableRoles() {
    const roles = await this.roles.find({ order: { Name: 'ASC' } });
    return roles
      .map((role) => String(role.Name ?? '').trim().toUpperCase())
      .filter((role) => role && !RESERVED_MANAGEMENT_ROLES.has(role));
  }

  async listManagedUsers() {
    const [users, assignments, roles] = await Promise.all([
      this.users.find({ order: { UserName: 'ASC' } }),
      this.userRoles.find(),
      this.roles.find(),
    ]);
    const roleById = new Map(
      roles.map((role) => [role.Id, String(role.Name ?? '').toUpperCase()]),
    );
    const rolesByUser = new Map<string, string[]>();
    assignments.forEach((assignment) => {
      const role = roleById.get(assignment.RoleId);
      if (!role) return;
      const current = rolesByUser.get(assignment.UserId) ?? [];
      current.push(role);
      rolesByUser.set(assignment.UserId, current);
    });
    const now = new Date();
    return users.map((user) => ({
      Id: user.Id,
      Email: user.Email ?? user.UserName ?? '',
      UserName: user.UserName ?? '',
      NombreContacto: user.NombreContacto ?? '',
      Celular: user.Celular ?? '',
      Roles: (rolesByUser.get(user.Id) ?? []).sort(),
      Activo:
        user.EmailConfirmed &&
        (!user.LockoutEnd || new Date(user.LockoutEnd).getTime() <= now.getTime()),
      FechaCreacion: user.CreationDate ?? null,
    }));
  }

  async create(email: string, password: string) {
    if (await this.findByUserName(email)) {
      throw new BadRequestException({
        DuplicateUserName: [`El usuario '${email}' ya existe.`],
      });
    }

    const userId = randomUUID();
    await this.dataSource.transaction(async (manager) => {
      const normalizedEmail = email.toUpperCase();

      await manager.insert(AspNetUserEntity, {
        Id: userId,
        UserName: email,
        NormalizedUserName: normalizedEmail,
        Email: email,
        NormalizedEmail: normalizedEmail,
        EmailConfirmed: true,
        PasswordHash: this.passwords.hash(password),
        SecurityStamp: randomUUID(),
        ConcurrencyStamp: randomUUID(),
        PhoneNumberConfirmed: false,
        TwoFactorEnabled: false,
        LockoutEnabled: true,
        AccessFailedCount: 0,
        CreationDate: new Date(),
      });

      const roleId = await this.ensureUserRole(manager);
      await manager.insert(AspNetUserRoleEntity, {
        UserId: userId,
        RoleId: roleId,
      });
    });

    return { Succeeded: true, Errors: [] };
  }

  async createManagedUser(model: ManagedUserModel & { Email: string; Password: string }) {
    const existing = await this.findByUserName(model.Email);
    if (existing) {
      throw new BadRequestException({
        DuplicateUserName: [`El usuario '${model.Email}' ya existe.`],
      });
    }

    const userId = randomUUID();
    await this.dataSource.transaction(async (manager) => {
      await this.insertUser(
        manager,
        userId,
        model.Email,
        model.Email,
        model.Password,
        {
          NombreContacto: model.NombreContacto,
          Celular: model.Celular,
        },
      );
      await this.syncManagedRoles(manager, userId, model.Roles ?? ['USER']);
      if (model.Activo === false) await this.setManagedUserActive(manager, userId, false);
    });

    return { Succeeded: true, Id: userId, Errors: [] };
  }

  async updateManagedUser(userId: string, model: ManagedUserModel) {
    const user = await this.users.findOne({ where: { Id: userId } });
    if (!user) throw new BadRequestException('Usuario no encontrado');

    const roles = await this.getRoles(userId);
    if (
      roles.some((role) => role.toUpperCase() === 'ADMIN') &&
      model.Email &&
      model.Email.toUpperCase() !== user.NormalizedUserName
    ) {
      throw new BadRequestException(
        'El usuario administrador debe conservar el nombre manager',
      );
    }

    if (model.Email && model.Email.toUpperCase() !== user.NormalizedUserName) {
      if (await this.findByUserName(model.Email)) {
        throw new BadRequestException({
          DuplicateUserName: [`El usuario '${model.Email}' ya existe.`],
        });
      }
    }

    const email = model.Email ?? user.Email;
    await this.dataSource.transaction(async (manager) => {
      await manager.update(
        AspNetUserEntity,
        { Id: userId },
        {
        ...(model.Email
          ? {
              UserName: email,
              NormalizedUserName: email?.toUpperCase(),
              Email: email,
              NormalizedEmail: email?.toUpperCase(),
            }
          : {}),
        ...(model.NombreContacto !== undefined
          ? { NombreContacto: model.NombreContacto }
          : {}),
        ...(model.Celular !== undefined ? { Celular: model.Celular } : {}),
          ConcurrencyStamp: randomUUID(),
        },
      );
      if (model.Roles !== undefined) {
        await this.syncManagedRoles(manager, userId, model.Roles);
      }
      if (model.Activo !== undefined) {
        await this.setManagedUserActive(manager, userId, model.Activo);
      }
    });
    return { Succeeded: true, Errors: [] };
  }

  async deactivateManagedUser(userId: string, actorId: string) {
    if (userId === actorId) {
      throw new BadRequestException('No puede desactivar su propia cuenta');
    }
    const user = await this.users.findOne({ where: { Id: userId } });
    if (!user) throw new BadRequestException('Usuario no encontrado');
    const roles = await this.getRoles(userId);
    if (roles.some((role) => RESERVED_MANAGEMENT_ROLES.has(role.toUpperCase()))) {
      throw new BadRequestException('No puede desactivar una cuenta administrativa');
    }
    await this.dataSource.transaction((manager) =>
      this.setManagedUserActive(manager, userId, false),
    );
    return { Succeeded: true, Errors: [] };
  }

  async updatePasswordById(userId: string, password: string): Promise<boolean> {
    const result = await this.users.update(
      { Id: userId },
      {
        PasswordHash: this.passwords.hash(password),
        SecurityStamp: randomUUID(),
        ConcurrencyStamp: randomUUID(),
      },
    );
    return Number(result.affected ?? 0) > 0;
  }

  async updatePasswordByUserName(
    userName: string,
    password: string,
  ): Promise<boolean> {
    const user = await this.findByUserName(userName);
    return user ? this.updatePasswordById(user.Id, password) : false;
  }

  private async ensureUserRole(manager: EntityManager): Promise<string> {
    return this.ensureRole(manager, 'USER');
  }

  private async syncManagedRoles(
    manager: EntityManager,
    userId: string,
    selectedRoles: string[],
  ) {
    const requested = [...new Set(selectedRoles.map((role) => role.trim().toUpperCase()))]
      .filter(Boolean)
      .filter((role) => !RESERVED_MANAGEMENT_ROLES.has(role));
    const names = requested.length ? requested : ['USER'];
    const foundRoles = await manager.find(AspNetRoleEntity, {
      where: { NormalizedName: In(names) },
    });
    if (foundRoles.length !== names.length) {
      throw new BadRequestException('Uno o mas roles no existen');
    }
    await manager.delete(AspNetUserRoleEntity, { UserId: userId });
    await manager.insert(
      AspNetUserRoleEntity,
      foundRoles.map((role) => ({ UserId: userId, RoleId: role.Id })),
    );
  }

  private async setManagedUserActive(
    manager: EntityManager,
    userId: string,
    active: boolean,
  ) {
    await manager.update(
      AspNetUserEntity,
      { Id: userId },
      {
        EmailConfirmed: active,
        LockoutEnabled: true,
        LockoutEnd: active ? null : new Date('9999-12-31T23:59:59.000Z'),
        SecurityStamp: randomUUID(),
        ConcurrencyStamp: randomUUID(),
      },
    );
  }

  private async ensureRole(
    manager: EntityManager,
    roleName: string,
  ): Promise<string> {
    const existing = await manager.findOne(AspNetRoleEntity, {
      where: { NormalizedName: roleName.toUpperCase() },
    });
    if (existing) return existing.Id;

    const roleId = randomUUID();
    await manager.insert(AspNetRoleEntity, {
      Id: roleId,
      Name: roleName.toUpperCase(),
      NormalizedName: roleName.toUpperCase(),
      ConcurrencyStamp: randomUUID(),
    });
    return roleId;
  }

  private async ensureSingleAdmin(userName: string, password: string) {
    await this.dataSource.transaction(async (manager) => {
      const adminRoleId = await this.ensureRole(manager, 'ADMIN');
      const assignments = await manager.find(AspNetUserRoleEntity, {
        where: { RoleId: adminRoleId },
      });
      if (assignments.length > 1) {
        throw new Error(
          'Configuración inválida: existe más de un usuario ADMIN',
        );
      }
      if (assignments.length === 1) {
        const assignedAdmin = await manager.findOneBy(AspNetUserEntity, {
          Id: assignments[0].UserId,
        });
        if (assignedAdmin?.NormalizedUserName !== userName.toUpperCase()) {
          throw new Error(
            'El único rol ADMIN debe pertenecer al usuario manager',
          );
        }
        return;
      }

      let user = await manager.findOne(AspNetUserEntity, {
        where: { NormalizedUserName: userName.toUpperCase() },
      });
      if (!user) {
        const userId = randomUUID();
        await this.insertUser(manager, userId, userName, userName, password);
        user = await manager.findOneByOrFail(AspNetUserEntity, { Id: userId });
      }
      await manager.insert(AspNetUserRoleEntity, {
        UserId: user.Id,
        RoleId: adminRoleId,
      });
    });
  }

  private async insertUser(
    manager: EntityManager,
    id: string,
    userName: string,
    email: string,
    password: string,
    extra: { NombreContacto?: string; Celular?: string } = {},
  ) {
    const normalized = userName.toUpperCase();
    await manager.insert(AspNetUserEntity, {
      Id: id,
      UserName: userName,
      NormalizedUserName: normalized,
      Email: email,
      NormalizedEmail: email.toUpperCase(),
      EmailConfirmed: true,
      PasswordHash: this.passwords.hash(password),
      SecurityStamp: randomUUID(),
      ConcurrencyStamp: randomUUID(),
      PhoneNumberConfirmed: false,
      TwoFactorEnabled: false,
      LockoutEnabled: true,
      AccessFailedCount: 0,
      CreationDate: new Date(),
      ...extra,
    });
  }
}
