import { SetMetadata } from '@nestjs/common';
// Intenta importar el UserRole desde tu entidad de usuarios si la tienes compartida
// Si no, puedes definirlo aquí mismo o usar strings.
import { UserRole } from '../users/entity/users.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
