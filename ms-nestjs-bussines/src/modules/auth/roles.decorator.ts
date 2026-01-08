// ms-nestjs-business/src/modules/auth/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

// ✅ Definir el tipo aquí mismo (sin importar desde users.entity)
export type UserRole = 'admin' | 'veterinario' | 'operario';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
