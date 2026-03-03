import { SetMetadata } from '@nestjs/common';

// 👇 AQUÍ ESTABA EL ERROR: Faltaba la palabra "export" al principio
export enum UserRole {
  ADMIN = 'admin',
  VETERINARIO = 'veterinario',
  OPERARIO = 'operario',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
