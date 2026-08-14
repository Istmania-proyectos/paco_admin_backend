import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class TicketSettingsGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;
    const email = String(user?.sub ?? '').trim().toLowerCase();
    const manager = String(
      this.config.get<string>('TICKETS_RELATED_EMAILS_MANAGER_EMAIL') ??
        this.config.get<string>('TICKETS_DEMO_EMAIL') ??
        'yovanni.amador@istmania.hn',
    )
      .trim()
      .toLowerCase();
    const roles = this.readRoles(user?.roles);
    if (roles.includes('ADMIN') || roles.includes('SUPERUSUARIO') || email === manager) return true;
    throw new ForbiddenException(
      'No tiene permiso para administrar correos relacionados.',
    );
  }

  private readRoles(raw?: string): string[] {
    try {
      const parsed: unknown = JSON.parse(raw ?? '[]');
      return Array.isArray(parsed)
        ? parsed.map(String).map((role) => role.toUpperCase())
        : [];
    } catch {
      return String(raw ?? '')
        .split(',')
        .map((role) => role.trim().toUpperCase())
        .filter(Boolean);
    }
  }
}
