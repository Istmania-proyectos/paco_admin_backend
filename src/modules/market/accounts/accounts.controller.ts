import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';

@ApiTags('Market Accounts')
@Controller('api/accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post('Post')
  post(@Body() model: { Email?: string; Password?: string }) {
    return this.accountsService.post(model);
  }

  @Post('GenerateConfirmEmail')
  generateConfirmEmail(@Body() model: { Email?: string }) {
    return this.accountsService.generateConfirmEmail(model);
  }

  @Post('ConfirmEmail')
  confirmEmail(@Body() model: { Email?: string; Token?: string }) {
    return this.accountsService.confirmEmail(model);
  }

  @Get('GetDireccion')
  getDireccion() {
    return this.accountsService.getDireccion();
  }

  @Get('GetDireccionUser')
  getDireccionUser(@Query('idUser') idUser: string) {
    return this.accountsService.getDireccionUser(idUser);
  }

  @Post('ResetPassword')
  resetPassword(
    @Body() model: { Email?: string; Token?: string; Password?: string },
  ) {
    return this.accountsService.resetPassword(model);
  }

  @Post('ForgotPassword')
  forgotPassword(@Body() model: { Email?: string }) {
    return this.accountsService.forgotPassword(model);
  }

  @Post('ForgotPasswordAdmin')
  forgotPasswordAdmin(@Body() model: { Email?: string }) {
    return this.accountsService.forgotPasswordAdmin(model);
  }
}
