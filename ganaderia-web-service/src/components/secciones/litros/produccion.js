// Cálculos de la producción diaria del tambo, sin React, para testearlos con node:test.

const r1 = (n) => Math.round(n * 10) / 10;

// Fecha de Argentina (UTC-3) en formato ISO.
export const hoyAR = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

// La API devuelve la fecha como '2026-11-06' o '2026-11-06T00:00:00.000Z'.
export const fechaISO = (f) => String(f ?? "").slice(0, 10);

// '2026-11-06' -> '06/11/2026' sin pasar por Date (evita el corrimiento de zona).
export const fechaLarga = (f) => {
  const [a, m, d] = fechaISO(f).split("-");
  return a ? `${d}/${m}/${a}` : "";
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
// '2026-11' -> 'nov 26'
export const textoMes = (clave) => {
  const [a, m] = clave.split("-");
  return `${MESES[Number(m) - 1]} ${a.slice(2)}`;
};

export const litrosPorVaca = (total, vacas) => (vacas > 0 ? r1(total / vacas) : null);

// Un punto por día, de la fecha más vieja a la más nueva. Si hay dos registros
// el mismo día se suman los litros y se toma la mayor cantidad de vacas.
export const porDia = (registros = []) => {
  const mapa = new Map();
  for (const r of registros) {
    const fecha = fechaISO(r.fecha);
    const d = mapa.get(fecha) ?? { fecha, fabrica: 0, terneros: 0, vacas: null, tratamiento: null };
    d.fabrica += Number(r.litros_vendido) || 0;
    d.terneros += Number(r.litros_terneros) || 0;
    if (r.cantidad_vacas != null) d.vacas = Math.max(d.vacas ?? 0, r.cantidad_vacas);
    if (r.vacas_en_tratamiento != null) d.tratamiento = Math.max(d.tratamiento ?? 0, r.vacas_en_tratamiento);
    mapa.set(fecha, d);
  }
  return [...mapa.values()]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((d) => {
      const total = r1(d.fabrica + d.terneros);
      return { ...d, fabrica: r1(d.fabrica), terneros: r1(d.terneros), total, por_vaca: litrosPorVaca(total, d.vacas) };
    });
};

// Días dentro de los últimos `meses` meses contando desde `hoy`. Sin meses: todos.
export const filtrarPeriodo = (dias, meses, hoy = hoyAR()) => {
  if (!meses) return dias;
  const [a, m, d] = hoy.split("-").map(Number);
  const desde = new Date(Date.UTC(a, m - 1 - meses, d)).toISOString().slice(0, 10);
  return dias.filter((x) => x.fecha > desde && x.fecha <= hoy);
};

export const porMes = (dias) => {
  const mapa = new Map();
  for (const d of dias) {
    const clave = d.fecha.slice(0, 7);
    const m = mapa.get(clave) ?? { mes: clave, litros: 0, fabrica: 0, dias: 0, sumaPorVaca: 0, diasConVacas: 0 };
    m.litros += d.total;
    m.fabrica += d.fabrica;
    m.dias += 1;
    if (d.por_vaca != null) {
      m.sumaPorVaca += d.por_vaca;
      m.diasConVacas += 1;
    }
    mapa.set(clave, m);
  }
  return [...mapa.values()]
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .map((m) => ({
      mes: m.mes,
      litros: r1(m.litros),
      fabrica: r1(m.fabrica),
      dias: m.dias,
      promedio_diario: r1(m.litros / m.dias),
      por_vaca: m.diasConVacas ? r1(m.sumaPorVaca / m.diasConVacas) : null,
    }));
};

// Litros por año con el acumulado mes a mes dentro de cada año.
export const porAnio = (meses) => {
  const anios = new Map();
  for (const m of meses) {
    const anio = m.mes.slice(0, 4);
    const a = anios.get(anio) ?? { anio, litros: 0, meses: [] };
    a.litros = r1(a.litros + m.litros);
    a.meses.push({ mes: m.mes, litros: m.litros, acumulado: a.litros });
    anios.set(anio, a);
  }
  return [...anios.values()].sort((a, b) => b.anio.localeCompare(a.anio));
};

const mediana = (valores) => {
  const v = [...valores].sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mitad = Math.floor(v.length / 2);
  return v.length % 2 ? v[mitad] : (v[mitad - 1] + v[mitad]) / 2;
};

const lejos = (valor, referencia) => referencia > 0 && (valor < referencia * 0.5 || valor > referencia * 1.5);

// Avisos antes de guardar un día. No bloquean: el usuario puede guardar igual.
// `dias` es la serie de porDia sin el día que se está cargando.
export const advertencias = ({ fecha, total, vacas, tratamiento }, dias = [], vacasRodeo = null) => {
  const avisos = [];
  const recientes = dias.filter((d) => d.fecha !== fecha).slice(-30);

  if (vacas != null && vacasRodeo > 0 && vacas > vacasRodeo) {
    avisos.push(`Cargaste ${vacas} vacas en ordeñe y el rodeo tiene ${vacasRodeo} en tambo.`);
  }
  if (tratamiento != null && vacas != null && tratamiento > vacas) {
    avisos.push(`Hay más vacas en tratamiento (${tratamiento}) que en ordeñe (${vacas}).`);
  }
  if (recientes.length >= 5) {
    const porVaca = litrosPorVaca(total, vacas);
    const refPorVaca = mediana(recientes.map((d) => d.por_vaca).filter((x) => x != null));
    if (porVaca != null && refPorVaca != null && lejos(porVaca, refPorVaca)) {
      avisos.push(`${porVaca} L por vaca está lejos de lo habitual (${r1(refPorVaca)} L por vaca).`);
    }
    const refTotal = mediana(recientes.map((d) => d.total));
    if (lejos(total, refTotal)) {
      avisos.push(`${r1(total)} L en el día está lejos de lo habitual (${r1(refTotal)} L).`);
    }
  }
  return avisos;
};
