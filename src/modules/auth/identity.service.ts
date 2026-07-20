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

  async createManagedUser(model: {
    Email: string;
    Password: string;
    NombreContacto?: string;
    Celular?: string;
  }) {
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
      const roleId = await this.ensureRole(manager, 'USER');
      await manager.insert(AspNetUserRoleEntity, {
        UserId: userId,
        RoleId: roleId,
      });
    });

    return { Succeeded: true, Id: userId, Errors: [] };
  }

  async updateManagedUser(
    userId: string,
    model: { Email?: string; NombreContacto?: string; Celular?: string },
  ) {
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
    await this.users.update(
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
