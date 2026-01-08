// ms-nestjs-business/src/modules/auth/skip-establecimiento.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { SKIP_ESTABLECIMIENTO_CHECK } from './establecimiento.guard';

/**
 * Decorador para saltar la verificación de establecimiento
 * Útil para endpoints de administración global
 */
export const SkipEstablecimientoCheck = () =>
  SetMetadata(SKIP_ESTABLECIMIENTO_CHECK, true);
