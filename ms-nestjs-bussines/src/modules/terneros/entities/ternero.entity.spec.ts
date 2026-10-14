import {
  crearTernero,
  haceDias,
  pesajeEstimativo,
} from 'src/test-utils/ternero.factory';

// Indicadores de crecimiento que ven el listado, el dashboard y el bot.
// Dependen de "hoy", así que el reloj queda fijo.
const HOY = new Date('2026-10-14T12:00:00Z');

describe('TerneroEntity - indicadores de crecimiento', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(HOY);
  });
  afterAll(() => jest.useRealTimers());

  describe('días de vida', () => {
    it('cuenta los días completos desde el nacimiento', () => {
      const ternero = crearTernero({
        fecha_nacimiento: new Date(haceDias(20, HOY)),
      });
      expect(ternero.calcularDiasDesdeNacimiento()).toBe(20);
    });

    it('devuelve 0 si no hay fecha, es inválida o es futura', () => {
      expect(
        crearTernero({ fecha_nacimiento: null }).calcularDiasDesdeNacimiento(),
      ).toBe(0);
      expect(
        crearTernero({
          fecha_nacimiento: new Date('no-es-fecha'),
        }).calcularDiasDesdeNacimiento(),
      ).toBe(0);
      expect(
        crearTernero({
          fecha_nacimiento: new Date('2026-12-01'),
        }).calcularDiasDesdeNacimiento(),
      ).toBe(0);
    });
  });

  describe('historial de pesajes', () => {
    it('agrega pesajes al final y los lee en orden', () => {
      const ternero = crearTernero();
      ternero.agregarPesaje('01/10', 42);
      ternero.agregarPesaje('08/10', 46.5);
      expect(ternero.estimativo).toBe('01/10:42|08/10:46.5');
      expect(ternero.obtenerHistorialPesajes()).toEqual([
        { fecha: '01/10', peso: 42 },
        { fecha: '08/10', peso: 46.5 },
      ]);
    });

    it('descarta entradas sin peso numérico', () => {
      const ternero = crearTernero({ estimativo: '01/10:42|basura|08/10:abc' });
      expect(ternero.obtenerHistorialPesajes()).toEqual([
        { fecha: '01/10', peso: 42 },
      ]);
    });

    it('sin pesajes, el último peso es el de nacimiento', () => {
      const ternero = crearTernero({ peso_nacer: 40 });
      expect(ternero.obtenerUltimoPeso()).toEqual({
        peso: 40,
        fecha: 'Nacimiento',
      });
    });
  });

  describe('aumento diario promedio', () => {
    it('reparte lo ganado desde el nacimiento entre los días de vida', () => {
      // 40 kg al nacer, 52 kg hoy, 20 días: 0,6 kg/día (rango normal de crianza artificial)
      const ternero = crearTernero({
        peso_nacer: 40,
        fecha_nacimiento: new Date(haceDias(20, HOY)),
        estimativo: pesajeEstimativo(HOY, 52),
      });
      expect(ternero.calcularAumentoDiarioPromedio()).toBe(0.6);
    });

    it('es 0 sin pesajes o recién nacido', () => {
      expect(crearTernero().calcularAumentoDiarioPromedio()).toBe(0);
      const recienNacido = crearTernero({
        fecha_nacimiento: new Date(haceDias(0, HOY)),
        estimativo: '14/10:40',
      });
      expect(recienNacido.calcularAumentoDiarioPromedio()).toBe(0);
    });

    // BUG: divide por los días hasta HOY y no hasta la fecha del último pesaje.
    // Un ternero pesado hace 70 días aparece con crecimiento bajísimo aunque haya crecido bien.
    // `estimativo` guarda "dd/mm" sin año, por eso el cálculo no puede usar la fecha del pesaje.
    it.failing('usa la fecha del último pesaje, no la de hoy', () => {
      const ternero = crearTernero({
        peso_nacer: 40,
        fecha_nacimiento: new Date(haceDias(100, HOY)),
        // pesado a los 30 días con 60 kg: ganó 20 kg en 30 días
        estimativo: pesajeEstimativo(new Date(haceDias(70, HOY)), 60),
      });
      expect(ternero.calcularAumentoDiarioPromedio()).toBeCloseTo(0.667, 2);
    });
  });

  describe('peso esperado y rendimiento', () => {
    it('el peso esperado se duplica cada 60 días', () => {
      const ternero = crearTernero({ peso_nacer: 40 });
      expect(ternero.calcularPesoEsperado(0)).toBe(40);
      expect(ternero.calcularPesoEsperado(60)).toBe(80);
      expect(ternero.calcularPesoEsperado(30)).toBe(56.57);
    });

    it('sin peso al nacer no hay peso esperado', () => {
      expect(crearTernero({ peso_nacer: 0 }).calcularPesoEsperado(30)).toBe(0);
    });

    it.each([
      [110, 'Excelente'],
      [109.9, 'Bueno'],
      [95, 'Bueno'],
      [94.9, 'Regular'],
      [80, 'Regular'],
      [79.9, 'Bajo'],
    ])('%d%% de lo esperado es "%s"', (porcentaje, esperado) => {
      expect(crearTernero().evaluarRendimiento(porcentaje)).toBe(esperado);
    });

    it('calcula el porcentaje contra el peso esperado del hito', () => {
      // a los 15 días se esperan 40 * 2^(15/60) = 47,57 kg; pesó 50
      const ternero = crearTernero({
        peso_nacer: 40,
        peso_15d: 50,
        fecha_nacimiento: new Date(haceDias(20, HOY)),
      });
      ternero.calcularIndicadoresCrecimiento();
      expect(ternero.peso_esperado_15d).toBe(47.57);
      expect(ternero.porcentaje_crecimiento_15d).toBe(105.1);
      expect(ternero.rendimiento_15d).toBe('Bueno');
    });

    // BUG: un hito que todavía no se pesó (peso 0) se evalúa como "Bajo".
    // Se ve en el listado: un ternero de 2 días aparece con "15d: Bajo".
    it.failing('un hito sin pesar no se marca como "Bajo"', () => {
      const ternero = crearTernero({
        peso_nacer: 40,
        peso_15d: 0,
        fecha_nacimiento: new Date(haceDias(2, HOY)),
      });
      ternero.calcularIndicadoresCrecimiento();
      expect(ternero.rendimiento_15d).not.toBe('Bajo');
    });
  });

  it('calcularIndicadoresCrecimiento completa todos los campos derivados', () => {
    const ternero = crearTernero({
      peso_nacer: 40,
      fecha_nacimiento: new Date(haceDias(20, HOY)),
      estimativo: pesajeEstimativo(HOY, 52),
    });
    ternero.calcularIndicadoresCrecimiento();
    expect(ternero).toMatchObject({
      dias_desde_nacimiento: 20,
      aumento_diario_promedio: 0.6,
      ultimo_peso: 52,
      ultimo_pesaje_fecha: '14/10',
      peso_esperado_60d: 80,
    });
  });
});
