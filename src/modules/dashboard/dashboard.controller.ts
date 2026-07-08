import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiUserGuard } from '../auth/api-user.guard';
import { IdentityService } from '../auth/identity.service';
import { JwtPayload } from '../auth/jwt.strategy';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(ApiUserGuard)
@Controller('api/Dashboard')
export class DashboardController {
  constructor(private readonly identity: IdentityService) {}

  @Get('Home')
  async home(@Req() request: Request & { user: JwtPayload }) {
    const user = await this.identity.findById(request.user.id);
    return {
      UserName: user?.UserName,
      Email: user?.Email,
    };
  }
}
