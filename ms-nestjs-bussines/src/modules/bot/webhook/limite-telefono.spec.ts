import { LimitePorTelefono } from './limite-telefono';

describe('LimitePorTelefono', () => {
  it('deja pasar hasta el máximo y corta el siguiente', () => {
    const limite = new LimitePorTelefono();
    for (let i = 0; i < 20; i++) expect(limite.permitir('549111', 1000 + i)).toBe(true);
    expect(limite.permitir('549111', 1100)).toBe(false);
  });

  it('cuenta cada teléfono por separado', () => {
    const limite = new LimitePorTelefono();
    for (let i = 0; i < 20; i++) limite.permitir('549111', 1000);
    expect(limite.permitir('549111', 1001)).toBe(false);
    expect(limite.permitir('549222', 1001)).toBe(true);
  });

  it('vuelve a dejar pasar cuando termina la ventana', () => {
    const limite = new LimitePorTelefono();
    for (let i = 0; i < 20; i++) limite.permitir('549111', 1000);
    expect(limite.permitir('549111', 1000 + 60001)).toBe(true);
  });
});
