import {
  CONFIG_TAMBO_DEFAULT as C,
  calcularEstadoRepro,
  calcularPendientes,
  calcularResumen,
  diasEntre,
  sumarDias,
} from './reproduccion.logic';

const HOY = '2026-11-06';

describe('fechas', () => {
  it('cuenta días sin correrse por zona horaria', () => {
    expect(diasEntre('2026-11-01', '2026-11-06')).toBe(5);
    expect(sumarDias('2026-02-27', 2)).toBe('2026-03-01');
  });
});

describe('calcularEstadoRepro', () => {
  it('sin eventos ni terneros queda sin dato', () => {
    expect(calcularEstadoRepro([], C).estado_reproductivo).toBeNull();
  });

  it('el último ternero cuenta como parto', () => {
    const e = calcularEstadoRepro([], C, '2026-09-01');
    expect(e).toMatchObject({
      estado_reproductivo: 'parida',
      fecha_ultimo_parto: '2026-09-01',
    });
  });

  it('no duplica el parto si el evento y el ternero coinciden', () => {
    const e = calcularEstadoRepro(
      [
        { tipo: 'parto', fecha: '2026-09-01' },
        { tipo: 'inseminacion', fecha: '2026-10-20' },
      ],
      C,
      '2026-09-02',
    );
    expect(e.estado_reproductivo).toBe('inseminada');
  });

  it('parto, inseminación y tacto positivo: preñada con parto probable a 283 días', () => {
    const e = calcularEstadoRepro(
      [
        { tipo: 'tacto', fecha: '2026-09-15', resultado: 'preñada' },
        { tipo: 'parto', fecha: '2026-07-01' },
        { tipo: 'inseminacion', fecha: '2026-08-20' },
      ],
      C,
    );
    expect(e).toMatchObject({
      estado_reproductivo: 'preñada',
      fecha_ultimo_servicio: '2026-08-20',
      fecha_parto_probable: sumarDias('2026-08-20', 283),
      numero_servicios: 1,
    });
  });

  it('tacto negativo deja vacía y borra el parto probable; dos servicios se cuentan', () => {
    const e = calcularEstadoRepro(
      [
        { tipo: 'parto', fecha: '2026-06-01' },
        { tipo: 'inseminacion', fecha: '2026-07-25' },
        { tipo: 'tacto', fecha: '2026-09-01', resultado: 'vacia' },
        { tipo: 'inseminacion', fecha: '2026-09-10' },
      ],
      C,
    );
    expect(e.estado_reproductivo).toBe('inseminada');
    expect(e.numero_servicios).toBe(2);
    const vacia = calcularEstadoRepro(
      [
        { tipo: 'inseminacion', fecha: '2026-07-25' },
        { tipo: 'tacto', fecha: '2026-09-01', resultado: 'vacia' },
      ],
      C,
    );
    expect(vacia).toMatchObject({
      estado_reproductivo: 'vacia',
      fecha_parto_probable: null,
    });
  });

  it('la ecografía con días de gestación manda sobre la fecha de servicio', () => {
    const e = calcularEstadoRepro(
      [
        {
          tipo: 'tacto',
          fecha: '2026-10-01',
          resultado: 'preñada',
          dias_gestacion: 40,
        },
      ],
      C,
    );
    expect(e.fecha_parto_probable).toBe(sumarDias('2026-10-01', 243));
  });

  it('un parto nuevo reinicia el ciclo', () => {
    const e = calcularEstadoRepro(
      [
        { tipo: 'inseminacion', fecha: '2025-10-01' },
        { tipo: 'parche', fecha: '2025-10-05' },
        { tipo: 'parto', fecha: '2026-07-10' },
      ],
      C,
    );
    expect(e).toMatchObject({
      estado_reproductivo: 'parida',
      fecha_ultimo_servicio: null,
      fecha_ultimo_parche: null,
      numero_servicios: 0,
    });
  });

  it('el orden de eventos del mismo día respeta el id', () => {
    const e = calcularEstadoRepro(
      [
        { id: 2, tipo: 'rechazo', fecha: '2026-10-01' },
        { id: 1, tipo: 'tacto', fecha: '2026-10-01', resultado: 'vacia' },
      ],
      C,
    );
    expect(e.estado_reproductivo).toBe('rechazo');
  });
});

