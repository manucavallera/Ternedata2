import { EntityManager } from 'typeorm';
import { CategoriaForrajeria } from './entities/categoria.entity';
import { ProductoForrajeria, UnidadVenta } from './entities/producto.entity';

// Catálogo típico de una forrajería. Se carga al crear una forrajería (y a pedido
// en una existente) para no arrancar de cero: precio y stock en 0, el dueño los
// completa y desactiva lo que no vende.
export const CATALOGO_BASE: { categoria: string; productos: { nombre: string; unidad: UnidadVenta }[] }[] = [
  {
    categoria: 'Fardos y rollos',
    productos: [
      { nombre: 'Fardo de alfalfa', unidad: UnidadVenta.FARDO },
      { nombre: 'Rollo de alfalfa', unidad: UnidadVenta.ROLLO },
      { nombre: 'Rollo de moha', unidad: UnidadVenta.ROLLO },
      { nombre: 'Rollo de pastura', unidad: UnidadVenta.ROLLO },
      { nombre: 'Fardo de paja', unidad: UnidadVenta.FARDO },
    ],
  },
  {
    categoria: 'Granos',
    productos: [
      { nombre: 'Maíz entero', unidad: UnidadVenta.KG },
      { nombre: 'Maíz partido', unidad: UnidadVenta.BOLSA },
      { nombre: 'Sorgo', unidad: UnidadVenta.KG },
      { nombre: 'Avena', unidad: UnidadVenta.KG },
      { nombre: 'Cebada', unidad: UnidadVenta.KG },
    ],
  },
  {
    categoria: 'Balanceados',
    productos: [
      { nombre: 'Balanceado ternero (iniciador)', unidad: UnidadVenta.BOLSA },
      { nombre: 'Balanceado recría', unidad: UnidadVenta.BOLSA },
      { nombre: 'Balanceado engorde', unidad: UnidadVenta.BOLSA },
      { nombre: 'Balanceado lechero', unidad: UnidadVenta.BOLSA },
      { nombre: 'Balanceado equino', unidad: UnidadVenta.BOLSA },
    ],
  },
  {
    categoria: 'Subproductos',
    productos: [
      { nombre: 'Expeller de soja', unidad: UnidadVenta.KG },
      { nombre: 'Expeller de girasol', unidad: UnidadVenta.KG },
      { nombre: 'Afrechillo de trigo', unidad: UnidadVenta.BOLSA },
      { nombre: 'Semilla de algodón', unidad: UnidadVenta.KG },
      { nombre: 'Burlanda', unidad: UnidadVenta.KG },
    ],
  },
  {
    categoria: 'Suplementos',
    productos: [
      { nombre: 'Núcleo vitamínico mineral', unidad: UnidadVenta.BOLSA },
      { nombre: 'Sal mineral', unidad: UnidadVenta.BOLSA },
      { nombre: 'Bloque proteico', unidad: UnidadVenta.UNIDAD },
      { nombre: 'Urea', unidad: UnidadVenta.BOLSA },
    ],
  },
  {
    categoria: 'Sustituto lácteo',
    productos: [{ nombre: 'Sustituto lácteo para terneros', unidad: UnidadVenta.BOLSA }],
  },
];

const clave = (texto: string) => texto.trim().toLocaleLowerCase('es');

// Agrega lo que falte del catálogo base. No duplica: compara por nombre sin
// mayúsculas, así se puede volver a correr sin pisar lo que el dueño ya cargó.
export async function cargarCatalogoBase(
  manager: EntityManager,
  idEstablecimiento: number,
): Promise<{ categorias: number; productos: number }> {
  const categoriaRepo = manager.getRepository(CategoriaForrajeria);
  const productoRepo = manager.getRepository(ProductoForrajeria);

  const categorias = new Map(
    (await categoriaRepo.find({ where: { id_establecimiento: idEstablecimiento } })).map(
      (c) => [clave(c.nombre), c],
    ),
  );
  const productos = new Set(
    (await productoRepo.find({ where: { id_establecimiento: idEstablecimiento } })).map(
      (p) => clave(p.nombre),
    ),
  );

  let categoriasNuevas = 0;
  let productosNuevos = 0;
  for (const grupo of CATALOGO_BASE) {
    let categoria = categorias.get(clave(grupo.categoria));
    if (!categoria) {
      categoria = await categoriaRepo.save(
        categoriaRepo.create({ id_establecimiento: idEstablecimiento, nombre: grupo.categoria }),
      );
      categorias.set(clave(grupo.categoria), categoria);
      categoriasNuevas++;
    }
    const faltantes = grupo.productos.filter((p) => !productos.has(clave(p.nombre)));
    if (faltantes.length === 0) continue;
    await productoRepo.save(
      faltantes.map((p) =>
        productoRepo.create({
          id_establecimiento: idEstablecimiento,
          id_categoria: categoria!.id_categoria,
          nombre: p.nombre,
          unidad_venta: p.unidad,
          costo: 0,
          precio: 0,
          stock_actual: 0,
          stock_minimo: 0,
        }),
      ),
    );
    faltantes.forEach((p) => productos.add(clave(p.nombre)));
    productosNuevos += faltantes.length;
  }
  return { categorias: categoriasNuevas, productos: productosNuevos };
}
