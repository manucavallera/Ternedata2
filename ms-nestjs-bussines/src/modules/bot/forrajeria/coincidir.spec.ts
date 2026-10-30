import { buscarPorNombre } from './coincidir';

const productos = [
  { nombre: 'Fardo de alfalfa' },
  { nombre: 'Rollo de alfalfa' },
  { nombre: 'Maíz molido' },
  { nombre: 'Maíz entero' },
  { nombre: 'Balanceado terneros' },
];

describe('buscarPorNombre', () => {
  it('encuentra por nombre exacto sin tildes ni mayúsculas', () => {
    expect(buscarPorNombre(productos, 'maiz MOLIDO')).toEqual({
      tipo: 'unico',
      item: productos[2],
    });
  });

  it('encuentra con palabras sueltas y en plural', () => {
    expect(buscarPorNombre(productos, 'fardos alfalfa')).toEqual({
      tipo: 'unico',
      item: productos[0],
    });
    expect(buscarPorNombre(productos, 'balanceado')).toEqual({
      tipo: 'unico',
      item: productos[4],
    });
  });

  it('avisa cuando hay varios posibles', () => {
    const r = buscarPorNombre(productos, 'maiz');
    expect(r.tipo).toBe('varios');
    expect(r.tipo === 'varios' && r.items).toHaveLength(2);
  });

  it('no encuentra lo que no está', () => {
    expect(buscarPorNombre(productos, 'sorgo')).toEqual({ tipo: 'ninguno' });
    expect(buscarPorNombre(productos, '')).toEqual({ tipo: 'ninguno' });
  });

  it('saca la unidad pegada al nombre si así no encuentra', () => {
    expect(buscarPorNombre(productos, 'bolsas de maiz molido')).toEqual({
      tipo: 'unico',
      item: productos[2],
    });
    expect(buscarPorNombre(productos, 'bolsas de maiz').tipo).toBe('varios');
    expect(
      buscarPorNombre([{ nombre: 'Alfalfa' }], 'fardos de alfalfa'),
    ).toEqual({ tipo: 'unico', item: { nombre: 'Alfalfa' } });
  });

  it('prefiere el exacto aunque otro lo contenga', () => {
    const clientes = [{ nombre: 'Juan' }, { nombre: 'Juan Pérez' }];
    expect(buscarPorNombre(clientes, 'juan')).toEqual({
      tipo: 'unico',
      item: clientes[0],
    });
    expect(buscarPorNombre(clientes, 'perez')).toEqual({
      tipo: 'unico',
      item: clientes[1],
    });
  });
});
