import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ApiUserGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
    context: ExecutionContext,
  ): TUser {
    const authenticated = super.handleRequest<TUser>(err, user, info, context);
    if ((authenticated as any)?.rol !== 'api_access') {
      throw new ForbiddenException('El token no tiene acceso a la API');
    }
    return authenticated;
  }
}
