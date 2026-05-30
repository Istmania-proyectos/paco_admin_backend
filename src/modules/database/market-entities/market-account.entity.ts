import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'AspNetUsers', schema: 'dbo' })
export class MarketAccount {
  @PrimaryColumn({ type: 'nvarchar', length: 450 })
  Id: string;

  @Column({ type: 'nvarchar', length: 256, nullable: true })
  UserName: string;

  @Column({ type: 'nvarchar', length: 256, nullable: true })
  NormalizedUserName: string;

  @Column({ type: 'nvarchar', length: 256, nullable: true })
  Email: string;

  @Column({ type: 'nvarchar', length: 256, nullable: true })
  NormalizedEmail: string;

  @Column({ type: 'bit', default: false })
  EmailConfirmed: boolean;

  @Column({ type: 'nvarchar', length: 'max', nullable: true, select: false })
  PasswordHash: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  SecurityStamp: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  ConcurrencyStamp: string;

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  PhoneNumber: string;

  @Column({ type: 'bit', default: false })
  PhoneNumberConfirmed: boolean;

  @Column({ type: 'bit', default: false })
  TwoFactorEnabled: boolean;

  @Column({ type: 'datetimeoffset', nullable: true })
  LockoutEnd: Date;

  @Column({ type: 'bit', default: true })
  LockoutEnabled: boolean;

  @Column({ type: 'int', default: 0 })
  AccessFailedCount: number;

  @Column({ type: 'datetime', nullable: true })
  CreationDate: Date;
}
