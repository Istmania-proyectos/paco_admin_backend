import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CredentialsDto } from './dto/credentials.dto';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('Post')
  @HttpCode(HttpStatus.OK)
  post(@Body() credentials: CredentialsDto) {
    return this.auth.login(credentials);
  }
}
