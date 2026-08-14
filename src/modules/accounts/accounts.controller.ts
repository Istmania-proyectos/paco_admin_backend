import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiUserGuard } from '../auth/api-user.guard';
import { AdminGuard } from '../auth/admin.guard';
import { SuperUserGuard } from '../auth/super-user.guard';
import { JwtPayload } from '../auth/jwt.strategy';
import { AccountsService } from './accounts.service';
import { RegistrationDto } from './dto/registration.dto';
import {
  CreateManagedUserDto,
  UpdateManagedUserDto,
} from './dto/manage-user.dto';
import {
  ResetPasswordAdminDto,
  ResetPasswordDto,
} from './dto/reset-password.dto';

type AuthenticatedRequest = Request & { user: JwtPayload };

@ApiTags('Accounts')
@Controller('api/accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Post('Post')
  @ApiBearerAuth()
  @UseGuards(ApiUserGuard, AdminGuard)
  post(@Body() model: RegistrationDto) {
    return this.accounts.register(model);
  }

  @Post('ResetPassword')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(ApiUserGuard)
  resetPassword(
    @Req() request: AuthenticatedRequest,
    @Body() model: ResetPasswordDto,
  ) {
    return this.accounts.resetPassword(request.user.id, model);
  }

  @Post('ResetPasswordAdmin')
  @HttpCode(HttpStatus.OK)
  resetPasswordAdmin(@Body() model: ResetPasswordAdminDto) {
    return this.accounts.resetPasswordAdmin(model);
  }

  @Post('users')
  @ApiBearerAuth()
  @UseGuards(ApiUserGuard, SuperUserGuard)
  createUser(@Body() model: CreateManagedUserDto) {
    return this.accounts.createUser(model);
  }

  @Get('users')
  @ApiBearerAuth()
  @UseGuards(ApiUserGuard, SuperUserGuard)
  listUsers() {
    return this.accounts.listUsers();
  }

  @Get('users/roles')
  @ApiBearerAuth()
  @UseGuards(ApiUserGuard, SuperUserGuard)
  listAssignableRoles() {
    return this.accounts.listAssignableRoles();
  }

  @Patch('users/:id')
  @ApiBearerAuth()
  @UseGuards(ApiUserGuard, SuperUserGuard)
  updateUser(@Param('id') id: string, @Body() model: UpdateManagedUserDto) {
    return this.accounts.updateUser(id, model);
  }

  @Post('users/:id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(ApiUserGuard, SuperUserGuard)
  resetManagedUserPassword(
    @Param('id') id: string,
    @Body() model: ResetPasswordDto,
  ) {
    return this.accounts.resetManagedUserPassword(id, model);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(ApiUserGuard, SuperUserGuard)
  deactivateUser(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.accounts.deactivateUser(id, request.user.id);
  }
}
