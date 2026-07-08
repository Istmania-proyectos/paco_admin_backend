import { BadRequestException, Injectable } from '@nestjs/common';
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
export class IdentityService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AspNetUserEntity)
    private readonly users: Repository<AspNetUserEntity>,
    @InjectRepository(AspNetRoleEntity)
    private readonly roles: Repository<AspNetRoleEntity>,
    @InjectRepository(AspNetUserRoleEntity)
    private readonly userRoles: Repository<AspNetUserRoleEntity>,
    private readonly passwords: AspNetPasswordService,
  ) {}

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
    const existing = await manager.findOne(AspNetRoleEntity, {
      where: { NormalizedName: 'USER' },
    });
    if (existing) return existing.Id;

    const roleId = randomUUID();
    await manager.insert(AspNetRoleEntity, {
      Id: roleId,
      Name: 'USER',
      NormalizedName: 'USER',
      ConcurrencyStamp: randomUUID(),
    });
    return roleId;
  }
}
