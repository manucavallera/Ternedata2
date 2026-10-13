import { Global, Module } from '@nestjs/common';
import { RolEstablecimientoService } from './rol-establecimiento.service';

// Global: RolesGuard se usa en casi todos los módulos y necesita este servicio.
@Global()
@Module({
  providers: [RolEstablecimientoService],
  exports: [RolEstablecimientoService],
})
export class RolEstablecimientoModule {}
