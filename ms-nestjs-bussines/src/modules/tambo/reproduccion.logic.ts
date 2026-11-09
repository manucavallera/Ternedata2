// Reglas del rodeo lechero, sin base de datos, para poder testearlas solas.
// Las fechas viajan como 'YYYY-MM-DD' y se comparan en UTC para no correrse un día.

export const TIPOS_EVENTO = [
  'parto',
  'inseminacion',
  'tacto',
  'parche',
  'secado',
  'preparto',
  'aborto',
  'rechazo',
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export const RESULTADOS_TACTO = ['preñada', 'vacia'] as const;

export type EstadoReproductivo =
  | 'parida'
  | 'inseminada'
  | 'preñada'
  | 'vacia'
  | 'rechazo';

export interface ConfigTambo {
  dias_espera: number; // desde el parto hasta poder inseminar
  dias_tacto: number; // desde la inseminación hasta confirmar preñez
  dias_reparche: number; // vida útil del parche de celo; también días desde la inseminación
  dias_secado: number; // antes del parto probable
  dias_preparto: number; // antes del parto probable
  dias_parto_proximo: number;
  dias_gestacion: number;
  dias_reconfirmacion: number; // días de preñez para reconfirmar (mes 6)
}

// Valores que dio el tambero (2026-11-09). Cada campo los puede cambiar.
export const CONFIG_TAMBO_DEFAULT: ConfigTambo = {
  dias_espera: 45, // desde el día 45 ya se puede inseminar (a los 60 es seguro)
  dias_tacto: 35,
  dias_reparche: 14, // el parche se renueva 14 días después de la inseminación
  dias_secado: 60,
  dias_preparto: 30,
  dias_parto_proximo: 7,
  dias_gestacion: 283,
  dias_reconfirmacion: 180,
};

export interface EventoRepro {
  id?: number;
  tipo: TipoEvento;
  fecha: string;
  resultado?: string | null;
  dias_gestacion?: number | null;
}

export interface EstadoRepro {
  estado_reproductivo: EstadoReproductivo | null;
  fecha_ultimo_parto: string | null;
  fecha_ultimo_servicio: string | null;
  fecha_ultimo_parche: string | null;
  fecha_ultimo_tacto: string | null;
  fecha_parto_probable: string | null;
  numero_servicios: number;
}

const MS_DIA = 24 * 60 * 60 * 1000;

export function aFecha(valor: string | Date | null | undefined): string | null {
  if (!valor) return null;
  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null;
    return valor.toISOString().slice(0, 10);
  }
  return String(valor).slice(0, 10);
}

function ms(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((ms(hasta) - ms(desde)) / MS_DIA);
}

export function sumarDias(fecha: string, dias: number): string {
  return new Date(ms(fecha) + dias * MS_DIA).toISOString().slice(0, 10);
}

