// Busca un producto o cliente por lo que escribió la persona ("fardo alfalfa", "juan").
// Sin mayúsculas ni tildes. Gana la coincidencia exacta; si no, todas las palabras tienen que estar.

export const normalizar = (texto: string) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// "fardos" y "fardo" cuentan igual.
const singular = (palabra: string) =>
  palabra.length > 3 && palabra.endsWith('es') && !palabra.endsWith('ces')
    ? palabra.slice(0, -2)
    : palabra.length > 3 && palabra.endsWith('s')
      ? palabra.slice(0, -1)
      : palabra;

const PALABRAS_VACIAS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'un',
  'una',
  'a',
  'al',
  'y',
]);

const palabras = (texto: string) =>
  normalizar(texto)
    .split(' ')
    .filter((p) => p && !PALABRAS_VACIAS.has(p))
    .map(singular);

export type Coincidencia<T> =
  | { tipo: 'unico'; item: T }
  | { tipo: 'varios'; items: T[] }
  | { tipo: 'ninguno' };

// Unidades que la gente pega al nombre ("3 bolsas de maíz", "50 kilos de avena").
const UNIDADES =
  /\b(bolsas?|bolsones?|kg|kgs|kilos?|toneladas?|tn|unidad(es)?|fardos?|rollos?)\b/g;

export function buscarPorNombre<T extends { nombre: string }>(
  lista: T[],
  buscado: string,
): Coincidencia<T> {
  const r = buscar(lista, buscado);
  if (r.tipo !== 'ninguno') return r;
  const sinUnidad = normalizar(buscado).replace(UNIDADES, ' ');
  return sinUnidad.trim() && sinUnidad.trim() !== normalizar(buscado)
    ? buscar(lista, sinUnidad)
    : r;
}

function buscar<T extends { nombre: string }>(
  lista: T[],
  buscado: string,
): Coincidencia<T> {
  const objetivo = normalizar(buscado);
  if (!objetivo) return { tipo: 'ninguno' };

  const exactos = lista.filter((x) => normalizar(x.nombre) === objetivo);
  if (exactos.length === 1) return { tipo: 'unico', item: exactos[0] };

  const buscadas = palabras(buscado);
  if (!buscadas.length) return { tipo: 'ninguno' };
  const candidatos = lista.filter((x) => {
    const delNombre = palabras(x.nombre);
    return buscadas.every((b) => delNombre.some((n) => n.startsWith(b)));
  });
  if (candidatos.length === 1) return { tipo: 'unico', item: candidatos[0] };
  if (candidatos.length > 1) return { tipo: 'varios', items: candidatos };
  return { tipo: 'ninguno' };
}
