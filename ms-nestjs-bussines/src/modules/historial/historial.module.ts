import { Module } from '@nestjs/common';
import { HistorialService } from './historial.service';
import { HistorialController } from './historial.controller';
import { JwtStrategy } from '../auth/jwt.strategy';

// No usa forFeature: las tablas *_history no son entities.
// Consulta vía DataSource (raw SQL), provisto global por TypeOrmModule.forRoot.
@Module({
  controllers: [HistorialController],
  providers: [HistorialService, JwtStrategy],
})
export class HistorialModule {}
