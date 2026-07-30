import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class MasterDataGuard implements CanActivate {
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

    if (
      !roles.some((role) =>
        ['ADMIN', 'MASTER_DATA'].includes(role.toUpperCase()),
      )
    ) {
      throw new ForbiddenException(
        'No tiene permisos para administrar datos maestros',
      );
    }
    return true;
  }
}
