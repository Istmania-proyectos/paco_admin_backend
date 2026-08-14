import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class SuperUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const roles = this.readRoles(request.user?.roles);
    if (roles.includes('SUPERUSUARIO')) return true;

    throw new ForbiddenException(
      'Esta operacion es exclusiva del superusuario.',
    );
  }

  private readRoles(raw?: string): string[] {
    try {
      const parsed: unknown = JSON.parse(raw ?? '[]');
      if (Array.isArray(parsed)) {
        return parsed.map((role) => String(role).trim().toUpperCase());
      }
    } catch {
      // Compatibilidad con tokens heredados separados por coma.
    }
    return String(raw ?? '')
      .split(',')
      .map((role) => role.trim().toUpperCase())
      .filter(Boolean);
  }
}
