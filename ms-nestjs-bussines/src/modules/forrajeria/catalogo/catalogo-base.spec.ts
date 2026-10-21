import { CATALOGO_BASE, cargarCatalogoBase } from './catalogo-base';
import { CategoriaForrajeria } from './entities/categoria.entity';

// Repositorios en memoria para ver qué se guarda.
const crearManager = (categorias: any[] = [], productos: any[] = []) => {
  let id = 100;
  const repo = (filas: any[], idCampo: string) => ({
    find: jest.fn(async () => filas),
    create: jest.fn((d) => d),
    save: jest.fn(async (d) => {
      const lista = Array.isArray(d) ? d : [d];
      lista.forEach((f) => { f[idCampo] = f[idCampo] ?? id++; filas.push(f); });
      return d;
    }),
  });
  const repos = {
    categorias: repo(categorias, 'id_categoria'),
    productos: repo(productos, 'id_producto'),
  };
  const manager: any = {
    getRepository: (entidad: any) => (entidad === CategoriaForrajeria ? repos.categorias : repos.productos),
  };
  return { manager, categorias, productos };
};

const totalProductos = CATALOGO_BASE.reduce((n, g) => n + g.productos.length, 0);

describe('cargarCatalogoBase', () => {
  it('carga todas las categorías y productos en una forrajería vacía, con precio y stock en 0', async () => {
    const { manager, categorias, productos } = crearManager();
    await expect(cargarCatalogoBase(manager, 7)).resolves.toEqual({
      categorias: CATALOGO_BASE.length,
      productos: totalProductos,
    });
    expect(categorias).toHaveLength(CATALOGO_BASE.length);
    expect(productos).toHaveLength(totalProductos);
    expect(productos.every((p) => p.id_establecimiento === 7 && p.precio === 0 && p.stock_actual === 0)).toBe(true);
    const fardo = productos.find((p) => p.nombre === 'Fardo de alfalfa');
    const fardos = categorias.find((c) => c.nombre === 'Fardos y rollos');
    expect(fardo).toMatchObject({ unidad_venta: 'fardo', id_categoria: fardos.id_categoria });
  });

  it('no duplica lo que ya existe (sin importar mayúsculas) y se puede correr dos veces', async () => {
    const { manager, categorias, productos } = crearManager(
      [{ id_categoria: 1, id_establecimiento: 7, nombre: 'GRANOS' }],
      [{ id_producto: 1, id_establecimiento: 7, nombre: 'maíz partido', precio: 18000 }],
    );
    const primera = await cargarCatalogoBase(manager, 7);
    expect(primera).toEqual({ categorias: CATALOGO_BASE.length - 1, productos: totalProductos - 1 });
    // El producto que ya tenía precio no se toca y los nuevos de Granos van a su categoría.
    expect(productos.find((p) => p.id_producto === 1).precio).toBe(18000);
    expect(productos.find((p) => p.nombre === 'Sorgo').id_categoria).toBe(1);

    await expect(cargarCatalogoBase(manager, 7)).resolves.toEqual({ categorias: 0, productos: 0 });
    expect(categorias).toHaveLength(CATALOGO_BASE.length);
  });
});