// Recorre los eventos en orden y deja el estado reproductivo actual.
// `partoTerneros` es la fecha del último ternero cargado: cuenta como un parto
// aunque nadie haya registrado el evento.
export function calcularEstadoRepro(
  eventos: EventoRepro[],
  config: ConfigTambo,
  partoTerneros?: string | null,
): EstadoRepro {
  const lista = [...eventos];
  const yaTieneParto = (f: string) =>
    lista.some(
      (e) => e.tipo === 'parto' && Math.abs(diasEntre(e.fecha, f)) <= 2,
    );
  if (partoTerneros && !yaTieneParto(partoTerneros)) {
    lista.push({ tipo: 'parto', fecha: partoTerneros });
  }
  lista.sort((a, b) => {
    const d = ms(a.fecha) - ms(b.fecha);
    return d !== 0 ? d : (a.id ?? 0) - (b.id ?? 0);
  });

  const e: EstadoRepro = {
    estado_reproductivo: null,
    fecha_ultimo_parto: null,
    fecha_ultimo_servicio: null,
    fecha_ultimo_parche: null,
    fecha_ultimo_tacto: null,
    fecha_parto_probable: null,
    numero_servicios: 0,
  };

  for (const ev of lista) {
    switch (ev.tipo) {
      case 'parto':
        e.estado_reproductivo = 'parida';
        e.fecha_ultimo_parto = ev.fecha;
        e.fecha_ultimo_servicio = null;
        e.fecha_ultimo_parche = null;
        e.fecha_ultimo_tacto = null;
        e.fecha_parto_probable = null;
        e.numero_servicios = 0;
        break;
      case 'inseminacion':
        e.estado_reproductivo = 'inseminada';
        e.fecha_ultimo_servicio = ev.fecha;
        e.fecha_parto_probable = sumarDias(ev.fecha, config.dias_gestacion);
        e.numero_servicios += 1;
        break;
      case 'tacto':
        e.fecha_ultimo_tacto = ev.fecha;
        if (ev.resultado === 'preñada') {
          e.estado_reproductivo = 'preñada';
          // Una ecografía puede dar los días de gestación: manda sobre la inseminación.
          if (ev.dias_gestacion) {
            e.fecha_parto_probable = sumarDias(
              ev.fecha,
              config.dias_gestacion - ev.dias_gestacion,
            );
          }
        } else {
          e.estado_reproductivo = 'vacia';
          e.fecha_parto_probable = null;
        }
        break;
      case 'aborto':
        e.estado_reproductivo = 'vacia';
        e.fecha_parto_probable = null;
        break;
      case 'parche':
        e.fecha_ultimo_parche = ev.fecha;
        break;
      case 'rechazo':
        e.estado_reproductivo = 'rechazo';
        break;
      // secado y preparto cambian la categoría, no el estado reproductivo
    }
  }
  return e;
}

// Categoría (columna `estado` de madres) que deja un evento.
export function categoriaPorEvento(tipo: TipoEvento): string | null {
  if (tipo === 'parto') return 'En Tambo';
  if (tipo === 'secado') return 'Seca';
  if (tipo === 'preparto') return 'Preparto';
  return null;
}

export interface MadreTambo extends Partial<EstadoRepro> {
  id_madre: number;
  rp_madre?: number | null;
  nombre?: string;
  estado: string;
  id_rodeo?: number | null;
}

export interface ItemPendiente {
  id_madre: number;
  rp_madre: number | null;
  nombre: string;
  dias: number; // días que lleva en la condición o que faltan para el parto
}

export interface Pendientes {
  reemparche: ItemPendiente[];
  a_tactar: ItemPendiente[];
  a_reconfirmar: ItemPendiente[];
  sin_inseminar: ItemPendiente[];
  a_secar: ItemPendiente[];
  a_preparto: ItemPendiente[];
  parto_proximo: ItemPendiente[];
}

