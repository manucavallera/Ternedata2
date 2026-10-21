import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoriaForrajeriaDto } from './dto/create-categoria.dto';
import { CreateProductoForrajeriaDto } from './dto/create-producto.dto';
import { CategoriaForrajeria } from './entities/categoria.entity';
import { ProductoForrajeria } from './entities/producto.entity';
import { cargarCatalogoBase } from './catalogo-base';

@Injectable()
export class CatalogoService {
  constructor(
    @InjectRepository(CategoriaForrajeria)
    private readonly categoriaRepository: Repository<CategoriaForrajeria>,
    @InjectRepository(ProductoForrajeria)
    private readonly productoRepository: Repository<ProductoForrajeria>,
  ) {}

  async createCategoria(
    idEstablecimiento: number,
    dto: CreateCategoriaForrajeriaDto,
  ): Promise<CategoriaForrajeria> {
    const categoria = this.categoriaRepository.create({
      ...dto,
      id_establecimiento: idEstablecimiento,
    });
    return this.categoriaRepository.save(categoria);
  }

  findCategorias(idEstablecimiento: number): Promise<CategoriaForrajeria[]> {
    return this.categoriaRepository.find({
      where: { id_establecimiento: idEstablecimiento },
      order: { nombre: 'ASC' },
    });
  }

  async createProducto(
    idEstablecimiento: number,
    dto: CreateProductoForrajeriaDto,
  ): Promise<ProductoForrajeria> {
    const producto = this.productoRepository.create({
      ...dto,
      id_establecimiento: idEstablecimiento,
      costo: dto.costo ?? 0,
      stock_actual: 0,
      stock_minimo: dto.stock_minimo ?? 0,
    });
    return this.productoRepository.save(producto);
  }

  cargarCatalogoBase(idEstablecimiento: number) {
    return this.productoRepository.manager.transaction((manager) =>
      cargarCatalogoBase(manager, idEstablecimiento),
    );
  }

  findProductos(idEstablecimiento: number): Promise<ProductoForrajeria[]> {
    return this.productoRepository.find({
      where: { id_establecimiento: idEstablecimiento },
      order: { nombre: 'ASC' },
    });
  }
}
