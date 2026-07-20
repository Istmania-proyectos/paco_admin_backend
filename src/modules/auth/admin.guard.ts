import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const rawRoles = request.user?.roles;
    let roles: string[] = [];

    try {
      const parsed: unknown = JSON.parse(rawRoles ?? '[]');
      roles = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      roles = (rawRoles ?? '').split(',').map((role) => role.trim());
    }

    if (!roles.some((role) => role.toUpperCase() === 'ADMIN')) {
      throw new ForbiddenException(
        'Esta operación es exclusiva del administrador',
      );
    }
    return true;
  }
}
