import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IdentityService } from '../auth/identity.service';
import { RegistrationDto } from './dto/registration.dto';
import {
  CreateManagedUserDto,
  UpdateManagedUserDto,
} from './dto/manage-user.dto';
import {
  ResetPasswordAdminDto,
  ResetPasswordDto,
} from './dto/reset-password.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly identity: IdentityService,
    private readonly config: ConfigService,
  ) {}

  register(model: RegistrationDto) {
    return this.identity.create(model.Email, model.Password);
  }

  createUser(model: CreateManagedUserDto) {
    return this.identity.createManagedUser(model);
  }

  updateUser(userId: string, model: UpdateManagedUserDto) {
    return this.identity.updateManagedUser(userId, model);
  }

  async resetPassword(userId: string, model: ResetPasswordDto) {
    const success = await this.identity.updatePasswordById(
      userId,
      model.Password,
    );
    return success
      ? { success: true, msg: 'Cambio exitoso', error: '' }
      : { success: false, msg: 'Error al cambiar password', error: '' };
  }

  async resetPasswordAdmin(model: ResetPasswordAdminDto) {
    const expectedSecret = this.config.get<string>('ADMIN_RESET_SECRET');
    if (!expectedSecret || model.ClaveSecreta !== expectedSecret) {
      return {
        success: false,
        msg: 'Palabra secreta equivocada',
        error: '',
      };
    }

    const success = await this.identity.updatePasswordByUserName(
      model.UserName,
      model.Password,
    );
    if (!success) throw new BadRequestException();

    return { success: true, msg: 'Cambio exitoso', error: '' };
  }
}