describe('calcularPendientes', () => {
  const base = { nombre: '', numero_servicios: 0 };

  it('arma cada pendiente con su regla', () => {
    const p = calcularPendientes(
      [
        // parida hace 70 días, sin servicio ni parche
        {
          ...base,
          id_madre: 1,
          estado: 'En Tambo',
          estado_reproductivo: 'parida',
          fecha_ultimo_parto: '2026-08-28',
        },
        // parida hace 20 días: todavía en espera
        {
          ...base,
          id_madre: 2,
          estado: 'En Tambo',
          estado_reproductivo: 'parida',
          fecha_ultimo_parto: '2026-10-17',
        },
        // inseminada hace 40 días, parche de hace 3 días
        {
          ...base,
          id_madre: 3,
          estado: 'En Tambo',
          estado_reproductivo: 'inseminada',
          fecha_ultimo_parto: '2026-06-01',
          fecha_ultimo_servicio: '2026-09-27',
          fecha_ultimo_parche: '2026-11-03',
        },
        // preñada en tambo, pare en 50 días
        {
          ...base,
          id_madre: 4,
          estado: 'En Tambo',
          estado_reproductivo: 'preñada',
          fecha_parto_probable: '2026-12-26',
        },
        // seca, pare en 15 días
        {
          ...base,
          id_madre: 5,
          estado: 'Seca',
          estado_reproductivo: 'preñada',
          fecha_parto_probable: '2026-11-21',
        },
        // preparto, pare en 5 días
        {
          ...base,
          id_madre: 6,
          estado: 'Preparto',
          estado_reproductivo: 'preñada',
          fecha_parto_probable: '2026-11-11',
        },
        // rechazo y sin dato no entran
        {
          ...base,
          id_madre: 7,
          estado: 'En Tambo',
          estado_reproductivo: 'rechazo',
          fecha_ultimo_parto: '2026-01-01',
        },
        {
          ...base,
          id_madre: 8,
          estado: 'En Tambo',
          estado_reproductivo: null,
          fecha_ultimo_parto: '2026-01-01',
        },
      ],
      C,
      HOY,
    );
    const ids = (k: keyof typeof p) => p[k].map((i) => i.id_madre);
    expect(ids('sin_inseminar')).toEqual([1]);
    expect(ids('reemparche')).toEqual([1]);
    expect(ids('a_tactar')).toEqual([3]);
    expect(ids('a_secar')).toEqual([4]);
    expect(ids('a_preparto')).toEqual([5]);
    expect(ids('parto_proximo')).toEqual([6]);
    expect(p.a_tactar[0].dias).toBe(40);
  });

  it('reemparche vuelve cuando el parche venció', () => {
    const p = calcularPendientes(
      [
        {
          id_madre: 1,
          estado: 'En Tambo',
          estado_reproductivo: 'inseminada',
          fecha_ultimo_parto: '2026-06-01',
          fecha_ultimo_servicio: '2026-10-30',
          fecha_ultimo_parche: '2026-10-20',
        },
      ],
      C,
      HOY,
    );
    expect(p.reemparche.map((i) => i.dias)).toEqual([17]);
  });

  it('respeta la configuración del campo', () => {
    const m = [
      {
        id_madre: 1,
        estado: 'En Tambo',
        estado_reproductivo: 'parida' as const,
        fecha_ultimo_parto: '2026-09-20',
      },
    ];
    expect(calcularPendientes(m, C, HOY).sin_inseminar).toHaveLength(0); // 47 días, espera 50
    expect(
      calcularPendientes(m, { ...C, dias_espera: 45 }, HOY).sin_inseminar,
    ).toHaveLength(1);
  });
});

describe('calcularResumen', () => {
  it('cuenta por categoría y estado y promedia días en leche solo en tambo', () => {
    const r = calcularResumen(
      [
        {
          id_madre: 1,
          estado: 'En Tambo',
          estado_reproductivo: 'preñada',
          fecha_ultimo_parto: '2026-10-27',
        },
        {
          id_madre: 2,
          estado: 'En Tambo',
          estado_reproductivo: null,
          fecha_ultimo_parto: '2026-10-07',
        },
        {
          id_madre: 3,
          estado: 'Seca',
          estado_reproductivo: 'preñada',
          fecha_ultimo_parto: '2025-01-01',
        },
        { id_madre: 4, estado: 'Vaquillona', estado_reproductivo: null },
      ],
      HOY,
    );
    expect(r.total).toBe(4);
    expect(r.por_categoria).toMatchObject({
      'En Tambo': 2,
      Seca: 1,
      Vaquillona: 1,
      Preparto: 0,
    });
    expect(r.por_estado).toMatchObject({ preñada: 2, sin_dato: 2 });
    expect(r.promedio_dias_en_leche).toBe(20);
    expect(r.vacas_con_parto).toBe(2);
  });
});
