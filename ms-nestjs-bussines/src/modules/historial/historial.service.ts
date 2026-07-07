import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

// Tablas versionadas y su PK. Whitelist: nunca interpolar nombres externos.
const TABLAS: { key: string; hist: string }[] = [
  { key: 'madres', hist: 'madres_history' },
  { key: 'terneros', hist: 'terneros_history' },
  { key: 'rodeos', hist: 'rodeos_history' },
  { key: 'tratamientos', hist: 'tratamientos_history' },
  { key: 'eventos', hist: 'eventos_history' },
  { key: 'dietas', hist: 'rodeo_dietas_history' },
];

// DEL a fecha T: días desde el último parto (proxy = fecha_nac del ternero más
// reciente de la madre), calculado RELATIVO a T (no a hoy). Solo si 'En Tambo'.
function calcularDelEnFecha(
  madre: any,
  ternerosDeMadre: any[],
  finDeDiaMs: number,
): number | null {
  if (madre.estado !== 'En Tambo') return null;
  if (!ternerosDeMadre || ternerosDeMadre.length === 0) return null;
  const ultimoParto = ternerosDeMadre
    .map((t) => new Date(t.fecha_nacimiento).getTime())
    .filter((ms) => !isNaN(ms))
    .reduce((max, ms) => (ms > max ? ms : max), 0);
  if (ultimoParto === 0) return null;
  const dias = Math.floor((finDeDiaMs - ultimoParto) / (1000 * 60 * 60 * 24));
  return dias < 0 ? 0 : dias;
}

@Injectable()
export class HistorialService {
  private readonly logger = new Logger(HistorialService.name);

  constructor(private readonly dataSource: DataSource) {}

  // Estado de una entidad a fecha T (fin del día). Descarta delete-markers.
  private async reconstruir(
    histTable: string,
    idEstablecimiento: number,
    finDeDia: string,
  ): Promise<any[]> {
    const sql = `
      SELECT data FROM (
        SELECT DISTINCT ON (entity_id) data, operacion
        FROM ${histTable}
        WHERE id_establecimiento = $1
          AND valid_from <= $2::timestamptz
          AND (valid_to IS NULL OR valid_to > $2::timestamptz)
        ORDER BY entity_id, valid_from DESC
      ) s
      WHERE operacion <> 'D';`;
    const rows = await this.dataSource.query(sql, [idEstablecimiento, finDeDia]);
    return rows.map((r: any) => r.data);
  }

  // Snapshot completo del rodeo a fecha pasada (YYYY-MM-DD).
  async snapshot(idEstablecimiento: number, fecha: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new HttpException(
        'Parámetro "fecha" inválido, usar YYYY-MM-DD',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const finDeDia = `${fecha} 23:59:59.999999`;
      const finDeDiaMs = new Date(`${fecha}T23:59:59.999`).getTime();
      const [madres, terneros, rodeos, tratamientos, eventos, dietas] =
        await Promise.all(
          TABLAS.map((t) =>
            this.reconstruir(t.hist, idEstablecimiento, finDeDia),
          ),
        );

      // DEL por vaca (relativo a la fecha pedida): agrupo terneros por id_madre.
      const ternerosPorMadre = new Map<number, any[]>();
      for (const t of terneros) {
        const idm = Number(t.id_madre);
        if (!idm) continue;
        if (!ternerosPorMadre.has(idm)) ternerosPorMadre.set(idm, []);
        ternerosPorMadre.get(idm).push(t);
      }
      const madresConDel = madres.map((m: any) => ({
        ...m,
        dias_en_leche: calcularDelEnFecha(
          m,
          ternerosPorMadre.get(Number(m.id_madre)) || [],
          finDeDiaMs,
        ),
      }));

      // Dietas: enriquezco modo 'formula' con cantidad de animales del rodeo a
      // esa fecha (madres + terneros reconstruidos) y el total resultante.
      const contarEnRodeo = (idRodeo: number) =>
        madres.filter((m: any) => Number(m.id_rodeo) === idRodeo).length +
        terneros.filter((t: any) => Number(t.id_rodeo) === idRodeo).length;
      const dietasCalc = dietas.map((d: any) => {
        if (d.modo !== 'formula') return { ...d, cantidad_animales: null, total_rodeo: null };
        const cantidad = contarEnRodeo(Number(d.id_rodeo));
        const kg = Number(d.kg_por_animal) || 0;
        return {
          ...d,
          cantidad_animales: cantidad,
          total_rodeo: Math.round(kg * cantidad * 100) / 100,
        };
      });

      return {
        fecha,
        madres: madresConDel,
        terneros,
        rodeos,
        tratamientos,
        eventos,
        dietas: dietasCalc,
      };
    } catch (error) {
      this.logger.error('Error al reconstruir snapshot', error);
      throw new HttpException(
        `Error al reconstruir snapshot: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Días con al menos un cambio en el rango [desde, hasta] (para pintar calendario).
  async diasConCambios(
    idEstablecimiento: number,
    desde: string,
    hasta: string,
  ): Promise<string[]> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
      throw new HttpException(
        'Parámetros "desde"/"hasta" inválidos, usar YYYY-MM-DD',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const subconsultas = TABLAS.map(
        (t) =>
          `SELECT valid_from::date d FROM ${t.hist}
             WHERE id_establecimiento = $1 AND valid_from::date BETWEEN $2 AND $3`,
      ).join('\nUNION\n');
      const sql = `SELECT DISTINCT d FROM (${subconsultas}) x ORDER BY d;`;
      const rows = await this.dataSource.query(sql, [
        idEstablecimiento,
        desde,
        hasta,
      ]);
      return rows.map((r: any) =>
        r.d instanceof Date ? r.d.toISOString().slice(0, 10) : String(r.d),
      );
    } catch (error) {
      this.logger.error('Error al obtener días con cambios', error);
      throw new HttpException(
        `Error al obtener días con cambios: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
