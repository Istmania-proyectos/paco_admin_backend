import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthCompatibilityService } from './auth-compatibility.service';

@ApiTags('Market Auth')
@Controller('api/auth')
export class AuthCompatibilityController {
  constructor(private readonly authService: AuthCompatibilityService) {}

  @Post('Post')
  post(@Body() credentials: { UserName?: string; Password?: string }) {
    return this.authService.post(credentials);
  }

  @Post('LoginDelivery')
  loginDelivery(@Body() credentials: { UserName?: string; Password?: string }) {
    return this.authService.loginDelivery(credentials);
  }

  @Post('ExternalLogin')
  externalLogin() {
    return this.authService.externalLogin();
  }

  @Post('GetUserClaims')
  getUserClaims(@Req() request) {
    return this.authService.getUserClaims(request.user);
  }
}
