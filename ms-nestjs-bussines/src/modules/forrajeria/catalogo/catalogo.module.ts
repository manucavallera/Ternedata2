import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstablecimientosModule } from '../../establecimientos/establecimientos.module';
import { CategoriaForrajeria } from './entities/categoria.entity';
import { ProductoForrajeria } from './entities/producto.entity';
import { CatalogoController } from './catalogo.controller';
import { CatalogoService } from './catalogo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CategoriaForrajeria, ProductoForrajeria]),
    EstablecimientosModule,
  ],
  controllers: [CatalogoController],
  providers: [CatalogoService],
  exports: [CatalogoService],
})
export class CatalogoForrajeriaModule {}
