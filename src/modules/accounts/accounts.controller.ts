import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiUserGuard } from '../auth/api-user.guard';
import { JwtPayload } from '../auth/jwt.strategy';
import { AccountsService } from './accounts.service';
import { RegistrationDto } from './dto/registration.dto';
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
}
