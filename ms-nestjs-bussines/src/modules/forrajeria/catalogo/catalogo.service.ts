import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoriaForrajeriaDto } from './dto/create-categoria.dto';
import { CreateProductoForrajeriaDto } from './dto/create-producto.dto';
import { UpdateProductoForrajeriaDto } from './dto/update-producto.dto';
import { UpdateCategoriaForrajeriaDto } from './dto/update-categoria.dto';
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

  async updateCategoria(
    idEstablecimiento: number,
    idCategoria: number,
    dto: UpdateCategoriaForrajeriaDto,
  ): Promise<CategoriaForrajeria> {
    const categoria = await this.categoriaRepository.findOne({
      where: { id_categoria: idCategoria, id_establecimiento: idEstablecimiento },
    });
    if (!categoria) throw new NotFoundException('Categoría no encontrada en la organización activa');
    Object.assign(categoria, dto);
    return this.categoriaRepository.save(categoria);
  }

  // Una categoría de otra organización no se puede asignar a un producto.
  private async validarCategoria(idEstablecimiento: number, idCategoria?: number | null) {
    if (idCategoria == null) return;
    const existe = await this.categoriaRepository.findOne({
      where: { id_categoria: idCategoria, id_establecimiento: idEstablecimiento },
    });
    if (!existe) throw new NotFoundException('Categoría no encontrada en la organización activa');
  }

  async createProducto(
    idEstablecimiento: number,
    dto: CreateProductoForrajeriaDto,
  ): Promise<ProductoForrajeria> {
    await this.validarCategoria(idEstablecimiento, dto.id_categoria);
    const producto = this.productoRepository.create({
      ...dto,
      id_establecimiento: idEstablecimiento,
      costo: dto.costo ?? 0,
      stock_actual: 0,
      stock_minimo: dto.stock_minimo ?? 0,
    });
    return this.productoRepository.save(producto);
  }

  // Precio, costo, nombre, mínimo, etc. Dar de baja = estado 'inactivo' (no se borra: lo usan pedidos viejos).
  async updateProducto(
    idEstablecimiento: number,
    idProducto: number,
    dto: UpdateProductoForrajeriaDto,
  ): Promise<ProductoForrajeria> {
    const producto = await this.productoRepository.findOne({
      where: { id_producto: idProducto, id_establecimiento: idEstablecimiento },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado en la organización activa');
    await this.validarCategoria(idEstablecimiento, dto.id_categoria);
    Object.assign(producto, dto);
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
