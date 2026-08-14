import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtPayload } from './jwt.strategy';

const READ_ONLY_ROLE = 'TICKET_SOLO_LECTURA';
const WRITE_ROLES = new Set([
  'ADMIN',
  'SUPERUSUARIO',
  'TICKET_INTEGRACION',
  'TICKET_JEFE_MARCA',
  'TICKET_MERCADEO',
  'TICKET_GERENCIA_GENERAL',
  'TICKET_SUPERVISOR',
  'TICKET_VENDEDOR',
]);

@Injectable()
export class TicketWriteGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const roles = this.readRoles(request.user?.roles);
    const isReadOnly = roles.includes(READ_ONLY_ROLE);
    const canWrite = roles.some((role) => WRITE_ROLES.has(role));

    if (isReadOnly && !canWrite) {
      throw new ForbiddenException(
        'El rol TICKET_SOLO_LECTURA solo permite consultar tickets.',
      );
    }
    return true;
  }

  private readRoles(raw?: string): string[] {
    try {
      const parsed: unknown = JSON.parse(raw ?? '[]');
      if (Array.isArray(parsed)) {
        return parsed.map((role) => String(role).trim().toUpperCase());
      }
    } catch {
      // Los tokens heredados pueden usar una lista separada por comas.
    }
    return String(raw ?? '')
      .split(',')
      .map((role) => role.trim().toUpperCase())
      .filter(Boolean);
  }
}
