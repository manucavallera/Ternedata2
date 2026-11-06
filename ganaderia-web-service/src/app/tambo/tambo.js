// Textos y cálculos del rodeo lechero, sin React, para testearlos con node:test.

export const CATEGORIAS = ["En Tambo", "Seca", "Preparto", "Vaquillona"];

export const ESTADOS = {
  parida: { texto: "Parida", clase: "bg-teal-100 text-teal-800" },
  inseminada: { texto: "Inseminada", clase: "bg-sky-100 text-sky-800" },
  preñada: { texto: "Preñada", clase: "bg-green-100 text-green-800" },
  vacia: { texto: "Vacía", clase: "bg-red-100 text-red-800" },
  rechazo: { texto: "Rechazo", clase: "bg-orange-100 text-orange-800" },
  sin_dato: { texto: "Sin dato", clase: "bg-gray-100 text-gray-600" },
};

export const TIPOS_EVENTO = [
  { valor: "parto", texto: "Parto" },
  { valor: "inseminacion", texto: "Inseminación" },
  { valor: "tacto", texto: "Tacto / ecografía" },
  { valor: "parche", texto: "Parche de celo" },
  { valor: "secado", texto: "Secado" },
  { valor: "preparto", texto: "Pasa a preparto" },
  { valor: "aborto", texto: "Aborto" },
  { valor: "rechazo", texto: "Rechazo (para vender)" },
];

export const textoTipo = (tipo) => TIPOS_EVENTO.find((t) => t.valor === tipo)?.texto ?? tipo;

// Orden y texto de las tarjetas de pendientes. `futuro`: los días son los que faltan.
export const PENDIENTES = [
  { clave: "reemparche", texto: "Reemparche", detalle: (d) => `parche hace ${d} días` },
  { clave: "a_tactar", texto: "A tactar", detalle: (d) => `inseminada hace ${d} días` },
  { clave: "sin_inseminar", texto: "Sin inseminar", detalle: (d) => `parió hace ${d} días` },
  { clave: "a_secar", texto: "A secar", detalle: (d) => faltan(d) },
  { clave: "a_preparto", texto: "A pasar a preparto", detalle: (d) => faltan(d) },
  { clave: "parto_proximo", texto: "Parto próximo", detalle: (d) => faltan(d) },
];

function faltan(d) {
  if (d < 0) return `parto atrasado ${-d} días`;
  if (d === 0) return "pare hoy";
  return `pare en ${d} días`;
}

export const CONFIG_CAMPOS = [
  { clave: "dias_espera", texto: "Días después del parto para empezar a inseminar" },
  { clave: "dias_tacto", texto: "Días después de la inseminación para tactar" },
  { clave: "dias_reparche", texto: "Días que dura el parche de celo" },
  { clave: "dias_secado", texto: "Días antes del parto para secar" },
  { clave: "dias_preparto", texto: "Días antes del parto para pasar a preparto" },
  { clave: "dias_parto_proximo", texto: "Días antes del parto para avisar" },
  { clave: "dias_gestacion", texto: "Días de gestación" },
];

export const hoyISO = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