export function calcularPendientes(
  madres: MadreTambo[],
  config: ConfigTambo,
  hoy: string,
): Pendientes {
  const p: Pendientes = {
    reemparche: [],
    a_tactar: [],
    a_reconfirmar: [],
    sin_inseminar: [],
    a_secar: [],
    a_preparto: [],
    parto_proximo: [],
  };
  const item = (m: MadreTambo, dias: number): ItemPendiente => ({
    id_madre: m.id_madre,
    rp_madre: m.rp_madre ?? null,
    nombre: m.nombre ?? '',
    dias,
  });

  for (const m of madres) {
    const repro = m.estado_reproductivo ?? null;
    if (!repro || repro === 'rechazo') continue;
    const parto = aFecha(m.fecha_ultimo_parto);
    const servicio = aFecha(m.fecha_ultimo_servicio);
    const parche = aFecha(m.fecha_ultimo_parche);
    const partoProbable = aFecha(m.fecha_parto_probable);
    const enTambo = m.estado === 'En Tambo';
    const diasPosParto = parto ? diasEntre(parto, hoy) : null;
    const pasoEspera =
      diasPosParto !== null && diasPosParto >= config.dias_espera;

    // "OK": apta para inseminar y sin inseminación registrada.
    if (estaOk(m, config, hoy)) {
      p.sin_inseminar.push(item(m, diasPosParto));
    }

    if (repro === 'inseminada' && servicio) {
      const dias = diasEntre(servicio, hoy);
      if (dias >= config.dias_tacto) p.a_tactar.push(item(m, dias));
    }

    // Parche de celo: vacas en servicio que todavía no se confirmaron preñadas.
    // A una inseminada se le renueva a los `dias_reparche` de la inseminación
    // (o del último parche, si se puso después).
    if (
      enTambo &&
      pasoEspera &&
      ['parida', 'vacia', 'inseminada'].includes(repro)
    ) {
      const desde =
        repro === 'inseminada' && servicio && (!parche || servicio > parche)
          ? servicio
          : parche;
      if (!desde) p.reemparche.push(item(m, diasPosParto));
      else {
        const dias = diasEntre(desde, hoy);
        if (dias >= config.dias_reparche) p.reemparche.push(item(m, dias));
      }
    }

    if (repro === 'preñada' && partoProbable) {
      const faltan = diasEntre(hoy, partoProbable);
      // Reconfirmación de preñez desde el mes 6, si no hubo tacto después.
      const gestacion = config.dias_gestacion - faltan;
      const cumplio = sumarDias(
        partoProbable,
        config.dias_reconfirmacion - config.dias_gestacion,
      );
      const tacto = aFecha(m.fecha_ultimo_tacto);
      if (
        gestacion >= config.dias_reconfirmacion &&
        faltan > 0 &&
        (!tacto || tacto < cumplio)
      ) {
        p.a_reconfirmar.push(item(m, gestacion));
      }
      if (enTambo && faltan <= config.dias_secado)
        p.a_secar.push(item(m, faltan));
      if (m.estado === 'Seca' && faltan <= config.dias_preparto) {
        p.a_preparto.push(item(m, faltan));
      }
      if (!enTambo && faltan <= config.dias_parto_proximo) {
        p.parto_proximo.push(item(m, faltan));
      }
    }
  }

  for (const lista of Object.values(p)) {
    lista.sort((a: ItemPendiente, b: ItemPendiente) => b.dias - a.dias);
  }
  // Para lo que viene (secar, preparto, parto), primero lo más urgente.
  for (const k of ['a_secar', 'a_preparto', 'parto_proximo'] as const) {
    p[k].sort((a, b) => a.dias - b.dias);
  }
  return p;
}

// "OK" del tambero: en tambo, pasó la espera desde el parto y no tiene inseminación registrada.
export function estaOk(
  m: MadreTambo,
  config: ConfigTambo,
  hoy: string,
): boolean {
  const repro = m.estado_reproductivo ?? null;
  if (m.estado !== 'En Tambo') return false;
  if (repro !== 'parida' && repro !== 'vacia') return false;
  const parto = aFecha(m.fecha_ultimo_parto);
  return !!parto && diasEntre(parto, hoy) >= config.dias_espera;
}

export function diasEnLeche(m: MadreTambo, hoy: string): number | null {
  if (m.estado !== 'En Tambo') return null;
  const parto = aFecha(m.fecha_ultimo_parto);
  if (!parto) return null;
  return Math.max(0, diasEntre(parto, hoy));
}

export function calcularResumen(madres: MadreTambo[], hoy: string) {
  const por_categoria: Record<string, number> = {
    'En Tambo': 0,
    Seca: 0,
    Preparto: 0,
    Vaquillona: 0,
  };
  const por_estado: Record<string, number> = {
    parida: 0,
    inseminada: 0,
    preñada: 0,
    vacia: 0,
    rechazo: 0,
    sin_dato: 0,
  };
  const del: number[] = [];
  for (const m of madres) {
    por_categoria[m.estado] = (por_categoria[m.estado] ?? 0) + 1;
    const clave = m.estado_reproductivo ?? 'sin_dato';
    por_estado[clave] = (por_estado[clave] ?? 0) + 1;
    const d = diasEnLeche(m, hoy);
    if (d !== null) del.push(d);
  }
  return {
    total: madres.length,
    por_categoria,
    por_estado,
    promedio_dias_en_leche: del.length
      ? Math.round(del.reduce((a, b) => a + b, 0) / del.length)
      : null,
    vacas_con_parto: del.length,
  };
}

export function hoyArgentina(): string {
  // Argentina es UTC-3 todo el año.
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
