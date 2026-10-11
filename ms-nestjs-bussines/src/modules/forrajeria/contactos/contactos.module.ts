import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstablecimientosModule } from '../../establecimientos/establecimientos.module';
import { ContactosController } from './contactos.controller';
import { ContactosService } from './contactos.service';
import { ContactoForrajeria } from './entities/contacto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContactoForrajeria]), EstablecimientosModule],
  controllers: [ContactosController],
  providers: [ContactosService],
  exports: [ContactosService],
})
export class ContactosForrajeriaModule {}