// '2026-09-14' -> '14/09/26'
export const fechaCorta = (iso) => {
  if (!iso) return "";
  const [a, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}/${a.slice(2)}`;
};

export const porcentaje = (parte, total) =>
  total > 0 ? `${((parte / total) * 100).toFixed(1).replace(/\.0$/, "")}%` : "0%";

// "325, 328 330" -> { ids: [..], noEncontradas: ['330'] } según las caravanas del rodeo.
export const caravanasAIds = (texto, vacas) => {
  const porRp = new Map(vacas.filter((v) => v.rp_madre != null).map((v) => [String(v.rp_madre), v.id_madre]));
  const ids = [];
  const noEncontradas = [];
  for (const rp of String(texto || "").split(/[\s,;]+/).filter(Boolean)) {
    const id = porRp.get(rp);
    if (id == null) noEncontradas.push(rp);
    else if (!ids.includes(id)) ids.push(id);
  }
  return { ids, noEncontradas };
};

export const filtrarVacas = (vacas, { busqueda = "", categoria = "", soloIds = null } = {}) => {
  const q = busqueda.trim().toLowerCase();
  return vacas.filter((v) => {
    if (categoria && v.estado !== categoria) return false;
    if (soloIds && !soloIds.includes(v.id_madre)) return false;
    if (!q) return true;
    return String(v.rp_madre ?? "").includes(q) || (v.nombre || "").toLowerCase().includes(q);
  });
};

// Línea de detalle de la tarjeta de una vaca.
export const detalleVaca = (v) => {
  const partes = [v.estado];
  if (v.rodeo?.nombre) partes.push(v.rodeo.nombre);
  if (v.fecha_ultimo_parto) {
    partes.push(`Parió ${fechaCorta(v.fecha_ultimo_parto)}${v.dias_en_leche != null ? ` (${v.dias_en_leche} DEL)` : ""}`);
  }
  if (v.estado_reproductivo === "inseminada" && v.fecha_ultimo_servicio) {
    partes.push(`Servicio ${fechaCorta(v.fecha_ultimo_servicio)}${v.numero_servicios > 1 ? ` (${v.numero_servicios}º)` : ""}`);
  }
  if (v.estado_reproductivo === "preñada") {
    partes.push(v.fecha_parto_probable ? `Parto probable ${fechaCorta(v.fecha_parto_probable)}` : "Parto probable sin calcular (falta la inseminación o los días de gestación)");
  }
  return partes.join(" · ");
};

// ---------- control lechero ----------

const litrosTexto = (n) => (n == null ? "-" : String(n).replace(".", ","));

// "Control 26/09: 14,5 + 12 = 26,5 L"
export const textoControl = (c) =>
  c ? `Control ${fechaCorta(c.fecha)}: ${litrosTexto(c.litros_manana)} + ${litrosTexto(c.litros_tarde)} = ${litrosTexto(c.total)} L` : "";

// Lo que se escribe en la planilla: vacío es null, acepta coma decimal.
export const leerLitros = (texto) => {
  const t = String(texto ?? "").trim().replace(",", ".");
  if (t === "") return { valor: null };
  if (!/^\d+(\.\d)?$/.test(t)) return { error: "Usá números con un decimal como máximo" };
  const valor = Number(t);
  if (valor > 80) return { error: "Más de 80 litros en un ordeñe" };
  return { valor };
};

// Filas de la planilla: vacas en tambo más las que ya tienen control ese día.
export const armarPlanilla = (vacas, controles = [], { todas = false } = {}) => {
  const porVaca = new Map(controles.map((c) => [c.id_madre, c]));
  return vacas
    .filter((v) => todas || v.estado === "En Tambo" || porVaca.has(v.id_madre))
    .sort((a, b) => (a.rp_madre ?? Infinity) - (b.rp_madre ?? Infinity))
    .map((v) => {
      const c = porVaca.get(v.id_madre);
      return {
        id_madre: v.id_madre,
        rp_madre: v.rp_madre,
        nombre: v.nombre,
        manana: c?.litros_manana != null ? litrosTexto(c.litros_manana) : "",
        tarde: c?.litros_tarde != null ? litrosTexto(c.litros_tarde) : "",
        guardada: Boolean(c),
      };
    });
};

// Revisa la planilla y arma el cuerpo del POST. Solo manda las vacas con
// litros o las que ya tenían control (vaciarlas lo borra).
export const planillaACuerpo = (filas) => {
  const errores = [];
  const vacas = [];
  let litros = 0;
  let conDato = 0;
  for (const f of filas) {
    const m = leerLitros(f.manana);
    const t = leerLitros(f.tarde);
    if (m.error || t.error) {
      errores.push(`${f.rp_madre ?? f.nombre}: ${m.error || t.error}`);
      continue;
    }
    if (m.valor == null && t.valor == null) {
      if (f.guardada) vacas.push({ id_madre: f.id_madre, litros_manana: null, litros_tarde: null });
      continue;
    }
    vacas.push({ id_madre: f.id_madre, litros_manana: m.valor, litros_tarde: t.valor });
    litros += (m.valor ?? 0) + (t.valor ?? 0);
    conDato += 1;
  }
  litros = Math.round(litros * 10) / 10;
  return {
    errores,
    vacas,
    resumen: { vacas: conDato, litros, promedio: conDato ? Math.round((litros / conDato) * 10) / 10 : null },
  };
};

// ---------- mixers ----------

export const ICONOS_INGREDIENTE = ["🌽", "🌾", "🌱", "🫘", "🥜", "🧂", "💧", "🟤", "🟢", "🟡"];

// Mueve el elemento i una posición arriba (-1) o abajo (+1). Fuera de rango no cambia.
export const mover = (lista, i, delta) => {
  const j = i + delta;
  if (i < 0 || i >= lista.length || j < 0 || j >= lista.length) return lista;
  const copia = [...lista];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
};

// Ingredientes del formulario -> cuerpo del PATCH/POST. Saltea filas vacías.
export const ingredientesACuerpo = (filas) => {
  const errores = [];
  const ingredientes = [];
  for (const f of filas) {
    const nombre = (f.nombre || "").trim();
    const textoKg = String(f.kg ?? "").trim().replace(",", ".");
    if (!nombre && !textoKg) continue;
    const kg = Number(textoKg);
    if (!nombre) errores.push("Falta el nombre de un ingrediente");
    else if (textoKg === "" || !Number.isFinite(kg) || kg < 0) errores.push(`${nombre}: kg inválidos`);
    else ingredientes.push({ nombre, kg, ...(f.icono ? { icono: f.icono } : {}) });
  }
  if (!errores.length && !ingredientes.length) errores.push("Cargá al menos un ingrediente");
  return { errores, ingredientes };
};
